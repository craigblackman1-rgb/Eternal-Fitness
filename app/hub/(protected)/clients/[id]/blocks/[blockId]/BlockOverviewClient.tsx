"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BlockActions } from "./BlockActions";
import { BlockSchedulePanel } from "./BlockSchedulePanel";
import { EditBlockDrawer } from "./EditBlockDrawer";
import { AddWorkoutDialog } from "./AddWorkoutDialog";
import { CarryOverDialog } from "./CarryOverDialog";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import { isoToLocalTime } from "@/lib/schedule-dates";
import { sessionWorkoutName, sessionHasNoExercises } from "@/lib/session-display";
import { deriveSessionStatus } from "@/lib/session-status";
import type { Weekday } from "@/lib/scheduling";
import type { SessionStatus, DBSession, BlockStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconCheck } from "@/components/icons";

// ── Archetype descriptions for the block chip strip ──────────────
const ARCHETYPE_LABELS: Record<string, string> = {
  A: "Full body, day 1",
  B: "Full body, day 2",
  C: "Full body, day 3",
};

interface DisplaySession {
  id: string;
  session_number: number;
  archetype: string | null;
  week: number;
  phase: string;
  data: {
    focus_label?: string;
    session_log?: { completed_at?: string | null } | null;
    versions?: {
      studio?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
      home?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
    };
  };
  scheduled_at: string | null;
  projected_at?: string | null;
  status: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  cancel_reason: string | null;
  charged_free?: "charged" | "free" | null;
  parent_session_id?: string | null;
}

interface PreviousBlock {
  id: string;
  block_number: number;
  status: BlockStatus;
  scheduled_start: string | null;
  sessionCount: number;
  completedCount: number;
  dateRange: string;
}

interface BlockOverviewClientProps {
  block: {
    id: string;
    block_number: number;
    block_note: string | null;
    summary: string | null;
    status: BlockStatus;
  };
  clientId: string;
  blockId: string;
  clientName: string;
  clientCondition: string | null;
  blockStatus: BlockStatus;
  approvedAt: string | null;
  blockDateSpanLabel: string;
  totalSessions: number;
  completedSessions: number;
  remainingCount: number;
  scheduledStartIso: string | null;
  scheduledStartLabel: string;
  weekdays: Weekday[];
  weeks: number[];
  sessions: DBSession[];
  displaySessions: DisplaySession[];
  chronologicalPositions: Map<string, { position: number; total: number }>;
  weekGroups: {
    key: string;
    kind: string;
    monday?: string;
    planWeek?: number;
    sessions: DisplaySession[];
  }[];
  previousBlocks: PreviousBlock[];
  archetypeTint: Record<string, string>;
}

function sessionStatus(s: DisplaySession): SessionStatus {
  return deriveSessionStatus({
    status: s.status,
    cancelled_at: s.cancelled_at,
    scheduled_at: s.scheduled_at,
    completed_at: s.completed_at,
    session_log: s.data?.session_log,
  });
}

export function BlockOverviewClient({
  block,
  clientId,
  blockId,
  clientName,
  clientCondition,
  blockStatus,
  approvedAt: approvedAtInitial,
  blockDateSpanLabel,
  totalSessions,
  completedSessions,
  remainingCount,
  scheduledStartIso,
  scheduledStartLabel,
  weekdays,
  weeks,
  sessions,
  displaySessions,
  chronologicalPositions,
  previousBlocks,
  archetypeTint,
}: BlockOverviewClientProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [carryOverOpen, setCarryOverOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [blockStatusState, setBlockStatusState] = useState<BlockStatus>(blockStatus);
  const [approvedAtState, setApprovedAtState] = useState<string | null>(approvedAtInitial);

  // ── Approve handler ──────────────────────────────────────────
  const doApprove = useCallback(async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/blocks/${blockId}/approve`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Failed to approve");
        setApproving(false);
        return;
      }
      const now = new Date().toISOString();
      setBlockStatusState("approved");
      setApprovedAtState(now);
      setApproveOpen(false);
      const firstName = clientName.split(" ")[0];
      const firstSession = displaySessions.find(
        (s) => s.scheduled_at && sessionStatus(s) !== "completed" && sessionStatus(s) !== "cancelled",
      );
      if (firstSession?.scheduled_at) {
        const d = new Date(firstSession.scheduled_at);
        const dateLabel = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
        const timeLabel = isoToLocalTime(firstSession.scheduled_at);
        toast.success(`Block ${block.block_number} approved. ${firstName}'s first session is ${dateLabel} at ${timeLabel}.`);
      } else {
        toast.success(`Block ${block.block_number} approved.`);
      }
      router.refresh();
    } catch {
      toast.error("Could not approve the block — check your connection and try again.");
    }
    setApproving(false);
  }, [blockId, block.block_number, clientName, displaySessions, router]);

  // ── Day label for session rows ───────────────────────────────
  const dayLabel = (s: DisplaySession): string => {
    if (s.scheduled_at) {
      const d = new Date(s.scheduled_at);
      return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    }
    const st = sessionStatus(s);
    if (st === "completed") {
      return s.completed_at
        ? `Completed ${new Date(s.completed_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`
        : "Completed — date unknown";
    }
    const pos = chronologicalPositions.get(s.id);
    return pos ? `Session ${pos.position} of ${pos.total}` : `Session ${s.session_number}`;
  };

  const dayTimeLabel = (s: DisplaySession): string => {
    if (s.scheduled_at) {
      const d = new Date(s.scheduled_at);
      const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      return `${date}\n${isoToLocalTime(s.scheduled_at)}`;
    }
    return dayLabel(s);
  };

  // ── Archetype chip strip ─────────────────────────────────────
  const archetypeCounts = new Map<string, number>();
  for (const s of displaySessions) {
    if (s.archetype) {
      archetypeCounts.set(s.archetype, (archetypeCounts.get(s.archetype) ?? 0) + 1);
    }
  }
  const archetypes = Array.from(archetypeCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const completedCount = displaySessions.filter((s) => sessionStatus(s) === "completed").length;
  const settledCount = displaySessions.filter((s) => {
    const st = sessionStatus(s);
    return st === "completed" || st === "cancelled";
  }).length;

  const blockDescriptor = clientCondition
    ? `Block ${block.block_number} of ${block.block_number} · ${clientCondition}`
    : `Block ${block.block_number} of ${block.block_number}`;

  const approvedDateLabel = approvedAtState
    ? new Date(approvedAtState).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              Block {block.block_number}
            </h1>
            <StatusBadge status={blockStatusState} />
          </div>
          <p className="text-[13px] text-[var(--body)] mt-0.5">
            {blockDescriptor}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {blockStatusState === "draft" && (
            <button
              type="button"
              onClick={() => setApproveOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-[var(--rose)] hover:bg-[color-mix(in_oklab,var(--rose)_88%,var(--ink))] text-white text-[13px] font-semibold transition-colors"
            >
              <IconCheck className="w-4 h-4" /> Review and approve
            </button>
          )}
          {blockStatusState === "approved" && approvedDateLabel && (
            <span className="text-sm font-medium text-[var(--muted)]">
              Approved · {approvedDateLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Block state section ─────────────────────────────────── */}
      <section
        className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm overflow-hidden"
        style={{ marginBottom: "var(--d-section-gap, 14px)" }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3.5 border border-[var(--hub-border)] rounded-[10px] bg-[var(--field-fill,#FDFDFE)] p-3.5">
            <div className="w-[44px] h-[44px] rounded-[8px] bg-[var(--s-primary-bg,rgba(193,131,159,.10))] text-[var(--rose-text,#94566F)] flex items-center justify-center text-[17px] font-extrabold shrink-0">
              {block.block_number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-[14.5px] font-bold text-[var(--color-ink)]">
                  Block {block.block_number}
                </strong>
                <StatusBadge status={blockStatusState} />
              </div>
              <p className="text-[12.5px] text-[var(--body)] mt-0.5">
                {totalSessions} sessions · {blockDateSpanLabel}
                {weekdays.length > 0 && (
                  <> · {weekdays.map((w) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][w]).join(", ")}</>
                )}
              </p>
              <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                {archetypes.map(([arch, count]) => (
                  <span
                    key={arch}
                    className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center text-[11.5px] font-bold bg-[var(--hub-card)] border border-[var(--hub-border)] text-[var(--muted)]"
                  >
                    {arch}
                  </span>
                ))}
                <span className="text-[11.5px] text-[var(--muted)] ml-1.5">
                  {archetypes.map(([arch, count]) => `${arch}×${count}`).join(" · ")}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center h-[30px] px-2.5 rounded-[6px] border border-[var(--hub-border)] bg-[var(--hub-card)] text-[12.5px] font-medium text-[var(--color-ink)] hover:bg-[var(--hub-hover)] transition-colors"
              >
                Edit block
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Actions bar ────────────────────────────────────────── */}
      <BlockActions
        onEditBlock={() => setDrawerOpen(true)}
        onAddWorkout={() => setAddWorkoutOpen(true)}
        onSchedule={() => setScheduleOpen(true)}
        onCarryOver={() => setCarryOverOpen(true)}
        clientId={clientId}
        blockId={blockId}
        blockNumber={block.block_number}
        clientName={clientName}
        hasRemaining={remainingCount > 0}
      />

      {/* ── Sessions section ───────────────────────────────────── */}
      <section
        className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm overflow-hidden"
        style={{ marginBottom: "var(--d-section-gap, 14px)" }}
      >
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--hub-border)]">
          <h2 className="text-[15px] font-bold text-[var(--color-ink)]">Sessions</h2>
          <span className="text-[12.5px] text-[var(--muted)]">
            {totalSessions} · {completedCount} done
          </span>
        </div>
        <div>
          {displaySessions.map((session) => {
            const st = sessionStatus(session);
            const workoutName = sessionWorkoutName(session, "—");
            const isEmpty = st !== "completed" && st !== "cancelled" && sessionHasNoExercises(session.data);
            const isScheduled = st === "scheduled" || st === "in_progress";
            const isPlanned = st === "planned";
            const settled = st === "completed" || st === "cancelled";
            const pos = chronologicalPositions.get(session.id);
            const sessionUrl = `/hub/clients/${clientId}/blocks/${blockId}/sessions/${session.session_number}`;
            const dateParts = session.scheduled_at ? dayTimeLabel(session).split("\n") : null;
            const subSessions = sessions.filter((s: DBSession) => s.parent_session_id === session.id);

            return (
              <div key={session.id}>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--hub-hover)] transition-colors border-t border-[var(--hub-border)] first:border-t-0 ${settled ? "opacity-60" : ""}`}
                >
                  {/* Date + time */}
                  <div className="w-[116px] shrink-0">
                    {dateParts ? (
                      <>
                        <div className="text-[13px] font-semibold text-[var(--color-ink)]">
                          {dateParts[0]}
                        </div>
                        <div className="text-[11.5px] font-medium text-[var(--muted)]">
                          {dateParts[1]}
                        </div>
                      </>
                    ) : (
                      <div className="text-[13px] font-medium text-[var(--muted)] italic">
                        {dayLabel(session)}
                      </div>
                    )}
                  </div>

                  {/* Workout */}
                  <div className="flex-1 min-w-0">
                    {isEmpty ? (
                      <span className="text-[13.5px] text-[var(--muted)] italic">
                        No workout assigned
                      </span>
                    ) : (
                      <span className="text-[13.5px] text-[var(--color-ink)]">
                        {session.archetype && (
                          <>{session.archetype} — </>
                        )}
                        {workoutName}
                      </span>
                    )}
                    {pos && (
                      <div className="text-[11.5px] text-[var(--muted)]">
                        Session {pos.position} of {pos.total}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    <SessionStatusPill status={st} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 w-[168px] justify-end">
                    {st === "completed" && (
                      <Link
                        href={sessionUrl}
                        className="inline-flex items-center h-[30px] px-2.5 rounded-[6px] border border-transparent text-[12.5px] font-medium text-[var(--muted)] hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors"
                      >
                        View
                      </Link>
                    )}
                    {st === "cancelled" && (
                      <Link
                        href={sessionUrl}
                        className="inline-flex items-center h-[30px] px-2.5 rounded-[6px] border border-transparent text-[12.5px] font-medium text-[var(--muted)] hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors"
                      >
                        View
                      </Link>
                    )}
                    {isPlanned && (
                      <>
                        {isEmpty ? (
                          <span className="text-[12.5px] font-semibold text-[var(--rose-text)]">
                            Assign workout
                          </span>
                        ) : (
                          <Link
                            href={sessionUrl}
                            className="inline-flex items-center h-[30px] px-2.5 rounded-[6px] border border-[var(--hub-border)] bg-[var(--hub-card)] text-[12.5px] font-medium text-[var(--color-ink)] hover:bg-[var(--hub-hover)] transition-colors"
                          >
                            Edit
                          </Link>
                        )}
                      </>
                    )}
                    {(isScheduled || isPlanned) && (
                      <Link
                        href={sessionUrl}
                        className="inline-flex items-center h-[30px] px-2.5 rounded-[6px] text-[12.5px] font-semibold text-[var(--muted)] hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors"
                      >
                        {isScheduled ? "View" : "Schedule"}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Cancelled session details */}
                {st === "cancelled" && (
                  <div className="px-4 pb-2 text-[11.5px] text-[var(--muted)] border-t border-[var(--hub-border)]">
                    {session.charged_free === "charged" && (
                      <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger-border)] px-2 py-0 text-[10px] font-bold mr-1.5">
                        Charged
                      </span>
                    )}
                    {session.charged_free === "free" && (
                      <span className="inline-flex items-center rounded-full bg-[var(--s-success-bg)] text-[var(--teal)] border border-[var(--s-success-bd)] px-2 py-0 text-[10px] font-bold mr-1.5">
                        Free
                      </span>
                    )}
                    Cancelled{session.cancel_reason ? ` — ${session.cancel_reason}` : ""}
                  </div>
                )}
              </div>
            );
          })}

          {displaySessions.length === 0 && (
            <div className="py-10 text-center text-sm text-[var(--muted)]">
              No sessions in this block yet.
            </div>
          )}
        </div>
      </section>

      {/* ── Previous blocks ─────────────────────────────────────── */}
      {previousBlocks.length > 0 && (
        <section
          className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm overflow-hidden"
          style={{ marginBottom: "var(--d-section-gap, 14px)" }}
        >
          <div className="px-4 py-2.5 border-b border-[var(--hub-border)]">
            <h2 className="text-[15px] font-bold text-[var(--color-ink)]">Previous blocks</h2>
          </div>
          <div>
            {previousBlocks.map((prevBlock) => (
              <div
                key={prevBlock.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--hub-hover)] transition-colors border-t border-[var(--hub-border)] first:border-t-0"
              >
                <span className="w-[7px] h-[7px] rounded-full bg-[var(--s-success)] shrink-0" />
                <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] font-semibold">
                  Block {prevBlock.block_number}
                  <span className="font-normal text-[var(--body)] mx-2">·</span>
                  <span className="font-normal text-[var(--body)]">
                    {prevBlock.sessionCount} sessions · {prevBlock.dateRange} · {prevBlock.status}
                  </span>
                </span>
                <Link
                  href={`/hub/clients/${clientId}/blocks/${prevBlock.id}`}
                  className="shrink-0 text-[12.5px] font-semibold text-[var(--rose-text)] hover:underline underline-offset-[3px]"
                >
                  See sessions
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Existing drawers & dialogs ──────────────────────────── */}
      <BlockSchedulePanel
        blockId={blockId}
        sessionCount={totalSessions}
        scheduledStartIso={scheduledStartIso}
        weekdays={weekdays}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />

      <EditBlockDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        block={block}
        sessionCount={totalSessions}
        completedSessions={completedSessions}
        scheduledStartIso={scheduledStartIso}
      />
      <AddWorkoutDialog open={addWorkoutOpen} onOpenChange={setAddWorkoutOpen} blockId={blockId} weeks={weeks} />
      <CarryOverDialog
        open={carryOverOpen}
        onOpenChange={setCarryOverOpen}
        blockId={blockId}
        blockNumber={block.block_number}
        clientId={clientId}
        remainingCount={remainingCount}
      />

      {/* ── Approve dialog ──────────────────────────────────────── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[12px] shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-ink)]">
              Approve Block {block.block_number}?
            </DialogTitle>
            <DialogDescription>
              {clientName} · {totalSessions} sessions
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-[var(--color-ink)] leading-relaxed">
            <p className="font-semibold">
              {clientName.split(" ")[0]}&apos;s {totalSessions} sessions become live. You can still change any workout on the day.
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-[var(--body)]">
              <li>Nothing is sent to {clientName.split(" ")[0]} by approving — the portal shows the block as it is delivered.</li>
              <li>Approval is recorded with today&apos;s date.</li>
            </ul>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setApproveOpen(false)}
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--hub-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={doApprove}
              disabled={approving}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--rose)] hover:bg-[color-mix(in_oklab,var(--rose)_88%,var(--ink))] text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              <IconCheck className="w-4 h-4" /> Approve block
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
