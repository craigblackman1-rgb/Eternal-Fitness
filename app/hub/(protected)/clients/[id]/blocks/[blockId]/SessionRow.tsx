"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import type { SessionStatus } from "@/types";
import {
  isoToLocalDate,
  isoToLocalTime,
  localPartsToISO,
  todayLocalISODate,
} from "@/lib/schedule-dates";

interface SessionRowProps {
  sessionId: string;
  archetypeLabel: string;
  archetypeTint: string;
  focusLabel: string;
  status: SessionStatus;
  dayLabel: string;
  /** Chronological position derived from scheduled_at — NOT session_number. */
  chronologicalPosition: { position: number; total: number } | null;
  sessionUrl: string;
  scheduledAt: string | null;
  cancelReason: string | null;
  /** CR-EF-099 — structured flag: 'charged' = consumed a session, 'free' = did not. */
  chargedFree?: "charged" | "free" | null;
  isEmpty: boolean;
  onAssignWorkout: (sessionId: string) => void;
}

/**
 * Collapsed one-liner session row — the block overview's real design
 * (hub-block-module.html `sessionHtml`/`actionsHtml`). Day+time · archetype ·
 * focus label · status pill · 1–2 action buttons. The prescription lives on
 * the dedicated session page, so there is no inline exercise table here.
 */
export function SessionRow({
  sessionId,
  archetypeLabel,
  archetypeTint,
  focusLabel,
  status,
  dayLabel,
  chronologicalPosition,
  sessionUrl,
  scheduledAt,
  cancelReason,
  chargedFree,
  isEmpty,
  onAssignWorkout,
}: SessionRowProps) {
  const router = useRouter();
  const [rescheduling, setRescheduling] = useState(false);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  const settled = status === "completed" || status === "cancelled";

  const startReschedule = () => {
    if (scheduledAt) {
      setReschedDate(isoToLocalDate(scheduledAt));
      setReschedTime(isoToLocalTime(scheduledAt));
    } else {
      setReschedDate(todayLocalISODate());
      setReschedTime("10:00");
    }
    setRescheduling(true);
  };

  const saveReschedule = async () => {
    if (!reschedDate || !reschedTime) {
      toast.error("Set a date and time");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_at: localPartsToISO(reschedDate, reschedTime) }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to reschedule");
      return;
    }
    toast.success("Session rescheduled");
    setRescheduling(false);
    router.refresh();
  };

  return (
    <div className="border-t border-[var(--hub-border)] first:border-t-0">
      <div className={`flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-2.5 hover:bg-[var(--hub-hover)] transition-colors ${status === "cancelled" ? "opacity-55" : ""}`}>
        <span className="min-w-[92px] shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {dayLabel}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${archetypeTint}`}>
            {archetypeLabel}
          </span>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-semibold truncate ${settled ? "text-muted-foreground" : "text-foreground"}`}>
              {focusLabel}
            </span>
            {chronologicalPosition && (
              <span className="text-[11px] text-muted-foreground">
                Session {chronologicalPosition.position} of {chronologicalPosition.total}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3.5 w-full justify-end sm:w-auto sm:contents">
          <span className="w-[150px] shrink-0 flex justify-end">
            <SessionStatusPill status={status} />
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {status === "completed" && (
              <Link
                href={sessionUrl}
                className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors"
              >
                View
              </Link>
            )}
            {status === "cancelled" && (
              <Link
                href={sessionUrl}
                className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
              >
                View
              </Link>
            )}
            {status === "planned" && (
              <>
                {isEmpty ? (
                  <button
                    type="button"
                    onClick={() => onAssignWorkout(sessionId)}
                    className="inline-flex items-center rounded-lg bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Assign workout
                  </button>
                ) : (
                  <Link
                    href={`${sessionUrl}?edit=1`}
                    className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors"
                  >
                    Edit
                  </Link>
                )}
                <button
                  type="button"
                  onClick={startReschedule}
                  className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
                >
                  Schedule
                </button>
              </>
            )}
            {(status === "scheduled" || status === "in_progress") && (
              <>
                <Link
                  href={sessionUrl}
                  className="inline-flex items-center rounded-lg bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  {status === "in_progress" ? "Resume" : "View"}
                </Link>
                <button
                  type="button"
                  onClick={startReschedule}
                  className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
                >
                  Reschedule
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {status === "cancelled" && (
        <div className="px-4 pb-3 text-xs text-muted-foreground">
          {chargedFree === "charged" && (
            <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger-border)] px-2 py-0 text-[10px] font-bold mr-1.5">
              Charged
            </span>
          )}
          {chargedFree === "free" && (
            <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] text-[var(--teal)] border border-[var(--status-success-border)] px-2 py-0 text-[10px] font-bold mr-1.5">
              Free
            </span>
          )}
          Cancelled{cancelReason ? ` — ${cancelReason}` : ""}
        </div>
      )}

      {rescheduling && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <span className="text-xs text-muted-foreground">Move to</span>
          <input
            type="date"
            value={reschedDate}
            onChange={(e) => setReschedDate(e.target.value)}
            className="h-8 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2 text-xs text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
          />
          <input
            type="time"
            value={reschedTime}
            onChange={(e) => setReschedTime(e.target.value)}
            className="h-8 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2 text-xs text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
          />
          <button
            type="button"
            onClick={saveReschedule}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-lg bg-rose px-3 text-xs font-semibold text-white hover:bg-rose/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setRescheduling(false)}
            className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
