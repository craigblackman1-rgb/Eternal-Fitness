"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import type { SessionStatus, SetLog } from "@/types";
import {
  isoToLocalDate,
  isoToLocalTime,
  localPartsToISO,
  todayLocalISODate,
} from "@/lib/schedule-dates";
import { buildSessionSetEvidence, type ExerciseSetEvidence } from "@/lib/session-sets";

interface SessionRowProps {
  sessionId: string;
  archetypeLabel: string;
  archetypeTint: string;
  focusLabel: string;
  status: SessionStatus;
  dayLabel: string;
  chronologicalPosition: { position: number; total: number } | null;
  sessionUrl: string;
  scheduledAt: string | null;
  projectedAt?: string | null;
  completedAt?: string | null;
  cancelReason: string | null;
  chargedFree?: "charged" | "free" | null;
  isEmpty: boolean;
  setCount?: number | null;
  pbCount?: number | null;
  onAssignWorkout: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  onAddSupplementary?: (sessionId: string) => void;
  canCancel?: boolean;
}

function fmtShort(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

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
  projectedAt,
  completedAt,
  cancelReason,
  chargedFree,
  isEmpty,
  setCount,
  pbCount,
  onAssignWorkout,
  onCancel,
  onAddSupplementary,
  canCancel,
}: SessionRowProps) {
  const router = useRouter();
  const [rescheduling, setRescheduling] = useState(false);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("10:00");
  const [pushAlong, setPushAlong] = useState(false);
  const [saving, setSaving] = useState(false);

  // Evidence expansion state
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState(false);
  const [evidenceExercises, setEvidenceExercises] = useState<ExerciseSetEvidence[] | null>(null);

  const settled = status === "completed" || status === "cancelled";
  const hasEvidence = status === "completed" && (setCount != null ? setCount > 0 : true);

  const toggleEvidence = async () => {
    if (evidenceOpen) {
      setEvidenceOpen(false);
      return;
    }
    setEvidenceOpen(true);
    if (evidenceExercises) return; // already loaded
    setEvidenceLoading(true);
    setEvidenceError(false);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/set-logs`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const logs: SetLog[] = await res.json();
      const evidence = buildSessionSetEvidence(logs);
      setEvidenceExercises(evidence.exercises);
    } catch {
      setEvidenceError(true);
    } finally {
      setEvidenceLoading(false);
    }
  };

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
      body: JSON.stringify({ scheduled_at: localPartsToISO(reschedDate, reschedTime), push_along: pushAlong }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to reschedule");
      return;
    }
    toast.success("Session rescheduled");
    setRescheduling(false);
    router.refresh();
  };

  // Date divergence: "Booked Mon 25 · Written up Thu 28"
  const dateDivergence = scheduledAt && completedAt
    ? fmtShort(scheduledAt) !== fmtShort(completedAt)
      ? `Booked ${fmtShort(scheduledAt)} · Written up ${fmtShort(completedAt)}`
      : null
    : null;

  const displaySetCount = setCount ?? 0;
  const displayPbCount = pbCount ?? 0;

  return (
    <div className={`border-t border-[var(--hub-border)] first:border-t-0 ${evidenceOpen ? "border-b-0" : ""}`}>
      <div className={`flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-2.5 hover:bg-[var(--hub-hover)] transition-colors ${status === "cancelled" ? "opacity-55" : ""} ${evidenceOpen ? "rounded-t-nested" : ""}`}>
        <span className="min-w-[92px] shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {projectedAt
            ? `${new Date(projectedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · projected`
            : dayLabel}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold shrink-0 ${archetypeTint}`}>
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
          {/* Evidence chip — completed sessions only */}
          {hasEvidence && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleEvidence(); }}
              className="text-[12.5px] font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer font-[inherit] whitespace-nowrap"
            >
              {displaySetCount} set{displaySetCount !== 1 ? "s" : ""}
              {displayPbCount > 0 && ` · ${displayPbCount} PB${displayPbCount !== 1 ? "s" : ""}`}
            </button>
          )}
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
                {status === "scheduled" && isEmpty ? (
                  <button
                    type="button"
                    onClick={() => onAssignWorkout(sessionId)}
                    className="inline-flex items-center rounded-lg bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Assign workout
                  </button>
                ) : (
                  <Link
                    href={sessionUrl}
                    className="inline-flex items-center rounded-lg bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    {status === "in_progress" ? "Resume" : "View"}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={startReschedule}
                  className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
                >
                  Reschedule
                </button>
              </>
            )}
            {(onCancel || onAddSupplementary) && status !== "completed" && status !== "cancelled" && (
              <>
                {onAddSupplementary && (
                  <button
                    type="button"
                    onClick={() => onAddSupplementary(sessionId)}
                    title="Work that runs alongside this session without using one up"
                    className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
                  >
                    + Supplementary
                  </button>
                )}
                {onCancel && canCancel && (
                  <button
                    type="button"
                    onClick={() => onCancel(sessionId)}
                    className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Date divergence — "Booked Mon 25 · Written up Thu 28" */}
      {dateDivergence && (
        <div className="px-4 pb-1 text-[12px] text-muted-foreground">
          {dateDivergence}
        </div>
      )}

      {/* Cancelled row — dual badges + reason */}
      {status === "cancelled" && (
        <div className="px-4 pb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="inline-flex items-center rounded-pill bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger-border)] px-2 py-0 text-[10px] font-bold">
              Cancelled
            </span>
            {chargedFree === "charged" && (
              <span className="inline-flex items-center rounded-pill bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger-border)] px-2 py-0 text-[10px] font-bold">
                Charged
              </span>
            )}
            {chargedFree === "free" && (
              <span className="inline-flex items-center rounded-pill bg-[var(--status-success-bg)] text-[var(--teal)] border border-[var(--status-success-border)] px-2 py-0 text-[10px] font-bold">
                Free
              </span>
            )}
            {displaySetCount > 0 && (
              <span className="inline-flex items-center rounded-pill bg-[var(--s-neutral-bg)] text-[var(--color-body)] border border-[var(--s-neutral-border)] px-2 py-0 text-[10px] font-bold">
                {displaySetCount} set{displaySetCount !== 1 ? "s" : ""} kept
              </span>
            )}
          </div>
          {cancelReason && (
            <div className="text-[12px] text-muted-foreground">{cancelReason}</div>
          )}
        </div>
      )}

      {/* Expandable evidence panel */}
      {evidenceOpen && (
        <div className="px-4 pb-3">
          <div className="border border-[var(--hub-border)] border-t-0 rounded-b-nested bg-[var(--hub-card)] overflow-hidden">
            {evidenceLoading && (
              <div className="px-3 py-3 text-xs text-muted-foreground">Loading sets…</div>
            )}
            {evidenceError && (
              <div className="px-3 py-3 text-xs text-[var(--status-danger)]">Couldn't load set data.</div>
            )}
            {evidenceExercises && evidenceExercises.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted-foreground">No sets recorded for this session.</div>
            )}
            {evidenceExercises && evidenceExercises.length > 0 && (
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr>
                    <th className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground text-left bg-[var(--hub-hover)] px-3 py-1.5">Exercise</th>
                    <th className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground text-left bg-[var(--hub-hover)] px-3 py-1.5">Set</th>
                    <th className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground text-left bg-[var(--hub-hover)] px-3 py-1.5">Weight</th>
                    <th className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground text-left bg-[var(--hub-hover)] px-3 py-1.5">Reps</th>
                    <th className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground text-left bg-[var(--hub-hover)] px-3 py-1.5">RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceExercises.map((ex) =>
                    ex.sets.map((set, si) => (
                      <tr key={`${ex.key}-${set.setNumber}`} className="border-b border-[var(--hub-border)] last:border-b-0">
                        {si === 0 && (
                          <td className="px-3 py-1.5 font-semibold text-foreground" rowSpan={ex.sets.length}>
                            {ex.name}
                          </td>
                        )}
                        <td className="px-3 py-1.5 tabular-nums">{set.setNumber}</td>
                        <td className="px-3 py-1.5 tabular-nums">{set.summary}</td>
                        <td className="px-3 py-1.5 tabular-nums">{!set.completed ? "skipped" : ""}</td>
                        <td className="px-3 py-1.5 tabular-nums"></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Rescheduling UI */}
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
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pushAlong}
              onChange={(e) => setPushAlong(e.target.checked)}
              className="h-3.5 w-3.5 accent-rose"
            />
            Roll workouts forward to later sessions
          </label>
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
