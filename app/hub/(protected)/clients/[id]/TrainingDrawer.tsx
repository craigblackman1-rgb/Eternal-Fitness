"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DrawerShell, useDrawerManager } from "./DrawerManager";
import { SessionChooser } from "./SessionChooser";
import { SessionMoveDialog } from "./SessionMoveDialog";
import { ShiftScheduleDialog } from "./ShiftScheduleDialog";
import { sessionWorkoutName } from "@/lib/session-display";
import { blockDisplayName } from "@/lib/block-name";
import { SupplementaryWorkoutsCard } from "@/components/hub/SupplementaryWorkoutsCard";
import { ensureUids } from "@/lib/exercise-ref";
import type { DBBlock, DBSession, SessionVersion, BlockStatus } from "@/types";
import type { DBProgramSlot, QueueState } from "@/lib/programs/types";
import type {
  TrainerizeHistoryData,
  TrainerizePerformedWorkoutSummary,
  TrainerizePerformedExerciseDetail,
} from "@/components/hub";

/* ── TrainingDrawer — per approved mockup: fcard sections with accent
   bands, week-grouped queue map, paginated sessions with Reassign/Move/Cancel,
   supplementary, standing rules, past programmes with derived status. ────── */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtShortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtDayShort(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

function sourceLabel(source: string): string {
  switch (source) {
    case "message": return "Message";
    case "attention": return "Attention flag";
    case "program_instruction": return "Program note";
    case "workout_instruction": return "Workout note";
    default: return source;
  }
}

/** Short display label for queue cells: "Workout 1" → "W1". */
function slotLetter(slot: DBProgramSlot): string {
  const label = slot.label?.trim();
  if (label) {
    const stripped = label.replace(/^(?:Workout|Warm[\s-]*up)\s+/i, "");
    const match = stripped.match(/^([A-Za-z0-9]+)/);
    if (match) {
      const prefix = /^workout\s/i.test(label) ? "W" : "";
      return prefix + match[1];
    }
    return stripped.slice(0, 3);
  }
  return String.fromCharCode(64 + slot.position);
}

/** Collapsed row for a Trainerize-performed workout, expanding on click. */
function PerformedWorkoutRow({
  workout,
  clientNumber,
  isOpen,
  onToggle,
  detail,
}: {
  workout: TrainerizePerformedWorkoutSummary;
  clientNumber: number;
  isOpen: boolean;
  onToggle: () => void;
  detail: TrainerizePerformedExerciseDetail[] | "loading" | "error" | undefined;
}) {
  const exerciseCount = workout.exercises.length;
  return (
    <div>
      <button type="button" className="srow" style={{ paddingLeft: 30 }} onClick={onToggle}>
        <span className="srow-d" style={{ width: 18, fontSize: 12 }}>{isOpen ? "\u25be" : "\u25b8"}</span>
        <span className="srow-w">
          {workout.workoutName || "Workout"}
          <small>
            {fmtShortDate(workout.performedDate)} \u00b7 {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} \u00b7 {workout.setCount} set{workout.setCount !== 1 ? "s" : ""}
          </small>
        </span>
      </button>
      {isOpen && (
        <div className="fcard-b pad rounded-control-sm" style={{ background: "var(--hub-hover)", borderBottom: "1px solid var(--hub-border)", marginLeft: 18 }}>
          {detail === "loading" && <p className="miss" style={{ margin: 0 }}>Loading sets\u2026</p>}
          {detail === "error" && <p className="miss" style={{ margin: 0 }}>Couldn&rsquo;t load this workout&rsquo;s sets.</p>}
          {Array.isArray(detail) && detail.length === 0 && (
            <p className="miss" style={{ margin: 0 }}>No sets recorded for this workout.</p>
          )}
          {Array.isArray(detail) && detail.map((ex, i) => (
            <div key={i} style={{ marginBottom: i < detail.length - 1 ? 10 : 0 }}>
              <p className="fk" style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--color-ink)" }}>{ex.name}</p>
              <table className="ptab">
                <thead>
                  <tr><th>Set</th><th>Reps</th><th>Weight</th><th>RPE</th></tr>
                </thead>
                <tbody>
                  {ex.sets.map((s, si) => (
                    <tr key={si}>
                      <td className="n">{s.setNumber}</td>
                      <td className="n">{s.reps ?? "\u2014"}</td>
                      <td className="n">{s.weightKg != null ? `${s.weightKg}kg` : "\u2014"}</td>
                      <td className="n">{s.rpe ?? "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

interface TrainingDrawerProps {
  clientNumber: number;
  clientName: string;
  sessionDuration: number | null;
  deliveryMode: string | null;
  preferredTime: string | null;
  latestBlock: DBBlock | null;
  blockSessions: DBSession[];
  allBlocks: DBBlock[];
  allSessions: DBSession[];
  blockSessionCounts: Record<number, number>;
  blockDateRangeLabel: string;
  exerciseTrendSummary?: {
    totalExercisesLogged: number;
    personalBests: number;
    heaviestLift: string | null;
    belowBestCount: number;
    recentNotes: string | null;
  };
  trainerizeHistory: TrainerizeHistoryData;
  standingRules?: { id: string; label: string | null; detail: string }[];
  sessionsRemaining: number | null;
  sessionsPurchased: number | null;
  paymentStatus: string | null;
  packageType: string | null;
  programState: QueueState | null;
  flaggedSessionIds: Set<string>;
  activeProgramId: string | null;
  clientId: string;
  derivedStatusByBlock?: Map<string, BlockStatus>;
}

export function TrainingDrawer({
  clientNumber,
  clientName,
  sessionDuration,
  deliveryMode,
  preferredTime,
  latestBlock,
  blockSessions,
  allBlocks,
  allSessions,
  blockSessionCounts,
  blockDateRangeLabel,
  exerciseTrendSummary,
  trainerizeHistory,
  standingRules = [],
  sessionsRemaining,
  sessionsPurchased,
  paymentStatus,
  packageType,
  programState,
  flaggedSessionIds,
  activeProgramId,
  clientId,
  derivedStatusByBlock,
}: TrainingDrawerProps) {
  const { openWorkoutDrawer } = useDrawerManager();
  const router = useRouter();

  // ── Dialog state ──
  const [chooserSessionId, setChooserSessionId] = useState<string | null>(null);
  const [chooserBusy, setChooserBusy] = useState(false);
  const [moveSession, setMoveSession] = useState<DBSession | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [extending, setExtending] = useState(false);

  // ── Paid-pot computation ──
  const isOngoing = !sessionsPurchased || packageType === "ongoing";
  const totalSessions = isOngoing ? null : sessionsPurchased;
  const remaining = sessionsRemaining ?? 0;

  // ── Program queue derivation ──
  const slots = programState?.slots ?? [];
  const totalQueueSlots = programState?.totalSlots ?? 0;
  const completedCount = programState?.completedCount ?? 0;
  const nextPosition = programState?.nextPosition ?? 1;
  const currentWeek = programState?.currentWeek ?? 1;
  const programWeeks = programState?.program?.weeks ?? 1;
  const programName = programState?.program?.name ?? "";
  const slotCount = slots.length;

  // Scheduled sessions by queue position
  const scheduledByPosition: Record<number, { scheduledAt: string | null }> = {};
  const programSessions = blockSessions.filter(
    (s) => s.program_id && s.program_slot_id && !s.parent_session_id
  );

  // Flagged positions (completed with no sets)
  const flaggedPositions = new Set<number>();
  for (const s of programSessions) {
    if (s.completed_at && flaggedSessionIds.has(s.id) && s.program_slot_id) {
      const slot = slots.find((sl) => sl.id === s.program_slot_id);
      if (slot) {
        flaggedPositions.add(slot.position);
      }
    }
  }

  // Scheduled sessions list (not supplementary, not cancelled, not completed)
  const scheduledSessions = blockSessions
    .filter((s) => s.scheduled_at && !s.completed_at && !s.cancelled_at && !s.parent_session_id)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  // Past programs (all except the latest)
  const pastBlocks = allBlocks.filter((b) => latestBlock && b.id !== latestBlock.id);

  // Trainerize history summary
  const tBlocks = trainerizeHistory.blocks ?? [];
  const unmatched = trainerizeHistory.unmatchedPerformedWorkouts ?? [];
  const notes = trainerizeHistory.notes ?? [];
  const tzTotalSessions = tBlocks.reduce(
    (sum: number, b: any) => sum + (b.performedWorkouts?.length ?? 0), 0
  ) + unmatched.length;
  const hasHistory = tBlocks.length > 0 || unmatched.length > 0 || notes.length > 0;

  const allDates: string[] = [];
  for (const b of tBlocks) {
    if (b.start_date) allDates.push(b.start_date);
    if (b.end_date) allDates.push(b.end_date);
  }
  for (const w of unmatched) if (w.performedDate) allDates.push(w.performedDate);
  const sortedDates = allDates.sort();
  const periodStart = sortedDates.length > 0 ? sortedDates[0] : null;
  const periodEnd = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [detailCache, setDetailCache] = useState<Record<string, TrainerizePerformedExerciseDetail[] | "loading" | "error">>({});

  const toggleWorkout = (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null);
      return;
    }
    setExpandedWorkoutId(workoutId);
    if (detailCache[workoutId]) return;
    setDetailCache((c) => ({ ...c, [workoutId]: "loading" }));
    fetch(`/api/clients/${clientNumber}/trainerize-workout/${workoutId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((json) => setDetailCache((c) => ({ ...c, [workoutId]: json.exercises ?? [] })))
      .catch(() => setDetailCache((c) => ({ ...c, [workoutId]: "error" })));
  };

  const renderPerformedList = (workouts: TrainerizePerformedWorkoutSummary[]) =>
    workouts.map((w) => (
      <PerformedWorkoutRow
        key={w.id}
        workout={w}
        clientNumber={clientNumber}
        isOpen={expandedWorkoutId === w.id}
        onToggle={() => toggleWorkout(w.id)}
        detail={detailCache[w.id]}
      />
    ));

  // ── Reassign handler ──
  async function handleReassignProgram(sessionId: string, slotId: string) {
    setChooserBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programState?.program.id ?? null,
          program_slot_id: slotId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reassign");
      }
      toast.success("Session reassigned to program slot");
      setChooserSessionId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reassign");
    } finally {
      setChooserBusy(false);
    }
  }

  async function handleReassignTemplate(sessionId: string, templateId: string, templateName: string) {
    setChooserBusy(true);
    try {
      const tplRes = await fetch("/api/workout-templates");
      if (!tplRes.ok) throw new Error("Could not load template data");
      const tplList: { id: string; name: string; data: SessionVersion }[] = await tplRes.json();
      const tpl = tplList.find((t) => t.id === templateId);
      if (!tpl) throw new Error("Template not found");

      const versions: Record<string, SessionVersion> = {};
      const buildVersion = (src: SessionVersion): SessionVersion => ({
        warm_up: ensureUids(src.warm_up ?? []),
        main_block: ensureUids(src.main_block ?? []),
        cooldown: ensureUids(src.cooldown ?? []),
      });
      versions.studio = buildVersion(tpl.data);
      versions.home = buildVersion(tpl.data);

      const patchBody = {
        data: { versions, focus_label: tpl.name },
        source_focus_label: tpl.name,
        source_archetype: null,
      };

      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign template");
      }

      fetch(`/api/workout-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment_usage: true }),
      }).catch(() => {});

      toast.success(`Assigned "${tpl.name}" to session`);
      setChooserSessionId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign template");
    } finally {
      setChooserBusy(false);
    }
  }

  function handleReassignOneOff(sessionId: string) {
    setChooserSessionId(null);
    router.push(`/hub/clients/${clientNumber}/add-workout?view=chooser`);
  }

  async function handleExtendProgram(weeks: number) {
    if (!programState?.program.id) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/programs/${programState.program.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extend program");
      }
      toast.success(`Program extended by ${weeks} week${weeks === 1 ? "" : "s"}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extend program");
    } finally {
      setExtending(false);
    }
  }

  // ── Week-grouped queue map data ──
  const weeks: Array<{
    label: string;
    cells: Array<{
      queueIndex: number;
      slotLabel: string;
      fullLabel: string;
      dayLabel: string;
      state: "done" | "flag" | "next" | "plain" | "beyond";
      ariaLabel: string;
    }>;
  }> = [];

  if (slotCount > 0 && totalQueueSlots > 0) {
    const totalWeeks = Math.ceil(totalQueueSlots / slotCount);
    const beyondPaidStart = totalSessions
      ? Math.max(0, totalSessions - completedCount)
      : Infinity;

    for (let w = 0; w < totalWeeks; w++) {
      const weekCells: typeof weeks[0]["cells"] = [];
      for (let s = 0; s < slotCount; s++) {
        const queueIndex = w * slotCount + s + 1;
        if (queueIndex > totalQueueSlots) break;

        const slot = slots.find((sl) => sl.position === s + 1);
        const slotLabel = slot ? slotLetter(slot) : String(s + 1);
        const fullLabel = slot?.label?.trim() || slotLabel;
        const scheduled = scheduledByPosition[queueIndex];
        const dayLabel = scheduled ? fmtDayShort(scheduled.scheduledAt) : "";

        let state: "done" | "flag" | "next" | "plain" | "beyond";
        if (queueIndex <= completedCount) {
          state = flaggedPositions.has(queueIndex) ? "flag" : "done";
        } else if (queueIndex === completedCount + 1) {
          state = "next";
        } else if (queueIndex > completedCount + beyondPaidStart) {
          state = "beyond";
        } else {
          state = "plain";
        }

        weekCells.push({
          queueIndex,
          slotLabel,
          fullLabel,
          dayLabel,
          state,
          ariaLabel: `${dayLabel ? `${dayLabel}, ` : ""}${fullLabel}${
            state === "next" ? ", next session" : ""
          }${state === "flag" ? ", completed with no sets logged" : ""}${
            state === "beyond" ? ", beyond the current paid pot" : ""
          }`,
        });
      }
      weeks.push({
        label: `Week ${w + 1}`,
        cells: weekCells,
      });
    }
  }

  // Beyond-paid count for the note
  const beyondPaidCount = totalSessions
    ? Math.max(0, remaining - (totalQueueSlots - completedCount))
    : 0;

  return (
    <DrawerShell
      id="dw-training"
      title="Training"
      subtitle={
        programState
          ? `${clientName} — ${programState.program.name} · ${remaining} of ${totalSessions ?? "?"} paid sessions remaining`
          : latestBlock
            ? `Block ${latestBlock.block_number} · ${blockSessionCounts[latestBlock.block_number] ?? blockSessions.length} sessions`
            : allBlocks.length > 0 ? `${allBlocks.length} blocks` : "No training yet"
      }
      width="lg"
    >
      {/* ═══ PROGRAM QUEUE ═══ */}
      {programState && totalQueueSlots > 0 && (
        <div className="fcard acc-teal mb-3.5">
          <div className="fcard-h">
            <span>Program queue</span>
            <span className="sub ml-2.5 normal-case tracking-normal font-medium text-[12px] text-[var(--color-body)]">
              {totalQueueSlots} slots \u00b7 consumed only by completed sessions, in order
            </span>
            <button
              type="button"
              className="btn-link ml-auto"
              onClick={() => router.push(`/hub/clients/${clientNumber}/programs/${programState.program.id}`)}
            >
              Open in builder
            </button>
          </div>
          <div className="fcard-b">
            {/* Queue map legend */}
            {slotCount > 0 && (
              <div className="flex gap-4 flex-wrap text-[12px] text-[var(--color-body)] mb-2.5 pb-2.5 border-b border-[var(--hub-border)]">
                {slots.map((sl) => (
                  <span key={sl.id}>
                    <b className="text-[var(--color-ink)] font-bold mr-1">{slotLetter(sl)}</b>
                    {sl.label?.trim() || `Slot ${sl.position}`}
                  </span>
                ))}
              </div>
            )}

            {/* Week-grouped queue map */}
            <div className="border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] p-3">
              {weeks.map((week, wi) => (
                <div key={wi} className={`flex items-center gap-3 py-1.5 ${wi > 0 ? "border-t border-[var(--hub-border)]" : ""}`}>
                  <span className="w-[88px] shrink-0 text-[11.5px] font-bold text-[var(--color-muted)]">
                    {week.label}
                  </span>
                  <div className="flex gap-1.5">
                    {week.cells.map((cell) => {
                      const isNext = cell.state === "next";
                      const isDone = cell.state === "done";
                      const isFlag = cell.state === "flag";
                      const isBeyond = cell.state === "beyond";
                      return (
                        <button
                          key={cell.queueIndex}
                          type="button"
                          title={cell.fullLabel}
                          aria-label={cell.ariaLabel}
                          onClick={() => {
                            if (isBeyond) return;
                            const slotAtPosition = slots.find((sl) => sl.position === ((cell.queueIndex - 1) % slotCount) + 1);
                            if (!slotAtPosition) return;
                            const sessionForCell = programSessions.find((s) => s.program_slot_id === slotAtPosition.id);
                            if (sessionForCell) openWorkoutDrawer(sessionForCell.id);
                          }}
                          className={`
                            w-[92px] h-[44px] shrink-0 border rounded-control
                            flex flex-col items-center justify-center gap-0.5
                            font-[inherit] p-0 transition-[border-color,box-shadow] duration-[120ms]
                            ${isBeyond
                              ? "bg-[var(--hub-hover)] border-dashed border-[var(--hub-border)] cursor-default hover:border-[var(--hub-border)] hover:shadow-none"
                              : isDone
                                ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] cursor-pointer hover:border-[var(--color-rose)] hover:shadow-[0_0_0_1px_var(--color-rose)]"
                                : isFlag
                                  ? "bg-[var(--status-warning-bg)] border-[var(--status-warning)] cursor-pointer hover:border-[var(--color-rose)] hover:shadow-[0_0_0_1px_var(--color-rose)]"
                                  : isNext
                                    ? "bg-[var(--status-primary-bg)] border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] cursor-pointer"
                                    : "bg-white border-[var(--hub-border)] cursor-pointer hover:border-[var(--color-rose)] hover:shadow-[0_0_0_1px_var(--color-rose)]"
                            }
                          `}
                        >
                          <small className={`text-[10.5px] font-semibold tabular-nums ${
                            isBeyond
                              ? "text-[var(--color-muted)]"
                              : isDone || isFlag
                                ? "text-[var(--color-teal)]"
                                : isNext
                                  ? "text-[var(--color-rose)]"
                                  : "text-[var(--color-body)]"
                          }`}>
                            {cell.dayLabel || "\u00a0"}
                          </small>
                          <b className={`text-[13px] font-extrabold leading-none ${
                            isBeyond
                              ? "text-[var(--color-muted)]"
                              : isDone || isFlag
                                ? "text-[var(--color-teal)]"
                                : isNext
                                  ? "text-[var(--color-rose)]"
                                  : "text-[var(--color-ink)]"
                          }`}>
                            {cell.slotLabel}
                          </b>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Map key */}
              <div className="flex gap-3.5 flex-wrap mt-2.5 pt-2.5 border-t border-[var(--hub-border)] text-[11.5px] text-[var(--color-body)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-[11px] h-[11px] rounded-[3px] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] shrink-0" />
                  Completed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-[11px] h-[11px] rounded-[3px] border border-[var(--status-warning)] bg-[var(--status-warning-bg)] shrink-0" />
                  Completed, no sets logged
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-[11px] h-[11px] rounded-[3px] border border-[var(--color-rose)] bg-[var(--status-primary-bg)] shrink-0" />
                  Next up
                </span>
                <span>Plain cells are scheduled</span>
                {totalSessions && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-[11px] h-[11px] rounded-[3px] border border-dashed border-[var(--hub-border)] bg-[var(--hub-hover)] shrink-0" />
                    Beyond the {remaining} remaining paid sessions
                  </span>
                )}
              </div>
            </div>

            {/* Beyond-paid note */}
            {beyondPaidCount > 0 && (
              <div className="flex items-center gap-2.5 mt-2.5 text-[13px] text-[var(--color-muted)]">
                <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--color-muted)]" />
                <span>
                  {beyondPaidCount} slot{beyondPaidCount === 1 ? "" : "s"} run past what&rsquo;s currently paid for.{" "}
                  {clientName} needs a pot renewal, or those sessions have nowhere to bill against.{" "}
                  <button
                    type="button"
                    disabled={extending}
                    onClick={() => handleExtendProgram(2)}
                    className="inline font-[inherit] text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer disabled:opacity-50"
                  >
                    {extending ? "Extending\u2026" : "Manage the pot"}
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SCHEDULED SESSIONS ═══ */}
      {scheduledSessions.length > 0 && (
        <div className="fcard acc-teal mb-3.5">
          <div className="fcard-h">
            <span>Scheduled sessions</span>
            <span className="sub ml-2.5 normal-case tracking-normal font-medium text-[12px] text-[var(--color-body)]">
              {scheduledSessions.length} booked \u00b7 {preferredTime ? preferredTime : ""}
            </span>
            <button
              type="button"
              className="btn-link ml-auto"
              onClick={() => setShiftOpen(true)}
            >
              Shift schedule
            </button>
          </div>
          <div className="fcard-b">
            {(showAllSessions ? scheduledSessions : scheduledSessions.slice(0, 5)).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 py-[9px] border-b border-[var(--hub-border)] last:border-b-0"
              >
                <span className="w-[130px] shrink-0 text-[13px] font-semibold text-[var(--color-ink)]">
                  {fmtShortDate(s.scheduled_at!)}
                  <small className="block text-[11.5px] font-medium text-[var(--color-muted)]">
                    {preferredTime ?? ""}
                  </small>
                </span>
                <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)]">
                  {sessionWorkoutName(s)}
                </span>
                <span className="flex gap-1 shrink-0">
                  {programState && (
                    <button
                      onClick={() => setChooserSessionId(s.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-control border border-[var(--hub-field-border)] bg-white px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer hover:bg-[var(--hub-hover)] transition-colors"
                    >
                      Reassign
                    </button>
                  )}
                  <button
                    onClick={() => setMoveSession(s)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-control border border-[var(--hub-field-border)] bg-white px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer hover:bg-[var(--hub-hover)] transition-colors"
                  >
                    Move
                  </button>
                  <button
                    onClick={() => setMoveSession(s)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-control border border-[var(--hub-field-border)] bg-white px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer hover:bg-[var(--hub-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                </span>
              </div>
            ))}
            {scheduledSessions.length > 5 && !showAllSessions && (
              <button
                type="button"
                onClick={() => setShowAllSessions(true)}
                className="w-full py-2 mt-1 text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer text-left font-[inherit]"
              >
                Show all {scheduledSessions.length} sessions
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ SUPPLEMENTARY ═══ */}
      <div className="fcard mb-3.5">
        <div className="fcard-h">
          <span>Supplementary</span>
          <span className="sub ml-2.5 normal-case tracking-normal font-medium text-[12px] text-[var(--color-body)]">
            runs alongside the program \u00b7 never uses a slot or a paid session
          </span>
        </div>
        <div className="fcard-b">
          <SupplementaryWorkoutsCard
            clientNumber={clientNumber}
            clientName={clientName}
            sessionsRemaining={sessionsRemaining}
          />
        </div>
      </div>

      {/* ═══ STANDING RULES ═══ */}
      {standingRules.length > 0 && (
        <div className="fcard acc-amber mb-3.5">
          <div className="fcard-h">
            <span>Standing rules</span>
            <button
              type="button"
              className="btn-link ml-auto"
              onClick={() => router.push(`/hub/clients/${clientNumber}`)}
            >
              Edit rules
            </button>
          </div>
          <div className="fcard-b">
            <div className="flex flex-wrap gap-1.5">
              {standingRules.map((rule) => (
                <span
                  key={rule.id}
                  className="inline-flex items-center h-[25px] px-2.5 rounded-pill bg-[var(--hub-hover)] border border-[var(--hub-border)] text-[12.5px] text-[var(--color-ink)]"
                >
                  {rule.label && <span className="font-semibold">{rule.label} \u2014 </span>}
                  {rule.detail}
                </span>
              ))}
            </div>
            <p className="miss mt-2 mb-0">
              Both apply to every slot. Either one that bites the next session is named on it.
            </p>
          </div>
        </div>
      )}

      {/* ═══ PAST PROGRAMMES ═══ */}
      {pastBlocks.length > 0 && (
        <div className="fcard acc-ink mb-3.5">
          <div className="fcard-h">
            <span>Past programmes</span>
          </div>
          <div className="fcard-b">
            {(showAllPast ? pastBlocks : pastBlocks.slice(0, 4)).map((block) => {
              const blockSessionsForCount = allSessions.filter(
                (s) => s.block_id === block.id && !s.parent_session_id
              );
              const dates = blockSessionsForCount
                .filter((s) => s.scheduled_at)
                .map((s) => s.scheduled_at!)
                .sort();
              const dateLabel = dates.length > 0
                ? `${fmtDate(dates[0])}${dates.length > 1 ? `\u2013${fmtDate(dates[dates.length - 1])}` : ""}`
                : "Not scheduled";

              // Use derived status if available, otherwise fall back to stored
              const derivedStatus = derivedStatusByBlock?.get(block.id) ?? block.status as BlockStatus;
              const statusLabel = derivedStatus === "complete" ? "Complete" : derivedStatus;

              return (
                <div
                  key={block.id}
                  className="flex items-center gap-[11px] w-full py-[8px] border-b border-[var(--hub-border)] last:border-b-0"
                >
                  <span className="w-[26px] h-[26px] shrink-0 rounded-control grid place-items-center text-[11px] font-extrabold bg-[var(--status-success-bg)] text-[var(--color-teal)]">
                    {block.block_number}
                  </span>
                  <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] font-semibold">
                    {blockDisplayName(block, blockSessionsForCount, blockSessionsForCount.length)}
                    <small className="text-xs font-normal text-[var(--color-body)] ml-2">
                      {blockSessionsForCount.length} session{blockSessionsForCount.length === 1 ? "" : "s"} \u00b7 {dateLabel}
                    </small>
                  </span>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold ${
                      derivedStatus === "complete"
                        ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
                        : derivedStatus === "active"
                          ? "bg-[var(--status-primary-bg)] text-[var(--color-rose)] border-[var(--status-primary-border)]"
                          : "bg-[var(--status-neutral-bg)] text-[var(--color-body)] border-[var(--status-neutral-border)]"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
              );
            })}
            {pastBlocks.length > 4 && !showAllPast && (
              <button
                type="button"
                onClick={() => setShowAllPast(true)}
                className="w-full py-2 mt-1 text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer text-left font-[inherit]"
              >
                Show all {pastBlocks.length} past programmes
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ BEFORE THE APP ═══ */}
      {hasHistory && (
        <div className="fcard acc-ink mb-3.5">
          <div className="fcard-h">
            <span>Before the app</span>
          </div>
          <div className="fcard-b">
            <div className="fgrid">
              <div className="frow"><span className="fk">Period</span><span className="fv num">{periodStart && periodEnd ? `${fmtShortDate(periodStart)} \u2013 ${fmtShortDate(periodEnd)}` : "\u2014"}</span></div>
              <div className="frow"><span className="fk">Blocks</span><span className="fv num">{tBlocks.length}</span></div>
              <div className="frow"><span className="fk">Sessions</span><span className="fv num">{tzTotalSessions}</span></div>
              <div className="frow"><span className="fk">Notes</span><span className="fv num">{notes.length}</span></div>
            </div>

            {tBlocks.length > 0 && (
              <>
                <p className="dw-h">Training history \u2014 tap to see sessions</p>
                {tBlocks.map((b) => {
                  const isOpen = expandedBlockId === b.id;
                  const performed = b.performedWorkouts ?? [];
                  return (
                    <div key={b.id}>
                      <button
                        type="button"
                        className="srow"
                        onClick={() => setExpandedBlockId(isOpen ? null : b.id)}
                      >
                        <span className="srow-d" style={{ width: 18, fontSize: 13 }}>{isOpen ? "\u25be" : "\u25b8"}</span>
                        <span className="srow-w">
                          {b.phase_name || "Program"}
                          <small>
                            {b.start_date && b.end_date
                              ? `${fmtShortDate(b.start_date)} \u2013 ${fmtShortDate(b.end_date)}`
                              : b.start_date
                                ? `From ${fmtShortDate(b.start_date)}`
                                : "Not dated"}
                            {" \u00b7 "}
                            {performed.length > 0 ? `${performed.length} session${performed.length !== 1 ? "s" : ""} performed` : "no sessions logged"}
                          </small>
                        </span>
                      </button>
                      {isOpen && (
                        performed.length > 0
                          ? renderPerformedList(performed)
                          : <p className="miss" style={{ padding: "10px 0 10px 30px", margin: 0 }}>No logged sessions fell inside this program&rsquo;s dates.</p>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {unmatched.length > 0 && (
              <>
                <p className="dw-h">Outside any program</p>
                <p className="miss" style={{ margin: "0 0 8px" }}>
                  {unmatched.length} logged session{unmatched.length !== 1 ? "s" : ""} from before this client&rsquo;s first imported program.
                </p>
                {renderPerformedList(unmatched)}
              </>
            )}

            <button
              type="button"
              className="dw-h"
              style={{ background: "none", border: 0, padding: 0, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, font: "inherit" }}
              onClick={() => setNotesOpen((v) => !v)}
            >
              <span style={{ fontSize: 11 }}>{notesOpen ? "\u25be" : "\u25b8"}</span>
              Notes ({notes.length})
            </button>
            {notesOpen && (
              notes.length > 0 ? (
                notes.map((n) => (
                  <div key={n.id} className="drow">
                    <span className="drow-m">
                      {sourceLabel(n.source)}{n.sender_name ? ` \u00b7 ${n.sender_name}` : ""}
                      <small style={{ whiteSpace: "pre-wrap" }}>{n.content}</small>
                    </span>
                    <span className="fk num" style={{ minWidth: 0, flexShrink: 0 }}>{fmtShortDate(n.source_date)}</span>
                  </div>
                ))
              ) : (
                <p className="miss">No notes or messages imported.</p>
              )
            )}

            <p className="miss" style={{ margin: "14px 0 0" }}>
              Imported history cannot be edited and does not count toward the session pot.
            </p>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => router.push(`/hub/clients/${clientNumber}/programs`)}
          className="inline-flex items-center justify-center gap-1.5 rounded-control border border-[var(--hub-field-border)] bg-white px-3.5 py-[7px] min-h-[36px] font-[inherit] text-[13px] font-medium text-[var(--color-body)] cursor-pointer hover:bg-[var(--hub-hover)] transition-colors"
        >
          See all workouts
        </button>
        <button
          type="button"
          onClick={() => router.push(`/hub/clients/${clientNumber}/programs/new`)}
          className="inline-flex items-center justify-center gap-1.5 rounded-control border border-transparent bg-[var(--color-rose)] text-white px-5 py-[7px] min-h-[36px] font-[inherit] text-[13px] font-semibold cursor-pointer hover:bg-[var(--color-rose)]/90 transition-colors ml-auto"
        >
          Plan next program
        </button>
      </div>

      {/* ═══ SESSION CHOOSER DIALOG ═══ */}
      {chooserSessionId && programState && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm"
            onClick={() => !chooserBusy && setChooserSessionId(null)}
          />
          <div className="relative w-full max-w-[680px] mx-4 bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_20px_60px_rgba(16,24,40,.18)] max-h-[85vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[var(--hub-border)]">
              <h3 className="m-0 text-[15.5px] font-bold text-[var(--color-ink)] tracking-tight">
                Assign this session
              </h3>
              <p className="m-0 mt-0.5 text-xs text-[var(--color-muted)]">
                {fmtShortDate(scheduledSessions.find((s) => s.id === chooserSessionId)?.scheduled_at ?? "")} \u00b7 {clientName}
              </p>
            </div>
            <div className="px-5 py-4">
              <SessionChooser
                nextSlot={programState.nextSlot}
                currentWeek={currentWeek}
                programWeeks={programWeeks}
                slotPosition={nextPosition}
                totalSlots={totalQueueSlots}
                sessionsRemaining={remaining}
                programName={programName}
                clientNumber={clientNumber}
                onConfirmProgram={(slotId) => handleReassignProgram(chooserSessionId, slotId)}
                onConfirmTemplate={(templateId, templateName) => handleReassignTemplate(chooserSessionId, templateId, templateName)}
                onConfirmOneOff={() => handleReassignOneOff(chooserSessionId)}
                onCancel={() => !chooserBusy && setChooserSessionId(null)}
              />
            </div>
            {chooserBusy && (
              <div className="absolute inset-0 bg-white/60 rounded-surface flex items-center justify-center pointer-events-none">
                <span className="text-[13px] font-semibold text-[var(--color-muted)]">Saving\u2026</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SESSION MOVE/CANCEL DIALOG ═══ */}
      {moveSession && (
        <SessionMoveDialog
          session={moveSession}
          clientNumber={clientNumber}
          clientName={clientName}
          preferredTime={preferredTime}
          onClose={() => setMoveSession(null)}
        />
      )}

      {/* ═══ SHIFT SCHEDULE DIALOG ═══ */}
      {shiftOpen && (
        <ShiftScheduleDialog
          clientNumber={clientNumber}
          clientId={clientId}
          onClose={() => setShiftOpen(false)}
        />
      )}
    </DrawerShell>
  );
}
