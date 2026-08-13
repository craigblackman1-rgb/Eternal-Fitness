/**
 * Personal-record (PB) check and upsert — reuses buildExerciseHistory from
 * lib/exercise-history.ts (the single-source PB definition). Server-only:
 * imports getPool() from pg-client and must not be imported from a client
 * component.
 *
 * Called by both set-logs API routes (hub + portal) after every successful
 * POST/PATCH to determine whether the just-saved set is a new personal best.
 */

import type { SetLog } from "@/types";
import { getPool } from "@/lib/pg-client";
import { buildExerciseHistory } from "@/lib/exercise-history";
import { parseExerciseName } from "@/lib/progress";

/**
 * Check whether a completed set is a new PB for its client, and upsert into
 * the personal_records table if it is. Returns true when the set established
 * at least one new personal best.
 *
 * Safety: re-derives from all completed set_logs for this client every time
 * (not from the personal_records table), so the PB derivation is always
 * consistent with buildExerciseHistory — never drifts from a competing
 * definition.
 */
export async function checkAndUpsertPB(
  clientId: string,
  log: SetLog,
): Promise<boolean> {
  if (!log.completed) return false;

  const pool = getPool();

  // Fetch every completed set_log for this client, across all sessions,
  // excluding the just-saved row so the PB check compares against the
  // pre-existing history — not the log we just wrote.
  const res = await pool.query(
    `SELECT sl.*
       FROM set_logs sl
       JOIN sessions s ON s.id = sl.session_id
       JOIN blocks b ON b.id = s.block_id
      WHERE b.client_id = $1 AND sl.completed = true AND sl.id <> $2
      ORDER BY sl.logged_at ASC`,
    [clientId, log.id],
  );

  const allLogs: SetLog[] = res.rows;
  const history = buildExerciseHistory(allLogs);

  // Does this set beat any existing PB for its exercise + metric?
  const exerciseName = parseExerciseName(log.exercise_ref);
  const entry = history.find((e) => e.exerciseName === exerciseName);

  let isPb = false;
  let pbMetric: "weight" | "duration" | null = null;
  let pbValue: number | null = null;
  let pbRepCount: number | null = null;

  if (log.weight_kg != null && log.reps != null) {
    const existing = entry?.personalBests.find((pb) => pb.reps === log.reps);
    if (!existing || log.weight_kg > (existing.weightKg ?? 0)) {
      isPb = true;
      pbMetric = "weight";
      pbValue = log.weight_kg;
      pbRepCount = log.reps;
    }
  }

  if (!isPb && log.duration_seconds != null) {
    const existing = entry?.personalBests.find((pb) => pb.durationSeconds != null);
    if (!existing || log.duration_seconds > (existing.durationSeconds ?? 0)) {
      isPb = true;
      pbMetric = "duration";
      pbValue = log.duration_seconds;
      pbRepCount = null;
    }
  }

  if (!isPb || !pbMetric || pbValue == null) return false;

  // Upsert into personal_records — idempotent, and never downgrades an existing PB:
  // GREATEST keeps the higher of the two values, so a delayed/replayed lower write
  // cannot silently overwrite a real higher PB (last-write-wins would). achieved_at
  // only advances when the incoming value actually beats the stored one.
  await pool.query(
    `INSERT INTO personal_records
       (client_id, exercise, metric, value, rep_count, achieved_at, source)
     VALUES ($1, $2, $3, $4, $5, $6, 'live_log')
     ON CONFLICT (client_id, exercise, metric, rep_count)
     DO UPDATE SET
       value = GREATEST(personal_records.value, EXCLUDED.value),
       achieved_at = CASE
         WHEN EXCLUDED.value > personal_records.value THEN EXCLUDED.achieved_at
         ELSE personal_records.achieved_at
       END`,
    [clientId, exerciseName, pbMetric, pbValue, pbRepCount, log.logged_at ?? log.created_at],
  );

  return true;
}
