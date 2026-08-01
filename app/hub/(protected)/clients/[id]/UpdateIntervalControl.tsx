"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UPDATE_INTERVAL_LABELS,
  type UpdateInterval,
  type UpdateDueInfo,
} from "@/lib/updates-due";
import { TokenPill } from "@/components/hub/StatusBadge";
import type { StatusToken } from "@/lib/hubStatus";

function dueStatusToken(status: string | null): StatusToken {
  switch (status) {
    case "overdue":
      return "danger";
    case "due_soon":
      return "warning";
    case "upcoming":
      return "primary";
    default:
      return "neutral";
  }
}

function dueStatusLabel(status: string | null): string {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "due_soon":
      return "Due Soon";
    case "upcoming":
      return "Upcoming";
    default:
      return "—";
  }
}

interface Props {
  clientNumber: number;
  updateInterval: UpdateInterval | null;
  dueInfo: UpdateDueInfo;
}

const INTERVAL_VALUES: (UpdateInterval | "")[] = [
  "",
  "4_week",
  "6_week",
  "12_week",
  "6_session",
  "flexible",
];

export function UpdateIntervalControl({
  clientNumber,
  updateInterval,
  dueInfo,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentInterval, setCurrentInterval] = useState(updateInterval);

  async function handleIntervalChange(value: string) {
    const next = value || null;
    setCurrentInterval(next as UpdateInterval | null);
    startTransition(async () => {
      await fetch(`/api/clients/${clientNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_interval: next }),
      });
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center gap-3 flex-wrap"
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: "1px solid var(--hub-border)",
      }}
    >
      <span
        className="text-xs text-muted-foreground whitespace-nowrap"
        style={{ marginBottom: 0 }}
      >
        Update interval
      </span>
      <select
        aria-label="Update interval"
        value={currentInterval ?? ""}
        onChange={(e) => handleIntervalChange(e.target.value)}
        disabled={isPending}
        className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 py-1.5 text-sm font-medium text-foreground focus:border-[var(--color-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)] disabled:opacity-50"
      >
        {INTERVAL_VALUES.map((v) => (
          <option key={v} value={v}>
            {v ? UPDATE_INTERVAL_LABELS[v as UpdateInterval] : "Not set"}
          </option>
        ))}
      </select>
      {dueInfo.nextDueDate ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Next update due:{" "}
            <span className="font-semibold text-foreground">
              {new Date(dueInfo.nextDueDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </span>
          <TokenPill
            token={dueStatusToken(dueInfo.status)}
            label={dueStatusLabel(dueInfo.status)}
          />
        </div>
      ) : currentInterval ? (
        <span className="text-xs text-muted-foreground">
          No previous send — due date will appear after the first update is sent.
        </span>
      ) : null}
    </div>
  );
}
