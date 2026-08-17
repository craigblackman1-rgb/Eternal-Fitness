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
  /** Weeks count for interval === "custom_weeks"; ignored otherwise. */
  updateIntervalWeeks: number | null;
  /** "YYYY-MM-DD" for interval === "fixed_date"; ignored otherwise. */
  updateIntervalNextDate: string | null;
  dueInfo: UpdateDueInfo;
}

const INTERVAL_VALUES: (UpdateInterval | "")[] = [
  "",
  "4_week",
  "6_week",
  "12_week",
  "6_session",
  "flexible",
  "custom_weeks",
  "fixed_date",
];

export function UpdateIntervalControl({
  clientNumber,
  updateInterval,
  updateIntervalWeeks,
  updateIntervalNextDate,
  dueInfo,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentInterval, setCurrentInterval] = useState(updateInterval);
  const [weeks, setWeeks] = useState(updateIntervalWeeks ?? 6);
  const [nextDate, setNextDate] = useState(updateIntervalNextDate ?? "");

  function patchClient(body: Record<string, unknown>) {
    startTransition(async () => {
      await fetch(`/api/clients/${clientNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    });
  }

  function handleIntervalChange(value: string) {
    const next = (value || null) as UpdateInterval | null;
    setCurrentInterval(next);
    // Clear the field that no longer applies so a stale value can't linger
    // and drive computeUpdateDue if the interval is switched back later.
    const body: Record<string, unknown> = { update_interval: next };
    if (next !== "custom_weeks") body.update_interval_weeks = null;
    if (next !== "fixed_date") body.update_interval_next_date = null;
    patchClient(body);
  }

  function handleWeeksCommit() {
    if (currentInterval !== "custom_weeks" || !weeks || weeks < 1) return;
    patchClient({ update_interval_weeks: weeks });
  }

  function handleDateCommit() {
    if (currentInterval !== "fixed_date" || !nextDate) return;
    patchClient({ update_interval_next_date: nextDate });
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
      {currentInterval === "custom_weeks" && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          every
          <input
            type="number"
            min={1}
            aria-label="Update interval in weeks"
            value={weeks}
            onChange={(e) => setWeeks(parseInt(e.target.value, 10) || 0)}
            onBlur={handleWeeksCommit}
            disabled={isPending}
            className="w-14 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 py-1.5 text-sm font-medium text-foreground focus:border-[var(--color-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)] disabled:opacity-50"
          />
          weeks
        </label>
      )}
      {currentInterval === "fixed_date" && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          due on
          <input
            type="date"
            aria-label="Fixed next-update date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            onBlur={handleDateCommit}
            disabled={isPending}
            className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 py-1.5 text-sm font-medium text-foreground focus:border-[var(--color-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)] disabled:opacity-50"
          />
        </label>
      )}
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
      ) : currentInterval === "fixed_date" ? (
        <span className="text-xs text-muted-foreground">
          Set a date above to show it here.
        </span>
      ) : currentInterval ? (
        <span className="text-xs text-muted-foreground">
          No previous send — due date will appear after the first update is sent.
        </span>
      ) : null}
    </div>
  );
}
