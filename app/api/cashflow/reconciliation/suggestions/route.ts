import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const AMOUNT_TOLERANCE = 0.01;
const EARLIEST_DAYS = 3;
const LATEST_DAYS = 30;

interface DBTransaction {
  id: string;
  import_id: string;
  txn_date: string;
  description: string;
  amount: number;
  balance: number | null;
  currency: string;
  raw_type: string | null;
  raw: Record<string, unknown> | null;
  matched_invoice_id: string | null;
  created_at: string;
}

interface DBInvoice {
  id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  client_document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CandidateMatch {
  invoice: DBInvoice & { clients: { name: string; client_number: number; display_code: string } | null };
  matchType: "likely" | "possible";
}

interface SuggestedPair {
  transaction: DBTransaction;
  matches: CandidateMatch[];
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: txns, error: txnErr } = await supabase
    .from("bank_transactions")
    .select("*")
    .is("matched_invoice_id", null)
    .order("txn_date", { ascending: false });

  if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 500 });

  const unmatchedTxns = (txns ?? []) as DBTransaction[];
  const positiveTxns = unmatchedTxns.filter((t) => t.amount > 0);

  if (positiveTxns.length === 0) return NextResponse.json([]);

  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("*, clients(name, client_number, display_code)")
    .in("status", ["sent", "overdue"])
    .order("due_date", { ascending: false });

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  const candidateInvoices = (invoices ?? []) as (DBInvoice & {
    clients: { name: string; client_number: number; display_code: string } | null;
  })[];

  const { data: dismissed, error: disErr } = await supabase
    .from("dismissed_matches")
    .select("bank_transaction_id, invoice_id");

  if (disErr) return NextResponse.json({ error: disErr.message }, { status: 500 });

  const dismissedSet = new Set(
    (dismissed ?? []).map((d: { bank_transaction_id: string; invoice_id: string }) =>
      `${d.bank_transaction_id}::${d.invoice_id}`
    )
  );

  const results: SuggestedPair[] = [];

  for (const txn of positiveTxns) {
    const txnDate = new Date(txn.txn_date + "T00:00:00");

    const matches: CandidateMatch[] = [];

    for (const inv of candidateInvoices) {
      const pairKey = `${txn.id}::${inv.id}`;
      if (dismissedSet.has(pairKey)) continue;

      const amountDiff = Math.abs(txn.amount - inv.total);
      if (amountDiff > AMOUNT_TOLERANCE) continue;

      const issueDate = new Date(inv.issue_date + "T00:00:00");
      const dueDate = new Date(inv.due_date + "T00:00:00");
      const earliest = new Date(issueDate);
      earliest.setDate(earliest.getDate() - EARLIEST_DAYS);
      const latest = new Date(dueDate);
      latest.setDate(latest.getDate() + LATEST_DAYS);

      if (txnDate < earliest || txnDate > latest) continue;

      const rawText =
        txn.description.toLowerCase() +
        (txn.raw ? " " + JSON.stringify(txn.raw).toLowerCase() : "");

      const matchType = rawText.includes(inv.invoice_number.toLowerCase())
        ? "likely"
        : "possible";

      matches.push({ invoice: inv, matchType });
    }

    if (matches.length > 0) {
      results.push({ transaction: txn, matches });
    }
  }

  return NextResponse.json(results);
}
