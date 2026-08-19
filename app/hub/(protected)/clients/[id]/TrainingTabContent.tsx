"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import { EmptyState } from "@/components/hub/EmptyState";
import { HubCard, HubCardHeader } from "@/components/hub";
import { ExerciseTrendsPanel } from "@/components/progress/ExerciseTrendsPanel";
import { ExerciseHistoryPanel } from "@/components/progress/ExerciseHistoryPanel";
import { TrainerizeHistoryPanel } from "@/components/hub";
import type { TrainerizeHistoryData } from "@/components/hub";

import type { ExerciseTrend } from "@/lib/progress";
import type { ExerciseHistoryEntry } from "@/lib/exercise-history";
import type { SetLog } from "@/types";
import { groupSetLogsBySession, type SessionSetEvidence } from "@/lib/session-sets";
import { deriveSessionStatus } from "@/lib/session-status";
import {
  IconFileText,
  IconClipboardList,
  IconBarChart3,
  IconActivity,
  IconPlus,
  IconPencil,
  IconChevronDown,
} from "@/components/icons";

type Segment = "blocks" | "sessions" | "progress" | "history";

interface BlockRow {
  id: string;
  block_number: number;
  created_at: string;
  status: string;
}

interface SessionRow {
  id: string;
  session_number: number;
  block_id: string;
  data?: any;
  scheduled_at?: string | null;
  status?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
  blocks?: { block_number: number };
}

type SessionSortKey = "date" | "session";
type SortDir = "asc" | "desc";

/** completed_at when logged, else scheduled_at, else null — same value the Date column displays. */
function sessionSortDate(session: SessionRow): number | null {
  const completedAt = (session.data as any)?.session_log?.completed_at as string | undefined;
  const iso = completedAt ?? session.scheduled_at ?? null;
  return iso ? new Date(iso).getTime() : null;
}

function sortSessions(sessions: SessionRow[], key: SessionSortKey, dir: SortDir): SessionRow[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...sessions].sort((a, b) => {
    if (key === "date") {
      const da = sessionSortDate(a);
      const db = sessionSortDate(b);
      if (da === null && db === null) return 0;
      if (da === null) return 1; // undated rows always sink to the bottom
      if (db === null) return -1;
      return (da - db) * mult;
    }
    // "session" — block number then session number within it, so a plain
    // session_number sort doesn't interleave block 1's #12 with block 3's #12.
    const blockA = (a as any).blocks?.block_number ?? 0;
    const blockB = (b as any).blocks?.block_number ?? 0;
    if (blockA !== blockB) return (blockA - blockB) * mult;
    return (a.session_number - b.session_number) * mult;
  });
}

function sessionStatus(session: SessionRow) {
  return deriveSessionStatus({
    status: session.status,
    cancelled_at: session.cancelled_at,
    completed_at: session.completed_at,
    scheduled_at: session.scheduled_at,
    session_log: (session.data as any)?.session_log,
  });
}

interface Props {
  clientNumber: number;
  blocks: BlockRow[];
  sessions: SessionRow[];
  setLogs: SetLog[];
  blockSessionCounts: Record<number, number>;
  exerciseTrends: ExerciseTrend[];
  exerciseHistory: ExerciseHistoryEntry[];
  trainerizeHistory: TrainerizeHistoryData;
}

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "blocks", label: "Blocks" },
  { key: "sessions", label: "Sessions" },
  { key: "progress", label: "Progress" },
  { key: "history", label: "Pre-app history" },
];

function SessionCheckinPill({
  fatigue,
  rpe,
}: {
  fatigue?: string | null;
  rpe?: number | null;
}) {
  const isFlagged = fatigue === "high" || (rpe != null && rpe >= 8);
  const label = isFlagged ? "Fatigue flagged" : "Good";
  if (isFlagged) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-px text-[11px] font-semibold text-[var(--status-warning)]">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-1.5 py-px text-[11px] font-semibold text-[var(--status-success)]">
      {label}
    </span>
  );
}

/** Stored ISO -> local "YYYY-MM-DD" for a date input. */
function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Combine a local "YYYY-MM-DD" with the time-of-day from an existing ISO timestamp. */
function localDateToIso(date: string, originalIso: string): string {
  const orig = new Date(originalIso);
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(y, mo - 1, d, orig.getHours(), orig.getMinutes(), orig.getSeconds(), orig.getMilliseconds()).toISOString();
}

/** Date cell for a session row. Primary display is the booking date
 *  (scheduled_at), with the logged date shown secondarily when it differs —
 *  matching mobile, which never renders a scheduled session as "—" (CR-EF-033).
 *  Click-to-edit still targets the logged date, and only when one exists. */
function SessionDateCell({ session }: { session: SessionRow }) {
  const router = useRouter();
  const log = (session.data as any)?.session_log;
  const completedAt: string | null = log?.completed_at ?? null;
  const scheduledAt: string | null = session.scheduled_at ?? null;
  const [editing, setEditing] = useState(false);
  const [dateValue, setDateValue] = useState(completedAt ? isoToLocalDate(completedAt) : "");
  const [saving, setSaving] = useState(false);

  const primaryAt = scheduledAt ?? completedAt;
  const completedLabel = completedAt
    ? new Date(completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "";
  const completedDiffers =
    completedAt != null &&
    scheduledAt != null &&
    isoToLocalDate(completedAt) !== isoToLocalDate(scheduledAt);

  if (!primaryAt) {
    return <span className="text-muted-foreground">—</span>;
  }

  const handleSave = async () => {
    if (!completedAt || !dateValue || saving) return;
    setSaving(true);
    const updatedLog = { ...log, completed_at: localDateToIso(dateValue, completedAt) };
    const updatedData = { ...(session.data ?? {}), session_log: updatedLog };
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatedData }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to change session date");
      return;
    }
    setEditing(false);
    toast.success("Session date updated");
    router.refresh();
  };

  if (editing) {
    return (
      <input
        type="date"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDateValue(completedAt ? isoToLocalDate(completedAt) : "");
            setEditing(false);
          }
          if (e.key === "Enter") handleSave();
        }}
        onClick={(e) => e.stopPropagation()}
        autoFocus
        disabled={saving}
        className="w-[130px] rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2 py-1 text-sm"
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        if (!completedAt) return;
        e.stopPropagation();
        setEditing(true);
      }}
      title={completedAt ? "Click to change logged date" : undefined}
      role={completedAt ? "button" : undefined}
      tabIndex={completedAt ? 0 : undefined}
      onKeyDown={(e) => {
        if (completedAt && e.key === "Enter") setEditing(true);
      }}
      className={`inline-flex items-center gap-1${completedAt ? " cursor-pointer hover:text-foreground" : ""}`}
    >
      <span>{new Date(primaryAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
      {completedDiffers && (
        <span className="text-muted-foreground" title={`Logged ${completedLabel}`}>
          · {completedLabel}
        </span>
      )}
      {completedAt && <IconPencil className="h-3 w-3 opacity-40" />}
    </span>
  );
}

/** Inline, expandable logged-set breakdown for one session row (CR-EF-036).
 *  Keyed by exercise_uid, so logs stay attributed across prescription edits. */
function SessionSetEvidenceTable({ evidence }: { evidence: SessionSetEvidence }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--hub-border)]">
          <th className="py-1.5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exercise</th>
          <th className="py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Set · load · reps</th>
        </tr>
      </thead>
      <tbody>
        {evidence.exercises.map((ex) => (
          <tr key={ex.key} className="border-b border-[var(--hub-border)] align-top last:border-0">
            <td className="py-1.5 pr-3 font-semibold text-foreground">{ex.name}</td>
            <td className="py-1.5 text-muted-foreground tabular-nums">
              {ex.sets.map((s) => (
                <div key={s.setNumber}>
                  Set {s.setNumber} · {s.summary}
                  {s.isWarmup && <span className="text-muted-foreground/70"> (warm-up)</span>}
                </div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TrainingTabContent({
  clientNumber,
  blocks,
  sessions,
  setLogs,
  blockSessionCounts,
  exerciseTrends,
  exerciseHistory,
  trainerizeHistory,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewParam = searchParams.get("view");
  const initialView: Segment =
    viewParam === "blocks" || viewParam === "sessions" || viewParam === "progress" || viewParam === "history"
      ? viewParam
      : "blocks";

  const [segment, setSegment] = useState<Segment>(initialView);
  const [sessionSortKey, setSessionSortKey] = useState<SessionSortKey>("date");
  const [sessionSortDir, setSessionSortDir] = useState<SortDir>("desc");
  const [creatingBlock, setCreatingBlock] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const handleNewEmptyBlock = async () => {
    if (creatingBlock) return;
    setCreatingBlock(true);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientNumber }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create block");
      }
      const block = await res.json();
      toast.success(`Block ${block.block_number} created`);
      router.push(`/hub/clients/${clientNumber}/blocks/${block.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create block");
      setCreatingBlock(false);
    }
  };

  const handleSessionSort = (key: SessionSortKey) => {
    if (key === sessionSortKey) {
      setSessionSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSessionSortKey(key);
      setSessionSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const sortedSessions = useMemo(
    () => sortSessions(sessions, sessionSortKey, sessionSortDir),
    [sessions, sessionSortKey, sessionSortDir],
  );

  // CR-EF-036: set_logs grouped per session, keyed by exercise_uid so logged
  // data survives a prescription edit (see lib/session-sets.ts).
  const setEvidenceBySession = useMemo(
    () => groupSetLogsBySession(setLogs),
    [setLogs],
  );

  useEffect(() => {
    const vp = searchParams.get("view");
    if (vp === "blocks" || vp === "sessions" || vp === "progress" || vp === "history") {
      setSegment(vp);
    }
  }, [searchParams]);

  const handleSegmentChange = (next: Segment) => {
    setSegment(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg bg-[var(--hub-hover)] p-[3px]">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => handleSegmentChange(s.key)}
            className={cn(
              "rounded-md px-4 py-2 text-[13px] font-semibold transition-all",
              segment === s.key
                ? "bg-[var(--hub-card)] text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {segment === "blocks" && (
        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconFileText className="w-4 h-4" />}
            title="Training Blocks"
            color="slate"
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNewEmptyBlock}
                  disabled={creatingBlock}
                  title="Create an empty block instantly, then add sessions from templates — skips AI generation"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors disabled:opacity-50"
                >
                  <IconPlus className="h-4 w-4" /> {creatingBlock ? "Creating…" : "New Block"}
                </button>
                <Link
                  href={`/hub/clients/${clientNumber}?tab=plan-agent`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-rose/90 transition-colors"
                >
                  <IconPlus className="h-4 w-4" /> Plan Block with AI
                </Link>
              </div>
            }
            className="px-5 pt-5"
          />
          {blocks && blocks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                    <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Block</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Started</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Progress</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Status</th>
                    <th className="h-10 px-5 py-0"></th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block) => (
                    <tr key={block.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)]">
                      <td className="py-2.5 px-5 font-semibold text-foreground">Block {block.block_number}</td>
                      <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">
                        {new Date(block.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2.5 px-5 text-foreground">{blockSessionCounts[block.block_number] ?? 0} sessions</td>
                      <td className="py-2.5 px-5"><StatusBadge status={block.status} /></td>
                      <td className="py-2.5 px-5 text-right whitespace-nowrap">
                        <Link href={`/hub/clients/${clientNumber}/blocks/${block.id}`} className="text-teal font-medium hover:underline">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 pb-5">
              <div className="flex items-center justify-between rounded-lg py-2 px-1 text-sm">
                <span className="text-muted-foreground">No blocks yet</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleNewEmptyBlock}
                    disabled={creatingBlock}
                    className="text-rose font-medium hover:underline disabled:opacity-50"
                  >
                    {creatingBlock ? "Creating…" : "New Block"}
                  </button>
                  <Link href={`/hub/clients/${clientNumber}?tab=plan-agent`} className="text-rose font-medium hover:underline">Plan with AI</Link>
                </div>
              </div>
            </div>
          )}
        </HubCard>
      )}

      {segment === "sessions" && (
        <HubCard padded={false}>
          <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Session Log" color="slate" className="px-5 pt-5" />
          {sessions && sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                    <th className="h-10 px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSessionSort("date")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Date
                        {sessionSortKey === "date" && <span>{sessionSortDir === "asc" ? "↑" : "↓"}</span>}
                      </button>
                    </th>
                    <th className="h-10 px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSessionSort("session")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Session
                        {sessionSortKey === "session" && <span>{sessionSortDir === "asc" ? "↑" : "↓"}</span>}
                      </button>
                    </th>
                    <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Status</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Logged</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Check-in</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Note</th>
                    <th className="h-10 px-5 py-0"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessions.map((session) => {
                    const log = (session.data as any)?.session_log;
                    const blockNum = (session as any).blocks?.block_number;
                    const fatigue = log?.fatigue;
                    const rpe = log?.rpe != null ? Number(log.rpe) : null;
                    const evidence = setEvidenceBySession[session.id];
                    const hasSets = !!evidence && evidence.setCount > 0;
                    const isExpanded = expandedSession === session.id;
                    return (
                      <Fragment key={session.id}>
                        <tr className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)]">
                          <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">
                            <SessionDateCell session={session} />
                          </td>
                          <td className="py-2.5 px-5 font-semibold text-foreground">
                            {blockNum != null ? `Block ${blockNum} \u00b7 S${session.session_number}` : `S${session.session_number}`}
                          </td>
                          <td className="py-2.5 px-5">
                            <SessionStatusPill status={sessionStatus(session)} />
                          </td>
                          <td className="py-2.5 px-5 whitespace-nowrap">
                            {hasSets ? (
                              <button
                                type="button"
                                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                                aria-expanded={isExpanded}
                                className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-teal"
                              >
                                {evidence.setCount} {evidence.setCount === 1 ? "set" : "sets"}
                                <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-5">
                            {log ? (
                              <SessionCheckinPill fatigue={fatigue} rpe={rpe} />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-5 text-muted-foreground max-w-[240px] truncate">{log?.notes || "—"}</td>
                          <td className="py-2.5 px-5 text-right whitespace-nowrap">
                            <Link
                              href={`/hub/clients/${clientNumber}/blocks/${session.block_id}/sessions/${session.session_number}`}
                              className="text-teal font-medium hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                        {isExpanded && hasSets && (
                          <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]/50">
                            <td colSpan={7} className="px-5 py-3">
                              <SessionSetEvidenceTable evidence={evidence} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 pb-5">
              <EmptyState title="No sessions logged yet." />
            </div>
          )}
        </HubCard>
      )}

      {segment === "progress" && (
        <>
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconBarChart3 className="w-4 h-4" />}
              title="Exercise Progress"
              color="teal"
              subtitle="Working weight and reps per exercise — live sessions and imported Trainerize history combined"
              className="px-5 pt-5"
            />
            <div className="px-5 pb-5">
              <ExerciseTrendsPanel
                trends={exerciseTrends}
                emptyTitle="No logged sessions yet"
                emptyDescription="Log sets from a session page (or a home-training client logs their own) and per-exercise trends will appear here."
                idPrefix="hub-exercise-trends"
              />
            </div>
          </HubCard>

          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconActivity className="w-4 h-4" />}
              title="Exercise History"
              color="teal"
              subtitle="Personal bests and last-performed weights — live sessions and imported Trainerize history combined"
              className="px-5 pt-5"
            />
            <div className="px-5 pb-5">
              <ExerciseHistoryPanel
                history={exerciseHistory}
                emptyTitle="No logged sessions yet"
                emptyDescription="Log sets from a session and per-exercise personal bests and history will appear here."
                idPrefix="hub-exercise-history"
              />
            </div>
          </HubCard>
        </>
      )}

      {segment === "history" && (
        <TrainerizeHistoryPanel
          data={trainerizeHistory}
          emptyTitle="No Trainerize history imported yet"
          emptyDescription="Run the Trainerize import for this client to populate their historical training data, PBs, and notes."
        />
      )}
    </div>
  );
}
