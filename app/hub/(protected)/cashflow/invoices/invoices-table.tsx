"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { lookupStatus } from "@/lib/hubStatus";
import type { DBInvoice } from "@/types";

const fmt = (n: number) => `£${n.toFixed(2)}`;
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function actionLabel(status: string, id: string): { label: string; href: string } {
  switch (status) {
    case "draft":
      return { label: "Continue", href: `/hub/cashflow/invoices/${id}` };
    case "sent":
      return { label: "Open", href: `/hub/cashflow/invoices/${id}` };
    case "overdue":
      return { label: "Chase", href: `/hub/cashflow/invoices/${id}` };
    case "paid":
      return { label: "View", href: `/hub/cashflow/invoices/${id}` };
    default:
      return { label: "Open", href: `/hub/cashflow/invoices/${id}` };
  }
}

export type InvoiceRow = DBInvoice & {
  clients?: { name: string; client_number: number; display_code: string | null } | null;
};

export function InvoicesTable({ data }: { data: InvoiceRow[] }) {
  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No invoices match your search
      </div>
    );
  }

  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr>
          <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]">
            Invoice
          </th>
          <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]">
            Client
          </th>
          <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]">
            Issued
          </th>
          <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]">
            Due
          </th>
          <th className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]">
            Amount
          </th>
          <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]">
            Status
          </th>
          <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]" />
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr
            key={row.id}
            className="border-b border-[var(--hub-border)] hover:bg-[var(--hub-hover)] transition-colors"
          >
            <td className="px-5 py-[13px] font-semibold text-foreground tabular-nums">
              <Link href={`/hub/cashflow/invoices/${row.id}`} className="hover:underline">
                {row.invoice_number}
              </Link>
            </td>
            <td className="px-5 py-[13px] text-foreground">
              {row.clients?.name ?? "—"}
            </td>
            <td className="px-5 py-[13px] text-muted-foreground tabular-nums">
              {fmtDate(row.issue_date)}
            </td>
            <td className="px-5 py-[13px] text-muted-foreground tabular-nums">
              {fmtDate(row.due_date)}
            </td>
            <td className="px-5 py-[13px] text-right tabular-nums font-medium text-foreground">
              {fmt(row.total)}
            </td>
            <td className="px-5 py-[13px]">
              <StatusBadge status={row.status} />
            </td>
            <td className="px-5 py-[13px]">
              <Link
                href={actionLabel(row.status, row.id).href}
                className="text-[var(--color-teal)] hover:underline font-medium text-[13px]"
              >
                {actionLabel(row.status, row.id).label}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
