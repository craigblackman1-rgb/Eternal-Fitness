"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { HubTable, type HubColumn } from "@/components/hub/HubTable";
import { HubPageHeader } from "@/components/hub/HubPageHeader";
import { TokenPill } from "@/components/hub/StatusBadge";
import { EmptyState } from "@/components/hub/EmptyState";
import type { DBProgram } from "@/lib/programs/types";
import type { StatusToken } from "@/lib/hubStatus";
import { IconTarget, IconPlus, IconUpload } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface ProgramRow extends DBProgram {
  clients?: { name: string; client_number: string | null } | null;
  slot_count?: number;
}

const statusConfig: Record<string, { token: StatusToken; label: string }> = {
  active: { token: "primary", label: "Active" },
  archived: { token: "neutral", label: "Archived" },
};

export function ProgramsListClient({ programs }: { programs: ProgramRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

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

  return (
    <div className="space-y-4">
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
        data={programs}
        columns={columns}
        getRowHref={(row) => `/hub/programs/${row.id}`}
        searchPlaceholder="Search programs…"
        searchKeys={["name"]}
        countLabel="program"
        emptyState={
          <EmptyState
            icon={<IconTarget className="h-8 w-8" />}
            title="No programs yet"
            description="Create a reusable training programme or import one from pasted text."
            cta={{
              label: "New program",
              onClick: handleNewProgram,
            }}
          />
        }
      />
    </div>
  );
}
