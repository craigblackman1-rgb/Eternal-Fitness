"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { IconPrinter, IconCheck } from "@/components/icons";
import { SubSessionRow } from "./SubSessionRow";
import { StatusBadge } from "@/components/hub/StatusBadge";
import {
  glanceSections,
  exerciseLoadLabel,
  exerciseSignature,
  glanceRepeats,
  glanceWorkoutCount,
} from "@/lib/block-glance";
import { computeGroups } from "@/lib/exercise-groups";
import { isoToLocalTime } from "@/lib/schedule-dates";
import { sessionWorkoutName } from "@/lib/session-display";
import type { DBSession, BlockStatus } from "@/types";

// ── Context ────────────────────────────────────────────────────

interface GlanceCtx {
  on: boolean;
  toggle: () => void;
  status: BlockStatus;
  approvedAt: string | null;
  blockNumber: number;
  clientName: string;
  totalSessions: number;
  workoutCount: number;
  dateSpanLabel: string;
  doApprove: () => void;
  approveOpen: boolean;
  setApproveOpen: (v: boolean) => void;
  firstBookedDate: string | null;
}

const Ctx = createContext<GlanceCtx | null>(null);

function useGlance() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGlance must be used within BlockGlanceProvider");
  return c;
}

// ── Provider ───────────────────────────────────────────────────

interface ProviderProps {
  sessions: DBSession[];
  positions: [string, { position: number; total: number }][];
  blockId: string;
  clientId: string;
  clientName: string;
  blockNumber: number;
  blockStatus: BlockStatus;
  approvedAt: string | null;
  dateSpanLabel: string;
  children: React.ReactNode;
}

export function BlockGlanceProvider({
  sessions,
  positions,
  blockId,
  clientId,
  clientName,
  blockNumber,
  blockStatus,
  approvedAt,
  dateSpanLabel,
  children,
}: ProviderProps) {
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState<BlockStatus>(blockStatus);
  const [approvedAtState, setApprovedAtState] = useState<string | null>(approvedAt);
  const [approveOpen, setApproveOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => { setStatus(blockStatus); }, [blockStatus]);
  useEffect(() => { setApprovedAtState(approvedAt); }, [approvedAt]);

  const toggle = useCallback(() => {
    setOn((v) => {
      if (!v) setCollapsed(new Set());
      return !v;
    });
    window.scrollTo({ top: 0 });
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const positionsMap = new Map(positions);
  const sortedPotSessions = sessions
    .filter((s) => !s.parent_session_id)
    .sort((a, b) => (positionsMap.get(a.id)?.position ?? 0) - (positionsMap.get(b.id)?.position ?? 0));
  const totalSessions = sortedPotSessions.length;
  const repeats = glanceRepeats(sortedPotSessions);
  const workoutCount = glanceWorkoutCount(sortedPotSessions);

  const subSessionsByParent = new Map<string, DBSession[]>();
  for (const s of sessions) {
    if (s.parent_session_id) {
      const arr = subSessionsByParent.get(s.parent_session_id) ?? [];
      arr.push(s);
      subSessionsByParent.set(s.parent_session_id, arr);
    }
  }

  const firstBookedDate = sortedPotSessions.find((s) => s.scheduled_at)?.scheduled_at ?? null;

  const doApprove = useCallback(async () => {
    const res = await fetch(`/api/blocks/${blockId}/approve`, { method: "POST" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to approve");
      return;
    }
    const now = new Date().toISOString();
    setStatus("approved");
    setApprovedAtState(now);
    setApproveOpen(false);
    const firstName = clientName.split(" ")[0];
    const firstSession = sortedPotSessions.find((s) => s.scheduled_at);
    if (firstSession?.scheduled_at) {
      const d = new Date(firstSession.scheduled_at);
      const dateLabel = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      const timeLabel = isoToLocalTime(firstSession.scheduled_at);
      toast.success(`Block ${blockNumber} approved. ${firstName}'s first session is ${dateLabel} at ${timeLabel}.`);
    } else {
      toast.success(`Block ${blockNumber} approved.`);
    }
    router.refresh();
  }, [blockId, clientName, blockNumber, router, sortedPotSessions]);

  const ctx: GlanceCtx = {
    on,
    toggle,
    status,
    approvedAt: approvedAtState,
    blockNumber,
    clientName,
    totalSessions,
    workoutCount,
    dateSpanLabel,
    doApprove,
    approveOpen,
    setApproveOpen,
    firstBookedDate,
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {on && (
        <>
          <GlanceView
            sessions={sortedPotSessions}
            positionsMap={positionsMap}
            repeats={repeats}
            collapsed={collapsed}
            toggleCollapse={toggleCollapse}
            clientId={clientId}
            blockId={blockId}
            subSessionsByParent={subSessionsByParent}
            allSessions={sessions}
          />
          <ApproveBar />
          <ApproveDialog
            open={approveOpen}
            onOpenChange={setApproveOpen}
            onConfirm={doApprove}
            blockNumber={blockNumber}
            clientName={clientName}
            totalSessions={totalSessions}
            workoutCount={workoutCount}
            firstBookedDate={firstBookedDate}
          />
        </>
      )}
    </Ctx.Provider>
  );
}

// ── GlanceToggle ───────────────────────────────────────────────

export function GlanceToggle() {
  const { on, toggle } = useGlance();
  return (
    <>
      {on && (
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-[13px] font-medium text-muted-foreground hover:bg-[var(--hub-hover)] transition-colors no-print"
        >
          <IconPrinter className="w-4 h-4" /> Print
        </button>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-[13px] font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors no-print"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        {on ? "Back to sessions" : "Show all exercises"}
      </button>
    </>
  );
}

// ── GlanceSessionsView ─────────────────────────────────────────

export function GlanceSessionsView({ children }: { children: React.ReactNode }) {
  const { on } = useGlance();
  return on ? null : <>{children}</>;
}

// ── GlanceView (full scrollable pass) ──────────────────────────

function GlanceView({
  sessions,
  positionsMap,
  repeats,
  collapsed,
  toggleCollapse,
  clientId,
  blockId,
  subSessionsByParent,
  allSessions,
}: {
  sessions: DBSession[];
  positionsMap: Map<string, { position: number; total: number }>;
  repeats: Map<string, number>;
  collapsed: Set<string>;
  toggleCollapse: (id: string) => void;
  clientId: string;
  blockId: string;
  subSessionsByParent: Map<string, DBSession[]>;
  allSessions: DBSession[];
}) {
  const { totalSessions, workoutCount } = useGlance();
  const [activeSession, setActiveSession] = useState<number>(1);
  const activeDateRef = useRef<string>("");
  const [activeDate, setActiveDate] = useState<string>("");
  const cardsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const n = entry.target.getAttribute("data-n");
            const d = entry.target.getAttribute("data-d") ?? "";
            if (n) {
              setActiveSession(Number(n));
              activeDateRef.current = d;
              setActiveDate(d);
            }
          }
        }
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: 0 },
    );
    cardsRef.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sessions]);

  const setCardRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current.set(id, el);
    else cardsRef.current.delete(id);
  }, []);

  return (
    <>
      <StickyBar activeSession={activeSession} activeDate={activeDate} />
      <div className="glance-list flex flex-col gap-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            position={positionsMap.get(session.id)}
            repeat={repeats.get(session.id)}
            isCollapsed={collapsed.has(session.id)}
            onToggle={() => toggleCollapse(session.id)}
            clientId={clientId}
            blockId={blockId}
            subSessions={subSessionsByParent.get(session.id) ?? []}
            allSessions={allSessions}
            cardRef={setCardRef(session.id)}
          />
        ))}
      </div>
      <ApproveBar />
    </>
  );
}

// ── Sticky reading bar ─────────────────────────────────────────

function StickyBar({ activeSession, activeDate }: { activeSession: number; activeDate: string }) {
  const { totalSessions, workoutCount } = useGlance();
  return (
    <div className="sticky top-[60px] z-30 flex items-center gap-3 px-3.5 py-2 mb-3 bg-white/90 backdrop-blur-md border border-[var(--hub-border)] rounded-[10px] shadow-sm text-[12.5px] text-muted-foreground no-print">
      <span>Reading</span>
      <span className="font-bold text-foreground tabular-nums">Session {activeSession} of {totalSessions}</span>
      <span className="text-[var(--hub-field-border)]">&middot;</span>
      <span>{activeDate}</span>
      <span className="ml-auto flex items-center gap-2">
        {workoutCount} workouts &middot; {totalSessions} sessions
      </span>
    </div>
  );
}

// ── Approve bar ────────────────────────────────────────────────

function ApproveBar() {
  const { status, approvedAt, totalSessions, workoutCount, dateSpanLabel, setApproveOpen, toggle } = useGlance();
  const approvedDate = approvedAt
    ? new Date(approvedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : null;
  return (
    <div className="fixed bottom-0 right-0 left-0 lg:left-60 z-30 flex items-center gap-3.5 px-6 py-3 bg-white/90 backdrop-blur-md border-t border-[var(--hub-border)] shadow-[0_-4px_20px_rgba(16,24,40,.06)] no-print">
      <div className="flex items-center gap-2.5 flex-wrap text-[13px] text-muted-foreground">
        <StatusBadge status={status} />
        <span><span className="font-bold text-foreground">{totalSessions} sessions</span> &middot; {workoutCount} workouts &middot; {dateSpanLabel}</span>
      </div>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border-0 bg-transparent text-[13px] font-medium text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
        >
          Back to sessions
        </button>
        {status === "draft" && (
          <button
            type="button"
            onClick={() => setApproveOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-rose hover:bg-rose/90 text-white text-[13px] font-semibold transition-colors"
          >
            <IconCheck className="w-4 h-4" /> Approve block
          </button>
        )}
        {status === "approved" && approvedDate && (
          <span className="text-sm font-medium text-muted-foreground">Approved &middot; {approvedDate}</span>
        )}
      </div>
    </div>
  );
}

// ── Approve dialog ─────────────────────────────────────────────

function ApproveDialog({
  open,
  onOpenChange,
  onConfirm,
  blockNumber,
  clientName,
  totalSessions,
  workoutCount,
  firstBookedDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  blockNumber: number;
  clientName: string;
  totalSessions: number;
  workoutCount: number;
  firstBookedDate: string | null;
}) {
  const firstName = clientName.split(" ")[0];
  const dateLabel = firstBookedDate
    ? new Date(firstBookedDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Block {blockNumber}?</DialogTitle>
          <DialogDescription>{clientName} &middot; {totalSessions} sessions &middot; {workoutCount} workouts</DialogDescription>
        </DialogHeader>
        <div className="text-sm text-foreground leading-relaxed">
          <p className="font-semibold">
            {firstName}&apos;s {totalSessions} sessions become live{dateLabel ? ` from ${dateLabel}` : ""}. You can still change any workout on the day.
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-muted-foreground">
            <li>Nothing is sent to {firstName} by approving &mdash; the portal shows the block as it is delivered.</li>
            <li>Approval is recorded with today&apos;s date.</li>
          </ul>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-[13px] font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-rose hover:bg-rose/90 text-white text-[13px] font-semibold transition-colors"
          >
            <IconCheck className="w-4 h-4" /> Approve block
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Session card ───────────────────────────────────────────────

function SessionCard({
  session,
  position,
  repeat,
  isCollapsed,
  onToggle,
  clientId,
  blockId,
  subSessions,
  allSessions,
  cardRef,
}: {
  session: DBSession;
  position?: { position: number; total: number };
  repeat?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  clientId: string;
  blockId: string;
  subSessions: DBSession[];
  allSessions: DBSession[];
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const { totalSessions } = useGlance();
  const sections = glanceSections(session);
  const sessionUrl = `/hub/clients/${clientId}/blocks/${blockId}/sessions/${session.session_number}`;
  const addWorkoutUrl = `/hub/clients/${clientId}/add-workout`;
  const workoutName = sessionWorkoutName(session, `Session ${position?.position ?? session.session_number}`);
  const exerciseCount = sections.reduce((n, s) => n + s.exercises.length, 0);
  const n = position?.position ?? session.session_number;

  const dateLabel = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : null;
  const timeLabel = session.scheduled_at ? isoToLocalTime(session.scheduled_at) : null;

  const archetypeTint: Record<string, string> = {
    A: "bg-teal/10 text-teal border-teal/20",
    B: "bg-rose/10 text-rose border-rose/20",
    C: "bg-dark-navy/10 text-dark-navy border-dark-navy/20",
  };

  return (
    <div
      ref={cardRef}
      data-n={n}
      data-d={dateLabel ?? ""}
      className="glance-card bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm"
    >
      <div className="flex items-center gap-3 p-3.5">
        <span className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[12px] font-extrabold bg-[var(--hub-hover)] border border-[var(--hub-border)] text-foreground shrink-0 tabular-nums">
          {n}
        </span>
        <div className="min-w-[150px]">
          <div className="text-[13.5px] font-bold text-foreground">{dateLabel ?? "Not yet booked"}</div>
          <div className="text-[11.5px] text-muted-foreground">
            {timeLabel ? `${timeLabel} \u00B7 ` : ""}Session {n} of {totalSessions}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {session.archetype && (
            <span className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[12px] font-extrabold border shrink-0 ${archetypeTint[session.archetype] ?? "bg-muted text-muted-foreground"}`}>
              {session.archetype}
            </span>
          )}
          <span className="text-[13.5px] font-bold text-foreground truncate">{workoutName}</span>
          <span className="text-[12px] text-muted-foreground">
            {exerciseCount > 0 ? `${exerciseCount} exercises` : ""}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {repeat !== undefined && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!isCollapsed}
              className="border-0 bg-transparent px-2 py-1 rounded-[6px] font-inherit text-[12.5px] font-semibold text-teal cursor-pointer hover:bg-[var(--hub-hover)] hover:text-[#066A75] transition-colors"
            >
              {isCollapsed ? `Same as session ${repeat} \u2014 show` : `\u2014 hide`}
            </button>
          )}
          {sections.length > 0 ? (
            <a
              href={sessionUrl}
              className="inline-flex items-center h-8 px-2.5 rounded-lg border border-transparent text-[12.5px] font-medium text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
            >
              Open session
            </a>
          ) : (
            <a
              href={addWorkoutUrl}
              className="inline-flex items-center h-8 px-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-[12.5px] font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors"
            >
              Add workout
            </a>
          )}
        </div>
      </div>

      {sections.length > 0 && (
        <div
          className="border-t border-[var(--hub-border)] px-4 py-3.5"
          {...(isCollapsed ? { hidden: true, "data-collapsed-body": true } : {})}
        >
          <SessionTable sections={sections} />
        </div>
      )}
      {sections.length === 0 && (
        <div className="border-t border-[var(--hub-border)] px-4 py-3">
          <span className="text-[13px] text-muted-foreground">No workout planned yet</span>
        </div>
      )}

      {subSessions.map((child) => (
        <div key={child.id} className="border-t border-[var(--hub-border)]">
          <SubSessionRow
            subSession={child}
            clientId={clientId}
            blockId={blockId}
          />
          {glanceSections(child).length > 0 && (
            <div className="px-4 py-3.5">
              <SessionTable sections={glanceSections(child)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Exercise table ─────────────────────────────────────────────

function SessionTable({ sections }: { sections: { label: string; exercises: { exercise_name: string; sets: number; reps: string; tempo: string; rest: string; load?: string; band_colour?: string; group_label?: string }[] }[] }) {
  return (
    <>
      {sections.map((section) => {
        const groups = computeGroups(section.exercises);
        return (
          <div key={section.label} className="mb-3 last:mb-0">
            <div className="text-[11.5px] font-bold text-foreground mb-1.5">{section.label}</div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground py-2.5 px-2 border-b border-[var(--hub-border)] whitespace-nowrap first:pl-0.5">Exercise</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground py-2.5 px-2 border-b border-[var(--hub-border)] whitespace-nowrap">Sets &times; reps</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground py-2.5 px-2 border-b border-[var(--hub-border)] whitespace-nowrap">Load / band</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground py-2.5 px-2 border-b border-[var(--hub-border)] whitespace-nowrap">Tempo</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground py-2.5 px-2 border-b border-[var(--hub-border)] whitespace-nowrap">Rest</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, gi) => (
                  <Fragment key={gi}>
                    {group.type === "group" && group.label && (
                      <tr>
                        <td colSpan={5} className="text-[11.5px] font-bold text-rose pt-2.5 px-0.5 pb-0.5">
                          {group.label}
                        </td>
                      </tr>
                    )}
                    {group.items.map((ex) => {
                      const load = exerciseLoadLabel(ex);
                      return (
                        <tr key={ex.exercise_name + ex.sets + ex.reps} className="border-b border-[var(--hub-border)] last:border-b-0">
                          <td className="py-2 px-2 text-foreground font-semibold first:pl-0.5">{ex.exercise_name}</td>
                          <td className="py-2 px-2 text-foreground tabular-nums whitespace-nowrap">{ex.sets} &times; {ex.reps}</td>
                          <td className={`py-2 px-2 font-semibold ${load.muted ? "text-muted-foreground" : "text-rose"}`}>{load.text}</td>
                          <td className="py-2 px-2 text-foreground tabular-nums whitespace-nowrap">{ex.tempo || "\u2014"}</td>
                          <td className="py-2 px-2 text-foreground tabular-nums whitespace-nowrap">{ex.rest || "\u2014"}</td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}


