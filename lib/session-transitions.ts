import { getPool } from "@/lib/pg-client";

/**
 * CR-EF-037 Phase 2 — flip a session to `in_progress` the moment its first set
 * is logged, and stamp `started_at` from that real event (never screen-mount
 * time — that was the CR-EF-030 bug). Idempotent: the WHERE guard means a
 * second/third call for the same session (second set, retry, offline replay)
 * is a no-op. Call this after every successful set_logs insert, staff and
 * portal alike — it's the one thing both write paths must agree on.
 */
export async function markSessionInProgress(sessionId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE sessions
        SET status = 'in_progress', started_at = COALESCE(started_at, now())
      WHERE id = $1
        AND status IN ('planned', 'scheduled')`,
    [sessionId],
  );
}
