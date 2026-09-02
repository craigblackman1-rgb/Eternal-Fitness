-- CR-EF-101 — Sub-sessions: supplementary work that does NOT consume a session.
--
-- A sub-session (e.g. a technique drill, rehab progression, assessment) is
-- linked to the parent session that occupies the slot. The parent link:
--   - Excludes the child from the session pot count
--   - Excludes it from "Session N of M" numbering
--   - Ties its scheduled_at to the parent (cannot be independently rescheduled)
--   - Causes it to cascade-cancel when the parent is cancelled
--   - Removes it from the cancellation review queue (no allowance implication)

ALTER TABLE sessions
  ADD COLUMN parent_session_id UUID NULL
  REFERENCES sessions(id) ON DELETE CASCADE;

CREATE INDEX idx_sessions_parent_session_id
  ON sessions(parent_session_id)
  WHERE parent_session_id IS NOT NULL;
