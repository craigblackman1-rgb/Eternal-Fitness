import { createClient } from "@/lib/supabase-server";
import { HubPageHeader, HubCard, HubCardHeader, KpiTile } from "@/components/hub";
import {
  IconBarChart3,
  IconFileText,
  IconPencil,
  IconCheckCircle,
  IconTarget,
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

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Tax liability"
        subtitle={`${taxYear} tax year (${new Date(bounds.periodStart + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} — ${new Date(bounds.periodEnd + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })})`}
        actions={<RecalculateButton taxYear={taxYear} />}
      />

      {!calculation ? (
        <HubCard>
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
          {/* Summary KPI band */}
          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            <KpiTile
              icon={<IconTarget className="w-5 h-5" />}
              label="Taxable profit"
              value={formatCurrency(calculation.taxable_profit)}
              statusToken="primary"
            />
            <KpiTile
              icon={<IconFileText className="w-5 h-5" />}
              label="Total tax due"
              value={formatCurrency(calculation.total_tax_due)}
              statusToken={calculation.total_tax_due > 0 ? "warning" : "success"}
            />
            <KpiTile
              icon={<IconCheckCircle className="w-5 h-5" />}
              label="Payments made"
              value={formatCurrency(calculation.payments_made)}
              statusToken={calculation.payments_made > 0 ? "success" : "neutral"}
            />
            <KpiTile
              icon={<IconTriangleAlert className="w-5 h-5" />}
              label="Balance due"
              value={formatCurrency(calculation.balance_due)}
              statusToken={calculation.balance_due > 0 ? "danger" : "success"}
            />
          </div>

          {/* Income breakdown */}
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconTarget className="w-4 h-4" />}
              title="Income"
              subtitle={`Total income received in the ${taxYear} tax year`}
              color="teal"
              divider
              className="px-5 pt-5 pb-3.5"
            />
            <div className="px-5 pb-5">
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">
                        Source
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--hub-border)] last:border-0">
                      <td className="px-5 py-3 font-medium">Invoice payments</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatCurrency(calculation.invoice_income)}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--hub-border)] last:border-0">
                      <td className="px-5 py-3 font-medium">Other income</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatCurrency(calculation.other_income)}
                      </td>
                    </tr>
                    <tr className="bg-[var(--hub-hover)]">
                      <td className="px-5 py-3 font-semibold">Total income</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold">
                        {formatCurrency(calculation.total_income)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </HubCard>

          {/* Expense breakdown */}
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconPencil className="w-4 h-4" />}
              title="Allowable expenses"
              subtitle="Categorised from imported bank transactions"
              color="amber"
              divider
              className="px-5 pt-5 pb-3.5"
            />
            <div className="px-5 pb-5">
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">
                        Category
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseCategories.map(({ key, label }) => {
                      const value = (calculation as unknown as Record<string, number>)[key] || 0;
                      if (value === 0) return null;
                      return (
                        <tr
                          key={key}
                          className="border-b border-[var(--hub-border)] last:border-0"
                        >
                          <td className="px-5 py-3 font-medium">{label}</td>
                          <td className="px-5 py-3 text-right tabular-nums">
                            {formatCurrency(value)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[var(--hub-hover)]">
                      <td className="px-5 py-3 font-semibold">Total expenses</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold">
                        {formatCurrency(calculation.total_expenses)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </HubCard>

          {/* Tax breakdown */}
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconBarChart3 className="w-4 h-4" />}
              title="Tax calculation"
              subtitle="2025-26 UK rates — Income Tax + Class 2 & 4 National Insurance"
              color="navy"
              divider
              className="px-5 pt-5 pb-3.5"
            />
            <div className="px-5 pb-5">
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">
                        Component
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--hub-border)]">
                      <td className="px-5 py-3 text-muted-foreground text-xs" colSpan={2}>
                        Taxable profit = {formatCurrency(calculation.total_income)} income −{" "}
                        {formatCurrency(calculation.total_expenses)} expenses ={" "}
                        {formatCurrency(calculation.taxable_profit)}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--hub-border)]">
                      <td className="px-5 py-3 pl-8 font-medium">
                        Basic rate (20% on first £50,270 above allowance)
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatCurrency(calculation.basic_rate_tax)}
                      </td>
                    </tr>
                    {calculation.higher_rate_tax > 0 && (
                      <tr className="border-b border-[var(--hub-border)]">
                        <td className="px-5 py-3 pl-8 font-medium">
                          Higher rate (40% on profit above £50,270)
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {formatCurrency(calculation.higher_rate_tax)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                      <td className="px-5 py-3 pl-8 font-semibold">Total Income Tax</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold">
                        {formatCurrency(calculation.total_income_tax)}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--hub-border)]">
                      <td className="px-5 py-3 pl-8 font-medium">
                        Class 2 NIC ({calculation.class2_weeks} weeks × £3.45)
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatCurrency(calculation.class2_nic)}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--hub-border)]">
                      <td className="px-5 py-3 pl-8 font-medium">
                        Class 4 NIC (6% + 2% above £50,270)
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatCurrency(calculation.class4_nic)}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                      <td className="px-5 py-3 pl-8 font-semibold">Total NIC</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold">
                        {formatCurrency(calculation.total_nic)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-bold text-[14px]">
                        Total tax + NIC due
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-[14px]">
                        {formatCurrency(calculation.total_tax_due)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </HubCard>
        </>
      )}

      {/* Disclaimer */}
      <div className="rounded-[16px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4 text-[13px] text-[var(--status-warning-text)]">
        <p className="font-semibold mb-1">Estimate only</p>
        <p>
          This is not a substitute for a qualified accountant. Based on 2025-26 UK rates;
          these change every tax year. Figures are only as accurate as imported and categorised
          bank transactions.
        </p>
      </div>
    </div>
  );
}
