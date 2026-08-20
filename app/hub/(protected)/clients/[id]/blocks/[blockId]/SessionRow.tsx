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
  sessionUrl: string;
  scheduledAt: string | null;
  cancelReason: string | null;
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
  sessionUrl,
  scheduledAt,
  cancelReason,
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
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-2.5 hover:bg-[var(--hub-hover)] transition-colors">
        <span className="w-[92px] shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {dayLabel}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${archetypeTint}`}>
            {archetypeLabel}
          </span>
          <span className={`text-sm font-semibold truncate ${settled ? "text-muted-foreground" : "text-foreground"}`}>
            {focusLabel}
          </span>
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
                <Link
                  href={`${sessionUrl}?edit=1`}
                  className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors"
                >
                  Edit
                </Link>
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
                  {status === "in_progress" ? "Resume" : "Log"}
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

      {status === "cancelled" && cancelReason && (
        <div className="px-4 pb-3 text-xs text-muted-foreground">Cancelled — {cancelReason}</div>
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
