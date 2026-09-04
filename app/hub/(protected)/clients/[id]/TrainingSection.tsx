"use client";

import Link from "next/link";
import { useDrawerManager } from "./DrawerManager";
import { BlockMap } from "./BlockMap";
import { sessionWorkoutName } from "@/lib/session-display";
import type { DBBlock, DBSession } from "@/types";

/* ── TrainingSection — the "training spine" from the mockup. Four bands:
   1. Duo (next session + is-it-working side by side)
   2. Block band + map (block metadata + session grid)
   3. Supplementary work note
   4. So far (past blocks + Trainerize history) */

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
}: TrainingSectionProps) {
  const { openDrawer } = useDrawerManager();
  const firstName = clientName.split(" ")[0];

  // Find the next upcoming (not-yet-completed) session in the latest block
  const nextSession = (() => {
    if (!latestBlock) return null;
    const now = Date.now();
    return blockSessions
      .filter((s) => !s.completed_at && s.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
      .find((s) => new Date(s.scheduled_at!).getTime() >= now) ?? null;
  })();

  // Most recently completed session
  const latestCompleted = (() => {
    const completed = blockSessions.filter((s) => s.completed_at && !s.parent_session_id);
    if (completed.length === 0) return null;
    return completed.reduce((latest, s) =>
      new Date(s.completed_at!) > new Date(latest.completed_at!) ? s : latest
    );
  })();

  const workoutSession = nextSession ?? latestCompleted;
  const workoutName = workoutSession ? sessionWorkoutName(workoutSession) : null;

  // Stats for the duo
  const totalLogged = exerciseTrendSummary?.totalExercisesLogged ?? 0;
  const personalBests = exerciseTrendSummary?.personalBests ?? 0;
  const heaviestLift = exerciseTrendSummary?.heaviestLift ?? null;
  const belowBestCount = exerciseTrendSummary?.belowBestCount ?? 0;

  // Block map cells from real session data
  const mapSessions = blockSessions.map((s) => ({
    id: s.id,
    sessionNumber: s.session_number ?? 0,
    scheduledAt: s.scheduled_at ?? null,
    isCompleted: !!s.completed_at,
    isNext: s.id === nextSession?.id,
    focusLabel: sessionWorkoutName(s),
    hasWorkout: sessionWorkoutName(s) !== "No workout assigned yet",
  }));

  // Total sessions across all blocks
  const totalSessions = allSessions.filter((s) => !s.parent_session_id).length;

  // Past blocks (all except the latest)
  const pastBlocks = allBlocks.filter((b) => latestBlock && b.id !== latestBlock.id);

  // Trainerize history summary
  const tzTotalSessions = trainerizeHistory.blocks.reduce(
    (sum: number, b: any) => sum + (b.workouts?.length ?? 0), 0
  );
  const tzDateRange = (() => {
    const allDates = trainerizeHistory.blocks.flatMap((b: any) => [b.start_date, b.end_date].filter(Boolean));
    if (allDates.length === 0) return null;
    const sorted = allDates.sort();
    return { start: sorted[0], end: sorted[sorted.length - 1] };
  })();

  return (
    <div className="bg-white border border-[var(--hub-border)] rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2.5 py-2.5 px-4">
        <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Training</h2>
        <span className="text-xs text-[var(--color-muted)]">
          {latestBlock ? `Block ${latestBlock.block_number} of ${allBlocks.length}` : "No blocks"} · {totalSessions} sessions since {allBlocks.length > 0 ? fmtDate(allBlocks[allBlocks.length - 1].created_at) : "—"}
        </span>
        <div className="ml-auto flex gap-1.5">
          <button className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent text-[var(--color-muted)] font-[inherit] text-xs font-semibold cursor-pointer px-2.5 py-1 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)]">
            Progress
          </button>
          <Link
            href={`/hub/clients/${clientNumber}?tab=plan-agent`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent text-[var(--color-muted)] font-[inherit] text-xs font-semibold cursor-pointer px-2.5 py-1 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] no-underline"
          >
            Plan next block
          </Link>
        </div>
      </div>

      <div className="px-4 pb-3">
        {/* ── Duo: next session + is-it-working ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Next session panel */}
          <div className="border border-[var(--hub-border)] rounded-[10px] bg-white overflow-hidden flex flex-col">
            <div className="flex items-baseline gap-2.5 py-[7px] px-3 border-b border-[var(--hub-border)] border-t-[3px] border-t-rose bg-[var(--status-primary-bg)]">
              <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--status-primary-text)]">Next</span>
              <span className="ml-auto text-xs font-semibold text-[var(--color-body)] tabular-nums">
                {nextSession?.scheduled_at
                  ? `${fmtDateShort(nextSession.scheduled_at)}${preferredTime ? ` · ${preferredTime}` : ""} · ${formatDuration(sessionDuration)}`
                  : "Not scheduled"}
              </span>
            </div>
            <div className="flex-1 py-2 px-3">
              {workoutName ? (
                <>
                  <p className="m-0 text-[14.5px] font-bold text-[var(--color-ink)] tracking-tight">{workoutName}</p>
                  <p className="m-0 mt-0.5 text-xs text-[var(--color-body)]">
                    {workoutSession?.data?.versions?.studio
                      ? `${(workoutSession.data.versions.studio.warm_up?.length ?? 0) + (workoutSession.data.versions.studio.main_block?.length ?? 0) + (workoutSession.data.versions.studio.cooldown?.length ?? 0)} exercises`
                      : "Loading..."}
                  </p>
                </>
              ) : (
                <p className="m-0 text-[13px] text-[var(--color-muted)] italic">No sessions scheduled</p>
              )}
            </div>
            <div className="flex gap-1.5 py-[7px] px-2.5 border-t border-[var(--hub-border)] bg-[var(--field-fill)]">
              <button
                onClick={(e) => openDrawer("dw-workout", e.currentTarget)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer transition-colors"
              >
                See the workout
              </button>
            </div>
          </div>

          {/* Is it working / progress panel */}
          <div className="border border-[var(--hub-border)] rounded-[10px] bg-white overflow-hidden flex flex-col">
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
        </div>

        {/* ── Block band ── */}
        {latestBlock && (
          <div className="flex items-baseline gap-2.5 flex-wrap mb-1.5">
            <h3 className="m-0 text-[11px] font-extrabold uppercase tracking-[.09em] text-[var(--color-ink)]">
              Block {latestBlock.block_number}
            </h3>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]">
              {latestBlock.status}
            </span>
            <span className="text-xs text-[var(--color-body)]">
              {blockSessionCounts[latestBlock.block_number] ?? 0} sessions · {blockDateRangeLabel}
            </span>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={(e) => openDrawer("dw-block", e.currentTarget)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent text-[var(--color-muted)] font-[inherit] text-xs font-semibold cursor-pointer px-2.5 py-1 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)]"
              >
                See all workouts
              </button>
            </div>
          </div>
        )}

        {/* ── Block map ── */}
        {latestBlock && mapSessions.length > 0 && (
          <div className="mb-3">
            <BlockMap sessions={mapSessions} />
          </div>
        )}

        {/* ── Supplementary work note ── */}
        <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--color-muted)]" />
          <span>
            Nothing runs alongside {firstName}&apos;s sessions.{" "}
            <button className="text-xs font-semibold text-[var(--color-rose)] hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer font-[inherit]">
              Add supplementary work
            </button>
          </span>
        </div>

        {/* ── So far band ── */}
        <div className="flex items-baseline gap-2.5 flex-wrap mt-3 mb-1.5">
          <h3 className="m-0 text-[11px] font-extrabold uppercase tracking-[.09em] text-[var(--color-ink)]">
            So far
          </h3>
          <span className="text-xs text-[var(--color-body)]">
            {allSessions.filter((s) => !s.parent_session_id).length} sessions in the hub{tzTotalSessions > 0 ? `, ${tzTotalSessions} before it` : ""}
          </span>
        </div>

        {/* Past blocks */}
        {pastBlocks.map((block) => {
          const blockSessionsForCount = allSessions.filter(
            (s) => s.block_id === block.id && !s.parent_session_id
          );
          const dates = blockSessionsForCount
            .filter((s) => s.scheduled_at)
            .map((s) => s.scheduled_at!)
            .sort();
          const dateLabel = dates.length > 0
            ? `${fmtDate(dates[0])}${dates.length > 1 ? `–${fmtDate(dates[dates.length - 1])}` : ""}`
            : "Not scheduled";

          return (
            <button
              key={block.id}
              className="flex items-center gap-[11px] w-full py-[7px] px-[11px] border border-transparent rounded-[10px] bg-transparent font-[inherit] text-left cursor-pointer transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
            >
              <span className="w-[26px] h-[26px] shrink-0 rounded-lg grid place-items-center text-[11px] font-extrabold bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
                {block.block_number}
              </span>
              <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] font-semibold">
                Block {block.block_number}
                <small className="text-xs font-normal text-[var(--color-body)] ml-2">
                  {blockSessionsForCount.length} sessions · {dateLabel}
                </small>
              </span>
              <span className="shrink-0">
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]">
                  {block.status}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-[var(--color-rose)]">
                See what she lifted ›
              </span>
            </button>
          );
        })}

        {/* Trainerize pre-app import */}
        {tzTotalSessions > 0 && (
          <button
            onClick={(e) => openDrawer("dw-preapp", e.currentTarget)}
            className="flex items-center gap-[11px] w-full py-[7px] px-[11px] border border-transparent rounded-[10px] bg-transparent font-[inherit] text-left cursor-pointer transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
          >
            <span className="w-[26px] h-[26px] shrink-0 rounded-lg grid place-items-center text-[11px] font-extrabold bg-[var(--status-neutral-bg)] text-[var(--navy)]">
              TZ
            </span>
            <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] font-semibold">
              Before the app
              <small className="text-xs font-normal text-[var(--color-body)] ml-2">
                {tzTotalSessions} sessions{tzDateRange ? ` · ${fmtDate(tzDateRange.start)} – ${fmtDate(tzDateRange.end)}` : ""} · Trainerize
              </small>
            </span>
            <span className="shrink-0">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] border-[var(--status-neutral-border)]">
                Read-only
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-[var(--color-rose)]">
              See history ›
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
