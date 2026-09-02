-- Lane D1 — session scheduling (additive only; no backfill).
--
-- Adds a "scheduled for" concept to sessions. This is deliberately distinct from
-- the existing "actually completed" record (sessions.data.session_log — RPE /
-- fatigue / notes / completed_at) and from the prescription (sessions.data JSONB).
-- A session's booked date and its performed record are two different things and
-- are never conflated: nothing here touches sessions.data.
--
--   scheduled_at  = when this session is booked to happen (NULL = unscheduled)
--   cancelled_at  = when the booking was cancelled (NULL = not cancelled).
--                   Reversible — clearing it un-cancels the session.
--   cancel_reason = optional free-text reason for the cancellation (NULL = none)
--
-- Every existing session row defaults to NULL for all three, i.e. unscheduled and
-- not cancelled, so no existing block/session's behaviour changes until Esther
-- applies a pattern or edits a session directly.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

COMMENT ON COLUMN sessions.scheduled_at IS
  'When this session is booked to happen. NULL = unscheduled. Distinct from the performed record in data.session_log.completed_at.';
COMMENT ON COLUMN sessions.cancelled_at IS
  'When the booking was cancelled. NULL = not cancelled. Reversible: clearing this un-cancels the session.';
COMMENT ON COLUMN sessions.cancel_reason IS
  'Optional free-text reason for the cancellation. NULL = none.';

-- Speeds up the studio-wide calendar query (Lane D2), which will filter/scan by
-- scheduled_at across all clients' sessions on a given day.
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at ON sessions(scheduled_at);

-- RLS deliberately not enabled here: matches the confirmed, working pattern used
-- since the Postgres migration (see 20260722_scanned_document_storage.sql and
-- 20260725_session_set_logs.sql). This is a plain-Postgres instance where the
-- Supabase "authenticated" role never carried over, so CREATE POLICY ...
-- TO authenticated errors with "role authenticated does not exist" and would
-- abort this migration. Access control is enforced at the app/API layer (staff
-- session check in the sessions API routes), same as every other table.
