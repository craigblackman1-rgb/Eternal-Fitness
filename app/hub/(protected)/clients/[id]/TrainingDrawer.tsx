"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DrawerShell, useDrawerManager } from "./DrawerManager";
import { BlockMap } from "./BlockMap";
import { ProgramQueueMap } from "./ProgramQueueMap";
import { SessionChooser } from "./SessionChooser";
import { sessionWorkoutName } from "@/lib/session-display";
import { blockDisplayName } from "@/lib/block-name";
import { SupplementaryWorkoutsCard } from "@/components/hub/SupplementaryWorkoutsCard";
import { ensureUids } from "@/lib/exercise-ref";
import type { DBBlock, DBSession, SessionVersion } from "@/types";
import type { DBProgram, DBProgramSlot, QueueState } from "@/lib/programs/types";
import type {
  TrainerizeHistoryData,
  TrainerizePerformedWorkoutSummary,
  TrainerizePerformedExerciseDetail,
} from "@/components/hub";

/* ── TrainingDrawer — consolidates the full training surface:
    program queue map, scheduled sessions (with Reassign chooser),
    supplementary work, standing rules, past programs, "So far" summary,
    and Trainerize pre-app history. */

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

function sourceLabel(source: string): string {
  switch (source) {
    case "message": return "Message";
    case "attention": return "Attention flag";
    case "program_instruction": return "Program note";
    case "workout_instruction": return "Workout note";
    default: return source;
  }
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
}: TrainingDrawerProps) {
  const { openWorkoutDrawer } = useDrawerManager();
  const router = useRouter();

  // ── SessionChooser dialog state ──
  const [chooserSessionId, setChooserSessionId] = useState<string | null>(null);
  const [chooserBusy, setChooserBusy] = useState(false);

  // ── Extend program state ──
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

  // Scheduled sessions by queue position (for day labels on the map)
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

  // Scheduled sessions list (from block sessions, not supplementary)
  const scheduledSessions = blockSessions
    .filter((s) => s.scheduled_at && !s.completed_at && !s.cancelled_at && !s.parent_session_id)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  // Sessions beyond the queue
  const beyondQueueCount = Math.max(0, remaining - (totalQueueSlots - completedCount));

  // Block map cells from real session data
  const mapSessions = blockSessions.map((s) => ({
    id: s.id,
    sessionNumber: s.session_number ?? 0,
    scheduledAt: s.scheduled_at ?? null,
    isCompleted: !!s.completed_at,
    isNext: false,
    focusLabel: sessionWorkoutName(s),
    hasWorkout: sessionWorkoutName(s) !== "No workout assigned yet",
  }));

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

  // ── Reassign handler: PATCH session with program slot ──
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

  // ── Reassign handler: PATCH session with template data ──
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
        data: {
          versions,
          focus_label: tpl.name,
        },
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

  // ── One-off: navigate to add-workout ──
  function handleReassignOneOff(sessionId: string) {
    setChooserSessionId(null);
    router.push(`/hub/clients/${clientNumber}/add-workout?view=chooser`);
  }

  // ── Extend program handler ──
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

  return (
    <DrawerShell
      id="dw-training"
      title="Training"
      subtitle={programState
        ? `${programState.program.name} · Week ${programState.currentWeek} of ${programState.program.weeks}`
        : latestBlock
          ? `Block ${latestBlock.block_number} · ${blockSessionCounts[latestBlock.block_number] ?? blockSessions.length} sessions`
          : allBlocks.length > 0 ? `${allBlocks.length} blocks` : "No training yet"}
      width="lg"
    >
      {/* ── Program queue map ── */}
      {programState && totalQueueSlots > 0 && (
        <div className="mb-3">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <p className="dw-h" style={{ margin: 0 }}>Program queue</p>
            <span className="text-xs text-[var(--color-body)]">
              {totalQueueSlots} slots · consumed only by completed sessions, in order
            </span>
          </div>
          <ProgramQueueMap
            slots={slots}
            totalSlots={totalQueueSlots}
            completedCount={completedCount}
            nextPosition={nextPosition}
            flaggedPositions={flaggedPositions}
            scheduledByPosition={scheduledByPosition}
            onCellClick={(position) => {
              const slotAtPosition = slots.find((s) => s.position === ((position - 1) % slotCount) + 1);
              if (!slotAtPosition) return;
              const sessionForCell = programSessions.find((s) => s.program_slot_id === slotAtPosition.id);
              if (sessionForCell) {
                openWorkoutDrawer(sessionForCell.id);
              }
            }}
          />
        </div>
      )}

      {/* ── Beyond-queue note with Extend action ── */}
      {programState && beyondQueueCount > 0 && (
        <div className="flex items-center gap-2.5 py-2 mb-3 text-[13px] text-[var(--color-muted)]">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--color-muted)]" />
          <span>
            The queue ends at slot {totalQueueSlots}. {clientName} has <b className="text-[var(--color-ink)]">{beyondQueueCount} more paid session{beyondQueueCount === 1 ? "" : "s"}</b> in their pot beyond it — they&apos;ll sit unassigned until you extend this program or start a new one.{" "}
            <button
              type="button"
              disabled={extending}
              onClick={() => handleExtendProgram(2)}
              className="inline font-[inherit] text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer disabled:opacity-50"
            >
              {extending ? "Extending…" : "Extend the program"}
            </button>
          </span>
        </div>
      )}

      {/* ── Scheduled sessions ── */}
      {scheduledSessions.length > 0 && (
        <div className="mb-3">
          <p className="dw-h">Scheduled sessions</p>
          {(showAllSessions ? scheduledSessions : scheduledSessions.slice(0, 5)).map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 py-[9px] px-3 rounded-nested border border-transparent w-full text-left font-[inherit]"
            >
              <span className="w-[116px] shrink-0 text-[13px] font-semibold text-[var(--color-ink)]">
                {fmtShortDate(s.scheduled_at!)}
                <small className="block text-[11.5px] font-normal text-[var(--color-muted)]">
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
      )}

      {/* ── Standing rules (home training) ── */}
      {standingRules.length > 0 && (
        <div className="mb-3 rounded-nested border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[var(--status-warning-border)]">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--status-warning-text)]">
              Standing rules · every session
            </span>
          </div>
          <div className="grid gap-x-4 gap-y-1.5 px-3 py-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {standingRules.map((rule) => (
              <div key={rule.id} className="text-[12.5px] text-[var(--color-ink)] leading-snug">
                {rule.label && (
                  <span className="font-semibold">{rule.label} — </span>
                )}
                {rule.detail}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Supplementary work ── */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <p className="dw-h" style={{ margin: 0 }}>Supplementary</p>
          <span className="text-xs text-[var(--color-body)]">
            Runs alongside the program. Never consumes a slot or a paid session.
          </span>
        </div>
        <SupplementaryWorkoutsCard
          clientNumber={clientNumber}
          clientName={clientName}
          sessionsRemaining={sessionsRemaining}
        />
      </div>

      {/* ── Past programs ── */}
      {pastBlocks.length > 0 && (
        <div className="mb-3">
          <p className="dw-h">Past programs</p>
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

            return (
              <div
                key={block.id}
                className="flex items-center gap-[11px] w-full py-[7px] px-[11px] border border-transparent rounded-nested transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)]"
              >
                <Link
                  href={`/hub/clients/${clientNumber}/blocks/${block.id}`}
                  className="flex items-center gap-[11px] flex-1 min-w-0 no-underline focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(193,131,159,.3)] rounded-nested"
                >
                  <span className="w-[26px] h-[26px] shrink-0 rounded-control grid place-items-center text-[11px] font-extrabold bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
                    {block.block_number}
                  </span>
                  <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] font-semibold">
                    {blockDisplayName(block, blockSessionsForCount, blockSessionsForCount.length)}
                    <small className="text-xs font-normal text-[var(--color-body)] ml-2">
                      {blockSessionsForCount.length} session{blockSessionsForCount.length === 1 ? "" : "s"} \u00b7 {dateLabel}
                    </small>
                  </span>
                  <span className="shrink-0">
                    <span className="inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]">
                      {block.status}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-rose)]">
                    See what she lifted \u203a
                  </span>
                </Link>
                {block.status === "complete" && (
                  <Link
                    href={`/hub/clients/${clientNumber}/updates/block-review/${block.id}`}
                    className="shrink-0 inline-flex items-center justify-center rounded-control border border-[var(--hub-field-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold text-foreground no-underline hover:bg-[var(--hub-hover)] transition-colors"
                  >
                    Review &amp; send
                  </Link>
                )}
              </div>
            );
          })}
          {pastBlocks.length > 4 && !showAllPast && (
            <button
              type="button"
              onClick={() => setShowAllPast(true)}
              className="w-full py-2 mt-1 text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer text-left font-[inherit]"
            >
              Show all {pastBlocks.length} past programs
            </button>
          )}
        </div>
      )}

      {/* ── So far ── */}
      {exerciseTrendSummary && (
        <div className="mb-3 rounded-nested border border-[var(--hub-border)] bg-white overflow-hidden">
          <div className="flex items-baseline gap-2.5 py-[7px] px-3 border-b border-[var(--hub-border)] border-t-[3px] border-t-[var(--status-success)] bg-[var(--status-success-bg)]">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--status-success-text)]">So far</span>
            <span className="ml-auto text-xs font-semibold text-[var(--color-body)] tabular-nums">
              {exerciseTrendSummary.totalExercisesLogged} exercise{exerciseTrendSummary.totalExercisesLogged === 1 ? "" : "s"} logged
            </span>
          </div>
          <div className="flex-1 py-2 px-3">
            <div className="flex gap-4 flex-wrap mb-0.5">
              <span className="text-xs text-[var(--color-body)]">
                <b className="block text-[17px] font-extrabold text-[var(--color-ink)] tracking-tight tabular-nums">{exerciseTrendSummary.personalBests}</b>
                personal bests
              </span>
              {exerciseTrendSummary.heaviestLift && (
                <span className="text-xs text-[var(--color-body)]">
                  <b className="block text-[17px] font-extrabold text-[var(--color-ink)] tracking-tight tabular-nums">{exerciseTrendSummary.heaviestLift}</b>
                  heaviest lift
                </span>
              )}
              {exerciseTrendSummary.belowBestCount > 0 && (
                <span className="text-xs text-[var(--color-body)]">
                  <b className="block text-[17px] font-extrabold text-[var(--status-danger)] tracking-tight tabular-nums">{exerciseTrendSummary.belowBestCount}</b>
                  below best
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Trainerize pre-app import ── */}
      {hasHistory && (
        <div className="mb-3">
          <p className="dw-h">Before the app</p>
          <div className="fcard acc-ink">
            <div className="fcard-h">Imported</div>
            <div className="fcard-b">
              <div className="fgrid">
                <div className="frow"><span className="fk">Period</span><span className="fv num">{periodStart && periodEnd ? `${fmtShortDate(periodStart)} \u2013 ${fmtShortDate(periodEnd)}` : "\u2014"}</span></div>
                <div className="frow"><span className="fk">Blocks</span><span className="fv num">{tBlocks.length}</span></div>
                <div className="frow"><span className="fk">Sessions</span><span className="fv num">{tzTotalSessions}</span></div>
                <div className="frow"><span className="fk">Notes</span><span className="fv num">{notes.length}</span></div>
              </div>
            </div>
          </div>

          {tBlocks.length > 0 && (
            <>
              <p className="dw-h">Training history — tap to see sessions</p>
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
      )}

      {/* ── Session Chooser dialog ── */}
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
                {fmtShortDate(scheduledSessions.find((s) => s.id === chooserSessionId)?.scheduled_at ?? "")} · {clientName}
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
                <span className="text-[13px] font-semibold text-[var(--color-muted)]">Saving…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </DrawerShell>
  );
}
