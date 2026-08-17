"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HubTable, TokenPill } from "@/components/hub";
import { toolbarSelectClasses } from "@/components/hub/Toolbar";
import { getScheduleStatus } from "@/lib/hubStatus";
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
    return data.filter((row) => row.status === statusFilter);
  }, [data, statusFilter]);

  const sortedData = [...filtered].sort((a, b) => {
    const statusOrder: Record<string, number> = { active: 0, approved: 1, draft: 2, complete: 3 };
    const aOrder = statusOrder[a.status] ?? 4;
    const bOrder = statusOrder[b.status] ?? 4;
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
          <div>
            <span className="font-medium text-foreground">{name}</span>
            {num != null && (
              <span className="text-xs text-muted-foreground ml-1.5">
                #{num}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "block",
      header: "Block",
      sortable: true,
      sortValue: (row: BlockWithClient) => row.block_number,
      className: "tabular-nums w-[80px]",
      render: (row: BlockWithClient) => (
        <span className="tabular-nums font-medium">Block {row.block_number}</span>
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
      key: "status",
      header: "Approval",
      sortable: true,
      sortValue: (row: BlockWithClient) => row.status,
      className: "w-[120px]",
      render: (row: BlockWithClient) => {
        const lookup = getScheduleStatus(row.status);
        return lookup ? <TokenPill token={lookup.token} label={lookup.label} /> : null;
      },
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
