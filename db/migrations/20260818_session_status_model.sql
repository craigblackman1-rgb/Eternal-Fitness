-- CR-EF-037 Phase 1 — first-class session status.
--
-- Kills the class of bug behind CR-EF-030/031/033/036 (four surfaces re-deriving
-- "completed" four different ways, none of them agreeing). Adds three columns
-- and backfills them from what already exists; nothing existing is altered or
-- dropped, and no existing reader breaks -- they keep reading data.session_log /
-- scheduled_at / cancelled_at exactly as before until the app code is switched
-- over to read `status` instead (separate, app-side change, not this migration).
--
--   status        the single source of truth from here on. One of:
--                    planned      -- no date, nothing logged (the default)
--                    scheduled    -- has scheduled_at, nothing logged yet
--                    in_progress  -- at least one set logged, not yet completed
--                    completed    -- data.session_log.completed_at is set
--                    cancelled    -- cancelled_at is set (takes precedence)
--   started_at    when the first set was logged. NOT screen-mount time (that was
--                 the H2/CR-EF-030 bug -- mount-time started_at is exactly what
--                 let a stale local ref clobber a real completion). Backfilled
--                 from the earliest set_logs row for the session where one
--                 exists; NULL where none does.
--   completed_at  mirrors data.session_log.completed_at as a real, indexable,
--                 sortable column -- CR-EF-027 needed this at the DB level and
--                 couldn't have it. The JSONB copy is left in place; the two
--                 are kept in sync by the transition API (app-side), not by a
--                 trigger, matching this project's existing pattern of no
--                 triggers on this table.
--
-- Backfill precedence, matching the assessment's verified mapping
-- (.context/assessment-workout-unification-2026-08-17.md, Part 3.1): cancelled
-- beats completed beats in-progress beats scheduled beats planned. A session
-- that was completed and then had its booking separately cancelled keeps
-- showing as cancelled here, same as the existing cancelled_at column already
-- implies -- this migration doesn't change that precedence, it just makes it a
-- first-class value instead of something four call sites re-infer.
--
-- Idempotent and additive throughout: every ALTER is IF NOT EXISTS, the backfill
-- UPDATE only touches rows where status is still the just-added default
-- ('planned'), so re-running this file is a no-op the second time. No RLS
-- statements -- matches the established pattern for this plain-Postgres
-- instance (see 20260725_session_scheduling.sql).

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_status_check'
  ) THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
      CHECK (status IN ('planned', 'scheduled', 'in_progress', 'completed', 'cancelled'));
  END IF;
END $$;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMENT ON COLUMN sessions.status IS
  'First-class session lifecycle state -- the single source of truth. Every surface must read this, not re-derive it from data.session_log/scheduled_at/cancelled_at. See CR-EF-037.';
COMMENT ON COLUMN sessions.started_at IS
  'When the first set was logged for this session. NOT screen-mount time -- that was the CR-EF-030 bug. NULL if nothing has been logged yet.';
COMMENT ON COLUMN sessions.completed_at IS
  'Real, indexable copy of data.session_log.completed_at. Kept in sync by the transition API, not a trigger.';

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Backfill. Only touches rows still at the just-added default, so this block is
-- safe to leave in a re-run migration file (idempotent) without re-deriving
-- status for any row the transition API has since taken ownership of.

-- 1) completed_at, from the existing JSONB record.
UPDATE sessions
SET completed_at = (data #>> '{session_log,completed_at}')::timestamptz
WHERE status = 'planned'
  AND data #>> '{session_log,completed_at}' IS NOT NULL;

-- 2) started_at, from the earliest logged set for the session (any exercise_ref
--    under this session_id), where one exists. set_logs has no direct FK to
--    sessions in this schema -- it is keyed by session_id (uuid) as a plain
--    column, matching every existing set_logs query in the app.
UPDATE sessions s
SET started_at = earliest.first_logged_at
FROM (
  SELECT session_id, MIN(COALESCE(logged_at, created_at)) AS first_logged_at
  FROM set_logs
  GROUP BY session_id
) earliest
WHERE s.id = earliest.session_id
  AND s.status = 'planned'
  AND s.started_at IS NULL;

-- 3) status itself, precedence cancelled > completed > in_progress > scheduled > planned.
UPDATE sessions
SET status = CASE
  WHEN cancelled_at IS NOT NULL THEN 'cancelled'
  WHEN completed_at IS NOT NULL THEN 'completed'
  WHEN started_at IS NOT NULL THEN 'in_progress'
  WHEN scheduled_at IS NOT NULL THEN 'scheduled'
  ELSE 'planned'
END
WHERE status = 'planned'
  AND (cancelled_at IS NOT NULL OR completed_at IS NOT NULL OR started_at IS NOT NULL OR scheduled_at IS NOT NULL);
