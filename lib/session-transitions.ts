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

/** Read a session's first-class lifecycle status (CR-EF-037 Phase 1). NULL when
 *  the session doesn't exist. */
export async function getSessionStatus(sessionId: string): Promise<string | null> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT status FROM sessions WHERE id = $1 LIMIT 1`,
    [sessionId],
  );
  return res.rows[0]?.status ?? null;
}

/**
 * CR-EF-031 — reopen a completed session so its logged data and prescription can
 * be changed again. Idempotent, guarded UPDATE (same shape as markSessionInProgress):
 * only a `completed` session matches the WHERE clause, so a second call is a no-op.
 * Clears both the first-class `completed_at` column and its JSONB mirror
 * (`data.session_log.completed_at`) so the two stay in sync — that sync is owned by
 * the transition API per 20260818_session_status_model.sql. Returns true when a row
 * was actually reopened, false when there was nothing to reopen (not found / not
 * completed). The subsequent edits themselves are audited by the existing
 * `trg_set_logs_audit` trigger into `set_log_revisions`.
 */
export async function reopenSession(sessionId: string): Promise<boolean> {
  const pool = getPool();
  const res = await pool.query(
    `UPDATE sessions
        SET status = 'in_progress',
            completed_at = NULL,
            data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{session_log,completed_at}',
              'null'::jsonb,
              false
            )
      WHERE id = $1
        AND status = 'completed'`,
    [sessionId],
  );
  return (res.rowCount ?? 0) > 0;
}
