export const AMOUNT_TOLERANCE = 0.01;
const EARLIEST_DAYS = 3;
const LATEST_DAYS = 30;

export interface MatchTransaction {
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

export interface MatchInvoice {
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

export interface CandidateMatch {
  invoice: MatchInvoice & { clients: { name: string; client_number: number; display_code: string } | null };
  matchType: "likely" | "possible";
}

export interface SuggestedPair {
  transaction: MatchTransaction;
  matches: CandidateMatch[];
}

export interface FindMatchesParams {
  transactions: MatchTransaction[];
  invoices: (MatchInvoice & { clients: { name: string; client_number: number; display_code: string } | null })[];
  dismissedSet: Set<string>;
}

export function findSuggestedMatches(params: FindMatchesParams): SuggestedPair[] {
  const { transactions, invoices, dismissedSet } = params;

  const positiveTxns = transactions.filter((t) => t.amount > 0);

  if (positiveTxns.length === 0) return [];

  const results: SuggestedPair[] = [];

  for (const txn of positiveTxns) {
    const txnDate = new Date(txn.txn_date + "T00:00:00");

    const matches: CandidateMatch[] = [];

    for (const inv of invoices) {
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

  return results;
}
