-- CR-EF-099 — structured charged/free flag on session cancellations.
--
-- Today, sessions.cancel_reason is free text with no record of whether the
-- cancellation consumed a session from the client's pot. This migration adds
-- an explicit `charged_free` flag set at cancellation time (Craig's decision
-- 2026-08-31: explicit flag, NOT auto-derived from a notice-period rule).
--
-- The flag drives the session pot counter: completed sessions + charged
-- cancellations = used; free cancellations and reschedules do not count.
--
-- NULL = not yet decided (covers old cancellations without the flag).
-- 'charged' = this cancellation consumed a session from the pot.
-- 'free' = this cancellation did not consume a session.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS charged_free TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_charged_free_check'
  ) THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_charged_free_check
      CHECK (charged_free IN ('charged', 'free'));
  END IF;
END $$;

COMMENT ON COLUMN sessions.charged_free IS
  'CR-EF-099 — structured flag set at cancellation time. ''charged'' = consumed a session from the pot, ''free'' = did not. NULL = not yet decided (legacy cancellations). Drives the session pot counter.';

CREATE INDEX IF NOT EXISTS idx_sessions_charged_free ON sessions(charged_free) WHERE charged_free IS NOT NULL;
