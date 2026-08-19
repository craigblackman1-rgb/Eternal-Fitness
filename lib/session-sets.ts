/**
 * CR-EF-036 — logged-set evidence for the client-page Sessions view.
 *
 * The Sessions tab was a pure `session_log` projection and never read `set_logs`,
 * so a session with logged sets but no "Complete" press rendered as a row of
 * dashes. These helpers turn raw `set_logs` rows into a compact, display-ready
 * per-exercise breakdown.
 *
 * Identity is keyed on `exercise_uid` — the stable per-exercise uid that already
 * lives in the prescription JSON and on the log row (100% backfilled) — falling
 * back to `exercise_name` then the legacy positional `exercise_ref`. Grouping by
 * uid (not array position) is what makes logged data survive a prescription edit:
 * a reorder/swap/remove shifts `exercise_ref` indices but never the uid.
 *
 * Pure functions only — no database imports, safe to import from client
 * components (the pg shim already coerces `weight_kg` from NUMERIC to number).
 */

import type { SetLog } from "@/types";
import { parseExerciseName } from "@/lib/progress";

/** One performed set, reduced to what the Sessions view needs to render. */
export interface SetEvidence {
  setNumber: number;
  /** Human summary, e.g. "12 kg × 10 reps", "20 s", "10 reps", or "skipped". */
  summary: string;
  completed: boolean;
  isWarmup: boolean;
}

/** One exercise's logged sets within a single session. */
export interface ExerciseSetEvidence {
  /** Identity key the exercise was grouped under (uid, else name, else ref). */
  key: string;
  /** Display name — the stored `exercise_name`, falling back to the ref's name segment. */
  name: string;
  sets: SetEvidence[];
}

/** Everything logged for one session, ready to render inline. */
export interface SessionSetEvidence {
  setCount: number;
  completedCount: number;
  exercises: ExerciseSetEvidence[];
}

/** Stable identity for grouping: uid wins, then name, then the positional ref. */
export function exerciseIdentityKey(log: SetLog): string {
  if (log.exercise_uid) return log.exercise_uid;
  if (log.exercise_name) return log.exercise_name;
  return log.exercise_ref;
}

/** Display name: the stored exercise_name, else the ref's trailing name segment. */
export function exerciseDisplayName(log: SetLog): string {
  return log.exercise_name ?? parseExerciseName(log.exercise_ref);
}

/** One set → a compact human string. Skipped sets read "skipped", never "—". */
export function formatSetSummary(log: SetLog): string {
  if (!log.completed) return "skipped";
  const parts: string[] = [];
  if (typeof log.weight_kg === "number") parts.push(`${log.weight_kg} kg`);
  if (typeof log.reps === "number") parts.push(`${log.reps} reps`);
  if (typeof log.duration_seconds === "number") parts.push(`${log.duration_seconds} s`);
  return parts.length > 0 ? parts.join(" × ") : "—";
}

/**
 * Reduce one session's set_logs into per-exercise evidence. Sets are ordered by
 * set_number within each exercise; exercises keep insertion (first-logged) order.
 */
export function buildSessionSetEvidence(logs: SetLog[]): SessionSetEvidence {
  const evidence: SessionSetEvidence = { setCount: 0, completedCount: 0, exercises: [] };
  if (!logs || logs.length === 0) return evidence;

  const byKey = new Map<string, ExerciseSetEvidence>();
  for (const log of logs) {
    if (!log) continue;
    const key = exerciseIdentityKey(log);
    let ex = byKey.get(key);
    if (!ex) {
      ex = { key, name: exerciseDisplayName(log), sets: [] };
      byKey.set(key, ex);
    }
    ex.sets.push({
      setNumber: log.set_number,
      summary: formatSetSummary(log),
      completed: log.completed,
      isWarmup: log.is_warmup ?? false,
    });
    evidence.setCount += 1;
    if (log.completed) evidence.completedCount += 1;
  }

  evidence.exercises = [...byKey.values()].map((ex) => ({
    ...ex,
    sets: [...ex.sets].sort((a, b) => a.setNumber - b.setNumber),
  }));
  return evidence;
}

/** Group a flat set_logs array into per-session evidence, keyed by session_id. */
export function groupSetLogsBySession(logs: SetLog[]): Record<string, SessionSetEvidence> {
  const bySession = new Map<string, SetLog[]>();
  for (const log of logs) {
    if (!log) continue;
    const list = bySession.get(log.session_id);
    if (list) list.push(log);
    else bySession.set(log.session_id, [log]);
  }
  const result: Record<string, SessionSetEvidence> = {};
  for (const [sessionId, sessionLogs] of bySession) {
    result[sessionId] = buildSessionSetEvidence(sessionLogs);
  }
  return result;
}
