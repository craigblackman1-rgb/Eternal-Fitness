-- Migration: Block re-parenting of a completed session
--
-- WHY a trigger and not a CHECK constraint?
-- A CHECK constraint like "parent_session_id IS NULL OR completed_at IS NULL"
-- would prevent a LEGITIMATE supplementary session from ever being completed.
-- That is wrong: supplementary sessions can and do get completed (e.g. a
-- supplementary holding 98 set_logs). The rule is about the TRANSITION —
-- you may not take an existing completed session and make it a supplementary
-- of another session — not about the end state. A trigger on UPDATE lets us
-- inspect the old and new rows to enforce exactly that.

CREATE OR REPLACE FUNCTION sessions_block_reparent_completed() RETURNS trigger AS $$
BEGIN
  IF OLD.completed_at IS NOT NULL
     AND OLD.parent_session_id IS NULL
     AND NEW.parent_session_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot re-parent a completed session (id %). A completed session stays a session in its own right; add a supplementary alongside it instead.',
      OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_block_reparent_completed ON sessions;
CREATE TRIGGER trg_sessions_block_reparent_completed
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION sessions_block_reparent_completed();
