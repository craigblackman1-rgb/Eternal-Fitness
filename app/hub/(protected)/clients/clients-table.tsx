"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { HubTable, type HubColumn } from "@/components/hub/HubTable";
import { toolbarSelectClasses } from "@/components/hub/Toolbar";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconUsers } from "@/components/icons";
import type { DBClient } from "@/types";

const complianceFilters = [
  { value: "all", label: "All statuses" },
  { value: "attention", label: "Needs attention" },
  { value: "do_not_train", label: "Do Not Train" },
  { value: "pending_medical", label: "Pending Clearance" },
  { value: "action_needed", label: "Action Needed" },
  { value: "clear", label: "Clear" },
] as const;

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

function getGoalsLabel(goals: string | undefined): string {
  if (!goals) return "—";
  const labels: Record<string, string> = {
    strength: "Strength",
    mobility: "Mobility",
    weight_loss: "Weight Loss",
    rehabilitation: "Rehab",
    confidence: "Confidence",
    general_fitness: "General Fitness",
  };
  return labels[goals] ?? goals;
}

const columns: HubColumn<DBClient>[] = [
  {
    key: "name",
    header: "Client",
    sortable: true,
    render: (client) => (
      <div className="flex items-center gap-3">
        <InitialsCircle name={client.name} />
        <span className="font-semibold text-foreground truncate">{client.name}</span>
        {client.client_status === "archived" && (
          <span className="text-xs font-medium text-muted-foreground bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded-full px-2 py-0.5 shrink-0">
            Archived
          </span>
        )}
      </div>
    ),
  },
  {
    key: "sessions_per_week",
    header: "Sessions / Week",
    render: (client) => {
      const spw = client.profile?.logistics?.sessions_per_week;
      return spw ? `${spw}x` : "—";
    },
  },
  {
    key: "conditions",
    header: "Conditions",
    render: (client) => {
      const count = client.profile?.health?.conditions?.length ?? 0;
      return count > 0 ? String(count) : "—";
    },
    sortable: true,
    sortValue: (client) => client.profile?.health?.conditions?.length ?? 0,
  },
  {
    key: "goals",
    header: "Goals",
    render: (client) => (
      <span className="truncate block max-w-32" title={client.profile?.goals?.primary ?? ""}>
        {getGoalsLabel(client.profile?.goals?.primary)}
      </span>
    ),
  },
  {
    key: "compliance_status",
    header: "Compliance",
    render: (client) =>
      client.compliance_status ? (
        <StatusBadge status={client.compliance_status} />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    sortValue: (client) => client.compliance_status ?? "",
  },
  {
    key: "created_at",
    header: "Created",
    sortable: true,
    className: "text-muted-foreground whitespace-nowrap",
    render: (client) =>
      new Date(client.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
  },
];

export function ClientsTable({ clients }: { clients: DBClient[] }) {
  const [filter, setFilter] = useState<(typeof complianceFilters)[number]["value"]>("all");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    let result = showArchived ? clients : clients.filter((c) => c.client_status !== "archived");
    if (filter === "attention") {
      result = result.filter((c) => c.compliance_status && c.compliance_status !== "clear");
    } else if (filter !== "all") {
      result = result.filter((c) => c.compliance_status === filter);
    }
    return result;
  }, [clients, filter, showArchived]);

  return (
    <HubTable
      data={filtered}
      columns={columns}
      getRowHref={(client) => `/hub/clients/${client.client_number}`}
      searchPlaceholder="Search clients by name..."
      searchKeys={["name"]}
      toolbar={
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className={toolbarSelectClasses}
            aria-label="Filter by compliance status"
          >
            {complianceFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-[var(--hub-border)]"
            />
            Show archived
          </label>
        </div>
      }
      emptyState={
        <EmptyState
          icon={<IconUsers className="w-7 h-7" />}
          title="No clients match your search."
          description="Try a different name or clear the compliance filter."
        />
      }
      countLabel="client"
    />
  );
}
