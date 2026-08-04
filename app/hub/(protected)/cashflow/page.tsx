import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { HubPageHeader, HubCard, HubCardHeader, KpiTile, StatusBadge } from "@/components/hub";
import {
  IconFileText,
  IconClock,
  IconCheckCircle,
  IconCheckSquare,
  IconArrowUpRight,
  IconBarChart3,
  IconTriangleAlert,
  IconTrendUp,
  IconZap,
  IconPlus,
} from "@/components/icons";
import {
  findSuggestedMatches,
  type MatchTransaction,
  type MatchInvoice,
} from "@/lib/cashflow-matching";
import { computeForecast } from "@/lib/cashflow-forecast";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export default async function CashflowOverviewPage() {
  const supabase = createClient();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  const [invoicesRes, txnRes, candidateInvoicesRes, dismissedRes, recentRes] =
    await Promise.all([
      supabase.from("invoices").select("id, status, total, due_date, updated_at"),
      supabase
        .from("bank_transactions")
        .select("*")
        .is("matched_invoice_id", null),
      supabase
        .from("invoices")
        .select("*, clients(name, client_number, display_code)")
        .in("status", ["sent", "overdue"]),
      supabase.from("dismissed_matches").select("bank_transaction_id, invoice_id"),
      supabase
        .from("invoices")
        .select("*, clients(name, client_number, display_code)")
        .order("updated_at", { ascending: false })
        .limit(7),
    ]);

  const allInvoices = (invoicesRes.data ?? []) as Array<{
    id: string;
    status: string;
    total: number;
    due_date: string;
    updated_at: string;
  }>;

  const outstandingTotal = allInvoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.total, 0);

  const overdueTotal = allInvoices
    .filter(
      (inv) =>
        inv.status === "overdue" ||
        (inv.status === "sent" && inv.due_date < today),
    )
    .reduce((sum, inv) => sum + inv.total, 0);

  // NOTE: paid_this_month uses updated_at as a proxy for payment date.
  // There is no dedicated paid_at column, so an invoice edited after being
  // paid (e.g. a note added) could still appear here incorrectly.
  const paidThisMonth = allInvoices
    .filter(
      (inv) =>
        inv.status === "paid" &&
        inv.updated_at >= monthStart &&
        inv.updated_at <= `${monthEnd}T23:59:59`,
    )
    .reduce((sum, inv) => sum + inv.total, 0);

  // Pending reconciliation: count unmatched bank_transactions that have at
  // least one suggested match, using the same matching heuristic as the
  // reconciliation suggestions API.
  const unmatchedTxns = (txnRes.data ?? []) as MatchTransaction[];
  const candidateInvoices = (candidateInvoicesRes.data ?? []) as (MatchInvoice & {
    clients: { name: string; client_number: number; display_code: string } | null;
  })[];
  const dismissedSet = new Set(
    (dismissedRes.data ?? []).map(
      (d: { bank_transaction_id: string; invoice_id: string }) =>
        `${d.bank_transaction_id}::${d.invoice_id}`,
    ),
  );

  const suggestionPairs = findSuggestedMatches({
    transactions: unmatchedTxns,
    invoices: candidateInvoices,
    dismissedSet,
  });
  const pendingReconCount = suggestionPairs.length;

  const recentInvoices = (recentRes.data ?? []) as Array<{
    id: string;
    invoice_number: string;
    status: string;
    total: number;
    issue_date: string;
    updated_at: string;
    clients: { name: string; client_number: number; display_code: string } | null;
  }>;

  const [{ data: taxCalcRaw }, forecast] = await Promise.all([
    supabase
      .from("tax_calculations")
      .select("*")
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    computeForecast(),
  ]);

  const taxCalc = taxCalcRaw as {
    tax_year: string;
    total_tax_due: number;
    taxable_profit: number;
  } | null;

  const forecastClosingBalance =
    forecast.projection.length > 2 ? forecast.projection[2].closing : null;

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Cashflow"
        subtitle={`Outstanding, overdue, paid, and reconciliation — ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
      />

      {/* KPI band */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={<IconFileText className="w-5 h-5" />}
          label="Outstanding"
          value={formatCurrency(outstandingTotal)}
          statusToken="warning"
        />
        <KpiTile
          icon={<IconClock className="w-5 h-5" />}
          label="Overdue"
          value={formatCurrency(overdueTotal)}
          statusToken={overdueTotal > 0 ? "danger" : "success"}
        />
        <KpiTile
          icon={<IconCheckCircle className="w-5 h-5" />}
          label="Paid this month"
          value={formatCurrency(paidThisMonth)}
          statusToken="success"
        />
        <KpiTile
          icon={<IconCheckSquare className="w-5 h-5" />}
          label="Pending reconciliation"
          value={pendingReconCount}
          statusToken={pendingReconCount > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-[18px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        {/* Recent activity — left column */}
        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconBarChart3 className="w-4 h-4" />}
            title="Recent activity"
            subtitle="Last 7 invoices by last update"
            color="navy"
            divider
            className="px-5 pt-5 pb-3.5"
          />
          <div className="px-5 pb-5">
            {recentInvoices.length > 0 ? (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">
                        Invoice
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">
                        Client
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">
                        Total
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">
                        Status
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">
                        Updated
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10 w-10">
                        &nbsp;
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv) => {
                      const initials = (inv.clients?.name ?? "??")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                        <tr
                          key={inv.id}
                          className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors"
                        >
                          <td className="px-5 py-3">
                            <span className="font-semibold text-foreground font-mono text-[13px]">
                              {inv.invoice_number}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="inline-flex items-center gap-2.5 min-w-0">
                              <span className="w-7 h-7 rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] grid place-items-center text-[11px] font-bold shrink-0">
                                {initials}
                              </span>
                              <span className="text-muted-foreground truncate">
                                {inv.clients?.name ?? "Unknown client"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-semibold tabular-nums text-foreground">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(inv.updated_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3">
                            <Link
                              href={`/hub/cashflow/invoices/${inv.id}`}
                              className="inline-flex items-center text-muted-foreground hover:text-rose transition-colors"
                            >
                              <IconArrowUpRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground pt-5 pb-1">
                No invoices yet — create one to see activity here.
              </p>
            )}
          </div>
        </HubCard>

        {/* Right rail — Tax, Forecast, Quick actions */}
        <div className="flex flex-col gap-[18px]">
          {/* Tax estimate */}
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconTriangleAlert className="w-4 h-4" />}
              title="Tax estimate"
              subtitle={`Tax year ${taxCalc?.tax_year ?? "—"}`}
              color="amber"
              action={
                <Link
                  href="/hub/cashflow/tax"
                  className="text-xs font-semibold text-rose hover:underline shrink-0"
                >
                  Details
                </Link>
              }
              divider
              className="px-5 pt-5 pb-3.5"
            />
            {taxCalc ? (
              <>
                <div className="px-5 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Income Tax + NIC
                  </p>
                  <p className="text-[26px] font-bold text-foreground tabular-nums leading-tight">
                    {formatCurrency(taxCalc.total_tax_due)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    On {formatCurrency(taxCalc.taxable_profit)} profit to date (income minus categorised expenses)
                  </p>
                </div>
                <div className="flex gap-2 items-start text-[11.5px] leading-[1.5] text-muted-foreground px-5 py-3 mt-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
                  <IconTriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px text-amber" />
                  <span>Estimate only — not a substitute for an accountant. Accuracy depends on real bank imports and categorised transactions.</span>
                </div>
              </>
            ) : (
              <div className="px-5 pb-5 pt-2">
                <p className="text-sm text-muted-foreground">
                  No tax estimate calculated yet —{" "}
                  <Link href="/hub/cashflow/tax" className="text-rose hover:underline font-medium">
                    visit Tax to generate one
                  </Link>
                  .
                </p>
              </div>
            )}
          </HubCard>

          {/* Cash flow forecast */}
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconTrendUp className="w-4 h-4" />}
              title="Cash flow forecast"
              subtitle="Next few months"
              color="teal"
              action={
                <Link
                  href="/hub/cashflow/forecast"
                  className="text-xs font-semibold text-rose hover:underline shrink-0"
                >
                  Details
                </Link>
              }
              divider
              className="px-5 pt-5 pb-3.5"
            />
            {forecast.hasSettings && forecastClosingBalance !== null ? (
              <>
                <div className="px-5 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Projected balance, 3 months out
                  </p>
                  <p className="text-[22px] font-bold text-foreground tabular-nums leading-tight">
                    {formatCurrency(forecastClosingBalance)}
                  </p>
                </div>
                <div className="flex gap-2 items-start text-[11.5px] leading-[1.5] text-muted-foreground px-5 py-3 mt-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
                  <IconTriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px text-amber" />
                  <span>Estimate only. Built from unpaid invoices, pending bills and a manually entered starting balance — not a live bank feed.</span>
                </div>
              </>
            ) : (
              <div className="px-5 pb-5 pt-2">
                <p className="text-sm text-muted-foreground">
                  Enter your current bank balance first —{" "}
                  <Link href="/hub/cashflow/forecast" className="text-rose hover:underline font-medium">
                    visit Forecast to set it up
                  </Link>
                  .
                </p>
              </div>
            )}
          </HubCard>

          {/* Quick actions */}
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconZap className="w-4 h-4" />}
              title="Quick actions"
              color="slate"
              divider
              className="px-5 pt-5 pb-3.5"
            />
            <div className="flex flex-col">
              <Link
                href="/hub/cashflow/invoices"
                className="flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors"
              >
                <IconPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                New invoice
              </Link>
              <Link
                href="/hub/cashflow/transactions"
                className="flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors border-t border-[var(--hub-border)]"
              >
                <IconArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 rotate-90" />
                Import bank statement
              </Link>
              <Link
                href="/hub/cashflow/reconciliation"
                className="flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors border-t border-[var(--hub-border)]"
              >
                <IconCheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                Review reconciliation
              </Link>
            </div>
          </HubCard>
        </div>
      </div>
    </div>
  );
}
