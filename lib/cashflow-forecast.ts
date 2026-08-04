import { supabase } from "@/lib/supabase";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export interface MonthBucket {
  key: string;
  label: string;
  date: Date;
  income: number;
  expenses: number;
}

export interface ProjectionMonth {
  key: string;
  label: string;
  opening: number;
  income: number;
  expenses: number;
  closing: number;
}

export interface ForecastResult {
  currentBalance: number;
  taxReserve: number;
  startingBalance: number;
  balanceAsOf: string | null;
  taxYear: string | null;
  hasSettings: boolean;
  runwayMonth: string | null;
  projection: ProjectionMonth[];
}

export async function computeForecast(): Promise<ForecastResult> {
  const now = new Date();
  const firstMonth = firstOfMonth(now);

  const [settingsRes, invoicesRes, billsRes, taxCalcRes] = await Promise.all([
    supabase.from("cash_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("invoices").select("id, total, status, due_date"),
    supabase.from("bills").select("id, name, amount, status, due_date, is_recurring, recurrence_rule"),
    supabase
      .from("tax_calculations")
      .select("id, tax_year, balance_due, calculated_at")
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const settings = settingsRes.data as { current_balance: number; balance_as_of: string | null } | null;
  const hasSettings = !!settings;

  const taxReserve = (taxCalcRes.data as { balance_due: number } | null)?.balance_due ?? 0;
  const taxYear = (taxCalcRes.data as { tax_year: string } | null)?.tax_year ?? null;

  const currentBalance = settings?.current_balance ?? 0;
  const balanceAsOf = settings?.balance_as_of ?? null;
  const startingBalance = Math.round((currentBalance - taxReserve) * 100) / 100;

  // Build 12-month buckets
  const months: MonthBucket[] = Array.from({ length: 12 }, (_, i) => {
    const d = addMonths(firstMonth, i);
    return {
      key: monthKey(d),
      label: d.toLocaleString("en-GB", { month: "short", year: "numeric" }),
      date: d,
      income: 0,
      expenses: 0,
    };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));

  function inHorizon(d: Date): boolean {
    return byKey.has(monthKey(firstOfMonth(d)));
  }

  function bucket(d: Date): MonthBucket | undefined {
    return byKey.get(monthKey(firstOfMonth(d)));
  }

  // 1. Unpaid invoices → income
  const invoices = (invoicesRes.data ?? []) as { id: string; total: number; status: string; due_date: string | null }[];
  for (const inv of invoices) {
    if (inv.status === "paid" || inv.status === "draft" || inv.status === "void") continue;
    const amount = Number(inv.total ?? 0);
    if (!amount) continue;
    let due = inv.due_date ? new Date(inv.due_date) : firstMonth;
    if (due < firstMonth) due = firstMonth;
    if (!inHorizon(due)) continue;
    const b = bucket(due);
    if (b) b.income += amount;
  }

  // 2. Pending bills → expenses (with recurring expansion)
  const allBills = (billsRes.data ?? []) as {
    id: string;
    name: string;
    amount: number;
    status: string;
    due_date: string;
    is_recurring: boolean;
    recurrence_rule: string | null;
  }[];

  for (const bill of allBills) {
    if (bill.status === "paid" || bill.status === "cancelled") continue;
    const amount = Number(bill.amount ?? 0);
    if (!amount) continue;

    if (!bill.is_recurring) {
      let due = new Date(bill.due_date);
      if (due < firstMonth) due = firstMonth;
      if (!inHorizon(due)) continue;
      const b = bucket(due);
      if (b) b.expenses += amount;
      continue;
    }

    const step = bill.recurrence_rule === "quarterly" ? 3 : bill.recurrence_rule === "annually" ? 12 : 1;
    const startDate = new Date(bill.due_date);
    for (const m of months) {
      if (m.date < firstOfMonth(startDate)) continue;
      const monthsSinceStart =
        (m.date.getFullYear() - startDate.getFullYear()) * 12 +
        (m.date.getMonth() - startDate.getMonth());
      if (monthsSinceStart % step !== 0) continue;
      m.expenses += amount;
    }
  }

  // Running balance
  let running = startingBalance;
  let runwayMonth: string | null = null;
  const projection: ProjectionMonth[] = months.map((m) => {
    const income = Math.round(m.income * 100) / 100;
    const expenses = Math.round(m.expenses * 100) / 100;
    const opening = Math.round(running * 100) / 100;
    running += income - expenses;
    const closing = Math.round(running * 100) / 100;
    if (runwayMonth === null && closing < 0) runwayMonth = m.label;
    return { key: m.key, label: m.label, opening, income, expenses, closing };
  });

  return {
    currentBalance,
    taxReserve,
    startingBalance,
    balanceAsOf,
    taxYear,
    hasSettings,
    runwayMonth,
    projection,
  };
}
