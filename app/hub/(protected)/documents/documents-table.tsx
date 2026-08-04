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
  signed_at: string | null;
  sent_at: string | null;
}

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "attention", label: "Needs attention" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
  { value: "superseded", label: "Superseded" },
] as const;

const kindFilters = [
  { value: "all", label: "All document types" },
  { value: "terms", label: "Personal Training Agreement" },
  { value: "parq", label: "PAR-Q" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "annual_review", label: "Annual Review" },
  { value: "consent", label: "Consent" },
  { value: "feedback", label: "Client Feedback" },
] as const;

const dateRangeFilters = [
  { value: "any", label: "Any time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "none", label: "None" },
] as const;

function daysAgo(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

function withinPreset(iso: string | null, preset: string): boolean {
  if (preset === "any") return true;
  if (preset === "none") return !iso;
  return iso != null && daysAgo(iso) <= Number(preset);
}

function InitialsCircle({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-rose/15 text-rose flex items-center justify-center text-xs font-bold shrink-0">
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
    sortable: true,
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
    key: "signed_at",
    header: "Date signed",
    sortable: true,
    className: "text-muted-foreground whitespace-nowrap",
    render: (row) => (row.signed_at ? fmt(row.signed_at) : <span className="text-muted-foreground/50">—</span>),
  },
  {
    key: "sent_at",
    header: "Last sent",
    sortable: true,
    className: "text-muted-foreground whitespace-nowrap",
    render: (row) => (row.sent_at ? fmt(row.sent_at) : <span className="text-muted-foreground/50">—</span>),
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
  const [statusFilter, setStatusFilter] = useState<
    (typeof statusFilters)[number]["value"]
  >("all");
  const [kindFilter, setKindFilter] = useState<
    (typeof kindFilters)[number]["value"]
  >("all");
  const [signedFilter, setSignedFilter] = useState<
    (typeof dateRangeFilters)[number]["value"]
  >("any");
  const [sentFilter, setSentFilter] = useState<
    (typeof dateRangeFilters)[number]["value"]
  >("any");

  const filtersActive =
    statusFilter !== "all" ||
    kindFilter !== "all" ||
    signedFilter !== "any" ||
    sentFilter !== "any";

  const resetFilters = () => {
    setStatusFilter("all");
    setKindFilter("all");
    setSignedFilter("any");
    setSentFilter("any");
  };

  const filtered = useMemo(() => {
    let result = data;
    if (statusFilter === "attention") {
      result = result.filter(
        (d) => d.status !== "signed" && d.status !== "superseded",
      );
    } else if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (kindFilter !== "all") {
      result = result.filter((d) => d.kind === kindFilter);
    }
    if (signedFilter !== "any") {
      result = result.filter((d) => withinPreset(d.signed_at, signedFilter));
    }
    if (sentFilter !== "any") {
      result = result.filter((d) => withinPreset(d.sent_at, sentFilter));
    }
    return result;
  }, [data, statusFilter, kindFilter, signedFilter, sentFilter]);

  return (
    <HubTable
      data={filtered}
      columns={columns}
      getRowHref={(row) =>
        row.clientNumber != null
          ? `/hub/clients/${row.clientNumber}/documents/${row.id}`
          : "#"
      }
      searchPlaceholder="Search documents by client or document..."
      searchKeys={["clientName", (row) => DOCUMENT_KIND_LABEL[row.kind as DocumentKind] ?? row.title]}
      toolbar={
        <>
          <select
            value={kindFilter}
            onChange={(e) =>
              setKindFilter(e.target.value as typeof kindFilter)
            }
            className="h-10 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose/30"
            aria-label="Filter by document type"
          >
            {kindFilters.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
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
          <select
            value={signedFilter}
            onChange={(e) =>
              setSignedFilter(e.target.value as typeof signedFilter)
            }
            className="h-10 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose/30"
            aria-label="Filter by date signed"
          >
            <option value="any">Signed — any time</option>
            {dateRangeFilters.filter((f) => f.value !== "any").map((f) => (
              <option key={f.value} value={f.value}>
                {f.value === "none" ? "Not yet signed" : `Signed in last ${f.value} days`}
              </option>
            ))}
          </select>
          <select
            value={sentFilter}
            onChange={(e) =>
              setSentFilter(e.target.value as typeof sentFilter)
            }
            className="h-10 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose/30"
            aria-label="Filter by last sent"
          >
            <option value="any">Last sent — any time</option>
            {dateRangeFilters.filter((f) => f.value !== "any").map((f) => (
              <option key={f.value} value={f.value}>
                {f.value === "none" ? "Never sent" : `Sent in last ${f.value} days`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!filtersActive}
            className="text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40 disabled:no-underline disabled:cursor-default"
          >
            Reset filters
          </button>
        </>
      }
      emptyState={
        <EmptyState
          icon={<IconFileText className="w-7 h-7" />}
          title="No documents match your filters."
          description="Try a different search, or reset the type, status, signed and sent filters."
        />
      }
      countLabel="document"
    />
  );
}
