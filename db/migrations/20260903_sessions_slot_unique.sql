-- BUG-EF-124 — prevent duplicate sessions at the same (block_id, session_number)
-- by adding a partial unique index on non-sub-session rows. Sub-sessions share
-- their parent's session_number, so parent_session_id IS NULL is required.
--
-- MUST be applied AFTER the Steph White dedupe migration that removes any
-- pre-existing duplicate rows; applying this first would fail on duplicates.
--
-- Idempotent: safe to re-run. IF NOT EXISTS guards the index.

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_block_slot_unique
  ON sessions(block_id, session_number)
  WHERE parent_session_id IS NULL;
