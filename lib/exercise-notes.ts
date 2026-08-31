/**
 * Exercise notes aggregator — flattens per-exercise notes from sessions into a
 * unified list for the client Notes panel.
 *
 * Exercise notes live inside `sessions.data.exercise_notes` as a
 * `Record<string, string>` keyed by each exercise's persistent `uid`. This lib
 * extracts them, resolves UIDs to human-readable exercise names via the session
 * version exercises, and attaches session context (date, focus label).
 *
 * Pure functions only: no database imports, safe to import from both server
 * components and client components.
 */

import type { Session, Exercise, SessionVersion } from "@/types";
import { DEFAULT_ARCHETYPE_FOCUS_LABELS } from "@/lib/planAgentPrompt";

/** A single exercise note enriched with session and exercise context. */
export interface AggregatedExerciseNote {
  /** The note text. */
  note: string;
  /** Human-readable exercise name (resolved from UID). */
  exerciseName: string;
  /** Session display name (focus_label or archetype fallback). */
  sessionName: string;
  /** ISO timestamp of the session's scheduled_at or created_at. */
  sessionDate: string;
  /** The raw exercise UID key. */
  exerciseUid: string;
  /** The session ID this note belongs to. */
  sessionId: string;
}

function sessionDisplayName(s: Session & { data?: Record<string, unknown> }): string {
  const data = s.data as Record<string, unknown> | undefined;
  const focusLabel = (data?.focus_label as string | null | undefined)?.trim?.();
  if (focusLabel) return focusLabel;
  return (
    DEFAULT_ARCHETYPE_FOCUS_LABELS[s.archetype ?? ""] ||
    (s.session_number != null ? `Session ${s.session_number}` : "—")
  );
}

function sessionDate(s: Session & { data?: Record<string, unknown> }): string {
  const data = s.data as Record<string, unknown> | undefined;
  return (
    (data?.scheduled_at as string | null) ??
    (data?.session_log as Record<string, unknown> | null)?.completed_at as string | null ??
    s.session_id
  );
}

/** Collect all exercises from a session version (warm_up + main_block + cooldown). */
function allExercises(version: SessionVersion | undefined): Exercise[] {
  if (!version) return [];
  return [...(version.warm_up ?? []), ...(version.main_block ?? []), ...(version.cooldown ?? [])];
}

/** Build a UID → exercise name map from a session's version data. */
function uidToNameMap(session: Session & { data?: Record<string, unknown> }): Map<string, string> {
  const data = session.data as Record<string, unknown> | undefined;
  const versions = data?.versions as Record<string, SessionVersion> | undefined;
  const map = new Map<string, string>();

  for (const version of Object.values(versions ?? {})) {
    for (const ex of allExercises(version)) {
      if (ex.uid && ex.exercise_name) {
        map.set(ex.uid, ex.exercise_name);
      }
    }
  }
  return map;
}

/**
 * Flatten exercise notes from all sessions into a unified, date-sorted list.
 *
 * @param sessions - Raw session rows from the DB (with `data` JSON populated).
 * @returns Array of AggregatedExerciseNote, sorted newest-first by session date.
 */
export function aggregateExerciseNotes(
  sessions: (Session & { data?: Record<string, unknown>; id?: string })[],
): AggregatedExerciseNote[] {
  const result: AggregatedExerciseNote[] = [];

  for (const session of sessions) {
    const data = session.data as Record<string, unknown> | undefined;
    const exerciseNotes = data?.exercise_notes as Record<string, string> | undefined;
    if (!exerciseNotes || typeof exerciseNotes !== "object") continue;

    const uidMap = uidToNameMap(session);
    const sessName = sessionDisplayName(session);
    const sessDate = sessionDate(session);
    const sessionId = session.id ?? session.session_id;

    for (const [uid, note] of Object.entries(exerciseNotes)) {
      if (!note || typeof note !== "string") continue;
      result.push({
        note,
        exerciseName: uidMap.get(uid) ?? "Unknown exercise",
        sessionName: sessName,
        sessionDate: sessDate,
        exerciseUid: uid,
        sessionId,
      });
    }
  }

  // Sort newest session first
  result.sort((a, b) => {
    const da = new Date(a.sessionDate).getTime();
    const db = new Date(b.sessionDate).getTime();
    if (!isNaN(da) && !isNaN(db)) return db - da;
    return 0;
  });

  return result;
}

/**
 * Count total exercise notes across all sessions.
 */
export function countExerciseNotes(
  sessions: (Session & { data?: Record<string, unknown> })[],
): number {
  let count = 0;
  for (const session of sessions) {
    const data = session.data as Record<string, unknown> | undefined;
    const exerciseNotes = data?.exercise_notes as Record<string, string> | undefined;
    if (exerciseNotes && typeof exerciseNotes === "object") {
      for (const note of Object.values(exerciseNotes)) {
        if (note && typeof note === "string" && note.trim()) count++;
      }
    }
  }
  return count;
}
