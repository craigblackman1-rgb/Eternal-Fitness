-- Audit trail for set_logs.
--
-- Why: editing a logged set overwrote it in place. `PATCH /api/sessions/[id]/set-logs`
-- updates reps/weight_kg/duration_seconds/completed/notes and re-stamps logged_at, keeping
-- no copy of the previous values. There was no trigger, no history table, and
-- track_commit_timestamp is off, so "what did this set say before it was edited?" was only
-- answerable by extracting an hourly pg_dump off the DB VPS.
--
-- That happened for real on 2026-08-10: a client's 3 Aug session was reopened and four sets
-- that had been recorded as completed were flipped to incomplete. Recovering those four
-- values took a dump extraction. This table makes the same question a query.
--
-- Trigger-based rather than app-level on purpose: it captures every write to set_logs,
-- including direct SQL and any future code path, not just the one API route that exists today.

CREATE TABLE IF NOT EXISTS set_log_revisions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ordering key. changed_at alone is not enough: a single "save session" writes many
  -- rows in one transaction, and now() returns transaction-start time, so every revision
  -- in that save would share a timestamp and could not be put back in order.
  -- clock_timestamp() below advances within the transaction; seq breaks any remaining tie.
  seq         bigserial NOT NULL,
  set_log_id  uuid NOT NULL,
  session_id  uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  -- Full-row jsonb snapshots rather than per-column old_/new_ pairs: survives schema
  -- changes to set_logs without needing a matching migration here.
  old_row     jsonb,
  new_row     jsonb
);

COMMENT ON TABLE set_log_revisions IS
  'Append-only history of every INSERT/UPDATE/DELETE on set_logs. Written by trg_set_logs_audit. No-op updates (logged_at re-stamped, no value change) are deliberately not recorded.';

-- No FK to set_logs: a DELETE must leave its own tombstone behind, and ON DELETE CASCADE
-- would remove exactly the history we are trying to keep.
CREATE INDEX IF NOT EXISTS idx_set_log_revisions_session ON set_log_revisions (session_id, seq DESC);
CREATE INDEX IF NOT EXISTS idx_set_log_revisions_set_log ON set_log_revisions (set_log_id, seq DESC);

CREATE OR REPLACE FUNCTION set_logs_audit() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO set_log_revisions (set_log_id, session_id, action, old_row, new_row)
    VALUES (NEW.id, NEW.session_id, 'INSERT', NULL, to_jsonb(NEW));
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only record a revision when something a human logged actually changed. Saving a
    -- session re-writes every row and bumps logged_at; recording those would bury the
    -- four real edits under seventeen no-ops, which is the exact noise that made the
    -- 2026-08-10 case hard to read.
    IF (NEW.reps IS DISTINCT FROM OLD.reps
        OR NEW.weight_kg IS DISTINCT FROM OLD.weight_kg
        OR NEW.duration_seconds IS DISTINCT FROM OLD.duration_seconds
        OR NEW.completed IS DISTINCT FROM OLD.completed
        OR NEW.notes IS DISTINCT FROM OLD.notes
        OR NEW.exercise_ref IS DISTINCT FROM OLD.exercise_ref
        OR NEW.set_number IS DISTINCT FROM OLD.set_number) THEN
      INSERT INTO set_log_revisions (set_log_id, session_id, action, old_row, new_row)
      VALUES (NEW.id, NEW.session_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;

  ELSE -- DELETE
    INSERT INTO set_log_revisions (set_log_id, session_id, action, old_row, new_row)
    VALUES (OLD.id, OLD.session_id, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_logs_audit ON set_logs;
CREATE TRIGGER trg_set_logs_audit
  AFTER INSERT OR UPDATE OR DELETE ON set_logs
  FOR EACH ROW EXECUTE FUNCTION set_logs_audit();
