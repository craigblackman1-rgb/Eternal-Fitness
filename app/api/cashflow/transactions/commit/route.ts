import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import type { ParsedTransaction } from "@/lib/bank-statement-parser";

interface CommitRequest {
  fileName: string;
  transactions: ParsedTransaction[];
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CommitRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fileName, transactions } = body;

  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: "transactions must be a non-empty array" }, { status: 400 });
  }

  const createdBy = user.email ?? user.id;

  const pool = getPool();
  const pg = await pool.connect();
  try {
    await pg.query("BEGIN");

    const importRes = await pg.query(
      `INSERT INTO bank_statement_imports (source_file_name, status, row_count, created_by)
       VALUES ($1, 'committed', $2, $3)
       RETURNING id`,
      [fileName, transactions.length, createdBy],
    );
    const importId: string = importRes.rows[0].id;

    for (const txn of transactions) {
      await pg.query(
        `INSERT INTO bank_transactions (import_id, txn_date, description, amount, balance, currency, raw_type, raw)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          importId,
          txn.date,
          txn.description,
          txn.amount,
          txn.balance,
          txn.currency,
          txn.raw_type,
          JSON.stringify(txn.raw),
        ],
      );
    }

    await pg.query("COMMIT");

    return NextResponse.json({
      importId,
      rowCount: transactions.length,
    }, { status: 201 });
  } catch (e) {
    await pg.query("ROLLBACK");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Commit failed" },
      { status: 500 },
    );
  } finally {
    pg.release();
  }
}
