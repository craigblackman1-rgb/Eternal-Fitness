/**
 * Exercise history — per-exercise PB + last-performed derivation over set_logs.
 *
 * Pure functions only: no database imports, safe to import from client
 * components. All DB access lives in portal-data.ts (portal) or the hub
 * server-component page (staff).
 *
 * exercise_ref convention (see supabase/migrations/20260725_session_set_logs.sql):
 *   <version>:<section>:<index>:<exercise_name>
 * e.g. "studio:warm_up:0:Bodyweight Squat". Grouping is by the trailing
 * exercise_name segment (everything after the last colon), because section/index
 * can shift between sessions for the same exercise.
 */

import type { SetLog } from "@/types";
import { parseExerciseName } from "@/lib/progress";

/** One personal-best entry — the heaviest weight_kg for a given rep count, or
 *  the longest duration_seconds for time-based exercises. */
export interface PersonalBestEntry {
  /** Reps at which this PB was set (null for time-based PBs). */
  reps: number | null;
  /** Heaviest weight_kg at these reps (null for time-based PBs). */
  weightKg: number | null;
  /** Longest duration_seconds (only populated for time-based PBs). */
  durationSeconds: number | null;
  /** ISO timestamp of the session where this PB was set. */
  achievedAt: string;
}

/** Summary of the most recent session where this exercise was performed. */
export interface LastPerformedEntry {
  /** ISO timestamp of the session. */
  loggedAt: string;
  /** Best weight_kg from that session (highest-weight set). */
  weightKg: number | null;
  /** Reps at that best weight. */
  reps: number | null;
  /** Best duration_seconds from that session. */
  durationSeconds: number | null;
}

export interface ExerciseHistoryEntry {
  exerciseName: string;
  /** Personal bests — one entry per rep-count bracket (weight-based) or one
   *  entry for max duration (time-based). */
  personalBests: PersonalBestEntry[];
  /** Most recent session data, or null if this exercise has never been logged. */
  lastPerformed: LastPerformedEntry | null;
  /** Number of distinct sessions in which this exercise was logged. */
  totalSessions: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Derive per-exercise PB + last-performed from raw set_logs rows.
 * Only completed sets are considered. An empty or sparse input returns [].
 */
export function buildExerciseHistory(logs: SetLog[]): ExerciseHistoryEntry[] {
  if (!logs || logs.length === 0) return [];

  // exercise_name → { sessions: Map<session_id, { loggedAt, bestWeight, bestReps, bestDuration }>,
  //                   pbByReps: Map<reps, { weightKg, loggedAt }>,
  //                   maxDuration: { durationSeconds, loggedAt } }
  const byExercise = new Map<string, {
    sessionBestWeight: number | null;
    sessionBestReps: number | null;
    sessionBestDuration: number | null;
    sessions: Map<string, {
      loggedAt: string;
      bestWeight: number | null;
      bestReps: number | null;
      bestDuration: number | null;
    }>;
    pbByReps: Map<number, { weightKg: number; loggedAt: string }>;
    maxDurationEntry: { durationSeconds: number; loggedAt: string } | null;
  }>();

  for (const log of logs) {
    if (!log || !log.exercise_ref || !log.completed || log.is_warmup) continue;
    const name = parseExerciseName(log.exercise_ref);

    let ex = byExercise.get(name);
    if (!ex) {
      ex = {
        sessionBestWeight: null,
        sessionBestReps: null,
        sessionBestDuration: null,
        sessions: new Map(),
        pbByReps: new Map(),
        maxDurationEntry: null,
      };
      byExercise.set(name, ex);
    }

    let sess = ex.sessions.get(log.session_id);
    if (!sess) {
      sess = {
        loggedAt: log.logged_at ?? log.created_at,
        bestWeight: null,
        bestReps: null,
        bestDuration: null,
      };
      ex.sessions.set(log.session_id, sess);
    }

    // Track best weight per session
    if (typeof log.weight_kg === "number" && (sess.bestWeight === null || log.weight_kg > sess.bestWeight)) {
      sess.bestWeight = log.weight_kg;
      sess.bestReps = log.reps;
    }

    // Track best duration per session
    if (typeof log.duration_seconds === "number" && (sess.bestDuration === null || log.duration_seconds > sess.bestDuration)) {
      sess.bestDuration = log.duration_seconds;
    }

    // Global PB: best weight_kg per rep count
    if (typeof log.weight_kg === "number" && typeof log.reps === "number") {
      const existing = ex.pbByReps.get(log.reps);
      if (!existing || log.weight_kg > existing.weightKg) {
        ex.pbByReps.set(log.reps, { weightKg: log.weight_kg, loggedAt: log.logged_at ?? log.created_at });
      }
    }

    // Global PB: max duration (time-based exercises)
    if (typeof log.duration_seconds === "number") {
      if (!ex.maxDurationEntry || log.duration_seconds > ex.maxDurationEntry.durationSeconds) {
        ex.maxDurationEntry = { durationSeconds: log.duration_seconds, loggedAt: log.logged_at ?? log.created_at };
      }
    }
  }

  const result: ExerciseHistoryEntry[] = [];
  for (const [name, ex] of byExercise) {
    // Personal bests: build from pbByReps map
    const personalBests: PersonalBestEntry[] = [];
    for (const [reps, pb] of ex.pbByReps) {
      personalBests.push({
        reps,
        weightKg: pb.weightKg,
        durationSeconds: null,
        achievedAt: pb.loggedAt,
      });
    }
    // Sort by weight descending (heaviest first)
    personalBests.sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0));

    // If no weighted PBs exist but there is a duration PB, add it
    if (personalBests.length === 0 && ex.maxDurationEntry) {
      personalBests.push({
        reps: null,
        weightKg: null,
        durationSeconds: ex.maxDurationEntry.durationSeconds,
        achievedAt: ex.maxDurationEntry.loggedAt,
      });
    }

    // Last performed: most recent session by logged_at
    const sessionsSorted = [...ex.sessions.entries()]
      .sort((a, b) => new Date(b[1].loggedAt).getTime() - new Date(a[1].loggedAt).getTime());
    const latestSession = sessionsSorted[0]?.[1] ?? null;
    const lastPerformed: LastPerformedEntry | null = latestSession
      ? {
          loggedAt: latestSession.loggedAt,
          weightKg: latestSession.bestWeight,
          reps: latestSession.bestReps,
          durationSeconds: latestSession.bestDuration,
        }
      : null;

    result.push({
      exerciseName: name,
      personalBests,
      lastPerformed,
      totalSessions: ex.sessions.size,
    });
  }

  result.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  return result;
}

export { formatDate };
