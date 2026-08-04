import { supabase } from "@/lib/supabase";

const PERSONAL_ALLOWANCE = 12570;
const BASIC_RATE_LIMIT = 50270;
const BASIC_RATE = 0.2;
const HIGHER_RATE = 0.4;
const CLASS2_RATE_PER_WEEK = 3.45;
const CLASS4_MAIN_RATE = 0.06;
const CLASS4_ADDITIONAL_RATE = 0.02;

export interface TaxYearBounds {
  periodStart: string;
  periodEnd: string;
  nextTaxYearStart: string;
}

export interface TaxCalcData {
  totalIncome: number;
  invoiceIncome: number;
  otherIncome: number;
  totalExpenses: number;
  expenseBreakdown: Record<string, number>;
}

export interface TaxCalcResult extends TaxCalcData {
  taxableProfit: number;
  basicRateTax: number;
  higherRateTax: number;
  totalIncomeTax: number;
  class2Weeks: number;
  class2Nic: number;
  class4Nic: number;
  totalNic: number;
  totalTaxDue: number;
}

export function currentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month < 4 || (month === 4 && now.getDate() < 6)) {
    return `${year - 1}-${String(year).slice(2)}`;
  }
  return `${year}-${String(year + 1).slice(2)}`;
}

export function getTaxYearBounds(taxYear: string): TaxYearBounds {
  const [startYear, shortEnd] = taxYear.split("-");
  const periodStart = `${startYear}-04-06`;
  const periodEnd = `${startYear.slice(0, 2)}${shortEnd}-04-05`;
  const nextTaxYearStart = `${parseInt(startYear) + 1}-04-06`;
  return { periodStart, periodEnd, nextTaxYearStart };
}

function round2dp(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateTaxLiability(data: TaxCalcData): TaxCalcResult {
  const { totalIncome, invoiceIncome, otherIncome, totalExpenses, expenseBreakdown } = data;
  const taxableProfit = round2dp(totalIncome - totalExpenses);

  let basicRateTax = 0;
  let higherRateTax = 0;

  if (taxableProfit > PERSONAL_ALLOWANCE) {
    const taxableAfterAllowance = taxableProfit - PERSONAL_ALLOWANCE;
    if (taxableAfterAllowance <= BASIC_RATE_LIMIT) {
      basicRateTax = round2dp(taxableAfterAllowance * BASIC_RATE);
    } else {
      basicRateTax = round2dp(BASIC_RATE_LIMIT * BASIC_RATE);
      higherRateTax = round2dp((taxableAfterAllowance - BASIC_RATE_LIMIT) * HIGHER_RATE);
    }
  }

  const totalIncomeTax = round2dp(basicRateTax + higherRateTax);

  const class2Weeks = taxableProfit > PERSONAL_ALLOWANCE ? 52 : 0;
  const class2Nic = round2dp(class2Weeks * CLASS2_RATE_PER_WEEK);

  let class4Nic = 0;
  if (taxableProfit > PERSONAL_ALLOWANCE) {
    const mainBand = Math.min(taxableProfit - PERSONAL_ALLOWANCE, BASIC_RATE_LIMIT);
    const additionalBand = Math.max(0, taxableProfit - PERSONAL_ALLOWANCE - BASIC_RATE_LIMIT);
    class4Nic = round2dp(mainBand * CLASS4_MAIN_RATE + additionalBand * CLASS4_ADDITIONAL_RATE);
  }

  const totalNic = round2dp(class2Nic + class4Nic);
  const totalTaxDue = round2dp(totalIncomeTax + totalNic);

  return {
    totalIncome,
    invoiceIncome,
    otherIncome,
    totalExpenses,
    expenseBreakdown,
    taxableProfit,
    basicRateTax,
    higherRateTax,
    totalIncomeTax,
    class2Weeks,
    class2Nic,
    class4Nic,
    totalNic,
    totalTaxDue,
  };
}

export async function calculateAndStoreTax(taxYear: string): Promise<{
  calculation: TaxCalcResult & { balanceDue: number; paymentsMade: number };
  stored: boolean;
}> {
  const bounds = getTaxYearBounds(taxYear);

  const [txnRes, paymentRes] = await Promise.all([
    supabase
      .from("bank_transactions")
      .select("amount, income_category, expense_category")
      .gte("txn_date", bounds.periodStart)
      .lt("txn_date", bounds.nextTaxYearStart)
      .eq("is_excluded", false),
    supabase
      .from("tax_payments")
      .select("amount")
      .eq("tax_year", taxYear),
  ]);

  const transactions: { amount: number; income_category: string | null; expense_category: string | null }[] =
    (txnRes.data ?? []) as unknown as { amount: number; income_category: string | null; expense_category: string | null }[];

  const totalIncome = transactions
    .filter((t) => Number(t.amount) > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const invoiceIncome = transactions
    .filter((t) => t.income_category === "invoice_payment")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const otherIncome = round2dp(totalIncome - invoiceIncome);

  const expenses = transactions.filter((t) => Number(t.amount) < 0);
  let totalExpenses = 0;
  const expenseBreakdown: Record<string, number> = {
    studio_rent: 0,
    equipment: 0,
    insurance: 0,
    software: 0,
    marketing: 0,
    professional_fees: 0,
    other: 0,
  };

  for (const t of expenses) {
    const cat = t.expense_category || "other";
    const amount = Math.abs(Number(t.amount));
    totalExpenses += amount;
    expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amount;
  }

  for (const key of Object.keys(expenseBreakdown)) {
    expenseBreakdown[key] = round2dp(expenseBreakdown[key]);
  }

  const calc = calculateTaxLiability({
    totalIncome: round2dp(totalIncome),
    invoiceIncome: round2dp(invoiceIncome),
    otherIncome: round2dp(otherIncome),
    totalExpenses: round2dp(totalExpenses),
    expenseBreakdown,
  });

  const paymentsData: { amount: number }[] = (paymentRes.data ?? []) as unknown as { amount: number }[];
  const paymentsMade = paymentsData.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(0, round2dp(calc.totalTaxDue - paymentsMade));

  await supabase
    .from("tax_calculations")
    .delete()
    .eq("tax_year", taxYear)
    .eq("period_type", "annual")
    .eq("period_start", bounds.periodStart)
    .eq("period_end", bounds.periodEnd);

  const { error } = await supabase.from("tax_calculations").insert({
    tax_year: taxYear,
    period_type: "annual",
    period_start: bounds.periodStart,
    period_end: bounds.periodEnd,
    total_income: calc.totalIncome,
    invoice_income: calc.invoiceIncome,
    other_income: calc.otherIncome,
    total_expenses: calc.totalExpenses,
    studio_rent_expenses: expenseBreakdown.studio_rent,
    equipment_expenses: expenseBreakdown.equipment,
    insurance_expenses: expenseBreakdown.insurance,
    software_expenses: expenseBreakdown.software,
    marketing_expenses: expenseBreakdown.marketing,
    professional_fees_expenses: expenseBreakdown.professional_fees,
    other_expenses: expenseBreakdown.other,
    taxable_profit: calc.taxableProfit,
    basic_rate_tax: calc.basicRateTax,
    higher_rate_tax: calc.higherRateTax,
    total_income_tax: calc.totalIncomeTax,
    class2_weeks: calc.class2Weeks,
    class2_nic: calc.class2Nic,
    class4_nic: calc.class4Nic,
    total_nic: calc.totalNic,
    total_tax_due: calc.totalTaxDue,
    payments_made: paymentsMade,
    balance_due: balanceDue,
  });

  if (error) throw new Error(`Failed to store tax calculation: ${error.message}`);

  return {
    calculation: { ...calc, balanceDue, paymentsMade },
    stored: true,
  };
}
