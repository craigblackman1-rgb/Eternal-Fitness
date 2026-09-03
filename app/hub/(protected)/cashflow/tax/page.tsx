import { createClient } from "@/lib/supabase-server";
import { HubPageHeader, HubCard, HubCardHeader } from "@/components/hub";
import {
  IconBarChart3,
  IconFileText,
  IconShieldCheck,
  IconTriangleAlert,
} from "@/components/icons";
import { currentTaxYear, getTaxYearBounds } from "@/lib/cashflow-tax";
import { RecalculateButton } from "./RecalculateButton";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  studio_rent: "Studio Rent",
  equipment: "Equipment",
  insurance: "Insurance",
  software: "Software",
  marketing: "Marketing",
  professional_fees: "Professional Fees",
  other: "Other",
};

interface TaxCalcRow {
  tax_year: string;
  period_type: string;
  period_start: string;
  period_end: string;
  total_income: number;
  invoice_income: number;
  other_income: number;
  total_expenses: number;
  studio_rent_expenses: number;
  equipment_expenses: number;
  insurance_expenses: number;
  software_expenses: number;
  marketing_expenses: number;
  professional_fees_expenses: number;
  other_expenses: number;
  taxable_profit: number;
  basic_rate_tax: number;
  higher_rate_tax: number;
  total_income_tax: number;
  class2_weeks: number;
  class2_nic: number;
  class4_nic: number;
  total_nic: number;
  total_tax_due: number;
  payments_made: number;
  balance_due: number;
  calculated_at: string;
}

export default async function TaxPage() {
  const supabase = createClient();
  const taxYear = currentTaxYear();
  const bounds = getTaxYearBounds(taxYear);

  const { data: calc } = await supabase
    .from("tax_calculations")
    .select("*")
    .eq("tax_year", taxYear)
    .eq("period_type", "annual")
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const calculation = calc as TaxCalcRow | null;

  const expenseCategories = [
    { key: "studio_rent_expenses", label: EXPENSE_CATEGORY_LABELS.studio_rent },
    { key: "equipment_expenses", label: EXPENSE_CATEGORY_LABELS.equipment },
    { key: "insurance_expenses", label: EXPENSE_CATEGORY_LABELS.insurance },
    { key: "software_expenses", label: EXPENSE_CATEGORY_LABELS.software },
    { key: "marketing_expenses", label: EXPENSE_CATEGORY_LABELS.marketing },
    { key: "professional_fees_expenses", label: EXPENSE_CATEGORY_LABELS.professional_fees },
    { key: "other_expenses", label: EXPENSE_CATEGORY_LABELS.other },
  ] as const;

  const periodStart = new Date(bounds.periodStart + "T00:00:00");
  const periodEnd = new Date(bounds.periodEnd + "T00:00:00");
  const dateRangeLabel = `${periodStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${periodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-5">
      <HubPageHeader
        title="Tax estimate"
        subtitle="Income Tax and National Insurance for the current UK tax year, calculated from categorised income and expenses."
        actions={<RecalculateButton taxYear={taxYear} />}
      />

      {/* Disclaimer */}
      <div
        data-od-id="tax-disclaimer"
        className="flex gap-3 rounded-[14px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4 text-[13px] leading-relaxed"
      >
        <IconTriangleAlert className="w-[18px] h-[18px] shrink-0 text-[var(--status-warning-text)] mt-px" />
        <div>
          <b className="text-[var(--color-ink)]">Estimate only — not a substitute for an accountant.</b>{" "}
          This figure is only as accurate as your categorised bank transactions and invoices. No real HSBC import has landed yet for every month, so treat this as directional until a full tax year of real data is in.
        </div>
      </div>

      {!calculation ? (
        <HubCard padded>
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground mb-4">
              No tax calculation yet for {taxYear}.
            </p>
            <p className="text-xs text-muted-foreground mb-0">
              Click &ldquo;Recalculate&rdquo; above to generate the first estimate — this pulls
              income and categorised expenses from imported bank transactions.
            </p>
          </div>
        </HubCard>
      ) : (
        <>
          {/* Headline */}
          <div
            data-od-id="tax-headline"
            className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[20px] shadow-sm p-7 flex items-center justify-between gap-5 flex-wrap"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.06em] text-[var(--color-muted-text)] m-0 mb-1.5">
                Estimated total due — tax year {taxYear}
              </p>
              <p className="text-[40px] font-bold text-[var(--color-ink)] m-0 tabular-nums tracking-[-.02em] leading-none">
                {formatCurrency(calculation.total_tax_due)}
              </p>
              <p className="text-[13px] text-[var(--color-body)] mt-1.5 m-0">
                {dateRangeLabel} · based on {formatCurrency(calculation.taxable_profit)} taxable profit to date
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.05em] text-[var(--status-warning-text)] bg-white border border-[var(--status-warning-border)] rounded-full px-3 py-1.5 shrink-0">
              <IconTriangleAlert className="w-3 h-3" />
              Estimate
            </span>
          </div>

          {/* Income & expenses card */}
          <HubCard
            data-od-id="income-expense-card"
            padded={false}
          >
            <HubCardHeader
              icon={<IconBarChart3 className="w-4 h-4" />}
              title="Income &amp; expenses"
              subtitle="From categorised invoices &amp; bank transactions this tax year"
              color="teal"
              divider
              className="px-5 pt-4 pb-3.5"
            />
            <div className="px-5 pb-4">
              <Row label="Training income" value={formatCurrency(calculation.total_income)} />

              {(() => {
                const activeCategories = expenseCategories
                  .filter(({ key }) => (calculation as unknown as Record<string, number>)[key] > 0)
                  .map(({ label }) => label);
                const catList = activeCategories.length > 0
                  ? activeCategories.join(", ")
                  : "None";
                return (
                  <Row
                    label="Allowable expenses"
                    detail={catList}
                    value={`–${formatCurrency(calculation.total_expenses)}`}
                    valueClass="text-[var(--color-teal)]"
                  />
                );
              })()}

              <RowTotal label="Taxable profit" value={formatCurrency(calculation.taxable_profit)} />
            </div>
          </HubCard>

          {/* Income Tax card */}
          <HubCard
            data-od-id="income-tax-card"
            padded={false}
          >
            <HubCardHeader
              icon={<IconFileText className="w-4 h-4" />}
              title="Income Tax"
              subtitle={`${taxYear} bands — personal allowance £12,570, basic rate 20% to £50,270`}
              color="amber"
              divider
              className="px-5 pt-4 pb-3.5"
            />
            <div className="px-5 pb-4">
              <div className="grid grid-cols-3 gap-3 mb-1.5">
                <BandTile
                  label="Personal allowance"
                  value="£12,570"
                  sub="Taxed at 0%"
                />
                <BandTile
                  label="Basic rate portion"
                  value={formatCurrency(
                    Math.min(Math.max(0, calculation.taxable_profit - 12570), 37700),
                  )}
                  sub="Taxed at 20%"
                />
                <BandTile
                  label="Higher rate portion"
                  value={formatCurrency(
                    Math.max(0, calculation.taxable_profit - 50270),
                  )}
                  sub={calculation.taxable_profit > 50270 ? "Taxed at 40%" : "Not reached this year"}
                />
              </div>
              <RowTotal label="Income Tax due" value={formatCurrency(calculation.total_income_tax)} />
            </div>
          </HubCard>

          {/* National Insurance card */}
          <HubCard
            data-od-id="nic-card"
            padded={false}
          >
            <HubCardHeader
              icon={<IconShieldCheck className="w-4 h-4" />}
              title="National Insurance"
              subtitle="Class 2 + Class 4, self-employed"
              color="rose"
              divider
              className="px-5 pt-4 pb-3.5"
            />
            <div className="px-5 pb-4">
              <Row
                label="Class 2 NIC"
                detail="£3.45 / week — flat rate, payable once profit clears the personal allowance"
                value={formatCurrency(calculation.class2_nic)}
              />
              <Row
                label="Class 4 NIC — main band"
                detail="6% on profit between £12,570 and £50,270"
                value={formatCurrency(calculation.class4_nic)}
              />
              <Row
                label="Class 4 NIC — additional band"
                detail="2% on profit above £50,270"
                value="£0.00"
              />
              <RowTotal label="NIC due" value={formatCurrency(calculation.total_nic)} />
            </div>
          </HubCard>

          {/* Total card */}
          <HubCard
            data-od-id="total-card"
            padded={false}
          >
            <div className="px-5 pt-4 pb-4">
              <div className="flex items-baseline justify-between py-2.5 px-0 bg-[var(--hub-hover)] -mx-5 px-5 text-[13.5px]">
                <span className="text-[var(--color-body)]">Income Tax</span>
                <span className="font-semibold text-[var(--color-ink)] tabular-nums whitespace-nowrap">
                  {formatCurrency(calculation.total_income_tax)}
                </span>
              </div>
              <Row label="Class 2 + Class 4 NIC" value={formatCurrency(calculation.total_nic)} />
              <RowTotal label="Estimated total due" value={formatCurrency(calculation.total_tax_due)} />
            </div>
          </HubCard>
        </>
      )}

      {/* Footnote */}
      <p className="text-xs text-[var(--color-muted-text)] text-center mt-1.5">
        No VAT applied — Esther is not VAT-registered. Rates shown are the {taxYear} tax year and are updated by hand each April.
      </p>
    </div>
  );
}

/* ── Shared card row primitives ── */

function Row({
  label,
  detail,
  value,
  valueClass,
}: {
  label: string;
  detail?: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-2.5 text-[13.5px] border-t border-[var(--hub-border)] first:border-t-0">
      <span className="text-[var(--color-body)]">
        {label}
        {detail && (
          <span className="block text-[11.5px] text-[var(--color-muted-text)] mt-0.5">{detail}</span>
        )}
      </span>
      <span className={`font-semibold text-[var(--color-ink)] tabular-nums whitespace-nowrap ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

function RowTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between pt-3.5 pb-0 text-[15px] border-t-2 border-[var(--color-ink)]">
      <span className="font-bold text-[var(--color-ink)]">{label}</span>
      <span className="font-bold text-[var(--color-ink)] tabular-nums whitespace-nowrap">{value}</span>
    </div>
  );
}

function BandTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border border-[var(--hub-border)] rounded-[12px] p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[.05em] text-[var(--color-muted-text)] m-0 mb-1.5">{label}</p>
      <p className="text-lg font-bold text-[var(--color-ink)] m-0 tabular-nums">{value}</p>
      <p className="text-[11.5px] text-[var(--color-muted-text)] mt-1 m-0">{sub}</p>
    </div>
  );
}
