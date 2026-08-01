"use client";

import { useMemo, useState } from "react";
import { StatusBadge, TokenPill } from "@/components/hub/StatusBadge";
import { HubTable, type HubColumn } from "@/components/hub/HubTable";
import { DocumentRowActions } from "@/components/hub/DocumentRowActions";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconFileText } from "@/components/icons";
import { DOCUMENT_KIND_LABEL, type DocumentKind } from "@/lib/documents/types";

export interface DocumentTableRow {
  id: string;
  clientName: string;
  clientNumber: number | null;
  hasEmail: boolean;
  kind: string;
  title: string;
  status: string;
  version: number;
  created_at: string;
  emailed: boolean | null;
}

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "attention", label: "Needs attention" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
  { value: "superseded", label: "Superseded" },
] as const;

function InitialsCircle({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-full bg-rose/15 text-rose flex items-center justify-center text-sm font-bold shrink-0">
      {initials}
    </div>
  );
}

function fmt(v: string) {
  return new Date(v).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const columns: HubColumn<DocumentTableRow>[] = [
  {
    key: "clientName",
    header: "Client",
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-3">
        <InitialsCircle name={row.clientName} />
        <span className="font-semibold text-foreground truncate">{row.clientName}</span>
      </div>
    ),
  },
  {
    key: "kind",
    header: "Document",
    sortable: true,
    render: (row) => (
      <span className="text-foreground">
        {DOCUMENT_KIND_LABEL[row.kind as DocumentKind] ?? row.title}
        {row.version > 1 ? ` (v${row.version})` : ""}
      </span>
    ),
    sortValue: (row) => DOCUMENT_KIND_LABEL[row.kind as DocumentKind] ?? row.title,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={row.status} />
        {row.status === "sent" && row.emailed === false && (
          <TokenPill token="neutral" label="Not delivered" />
        )}
      </div>
    ),
    sortValue: (row) => row.status,
  },
  {
    key: "created_at",
    header: "Created",
    sortable: true,
    className: "text-muted-foreground whitespace-nowrap",
    render: (row) => fmt(row.created_at),
  },
  {
    key: "actions",
    header: "",
    render: (row) => (
      <DocumentRowActions
        docId={row.id}
        status={row.status}
        hasEmail={row.hasEmail}
        clientName={row.clientName}
      />
    ),
    className: "text-right",
    headerClassName: "w-0",
  },
];

interface DocumentsTableProps {
  data: DocumentTableRow[];
}

export function DocumentsTable({ data }: DocumentsTableProps) {
  const [filter, setFilter] = useState<
    (typeof statusFilters)[number]["value"]
  >("all");

  const filtered = useMemo(() => {
    if (filter === "all") return data;
    if (filter === "attention") {
      return data.filter(
        (d) => d.status !== "signed" && d.status !== "superseded",
      );
    }
    return data.filter((d) => d.status === filter);
  }, [data, filter]);

  return (
    <HubTable
      data={filtered}
      columns={columns}
      getRowHref={(row) =>
        row.clientNumber != null
          ? `/hub/clients/${row.clientNumber}/documents/${row.id}`
          : "#"
      }
      searchPlaceholder="Search documents by client name..."
      searchKeys={["clientName"]}
      toolbar={
        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as typeof filter)
          }
          className="h-10 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose/30"
          aria-label="Filter by status"
        >
          {statusFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      }
      emptyState={
        <EmptyState
          icon={<IconFileText className="w-7 h-7" />}
          title="No documents match your search."
          description="Try a different name or clear the status filter."
        />
      }
      countLabel="document"
    />
  );
}
