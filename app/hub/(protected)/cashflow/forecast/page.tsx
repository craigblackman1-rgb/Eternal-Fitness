import { computeForecast } from "@/lib/cashflow-forecast";
import { HubPageHeader, HubCard } from "@/components/hub";
import { IconTrendUp, IconTriangleAlert } from "@/components/icons";
import { ForecastChart } from "./ForecastChart";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export default async function ForecastPage() {
  const forecast = await computeForecast();

  if (!forecast.hasSettings) {
    return (
      <div className="space-y-6">
        <HubPageHeader
          title="Cash flow forecast"
          subtitle="What's coming in and going out over the next 12 months — built from unpaid invoices, pending bills, your current balance, and the tax estimate held back as a reserve."
        />
        <HubCard>
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground mb-4">
              Enter your current bank balance to generate a forecast.
            </p>
            <p className="text-xs text-muted-foreground mb-0">
              There&rsquo;s no live bank connection — update your balance manually whenever you want a fresh forecast.
            </p>
          </div>
        </HubCard>
      </div>
    );
  }

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Cash flow forecast"
        subtitle="What's coming in and going out over the next 12 months — built from unpaid invoices, pending bills, your current balance, and the tax estimate held back as a reserve."
      />

      {/* Assumptions */}
      <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-3">
        <div className="assum bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[14px] p-[14px_16px] shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted-text)] m-0 mb-1">
            Current bank balance
          </p>
          <p className="text-lg font-bold text-[var(--color-ink)] tabular-nums m-0">
            {formatCurrency(forecast.currentBalance)}
          </p>
          <p className="text-[11.5px] text-[var(--color-muted-text)] mt-1 m-0">
            Manually entered · updated {todayStr}
          </p>
        </div>
        <div className="assum bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[14px] p-[14px_16px] shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted-text)] m-0 mb-1">
            Less: tax reserve held back
          </p>
          <p className="text-lg font-bold text-[var(--color-ink)] tabular-nums m-0">
            –{formatCurrency(forecast.taxReserve)}
          </p>
          <p className="text-[11.5px] text-[var(--color-muted-text)] mt-1 m-0">
            From the Tax estimate
          </p>
        </div>
        <div className="assum bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[14px] p-[14px_16px] shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted-text)] m-0 mb-1">
            Effective starting balance
          </p>
          <p className="text-lg font-bold text-[var(--color-ink)] tabular-nums m-0">
            {formatCurrency(forecast.startingBalance)}
          </p>
          <p className="text-[11.5px] text-[var(--color-muted-text)] mt-1 m-0">
            {forecast.balanceAsOf
              ? new Date(forecast.balanceAsOf + "T00:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : todayStr}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex gap-3 rounded-[14px] p-[15px_18px] text-[12.5px] leading-relaxed bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)]">
        <IconTriangleAlert className="w-[18px] h-[18px] shrink-0 text-[var(--status-warning)] mt-px" />
        <div>
          <b className="text-[var(--color-ink)]">Estimate only — not a substitute for an accountant.</b>{" "}
          There&rsquo;s no live bank connection, so this forecast is only as good as the balance above, which you&rsquo;ll need to keep updating by hand. Income and expenses are drawn from unpaid invoices and pending bills already in the Hub — not a sales pipeline.
        </div>
      </div>

      {/* Chart */}
      <ForecastChart projection={forecast.projection} />

      {/* Table */}
      <HubCard padded={false}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted-text)] bg-[var(--hub-hover)] px-[18px] h-10 border-b border-[var(--hub-border)]">
                Month
              </th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted-text)] bg-[var(--hub-hover)] px-[18px] h-10 border-b border-[var(--hub-border)]">
                Opening
              </th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted-text)] bg-[var(--hub-hover)] px-[18px] h-10 border-b border-[var(--hub-border)]">
                Income
              </th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted-text)] bg-[var(--hub-hover)] px-[18px] h-10 border-b border-[var(--hub-border)]">
                Expenses
              </th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted-text)] bg-[var(--hub-hover)] px-[18px] h-10 border-b border-[var(--hub-border)]">
                Closing
              </th>
            </tr>
          </thead>
          <tbody>
            {forecast.projection.map((m) => {
              const isNegative = m.closing < 0;
              return (
                <tr
                  key={m.key}
                  className={
                    isNegative
                      ? "bg-[var(--status-danger-bg)]"
                      : "border-b border-[var(--hub-border)] last:border-0"
                  }
                >
                  <td className="px-[18px] py-[11px] border-b border-[var(--hub-border)] align-middle">
                    <span className="font-semibold text-[var(--color-ink)]">{m.label}</span>
                    {isNegative && (
                      <span className="inline-flex items-center gap-[5px] text-[10.5px] font-bold uppercase tracking-[0.04em] text-[var(--status-danger)] bg-white border border-[var(--status-danger)] rounded-full px-2 py-0.5 ml-2">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                          <path d="M12 9v4M12 17h.01" />
                        </svg>
                        Goes negative
                      </span>
                    )}
                  </td>
                  <td className="tabular-nums text-right whitespace-nowrap px-[18px] py-[11px] border-b border-[var(--hub-border)] text-[var(--color-body)] align-middle">
                    {formatCurrency(m.opening)}
                  </td>
                  <td className="tabular-nums text-right whitespace-nowrap px-[18px] py-[11px] border-b border-[var(--hub-border)] text-[var(--color-teal)] align-middle">
                    +{formatCurrency(m.income)}
                  </td>
                  <td className="tabular-nums text-right whitespace-nowrap px-[18px] py-[11px] border-b border-[var(--hub-border)] text-[var(--color-ink)] align-middle">
                    –{formatCurrency(m.expenses)}
                  </td>
                  <td
                    className={`tabular-nums text-right whitespace-nowrap font-bold px-[18px] py-[11px] border-b border-[var(--hub-border)] align-middle ${
                      isNegative ? "text-[var(--status-danger)]" : "text-[var(--color-ink)]"
                    }`}
                  >
                    {formatCurrency(m.closing)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </HubCard>
    </div>
  );
}
