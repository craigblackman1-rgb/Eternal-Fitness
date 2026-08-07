"use client";

import { useState, useCallback, useEffect } from "react";

export interface BankTransaction {
  id: string;
  import_id: string;
  txn_date: string;
  description: string;
  amount: number;
  balance: number | null;
  currency: string;
  income_category: string | null;
  expense_category: string | null;
  is_excluded: boolean;
}

function formatAmount(amount: number, currency: string): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(abs);
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const incomeCategoryOptions = [
  { value: "", label: "—" },
  { value: "invoice_payment", label: "Invoice payment" },
  { value: "other_income", label: "Other income" },
  { value: "refund", label: "Refund" },
  { value: "interest", label: "Interest" },
];

const expenseCategoryOptions = [
  { value: "", label: "—" },
  { value: "studio_rent", label: "Studio rent" },
  { value: "equipment", label: "Equipment" },
  { value: "insurance", label: "Insurance" },
  { value: "software", label: "Software" },
  { value: "marketing", label: "Marketing" },
  { value: "professional_fees", label: "Professional fees" },
  { value: "other", label: "Other" },
];

interface TransactionTableProps {
  transactions: BankTransaction[];
  /** Called after a successful category/exclude edit so a parent holding its
   *  own copy of the full (unfiltered) list — e.g. for search/filter — can
   *  stay in sync. Without this, an edit only lives in this component's local
   *  state and gets silently reverted the next time the parent re-filters and
   *  passes a fresh `transactions` array back down. */
  onRowUpdated?: (id: string, updates: Partial<BankTransaction>) => void;
}

export function TransactionTable({ transactions, onRowUpdated }: TransactionTableProps) {
  const [rows, setRows] = useState(transactions);

  // Callers that filter/search re-pass a new `transactions` array — keep local
  // state in sync so the visible rows always reflect the current filter, not
  // just whatever was passed in on first mount.
  useEffect(() => {
    setRows(transactions);
  }, [transactions]);

  const patchRow = useCallback(async (id: string, updates: Record<string, unknown>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    onRowUpdated?.(id, updates);

    try {
      const res = await fetch(`/api/cashflow/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Patch failed");
    } catch {
      setRows(transactions);
    }
  }, [transactions]);

  return (
    <div className="overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--hub-hover)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--hub-muted)]">
            <th className="px-5 py-2.5 text-left">Date</th>
            <th className="px-5 py-2.5 text-left">Description</th>
            <th className="px-5 py-2.5 text-right">Amount</th>
            <th className="px-5 py-2.5 text-right">Balance</th>
            <th className="px-5 py-2.5 text-left">Category</th>
            <th className="px-5 py-2.5 text-center w-10">
              <span title="Exclude from tax calc">Excl.</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((txn) => {
            const isIncome = Number(txn.amount) > 0;
            return (
              <tr
                key={txn.id}
                className={`border-b border-[var(--hub-border)] text-sm hover:bg-[var(--hub-hover)]/50 transition-colors ${txn.is_excluded ? "opacity-50" : ""}`}
              >
                <td className="px-5 py-2.5 whitespace-nowrap text-[var(--hub-muted)]">
                  {formatDate(txn.txn_date)}
                </td>
                <td className="px-5 py-2.5">{txn.description}</td>
                <td
                  className={`px-5 py-2.5 text-right tabular-nums font-medium ${
                    isIncome
                      ? "text-[var(--status-success-text)]"
                      : "text-[var(--status-danger)]"
                  }`}
                >
                  {formatAmount(Number(txn.amount), txn.currency)}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-[var(--hub-muted)]">
                  {txn.balance != null
                    ? new Intl.NumberFormat("en-GB", {
                        style: "currency",
                        currency: txn.currency,
                      }).format(Number(txn.balance))
                    : "—"}
                </td>
                <td className="px-5 py-2.5">
                  {isIncome ? (
                    <select
                      value={txn.income_category ?? ""}
                      onChange={(e) =>
                        patchRow(txn.id, {
                          income_category: e.target.value || null,
                        })
                      }
                      className="h-8 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose/30"
                    >
                      {incomeCategoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={txn.expense_category ?? ""}
                      onChange={(e) =>
                        patchRow(txn.id, {
                          expense_category: e.target.value || null,
                        })
                      }
                      className="h-8 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose/30"
                    >
                      {expenseCategoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-5 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={txn.is_excluded}
                    onChange={(e) =>
                      patchRow(txn.id, { is_excluded: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-[var(--hub-border)] accent-rose cursor-pointer"
                    title="Exclude from tax calc"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
