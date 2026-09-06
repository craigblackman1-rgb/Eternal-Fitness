"use client";

import Link from "next/link";
import { useDrawerManager } from "./DrawerManager";
import { sessionWorkoutName } from "@/lib/session-display";
import type { DBBlock, DBSession } from "@/types";
import type { QueueState } from "@/lib/programs/types";

/* ── TrainingSummary — compact training band on the client record base page.
   Shows: paid-pot bar, flagged-sessions warning, Next/Program duo panels,
   Is-it-working stats, and an "Open Training" affordance opening the
   Training drawer. Heavy content (queue map, scheduled sessions, supplementary,
   past blocks, Trainerize history) lives in the TrainingDrawer. */

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

interface TrainingSummaryProps {
  clientNumber: number;
  clientName: string;
  preferredTime: string | null;
  latestBlock: DBBlock | null;
  blockSessions: DBSession[];
  allBlocks: DBBlock[];
  allSessions: DBSession[];
  exerciseTrendSummary?: {
    totalExercisesLogged: number;
    personalBests: number;
    heaviestLift: string | null;
    belowBestCount: number;
    recentNotes: string | null;
  };
  sessionsRemaining: number | null;
  sessionsPurchased: number | null;
  paymentStatus: string | null;
  packageType: string | null;
  programState: QueueState | null;
  flaggedSessionIds: Set<string>;
  activeProgramId: string | null;
  clientId: string;
}

export function TrainingSummary({
  clientNumber,
  clientName,
  preferredTime,
  latestBlock,
  blockSessions,
  allBlocks,
  allSessions,
  exerciseTrendSummary,
  sessionsRemaining,
  sessionsPurchased,
  paymentStatus,
  packageType,
  programState,
  flaggedSessionIds,
  activeProgramId,
  clientId,
}: TrainingSummaryProps) {
  const { openDrawer, openWorkoutDrawer } = useDrawerManager();

  // ── Paid-pot computation ──
  const isOngoing = !sessionsPurchased || packageType === "ongoing";
  const totalSessions = isOngoing ? null : sessionsPurchased;
  const remaining = sessionsRemaining ?? 0;

  // Stats for "Is it working"
  const totalLogged = exerciseTrendSummary?.totalExercisesLogged ?? 0;
  const personalBests = exerciseTrendSummary?.personalBests ?? 0;
  const heaviestLift = exerciseTrendSummary?.heaviestLift ?? null;
  const belowBestCount = exerciseTrendSummary?.belowBestCount ?? 0;

  // ── Program queue derivation ──
  const totalQueueSlots = programState?.totalSlots ?? 0;
  const completedCount = programState?.completedCount ?? 0;
  const nextPosition = programState?.nextPosition ?? 1;
  const currentWeek = programState?.currentWeek ?? 1;
  const programWeeks = programState?.program?.weeks ?? 1;
  const programName = programState?.program?.name ?? "";

  // Next session from block sessions
  const nextSession = (() => {
    if (!latestBlock) return null;
    const now = Date.now();
    return blockSessions
      .filter((s) => !s.completed_at && s.scheduled_at && !s.parent_session_id)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
      .find((s) => new Date(s.scheduled_at!).getTime() >= now) ?? null;
  })();

  // Completed sessions for flagged banner
  const completedSessions = blockSessions.filter(
    (s) => s.completed_at && !s.parent_session_id
  );

  const nonSupplementaryCount = allSessions.filter((s) => !s.parent_session_id).length;

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
              ? "No training yet"
              : `${nonSupplementaryCount} session${nonSupplementaryCount === 1 ? "" : "s"} since ${new Date(allBlocks[allBlocks.length - 1].created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={(e) => openDrawer("dw-training", e.currentTarget)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer transition-colors"
          >
            Open training
          </button>
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
                      {slotLabel(programState.nextSlot)} — slot {nextPosition} of {totalQueueSlots}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-[var(--color-body)]">
                      {programState.nextSlot.data?.sections?.length ?? 0} section{((programState.nextSlot.data?.sections?.length ?? 0) === 1) ? "" : "s"}. Consumes one paid session when completed.
                    </p>
                  </>
                ) : (
                  <p className="m-0 text-[13px] text-[var(--color-muted)] italic">No upcoming slot</p>
                )}
              </div>
              {programState.nextSlot && nextSession && (
                <div className="flex gap-1.5 py-[7px] px-2.5 border-t border-[var(--hub-border)] bg-[var(--field-fill)]">
                  <button
                    onClick={(e) => openWorkoutDrawer(nextSession.id, e.currentTarget)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    See the workout
                  </button>
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
                  {programState.slots.length} slot{(programState.slots.length) === 1 ? "" : "s"} · Advances only on completed sessions.
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
              onClick={(e) => openDrawer("dw-training", e.currentTarget)}
              className="ml-auto text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer font-[inherit]"
            >
              See every exercise ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function slotLabel(slot: { label?: string | null; position: number }): string {
  const label = slot.label?.trim();
  if (label) {
    const match = label.match(/^([A-Za-z0-9]+)/);
    return match ? match[1] : label.slice(0, 3);
  }
  return String.fromCharCode(64 + slot.position);
}
