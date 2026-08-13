-- Adds is_warmup to set_logs so a warm-up set (the first N prescribed sets of
-- an exercise) can be distinguished from a working set at the row level, permanently.
--
-- The warm-up status must live on the row rather than be re-derived from the
-- prescription, because the prescription mutates mid-session (sets are added or
-- removed, and the warm-up count edited): deriving it at read time would make a
-- historical log's warm-up status revisionist. Persisting it here means a set that
-- was logged as a warm-up stays a warm-up forever.
--
-- Warm-up sets must never count as a personal best and must be excluded from
-- exercise-history/trend aggregation — the server gate in lib/personal-records.ts
-- (early return when is_warmup is true) plus the filters in lib/exercise-history.ts
-- and lib/progress.ts all key off this column.
--
-- Idempotent: safe to re-run. The statement is guarded with IF NOT EXISTS; nothing
-- is dropped and no existing column or row is altered destructively. Existing rows
-- backfill to false (the default), which is correct: every pre-existing log is a
-- working set, never a warm-up.

ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS is_warmup BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN set_logs.is_warmup IS
  'True when this set is one of an exercise''s prescribed warm-up sets (the first N of its sets). Warm-up sets never register as a personal best and are excluded from PB/trend history. Defaults to false for rows created before this column existed.';
