/**
 * S8 — Block review & update. Pure fact-assembly for the "This block, in
 * facts" panel: attendance, PBs achieved inside the block's own dates, and
 * exercises still logging below their all-time best. No DB imports here —
 * the page (server component) fetches the rows, these functions turn them
 * into the honest facts the screen renders. Every fact here must be
 * computable from real rows; where it can't be, the caller renders the
 * empty state (rule 5 — a missing value is a sentence, not an invented
 * number).
 */

import type { DBSession, SetLog } from "@/types";
import { parseExerciseName } from "@/lib/progress";

export interface AttendanceFacts {
  /** Non-cancelled, non-sub-session bookings in the block. */
  bookedCount: number;
  /** Of those, how many actually completed (status === 'completed'). */
  completedCount: number;
  cancelledCount: number;
  cancelledSessions: { scheduledAt: string | null; reason: string | null }[];
  /** Earliest–latest scheduled_at across the block's own sessions, formatted. */
  dateRangeLabel: string;
  /** True only when every booked session completed — never assumed. */
  isFullAttendance: boolean;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Attendance facts for one block, computed from its own sessions rows only —
 *  never inferred from the block's own `status` field (a block can be marked
 *  complete while a session inside it never logged, and the fact must say so). */
export function computeAttendanceFacts(blockSessions: DBSession[]): AttendanceFacts {
  const mainSessions = blockSessions.filter((s) => !s.parent_session_id);
  const cancelled = mainSessions.filter((s) => !!s.cancelled_at);
  const booked = mainSessions.filter((s) => !s.cancelled_at);
  const completed = booked.filter((s) => (s.status ?? (s.completed_at ? "completed" : "planned")) === "completed");

  const dates = mainSessions
    .map((s) => s.scheduled_at)
    .filter((d): d is string => !!d)
    .sort();

  return {
    bookedCount: booked.length,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    cancelledSessions: cancelled.map((s) => ({ scheduledAt: s.scheduled_at ?? null, reason: s.cancel_reason ?? null })),
    dateRangeLabel:
      dates.length === 0
        ? "Not yet scheduled"
        : dates[0] === dates[dates.length - 1]
          ? fmtDate(dates[0])
          : `${fmtDate(dates[0])}–${fmtDate(dates[dates.length - 1])}`,
    isFullAttendance: booked.length > 0 && completed.length === booked.length,
  };
}

export interface PbFact {
  exercise: string;
  weightKg: number | null;
  repCount: number | null;
  achievedAtLabel: string;
}

/** Personal records (from the `personal_records` table) whose achieved_at
 *  falls inside the block's own date range — i.e. genuinely set during this
 *  block, not carried in from before or after it. Weight-metric PBs only
 *  (matches the weight-based "still below best" comparison below); a
 *  duration/rep/band PB is real but this card's job is the weight story. */
export function computePbsInBlockRange(
  personalRecords: { exercise: string; metric: string; value: string | number; rep_count: number | null; achieved_at: string }[],
  rangeStartIso: string | null,
  rangeEndIso: string | null,
): PbFact[] {
  if (!rangeStartIso || !rangeEndIso) return [];
  const start = new Date(rangeStartIso).getTime();
  const end = new Date(rangeEndIso).getTime();
  return personalRecords
    .filter((pr) => pr.metric === "weight")
    .filter((pr) => {
      const t = new Date(pr.achieved_at).getTime();
      return t >= start && t <= end;
    })
    .map((pr) => ({
      exercise: pr.exercise,
      weightKg: Number(pr.value),
      repCount: pr.rep_count,
      achievedAtLabel: fmtDate(pr.achieved_at),
    }))
    .sort((a, b) => a.exercise.localeCompare(b.exercise));
}

export interface BelowBestFact {
  exercise: string;
  lastWeightKg: number;
  bestWeightKg: number;
}

/** Exercises whose most recently logged working weight sits below the
 *  heaviest weight ever logged for that exercise (any block, any time) — the
 *  same "last point vs. max across all points" comparison the client
 *  record's own Training section already uses for its "below best" count,
 *  reapplied here to name the exercises rather than just count them.
 *  Scoped to ALL of the client's set_logs (not just this block) because a
 *  fact carried over from before the block is still true during it — the
 *  card explains that in copy, this function just finds the exercises. */
export function computeBelowBestFacts(allClientSetLogs: SetLog[]): BelowBestFact[] {
  const working = allClientSetLogs.filter((l) => l.completed && !l.is_warmup && typeof l.weight_kg === "number");

  // exercise -> session_id -> best weight logged in that session, plus when
  const byExercise = new Map<string, Map<string, { weight: number; loggedAt: string }>>();
  for (const l of working) {
    const name = parseExerciseName(l.exercise_ref);
    let sessions = byExercise.get(name);
    if (!sessions) {
      sessions = new Map();
      byExercise.set(name, sessions);
    }
    const loggedAt = l.logged_at ?? l.created_at;
    const existing = sessions.get(l.session_id);
    if (!existing || (l.weight_kg as number) > existing.weight) {
      sessions.set(l.session_id, { weight: l.weight_kg as number, loggedAt });
    }
  }

  const result: BelowBestFact[] = [];
  for (const [exercise, sessions] of byExercise) {
    const points = [...sessions.values()].sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : a.loggedAt > b.loggedAt ? 1 : 0));
    if (points.length < 2) continue; // nothing to compare a single session against
    const best = Math.max(...points.map((p) => p.weight));
    const last = points[points.length - 1].weight;
    if (last < best) {
      result.push({ exercise, lastWeightKg: last, bestWeightKg: best });
    }
  }
  return result.sort((a, b) => a.exercise.localeCompare(b.exercise));
}

/** Standing training rules ("what this means for training"), rendered as
 *  plain detail text. Deliberately drops the rule-type label when it is the
 *  unclassified placeholder ("General / unclassified note") — real data on
 *  this client base carries that placeholder on every row, and RULES.md /
 *  CLAUDE.md both bar a placeholder category ever reaching a screen. */
export function computeRulesInEffect(
  adaptations: { id: string; detail: string; rule_type_id: string }[],
  ruleTypesById: Map<string, { label?: string | null }>,
): { id: string; text: string }[] {
  const PLACEHOLDER_LABEL = "General / unclassified note";
  return adaptations.map((r) => {
    const label = ruleTypesById.get(r.rule_type_id)?.label;
    const usableLabel = label && label !== PLACEHOLDER_LABEL ? label : null;
    return { id: r.id, text: usableLabel ? `${usableLabel} — ${r.detail}` : r.detail };
  });
}
