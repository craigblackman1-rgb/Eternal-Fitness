"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HubTable, TokenPill } from "@/components/hub";
import { toolbarSelectClasses } from "@/components/hub/Toolbar";
import type { StatusToken } from "@/lib/hubStatus";
import type { BlockWithClient } from "./page";

function formatDate(d: string | null): string {
  if (!d) return "Not set";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const blockApprovalMap: Record<string, { token: StatusToken; label: string }> = {
  draft: { token: "warning", label: "Awaiting review" },
  approved: { token: "success", label: "Approved" },
  active: { token: "primary", label: "Active" },
  complete: { token: "success", label: "Completed" },
};

function actionLabel(row: BlockWithClient): string {
  if (row.compliance_status === "do_not_train") return "Open";
  switch (row.derived_status) {
    case "active":
      return "Open";
    case "complete":
      return "Review";
    case "draft":
      return "Continue";
    case "approved":
    default:
      return "Open";
  }
}

function EditableDateCell({
  value,
  blockId,
}: {
  value: string | null;
  blockId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [dateValue, setDateValue] = useState(value ? value.slice(0, 10) : "");

  const handleSave = useCallback(async () => {
    if (!dateValue) {
      setEditing(false);
      return;
    }
    try {
      await fetch(`/api/blocks/${blockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_start: new Date(dateValue).toISOString() }),
      });
    } catch {
      // Silently ignore — the next server render picks up the correct value
    }
    setEditing(false);
    router.refresh();
  }, [dateValue, blockId, router]);

  if (editing) {
    return (
      <input
        type="date"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter") handleSave();
        }}
        onClick={(e) => e.stopPropagation()}
        autoFocus
        className="w-[130px] rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2 py-1 text-sm"
      />
    );
  }

  return (
    <span
      className={!value ? "text-muted-foreground italic" : ""}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Click to set scheduled start date"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") setEditing(true);
      }}
    >
      {formatDate(value)}
    </span>
  );
}

export function PlanScheduleTable({ data }: { data: BlockWithClient[] }) {
  const statusFilters = [
    { value: "all", label: "All statuses" },
    { value: "draft", label: "Awaiting review" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active" },
    { value: "complete", label: "Completed" },
  ] as const;

  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]["value"]>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return data;
    return data.filter((row) => row.derived_status === statusFilter);
  }, [data, statusFilter]);

  const sortedData = [...filtered].sort((a, b) => {
    const statusOrder: Record<string, number> = { active: 0, approved: 1, draft: 2, complete: 3 };
    const aOrder = statusOrder[a.derived_status] ?? 4;
    const bOrder = statusOrder[b.derived_status] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.scheduled_start && b.scheduled_start) {
      return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
    }
    if (a.scheduled_start) return -1;
    if (b.scheduled_start) return 1;
    return b.block_number - a.block_number;
  });

  const columns = [
    {
      key: "client",
      header: "Client",
      sortable: true,
      sortValue: (row: BlockWithClient) => row.client_name ?? "",
      render: (row: BlockWithClient) => {
        const name = row.client_name ?? "Unknown";
        const num = row.client_number;
        return (
          <div className="flex items-center gap-2.5">
            <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--status-primary-bg)] text-[var(--color-rose)] text-xs font-bold">
              {initialsFor(name)}
            </span>
            <div className="min-w-0">
              <span className="font-medium text-foreground">{name}</span>
              {num != null && (
                <span className="text-xs text-muted-foreground ml-1.5">
                  #{num}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "block",
      header: "Block",
      sortable: true,
      sortValue: (row: BlockWithClient) => row.block_number,
      className: "min-w-[140px]",
      render: (row: BlockWithClient) => (
        <span className="font-medium">
          <span className="tabular-nums text-muted-foreground mr-1.5">#{row.block_number}</span>
          {row.display_name}
        </span>
      ),
    },
    {
      key: "programme",
      header: "Programme",
      sortable: true,
      sortValue: (row: BlockWithClient) => row.programme ?? "",
      render: (row: BlockWithClient) => (
        <span className={row.programme ? "text-muted-foreground" : "text-muted-foreground italic"}>
          {row.programme ?? "—"}
        </span>
      ),
    },
    {
      key: "due",
      header: "Scheduled start",
      sortable: true,
      sortValue: (row: BlockWithClient) => row.scheduled_start ?? "",
      render: (row: BlockWithClient) => (
        <EditableDateCell value={row.scheduled_start} blockId={row.id} />
      ),
    },
    {
      key: "progress",
      header: "Progress",
      sortable: true,
      sortValue: (row: BlockWithClient) => row.sessions_completed,
      render: (row: BlockWithClient) => {
        if (row.compliance_status === "do_not_train") {
          return <span className="text-muted-foreground italic">Blocked</span>;
        }
        if (!row.scheduled_start) {
          return <span className="text-muted-foreground italic">Not started</span>;
        }
        const total = row.sessions_total;
        const done = row.sessions_completed;
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-[90px] rounded-full bg-[var(--hub-border)] overflow-hidden align-middle">
              <span
                className="block h-full rounded-full bg-[var(--color-teal)]"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="tabular-nums whitespace-nowrap">{done} of {total}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Approval",
      sortable: true,
      sortValue: (row: BlockWithClient) => row.derived_status,
      className: "w-[120px]",
      render: (row: BlockWithClient) => {
        if (row.compliance_status === "do_not_train") {
          return <TokenPill token="danger" label="Do Not Train" />;
        }
        const lookup = blockApprovalMap[row.derived_status];
        return lookup ? <TokenPill token={lookup.token} label={lookup.label} /> : null;
      },
    },
    {
      key: "action",
      header: "",
      render: (row: BlockWithClient) => (
        <Link
          href={`/hub/clients/${row.client_number ?? row.client_id}/blocks/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-teal font-medium hover:underline whitespace-nowrap"
        >
          {actionLabel(row)}
        </Link>
      ),
    },
  ];

  return (
    <HubTable
      data={sortedData}
      columns={columns}
      getRowHref={(row) => `/hub/clients/${row.client_number ?? row.client_id}/blocks/${row.id}`}
      searchPlaceholder="Search clients…"
      searchKeys={[(row: BlockWithClient) => row.client_name ?? ""]}
      countLabel="block"
      toolbar={
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={toolbarSelectClasses}
          aria-label="Filter by approval status"
        >
          {statusFilters.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      }
    />
  );
}
