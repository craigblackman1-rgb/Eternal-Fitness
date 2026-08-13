/**
 * Lane C — per-exercise progress/trend aggregation over set_logs.
 *
 * Pure functions only: no database imports, safe to import from client
 * components (the chart panel imports the types). All DB access for
 * progress lives in lib/progress-db.ts.
 *
 * exercise_ref convention (see supabase/migrations/20260725_session_set_logs.sql):
 *   <version>:<section>:<index>:<exercise_name>
 * e.g. "studio:warm_up:0:Bodyweight Squat". Parsing is defensive — a ref that
 * doesn't match the convention falls back to the raw ref as the display name
 * rather than being dropped, so a format drift degrades labels, not data.
 */

import type { SetLog } from "@/types";

/**
 * "Gone quiet" threshold: a home-training client with no self-logged set
 * (logged_by = 'client') in this many days is flagged to Esther in the hub.
 * Esther-facing detection only — any client-facing nudge/send is gated
 * separately (see the Work Order's ASK FIRST list) and is NOT wired here.
 */
export const HOME_TRAINING_QUIET_DAYS = 7;

/** True when a home-training client counts as "gone quiet". */
export function isGoneQuiet(
  lastClientLogAt: string | null,
  days: number = HOME_TRAINING_QUIET_DAYS,
  now: Date = new Date(),
): boolean {
  if (!lastClientLogAt) return true;
  const last = new Date(lastClientLogAt);
  if (isNaN(last.getTime())) return true;
  return now.getTime() - last.getTime() > days * 86_400_000;
}

/**
 * Pull the exercise name back out of an exercise_ref. Tolerant of format
 * drift: names containing ":" are re-joined; anything that doesn't look like
 * the 4-part convention is returned as-is so no log row ever disappears from
 * the trend view because of an unexpected ref shape.
 */
export function parseExerciseName(exerciseRef: string): string {
  const parts = exerciseRef.split(":");
  if (parts.length >= 4) {
    const name = parts.slice(3).join(":").trim();
    if (name) return name;
  }
  const trimmed = exerciseRef.trim();
  return trimmed || "Unknown exercise";
}

/** Which metric a trend charts, based on what was actually logged. */
export type TrendMetric = "weight" | "reps" | "duration";

/** block/session labelling info for a session id (for x-axis labels). */
export interface TrendSessionMeta {
  blockNumber: number | null;
  sessionNumber: number | null;
}

/** One point per session in which the exercise was logged. */
export interface TrendPoint {
  /** ISO timestamp of the first log for this exercise in this session. */
  loggedAt: string;
  /** X-axis label, e.g. "B2 S5" or a short date when block info is missing. */
  label: string;
  /** Short date, e.g. "25 Jul" — shown in tooltips alongside the label. */
  dateLabel: string;
  /** Heaviest completed set (kg); null when nothing weighted was completed. */
  topWeightKg: number | null;
  /** Reps achieved on that heaviest completed set. */
  repsAtTopWeight: number | null;
  /** Best completed reps in the session (any set). */
  maxReps: number | null;
  /** Longest completed duration in the session (seconds). */
  maxDurationSeconds: number | null;
  completedSets: number;
  totalSets: number;
}

export interface ExerciseTrend {
  exerciseName: string;
  metric: TrendMetric;
  points: TrendPoint[];
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Aggregate raw set_logs rows into per-exercise trends: one point per
 * session, ordered oldest-first. Handles the empty/sparse case by simply
 * returning [] — callers render an empty state, never a broken chart.
 */
export function buildExerciseTrends(
  logs: SetLog[],
  sessionMeta: Record<string, TrendSessionMeta> = {},
): ExerciseTrend[] {
  if (!logs || logs.length === 0) return [];

  // exercise name -> session id -> logs
  const byExercise = new Map<string, Map<string, SetLog[]>>();
  for (const log of logs) {
    if (!log || !log.exercise_ref) continue;
    const name = parseExerciseName(log.exercise_ref);
    let sessions = byExercise.get(name);
    if (!sessions) {
      sessions = new Map();
      byExercise.set(name, sessions);
    }
    const list = sessions.get(log.session_id);
    if (list) list.push(log);
    else sessions.set(log.session_id, [log]);
  }

  const trends: ExerciseTrend[] = [];
  for (const [exerciseName, sessions] of byExercise) {
    const points: TrendPoint[] = [];
    for (const [sessionId, sessionLogs] of sessions) {
      const loggedAt = sessionLogs
        .map((l) => l.logged_at)
        .filter(Boolean)
        .sort()[0] ?? sessionLogs[0].created_at;

      const completed = sessionLogs.filter((l) => l.completed);
      // Working sets only for the trend metrics — a warm-up set's weight/reps/
      // duration must never set the session's "top weight" or "best reps".
      const working = completed.filter((l) => !l.is_warmup);

      let topWeightKg: number | null = null;
      let repsAtTopWeight: number | null = null;
      let maxReps: number | null = null;
      let maxDurationSeconds: number | null = null;
      for (const l of working) {
        if (typeof l.weight_kg === "number") {
          if (topWeightKg === null || l.weight_kg > topWeightKg) {
            topWeightKg = l.weight_kg;
            repsAtTopWeight = l.reps ?? null;
          } else if (l.weight_kg === topWeightKg && typeof l.reps === "number") {
            repsAtTopWeight = Math.max(repsAtTopWeight ?? 0, l.reps);
          }
        }
        if (typeof l.reps === "number") maxReps = Math.max(maxReps ?? 0, l.reps);
        if (typeof l.duration_seconds === "number") {
          maxDurationSeconds = Math.max(maxDurationSeconds ?? 0, l.duration_seconds);
        }
      }

      const meta = sessionMeta[sessionId];
      const dateLabel = shortDate(loggedAt);
      const label =
        meta && meta.blockNumber != null && meta.sessionNumber != null
          ? `B${meta.blockNumber} S${meta.sessionNumber}`
          : dateLabel;

      points.push({
        loggedAt,
        label,
        dateLabel,
        topWeightKg,
        repsAtTopWeight,
        maxReps,
        maxDurationSeconds,
        completedSets: completed.length,
        totalSets: sessionLogs.length,
      });
    }

    points.sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : a.loggedAt > b.loggedAt ? 1 : 0));

    const metric: TrendMetric = points.some((p) => p.topWeightKg !== null)
      ? "weight"
      : points.some((p) => p.maxDurationSeconds !== null)
        ? "duration"
        : "reps";

    trends.push({ exerciseName, metric, points });
  }

  trends.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  return trends;
}
