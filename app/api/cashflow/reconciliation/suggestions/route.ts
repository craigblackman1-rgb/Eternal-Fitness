import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  findSuggestedMatches,
  type MatchTransaction,
  type MatchInvoice,
} from "@/lib/cashflow-matching";

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

  const unmatchedTxns = (txns ?? []) as MatchTransaction[];

  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("*, clients(name, client_number, display_code)")
    .in("status", ["sent", "overdue"])
    .order("due_date", { ascending: false });

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  const candidateInvoices = (invoices ?? []) as (MatchInvoice & {
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

  const results = findSuggestedMatches({
    transactions: unmatchedTxns,
    invoices: candidateInvoices,
    dismissedSet,
  });

  return NextResponse.json(results);
}
