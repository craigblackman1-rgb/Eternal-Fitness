"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { HubTable, type HubColumn } from "@/components/hub/HubTable";
import { HubPageHeader } from "@/components/hub/HubPageHeader";
import { TokenPill } from "@/components/hub/StatusBadge";
import { EmptyState } from "@/components/hub/EmptyState";
import type { DBProgram } from "@/lib/programs/types";
import type { StatusToken } from "@/lib/hubStatus";
import { IconTarget, IconPlus, IconUpload, IconCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface ProgramRow extends DBProgram {
  clients?: { name: string; client_number: string | null } | null;
  slot_count?: number;
}

export interface ClientContext {
  id: string;
  name: string;
  client_number: string;
  active_program_id: string | null;
}

const statusConfig: Record<string, { token: StatusToken; label: string }> = {
  active: { token: "primary", label: "Active" },
  archived: { token: "neutral", label: "Archived" },
};

export function ProgramsListClient({
  programs,
  clientContext,
}: {
  programs: ProgramRow[];
  clientContext?: ClientContext | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const archivedCount = programs.filter((p) => p.status === "archived").length;
  const visiblePrograms = showArchived
    ? programs
    : programs.filter((p) => p.status !== "archived");

  const handleArchive = async (program: ProgramRow) => {
    const newStatus = program.status === "archived" ? "active" : "archived";
    const label = `${program.id}-archive`;
    setActionBusy(label);
    try {
      const res = await fetch(`/api/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const text = await res.text();
      let data: Record<string, unknown> | null = null;
      try { data = JSON.parse(text); } catch { /* non-JSON response */ }
      if (!res.ok) throw new Error((data?.error as string) || "Request failed");
      toast.success(newStatus === "archived" ? "Program archived" : "Program restored");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionBusy(null);
    }
  };

  const handleDelete = async (program: ProgramRow) => {
    if (!confirm(`Delete ${program.name}? This cannot be undone.`)) return;
    const label = `${program.id}-delete`;
    setActionBusy(label);
    try {
      const res = await fetch(`/api/programs/${program.id}`, {
        method: "DELETE",
      });
      const text = await res.text();
      let data: Record<string, unknown> | null = null;
      try { data = JSON.parse(text); } catch { /* non-JSON response */ }
      if (!res.ok) {
        const msg = (data?.error as string) || "Request failed";
        if (res.status === 409 && data?.in_use) {
          const inUse = data.in_use as { clients: number; sessions: number };
          const parts: string[] = [];
          if (inUse.clients > 0) parts.push(`${inUse.clients} client${inUse.clients > 1 ? "s" : ""}`);
          if (inUse.sessions > 0) parts.push(`${inUse.sessions} session${inUse.sessions > 1 ? "s" : ""}`);
          toast.error(`Program is in use (${parts.join(", ")}). Archive it instead.`);
        } else {
          throw new Error(msg);
        }
      } else {
        toast.success("Program deleted");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionBusy(null);
    }
  };

  const handleNewProgram = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New program", weeks: 6 }),
      });
      if (!res.ok) throw new Error("Failed to create program");
      const { id } = await res.json();
      router.push(`/hub/programs/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const handleApply = async (programId: string) => {
    if (!clientContext) return;
    setApplyingId(programId);
    try {
      const res = await fetch(`/api/clients/${clientContext.id}/apply-program`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_id: programId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to apply program");
      }
      toast.success("Program applied");
      router.push(`/hub/clients/${clientContext.client_number}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setApplyingId(null);
    }
  };

  const columns: HubColumn<ProgramRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: "weeks",
      header: "Weeks",
      sortable: true,
      sortValue: (row) => row.weeks,
      render: (row) => (
        <span className="tabular-nums">{row.weeks}</span>
      ),
      className: "w-20",
    },
    {
      key: "slots",
      header: "Slots",
      sortable: true,
      sortValue: (row) => row.slot_count ?? 0,
      render: (row) => (
        <span className="tabular-nums">{row.slot_count ?? 0}</span>
      ),
      className: "w-20",
    },
    {
      key: "client",
      header: "Client",
      sortable: true,
      sortValue: (row) => row.clients?.name ?? "Library",
      render: (row) => (
        <span className={row.clients ? "text-foreground" : "text-muted-foreground"}>
          {row.clients?.name ?? "Library"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => {
        const cfg = statusConfig[row.status] ?? statusConfig.active;
        return <TokenPill token={cfg.token} label={cfg.label} />;
      },
      className: "w-28",
    },
  ];

  // Actions column — always added (not just when clientContext is present)
  columns.push({
    key: "actions",
    header: "",
    render: (row) => {
      const isArchived = row.status === "archived";
      const isBusy = actionBusy === `${row.id}-archive` || actionBusy === `${row.id}-delete`;
      return (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy}
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleArchive(row);
            }}
          >
            {isArchived ? "Unarchive" : "Archive"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy}
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete(row);
            }}
          >
            Delete
          </Button>
        </div>
      );
    },
    className: "w-40",
  });

  if (clientContext) {
    columns.push({
      key: "apply",
      header: "",
      render: (row) => {
        const isApplied = clientContext.active_program_id === row.id;
        const isApplying = applyingId === row.id;
        if (isApplied) {
          return (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
              <IconCheck className="h-4 w-4" />
              Applied
            </span>
          );
        }
        return (
          <Button
            variant="outline"
            size="sm"
            disabled={applyingId !== null}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleApply(row.id);
            }}
          >
            {isApplying ? "Applying…" : "Apply"}
          </Button>
        );
      },
      className: "w-28",
    });
  }

  return (
    <div className="space-y-4">
      {clientContext && (
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
          Choosing a program for{" "}
          <Link
            href={`/hub/clients/${clientContext.client_number}`}
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            {clientContext.name}
          </Link>
        </div>
      )}

      <HubPageHeader
        title="Programs"
        subtitle="Reusable training programmes with weekly progression"
        actions={
          <>
            <Link href="/hub/programs/import">
              <Button variant="outline" size="sm" className="gap-1.5">
                <IconUpload className="h-3.5 w-3.5" />
                Import from text
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleNewProgram}
              disabled={creating}
            >
              <IconPlus className="h-3.5 w-3.5" />
              {creating ? "Creating…" : "New program"}
            </Button>
          </>
        }
      />

      <HubTable
        data={visiblePrograms}
        columns={columns}
        getRowHref={(row) => `/hub/programs/${row.id}`}
        searchPlaceholder="Search programs…"
        searchKeys={["name"]}
        countLabel="program"
        emptyState={
          <EmptyState
            icon={<IconTarget className="h-8 w-8" />}
            title={showArchived ? "No archived programs" : "No programs yet"}
            description={
              showArchived
                ? "All programs are active."
                : "Create a reusable training programme or import one from pasted text."
            }
            cta={
              showArchived
                ? undefined
                : {
                    label: "New program",
                    onClick: handleNewProgram,
                  }
            }
          />
        }
      />

      {archivedCount > 0 && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {showArchived
              ? "Hide archived"
              : `Show archived (${archivedCount})`}
          </button>
        </div>
      )}
    </div>
  );
}
