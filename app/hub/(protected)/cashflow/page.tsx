import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/hub";
import {
  findSuggestedMatches,
  type MatchTransaction,
  type MatchInvoice,
} from "@/lib/cashflow-matching";

/* ── S9 Finance overview (design-systems v3/13-finance.html) ──────────────
   Replaces the old four-KPI-tile + tax/forecast-card dashboard. The reality
   check that shapes this page (Craig, 5 Sep 2026): "Everyone has paid
   outside of the hub so to say they are due to pay would be incorrect." All
   21 previously-"pending" clients were bulk-flipped to payment_status =
   'paid' that day for exactly that reason — the flag had been lying the
   whole time. Neither clients.payment_status nor invoices.status is a
   bank-verified fact; only a matched bank_transactions row is. So this page
   does not claim to know who owes money — it shows what paperwork is open
   and what the bank has actually confirmed.

   Every queue row below traces to a real column (see the five decision
   types in the mockup's Q1 comment). Nothing here is illustrative — where
   the mockup used placeholder examples (Rick Frenken, Steph White, a "3
   bank lines" count), this build uses whatever the real query returns,
   including "none" when that is the true state.

   Tax, Forecast, Reconciliation and Bank transactions are cut from this
   dashboard's framing (per the mockup's Q2 comment) but not from the hub —
   they keep their own pages and routes, reachable from "Elsewhere in
   Finance" below. Nothing was deleted. */

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

interface ClientRow {
  id: string;
  name: string;
  client_number: number;
  client_status: string | null;
  block_expiry_date: string | null;
  sessions_remaining: number | null;
  sessions_purchased: number | null;
  client_rate: number | null;
  session_duration: number | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  issue_date: string;
  due_date: string;
  updated_at: string;
  created_at: string;
  clients: { name: string; client_number: number; display_code: string | null } | null;
}

type QueueTone = "due" | "warn" | "quiet";

interface QueueItem {
  id: string;
  tone: QueueTone;
  headline: string;
  subline: string;
  actionLabel: string;
  href: string;
}

const DOT: Record<QueueTone, string> = {
  due: "bg-rose",
  warn: "bg-[var(--status-warning)]",
  quiet: "bg-[var(--status-success)]",
};

// A block within this many days of its expiry (or already past it) with
// sessions still unused is a "sell the next one now, or let it lapse"
// decision. No prior screen in this codebase defines this window, so 14
// days is a deliberate choice here — roughly two weeks' notice.
const BLOCK_ENDING_WINDOW_DAYS = 14;

// The standard session length. clients.session_duration defaults to 60;
// a client trained at any other length with no client_rate override means
// every invoice for them defaults to the wrong price (CR-EF-135).
const STANDARD_SESSION_DURATION = 60;

export default async function CashflowOverviewPage() {
  const supabase = createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const [clientsRes, invoicesRes, unmatchedTxnRes, dismissedRes, invoiceCountRes] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, name, client_number, client_status, block_expiry_date, sessions_remaining, sessions_purchased, client_rate, session_duration",
      )
      .eq("client_status", "active"),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, issue_date, due_date, updated_at, created_at, clients(name, client_number, display_code)")
      .order("updated_at", { ascending: false }),
    supabase.from("bank_transactions").select("*").is("matched_invoice_id", null),
    supabase.from("dismissed_matches").select("bank_transaction_id, invoice_id"),
    supabase.from("invoices").select("id", { count: "exact", head: true }),
  ]);

  const clients = (clientsRes.data ?? []) as ClientRow[];
  const allInvoices = (invoicesRes.data ?? []) as InvoiceRow[];
  const invoiceTotalCount = invoiceCountRes.count ?? allInvoices.length;

  // ── Bank matches actually confirmed — the one non-guessable signal ──────
  const matchedInvoiceRes = await supabase
    .from("bank_transactions")
    .select("matched_invoice_id")
    .not("matched_invoice_id", "is", null);
  const confirmedMatchedIds = new Set(
    ((matchedInvoiceRes.data ?? []) as { matched_invoice_id: string }[]).map((r) => r.matched_invoice_id),
  );

  const queue: QueueItem[] = [];

  // 1) A block ending (or already ended) with sessions left unused — sell
  // the next one now, or let it lapse. (clients.block_expiry_date, sessions_remaining)
  const endingClients = clients
    .filter((c) => {
      if (!c.block_expiry_date) return false;
      const remaining = c.sessions_remaining ?? 0;
      if (remaining <= 0) return false;
      const expiry = new Date(c.block_expiry_date);
      const daysUntil = daysBetween(expiry, now);
      return daysUntil <= BLOCK_ENDING_WINDOW_DAYS; // includes already-past expiries
    })
    .sort((a, b) => new Date(a.block_expiry_date!).getTime() - new Date(b.block_expiry_date!).getTime());

  for (const c of endingClients) {
    const expiry = new Date(c.block_expiry_date!);
    const daysUntil = daysBetween(expiry, now);
    const remaining = c.sessions_remaining ?? 0;
    const purchased = c.sessions_purchased ?? remaining;
    const whenText =
      daysUntil >= 0
        ? `ends in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`
        : `ended ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} ago`;
    queue.push({
      id: `block-${c.id}`,
      tone: "due",
      headline: `${c.name}'s program ${whenText}`,
      subline: `${remaining} of ${purchased} session${purchased === 1 ? "" : "s"} unused. Decide whether to sell the next program now.`,
      actionLabel: "Raise invoice",
      href: "/hub/cashflow/invoices/new",
    });
  }

  // 2) An invoice drafted and never sent — it cannot be paid by any route
  // until it's sent. (invoices.status = 'draft')
  const draftInvoices = allInvoices.filter((inv) => inv.status === "draft");
  for (const inv of draftInvoices) {
    const ageDays = daysBetween(now, new Date(inv.issue_date));
    queue.push({
      id: `draft-${inv.id}`,
      tone: "warn",
      headline: `${inv.clients?.name ?? "Unknown client"}'s invoice (${fmt(inv.total)}) has been a draft for ${ageDays} day${ageDays === 1 ? "" : "s"}`,
      subline: "invoices.status = 'draft'. A draft cannot be paid by any route until it's sent.",
      actionLabel: "Send invoice",
      href: `/hub/cashflow/invoices/${inv.id}`,
    });
  }

  // 3) An overdue invoice with no matching bank line — a status check, not
  // an accusation. (invoices.status/due_date + no confirmed match)
  const overdueUnmatched = allInvoices.filter(
    (inv) =>
      (inv.status === "overdue" || (inv.status === "sent" && inv.due_date < today)) &&
      !confirmedMatchedIds.has(inv.id),
  );
  for (const inv of overdueUnmatched) {
    const daysOverdue = daysBetween(now, new Date(inv.due_date));
    queue.push({
      id: `overdue-${inv.id}`,
      tone: "warn",
      headline: `${inv.clients?.name ?? "Unknown client"}'s invoice (${fmt(inv.total)}) is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} past due, and no bank line has matched it`,
      subline: "If they've already paid another way, mark it — otherwise send a reminder. Not an accusation, a status check.",
      actionLabel: "Open invoice",
      href: `/hub/cashflow/invoices/${inv.id}`,
    });
  }

  // 4) Bank lines that look like they match unpaid invoices — confirm or
  // dismiss. (bank_transactions unmatched + findSuggestedMatches heuristic)
  const candidateInvoicesRes = await supabase
    .from("invoices")
    .select("*, clients(name, client_number, display_code)")
    .in("status", ["sent", "overdue"]);
  const unmatchedTxns = (unmatchedTxnRes.data ?? []) as MatchTransaction[];
  const candidateInvoices = (candidateInvoicesRes.data ?? []) as (MatchInvoice & {
    clients: { name: string; client_number: number; display_code: string } | null;
  })[];
  const dismissedSet = new Set(
    (dismissedRes.data ?? []).map(
      (d: { bank_transaction_id: string; invoice_id: string }) => `${d.bank_transaction_id}::${d.invoice_id}`,
    ),
  );
  const suggestionPairs = findSuggestedMatches({
    transactions: unmatchedTxns,
    invoices: candidateInvoices,
    dismissedSet,
  });
  if (suggestionPairs.length > 0) {
    const n = suggestionPairs.length;
    queue.push({
      id: "recon",
      tone: "quiet",
      headline: `${n} bank line${n === 1 ? "" : "s"} look${n === 1 ? "s" : ""} like ${n === 1 ? "it matches" : "they match"} unpaid invoices`,
      subline: "Reviewing a suggested match takes less time than chasing something already paid.",
      actionLabel: "Review matches",
      href: "/hub/cashflow/reconciliation",
    });
  }

  // 5) A client training at a non-standard session length with no
  // client_rate override — every invoice for them defaults to the wrong
  // price. (clients.client_rate IS NULL + session_duration != 60)
  const noRateClients = clients.filter(
    (c) => c.client_rate == null && c.session_duration != null && c.session_duration !== STANDARD_SESSION_DURATION,
  );
  for (const c of noRateClients) {
    queue.push({
      id: `rate-${c.id}`,
      tone: "quiet",
      headline: `${c.name} has no rate set`,
      subline: `Trains in ${c.session_duration}-minute sessions, not the standard ${STANDARD_SESSION_DURATION}, but has no rate set — so every invoice for ${c.name.split(" ")[0]} falls back to the standard rate.`,
      actionLabel: "Set rate",
      href: `/hub/clients/${c.client_number}`,
    });
  }

  const needCount = queue.length;
  const recentInvoices = allInvoices.slice(0, 7);

  return (
    <div className="max-w-[1120px] mx-auto">
      {/* Header — no avatar, this page has no single subject. */}
      <div className="mb-3.5">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <h1 className="m-0 text-[25px] font-bold tracking-tight text-[var(--color-ink)]">Finance</h1>
        </div>
        <p className="mt-1 mb-0 text-[13px] text-[var(--color-body)] max-w-[76ch]">
          Invoices you&rsquo;ve raised through the hub, and what the bank actually confirms. Most of Esther&rsquo;s
          clients pay her outside the app — this page cannot tell you who owes money, only what paperwork is open.
        </p>
      </div>

      {/* ── Needs you ── */}
      <div className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden mb-3.5">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Needs you</h2>
          <span className="text-xs text-[var(--color-muted)]">
            {needCount > 0 ? `${needCount} thing${needCount === 1 ? "" : "s"}` : "Nothing outstanding"}
          </span>
        </div>
        <div className="px-4 pb-3 pt-1">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 px-3 rounded-nested border border-transparent transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)]"
            >
              <span className={`w-[7px] h-[7px] rounded-pill shrink-0 mt-0.5 self-start ${DOT[item.tone]}`} />
              <span className="min-w-0 flex-1 text-[13.5px] text-[var(--color-ink)]">
                <b className="font-semibold">{item.headline}</b>
                <span className="block text-xs text-[var(--color-muted)] mt-px">{item.subline}</span>
              </span>
              <Link
                href={item.href}
                className="shrink-0 inline-flex items-center justify-center rounded-control border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] text-xs font-semibold no-underline transition-colors"
              >
                {item.actionLabel}
              </Link>
            </div>
          ))}

          {queue.length === 0 && (
            <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
              <span className="w-[7px] h-[7px] rounded-pill bg-[var(--status-success)] shrink-0" />
              <span>Nothing open. No draft or overdue invoices, no unconfirmed bank matches, and no missing rates.</span>
            </div>
          )}

          {queue.length > 0 && (
            <>
              <hr className="h-px bg-[var(--hub-border)] border-0 my-3" />
              <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
                <span className="w-[7px] h-[7px] rounded-pill bg-[var(--status-success)] shrink-0" />
                <span>
                  Nothing else open. Every other invoice on file is either confirmed paid by a matched bank line, or
                  has no due date yet to check against.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── The register ── */}
      <div className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden mb-3.5">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Invoices</h2>
          <span className="text-xs text-[var(--color-muted)]">
            {invoiceTotalCount > 0
              ? `Most recent ${recentInvoices.length} of ${invoiceTotalCount} on file`
              : "None raised yet"}
          </span>
        </div>

        {recentInvoices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-4 h-9">
                      Invoice
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-4 h-9">
                      Client
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-4 h-9">
                      Issued
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-4 h-9">
                      Due
                    </th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-4 h-9">
                      Amount
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-4 h-9">
                      Status
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-4 h-9" />
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-[var(--hub-border)] hover:bg-[var(--hub-hover)] transition-colors">
                      <td className="px-4 py-[10px] font-semibold text-foreground tabular-nums">
                        <Link href={`/hub/cashflow/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-[10px] text-foreground">{inv.clients?.name ?? "—"}</td>
                      <td className="px-4 py-[10px] text-muted-foreground tabular-nums">{fmtDate(inv.issue_date)}</td>
                      <td className="px-4 py-[10px] text-muted-foreground tabular-nums">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-[10px] text-right tabular-nums font-medium text-foreground">
                        {fmt(inv.total)}
                      </td>
                      <td className="px-4 py-[10px]">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-[10px]">
                        <Link
                          href={`/hub/cashflow/invoices/${inv.id}`}
                          className="text-[var(--color-teal)] hover:underline font-medium text-[13px]"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-[var(--hub-border)]">
              <Link href="/hub/cashflow/invoices" className="text-xs font-semibold text-[var(--color-rose)] hover:underline">
                See all {invoiceTotalCount} invoice{invoiceTotalCount === 1 ? "" : "s"} ›
              </Link>
            </div>
          </>
        ) : (
          <div className="px-4 py-6 text-[13px] text-[var(--color-body)]">
            No invoices raised through the hub yet.{" "}
            <Link href="/hub/cashflow/invoices/new" className="text-[var(--color-rose)] font-semibold hover:underline">
              Raise the first one
            </Link>
            .
          </div>
        )}
      </div>

      {/* ── Elsewhere in Finance ──
           Reconciliation, Bank transactions, Tax and Forecast are real,
           built tools — cut from the dashboard framing above, not from the
           hub. Plain links, not metrics, each carrying the one sentence
           that says what the tool is for. */}
      <div className="flex items-center gap-1.5 flex-wrap py-2.5 px-3 bg-white border border-[var(--hub-border)] rounded-nested shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)]">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-muted)] pr-1">
          Elsewhere
        </span>
        <Link href="/hub/cashflow/reconciliation" className="flex flex-col px-2.5 py-1.5 rounded-control hover:bg-[var(--hub-hover)] no-underline">
          <b className="text-[12.5px] font-semibold text-[var(--color-ink)]">Reconciliation</b>
          <span className="text-[11.5px] text-[var(--color-muted)]">Match bank lines to invoices by hand</span>
        </Link>
        <Link href="/hub/cashflow/transactions" className="flex flex-col px-2.5 py-1.5 rounded-control hover:bg-[var(--hub-hover)] no-underline">
          <b className="text-[12.5px] font-semibold text-[var(--color-ink)]">Bank transactions</b>
          <span className="text-[11.5px] text-[var(--color-muted)]">The imported statement, unmatched and matched</span>
        </Link>
        <Link href="/hub/cashflow/tax" className="flex flex-col px-2.5 py-1.5 rounded-control hover:bg-[var(--hub-hover)] no-underline">
          <b className="text-[12.5px] font-semibold text-[var(--color-ink)]">Tax</b>
          <span className="text-[11.5px] text-[var(--color-muted)]">An estimate, not advice — depends on categorised transactions</span>
        </Link>
        <Link href="/hub/cashflow/forecast" className="flex flex-col px-2.5 py-1.5 rounded-control hover:bg-[var(--hub-hover)] no-underline">
          <b className="text-[12.5px] font-semibold text-[var(--color-ink)]">Forecast</b>
          <span className="text-[11.5px] text-[var(--color-muted)]">Projected balance from a manually entered starting point</span>
        </Link>
      </div>
    </div>
  );
}
