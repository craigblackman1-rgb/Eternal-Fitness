"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDrawerManager } from "./DrawerManager";
import { ProgramQueueMap } from "./ProgramQueueMap";
import { SessionChooser } from "./SessionChooser";
import { sessionWorkoutName } from "@/lib/session-display";
import { SupplementaryWorkoutsCard } from "@/components/hub/SupplementaryWorkoutsCard";
import { ensureUids } from "@/lib/exercise-ref";
import type { DBBlock, DBSession, SessionVersion } from "@/types";
import type { DBProgram, DBProgramSlot, QueueState } from "@/lib/programs/types";

/* ── TrainingSection — the "training spine" from client-training.html mockup.
   Program-driven view replacing the block-focused layout.
   Elements: paid-pot bar, Training section with program panels + queue map,
   scheduled sessions, supplementary rail. */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDuration(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return "—";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${minutes}min`;
}

interface TrainingSectionProps {
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
  blockCompletedCounts: Record<number, number>;
  blockDateRangeLabel: string;
  exerciseTrendSummary?: {
    totalExercisesLogged: number;
    personalBests: number;
    heaviestLift: string | null;
    belowBestCount: number;
    recentNotes: string | null;
  };
  trainerizeHistory: {
    blocks: any[];
    notes: any[];
  };
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

export function TrainingSection({
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
  blockCompletedCounts,
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
}: TrainingSectionProps) {
  const { openDrawer, openWorkoutDrawer } = useDrawerManager();
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

  // Stats for the "Is it working" panel
  const totalLogged = exerciseTrendSummary?.totalExercisesLogged ?? 0;
  const personalBests = exerciseTrendSummary?.personalBests ?? 0;
  const heaviestLift = exerciseTrendSummary?.heaviestLift ?? null;
  const belowBestCount = exerciseTrendSummary?.belowBestCount ?? 0;

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

  // Flagged positions (completed with no sets) from the flaggedSessionIds set
  const flaggedPositions = new Set<number>();
  for (const s of programSessions) {
    if (s.completed_at && flaggedSessionIds.has(s.id) && s.program_slot_id) {
      const slot = slots.find((sl) => sl.id === s.program_slot_id);
      if (slot) {
        flaggedPositions.add(slot.position);
      }
    }
  }

  // Next session from block sessions
  const nextSession = (() => {
    if (!latestBlock) return null;
    const now = Date.now();
    return blockSessions
      .filter((s) => !s.completed_at && s.scheduled_at && !s.parent_session_id)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
      .find((s) => new Date(s.scheduled_at!).getTime() >= now) ?? null;
  })();

  const workoutSession = nextSession;
  const workoutName = workoutSession ? sessionWorkoutName(workoutSession) : null;

  // Scheduled sessions list (from block sessions, not supplementary)
  const scheduledSessions = blockSessions
    .filter((s) => s.scheduled_at && !s.completed_at && !s.cancelled_at && !s.parent_session_id)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  // Completed sessions for the flagged banner
  const completedSessions = blockSessions.filter(
    (s) => s.completed_at && !s.parent_session_id
  );

  // Sessions beyond the queue
  const beyondQueueCount = Math.max(0, remaining - (totalQueueSlots - completedCount));

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
      // Fetch full template data
      const tplRes = await fetch("/api/workout-templates");
      if (!tplRes.ok) throw new Error("Could not load template data");
      const tplList: { id: string; name: string; data: SessionVersion }[] = await tplRes.json();
      const tpl = tplList.find((t) => t.id === templateId);
      if (!tpl) throw new Error("Template not found");

      // Apply template data to the session (same logic as add-workout POST)
      const versions: Record<string, SessionVersion> = {};
      const sectionKeys = ["warm_up", "main_block", "cooldown"] as const;
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

      // Increment template usage count
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
    <div className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden">

      {/* ── Section header ── */}
      <div className="flex items-center gap-2.5 py-2.5 px-4">
        <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Training</h2>
        {programState && (
          <span className="text-xs text-[var(--color-muted)]">
            {clientName} — {programName} · slot {nextPosition} of {totalQueueSlots} next
          </span>
        )}
        {!programState && (
          <span className="text-xs text-[var(--color-muted)]">
            {allBlocks.length === 0
              ? "No training blocks yet"
              : `${totalSessions} session${totalSessions === 1 ? "" : "s"} since ${fmtDate(allBlocks[allBlocks.length - 1].created_at)}`}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          {programState && (
            <Link
              href={`/hub/programs/${programState.program.id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent text-[var(--color-muted)] font-[inherit] text-xs font-semibold cursor-pointer px-2.5 py-1 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] no-underline"
            >
              Change program
            </Link>
          )}
          {!programState && activeProgramId && (
            <Link
              href={`/hub/programs/${activeProgramId}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent text-[var(--color-muted)] font-[inherit] text-xs font-semibold cursor-pointer px-2.5 py-1 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] no-underline"
            >
              Open in the builder ›
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">

        {/* ── Paid-pot bar ── */}
        <div className="flex items-center gap-3.5 py-3 px-3.5 border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] mb-3">
          <div className="w-[46px] h-[46px] shrink-0 rounded-full grid place-items-center text-xs font-extrabold tabular-nums bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-2 border-[var(--status-success-border)]">
            {isOngoing ? "∞" : `${remaining}/${totalSessions}`}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-2 flex-wrap">
              Session pot{" "}
              <span className="inline-flex items-center h-[21px] px-2.5 rounded-full text-[11.5px] font-semibold border border-transparent bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]">
                {paymentStatus === "paid" ? "Paid" : paymentStatus === "unpaid" ? "Unpaid" : paymentStatus ?? "Unknown"}
              </span>
            </div>
            <p className="m-0 mt-0.5 text-[12.5px] text-[var(--color-body)]">
              {isOngoing
                ? "Ongoing package — no session cap"
                : `${remaining} of ${totalSessions} sessions remaining${totalSessions && remaining <= Math.ceil(totalSessions * 0.2) ? " · renewal due once this pack runs out" : ""}`}
            </p>
          </div>
        </div>

        {/* ── Warning: completed with no sets ── */}
        {completedSessions.some((s) => flaggedSessionIds.has(s.id)) && (
          <div className="flex items-center gap-3 py-2.5 px-3 mb-3 rounded-nested bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)]">
            <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--status-warning)]" />
            <span className="flex-1 text-[13.5px] text-[var(--color-ink)]">
              <b>Completed sessions with no sets logged</b>
              <span className="block text-[12.5px] text-[var(--color-muted)] mt-0.5">
                These still used paid sessions. Log what happened, or confirm nothing was recorded.
              </span>
            </span>
          </div>
        )}

        {/* ── Program panels (Next + Program) ── */}
        {programState ? (
          <div className="grid grid-cols-2 gap-2.5 mb-3 max-[1080px]:grid-cols-1">
            {/* Next session panel */}
            <div className="border border-[var(--hub-border)] rounded-nested bg-white overflow-hidden flex flex-col">
              <div className="flex items-baseline gap-2.5 py-[7px] px-3 border-b border-[var(--hub-border)] border-t-[3px] border-t-rose bg-[var(--status-primary-bg)]">
                <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--status-primary-text)]">Next</span>
                <span className="ml-auto text-xs font-semibold text-[var(--color-body)] tabular-nums">
                  {nextSession?.scheduled_at
                    ? `${fmtDateShort(nextSession.scheduled_at)}${preferredTime ? ` · ${preferredTime}` : ""}`
                    : "Not scheduled"}
                </span>
              </div>
              <div className="flex-1 py-2 px-3">
                {programState.nextSlot ? (
                  <>
                    <p className="m-0 text-[14.5px] font-bold text-[var(--color-ink)] tracking-tight">
                      Workout {slotLetter(programState.nextSlot)} — slot {nextPosition} of {totalQueueSlots}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-[var(--color-body)]">
                      {programState.nextSlot.data?.sections?.length ?? 0} section{((programState.nextSlot.data?.sections?.length ?? 0) === 1) ? "" : "s"}. Consumes one paid session when completed.
                    </p>
                  </>
                ) : (
                  <p className="m-0 text-[13px] text-[var(--color-muted)] italic">No upcoming slot</p>
                )}
              </div>
              {programState.nextSlot && (
                <div className="flex gap-1.5 py-[7px] px-2.5 border-t border-[var(--hub-border)] bg-[var(--field-fill)]">
                  {nextSession && (
                    <button
                      onClick={(e) => openWorkoutDrawer(nextSession.id, e.currentTarget)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer transition-colors"
                    >
                      See the workout
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Program info panel */}
            <div className="border border-[var(--hub-border)] rounded-nested bg-white overflow-hidden flex flex-col">
              <div className="flex items-baseline gap-2.5 py-[7px] px-3 border-b border-[var(--hub-border)] border-t-[3px] border-t-[var(--status-success)] bg-[var(--status-success-bg)]">
                <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--status-success-text)]">Program</span>
                <span className="ml-auto text-xs font-semibold text-[var(--color-body)] tabular-nums">
                  Week {currentWeek} of {programWeeks}
                </span>
              </div>
              <div className="flex-1 py-2 px-3">
                <p className="m-0 text-[14.5px] font-bold text-[var(--color-ink)] tracking-tight">{programName}</p>
                <p className="m-0 mt-0.5 text-xs text-[var(--color-body)]">
                  {slotCount} slot{slotCount === 1 ? "" : "s"} · Advances only on completed sessions.
                </p>
              </div>
              <div className="flex gap-1.5 py-[7px] px-2.5 border-t border-[var(--hub-border)] bg-[var(--field-fill)]">
                <Link
                  href={`/hub/programs/${programState.program.id}`}
                  className="ml-auto text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer font-[inherit] no-underline"
                >
                  Open in the builder ›
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* No program applied — show apply prompt */
          <div className="mb-3 border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] p-4 text-center">
            <p className="m-0 text-[13px] text-[var(--color-muted)]">
              No program applied yet. Apply a program to use the queue.
            </p>
            <Link
              href={`/hub/programs?client=${clientNumber}`}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-control bg-rose text-white font-[inherit] text-xs font-semibold cursor-pointer px-3.5 py-1.5 no-underline hover:bg-[color-mix(in_oklab,var(--rose)_88%,var(--ink))] transition-colors"
            >
              Apply a program
            </Link>
          </div>
        )}

        {/* ── Is it working ── */}
        <div className="border border-[var(--hub-border)] rounded-nested bg-white overflow-hidden flex flex-col mb-3">
          <div className="flex items-baseline gap-2.5 py-[7px] px-3 border-b border-[var(--hub-border)] border-t-[3px] border-t-[var(--status-success)] bg-[var(--status-success-bg)]">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--status-success-text)]">Is it working</span>
            <span className="ml-auto text-xs font-semibold text-[var(--color-body)] tabular-nums">
              {totalLogged} exercise{totalLogged === 1 ? "" : "s"} logged
            </span>
          </div>
          <div className="flex-1 py-2 px-3">
            <div className="flex gap-4 flex-wrap mb-0.5">
              <span className="text-xs text-[var(--color-body)]">
                <b className="block text-[17px] font-extrabold text-[var(--color-ink)] tracking-tight tabular-nums">{personalBests}</b>
                personal bests
              </span>
              {heaviestLift && (
                <span className="text-xs text-[var(--color-body)]">
                  <b className="block text-[17px] font-extrabold text-[var(--color-ink)] tracking-tight tabular-nums">{heaviestLift}</b>
                  heaviest lift
                </span>
              )}
              {belowBestCount > 0 && (
                <span className="text-xs text-[var(--color-body)]">
                  <b className="block text-[17px] font-extrabold text-[var(--status-danger)] tracking-tight tabular-nums">{belowBestCount}</b>
                  below best
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 py-[7px] px-2.5 border-t border-[var(--hub-border)] bg-[var(--field-fill)]">
            <button
              onClick={(e) => openDrawer("dw-progress", e.currentTarget)}
              className="ml-auto text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer font-[inherit]"
            >
              See every exercise ›
            </button>
          </div>
        </div>

        {/* ── Program queue map ── */}
        {programState && totalQueueSlots > 0 && (
          <div className="mb-3">
            <div className="flex items-baseline gap-2.5 flex-wrap mb-1.5">
              <h3 className="m-0 text-[11px] font-extrabold uppercase tracking-[.09em] text-[var(--color-ink)]">
                Program queue
              </h3>
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
                // Find the session at this queue position and open its workout drawer
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
          <>
            <div className="flex items-baseline gap-2.5 flex-wrap mb-1.5">
              <h3 className="m-0 text-[11px] font-extrabold uppercase tracking-[.09em] text-[var(--color-ink)]">
                Scheduled sessions
              </h3>
            </div>
            {scheduledSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 py-[9px] px-3 rounded-nested border border-transparent w-full text-left font-[inherit]"
              >
                <span className="w-[116px] shrink-0 text-[13px] font-semibold text-[var(--color-ink)]">
                  {fmtDateShort(s.scheduled_at!)}
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
          </>
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

        {/* ── Supplementary ── */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2.5 flex-wrap mb-1.5">
            <h3 className="m-0 text-[11px] font-extrabold uppercase tracking-[.09em] text-[var(--color-ink)]">
              Supplementary
            </h3>
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
      </div>

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
                {fmtDateShort(scheduledSessions.find((s) => s.id === chooserSessionId)?.scheduled_at ?? "")} · {clientName}
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
    </div>
  );
}

function slotLetter(slot: DBProgramSlot): string {
  const label = slot.label?.trim();
  if (label) {
    const match = label.match(/^([A-Za-z0-9]+)/);
    return match ? match[1] : label.slice(0, 3);
  }
  return String.fromCharCode(64 + slot.position);
}
