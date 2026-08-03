import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { transaction_id, invoice_id } = body;

  if (!transaction_id || !invoice_id) {
    return NextResponse.json({ error: "transaction_id and invoice_id are required" }, { status: 400 });
  }

  const pool = getPool();
  const pg = await pool.connect();
  try {
    await pg.query("BEGIN");

    const txnCheck = await pg.query(
      `SELECT id, matched_invoice_id FROM bank_transactions WHERE id = $1 FOR UPDATE`,
      [transaction_id]
    );
    if (txnCheck.rows.length === 0) {
      await pg.query("ROLLBACK");
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (txnCheck.rows[0].matched_invoice_id) {
      await pg.query("ROLLBACK");
      return NextResponse.json({ error: "Transaction already matched" }, { status: 409 });
    }

    const invCheck = await pg.query(
      `SELECT id, status FROM invoices WHERE id = $1 FOR UPDATE`,
      [invoice_id]
    );
    if (invCheck.rows.length === 0) {
      await pg.query("ROLLBACK");
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invCheck.rows[0].status === "paid") {
      await pg.query("ROLLBACK");
      return NextResponse.json({ error: "Invoice already paid" }, { status: 409 });
    }

    await pg.query(
      `UPDATE bank_transactions SET matched_invoice_id = $1 WHERE id = $2`,
      [invoice_id, transaction_id]
    );

    await pg.query(
      `UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = $1`,
      [invoice_id]
    );

    await pg.query("COMMIT");
    pg.release();

    return NextResponse.json({ success: true });
  } catch (e) {
    await pg.query("ROLLBACK").catch(() => {});
    pg.release();
    return NextResponse.json({ error: "Failed to confirm match" }, { status: 500 });
  }
}
