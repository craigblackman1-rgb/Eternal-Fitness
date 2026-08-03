"use client";

import { HubTable, type HubColumn } from "@/components/hub/HubTable";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconFileText } from "@/components/icons";
import type { DBInvoice } from "@/types";

const fmt = (n: number) => `£${n.toFixed(2)}`;
const fmtDate = (d: string) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

type InvoiceRow = DBInvoice & {
  clients?: { name: string; client_number: number; display_code: string | null } | null;
};

const columns: HubColumn<InvoiceRow>[] = [
  {
    key: "invoice_number",
    header: "Invoice",
    sortable: true,
    sortValue: (row) => row.invoice_number,
    render: (row) => <span className="font-medium tabular-nums">{row.invoice_number}</span>,
  },
  {
    key: "client",
    header: "Client",
    sortable: true,
    sortValue: (row) => row.clients?.name ?? "",
    render: (row) => <span>{row.clients?.name ?? "—"}</span>,
  },
  {
    key: "total",
    header: "Total",
    sortable: true,
    sortValue: (row) => row.total,
    render: (row) => <span className="tabular-nums">{fmt(row.total)}</span>,
  },
  {
    key: "issue_date",
    header: "Issue date",
    sortable: true,
    sortValue: (row) => row.issue_date,
    render: (row) => <span className="tabular-nums">{fmtDate(row.issue_date)}</span>,
  },
  {
    key: "due_date",
    header: "Due date",
    sortable: true,
    sortValue: (row) => row.due_date,
    render: (row) => <span className="tabular-nums">{fmtDate(row.due_date)}</span>,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => <StatusBadge status={row.status} />,
  },
];

interface InvoicesTableProps {
  data: InvoiceRow[];
}

export function InvoicesTable({ data }: InvoicesTableProps) {
  return (
    <HubTable
      data={data}
      columns={columns}
      getRowHref={(row) => `/hub/cashflow/invoices/${row.id}`}
      searchPlaceholder="Search invoices..."
      searchKeys={["invoice_number", (row) => row.clients?.name ?? ""]}
      countLabel="invoice"
      emptyState={
        <EmptyState
          icon={<IconFileText className="w-9 h-9" />}
          title="No matching invoices"
          description="Try a different search term"
        />
      }
    />
  );
}
