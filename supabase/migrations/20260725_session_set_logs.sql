-- Lane A — per-set session logging (additive only; no drops, no backfill).
-- The prescription stays inside sessions.data (JSONB). set_logs records what was
-- actually performed, one row per set, against a prescribed exercise.
--
-- exercise_ref convention: prescribed exercises are not individually row-addressable
-- today (they live inside sessions.data.versions), so each log row carries a stable
-- composite text key identifying the exercise it was performed against:
--
--   <version>:<section>:<index>:<exercise_name>
--
--   e.g. 'studio:warm_up:0:Bodyweight Squat'
--        'home:main_block:2:Goblet Squat'
--
--   version  = 'studio' | 'home'        (sessions.data.versions key)
--   section  = 'warm_up' | 'main_block' | 'cooldown'
--   index    = zero-based position of the exercise within that section array
--   exercise_name = Exercise.exercise_name at the time of logging
--
-- The version segment is included because the studio and home versions are separate
-- exercise lists that would otherwise collide on section+index. The exercise_name
-- segment guards against silent misattribution if an exercise is later swapped at
-- the same index.

CREATE TABLE IF NOT EXISTS set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_ref TEXT NOT NULL,
  set_number INT NOT NULL,
  reps INT,
  weight_kg NUMERIC,
  duration_seconds INT,
  completed BOOLEAN NOT NULL DEFAULT true,
  logged_by TEXT NOT NULL CHECK (logged_by IN ('trainer', 'client')) DEFAULT 'trainer',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN set_logs.exercise_ref IS
  'Stable key for the prescribed exercise this log is against: <version>:<section>:<index>:<exercise_name>, e.g. ''studio:warm_up:0:Bodyweight Squat''. See migration header for the full convention.';

CREATE INDEX IF NOT EXISTS idx_set_logs_session_id ON set_logs(session_id);

ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read set_logs" ON set_logs;
CREATE POLICY "Users can read set_logs"
  ON set_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert set_logs" ON set_logs;
CREATE POLICY "Users can insert set_logs"
  ON set_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update set_logs" ON set_logs;
CREATE POLICY "Users can update set_logs"
  ON set_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete set_logs" ON set_logs;
CREATE POLICY "Users can delete set_logs"
  ON set_logs FOR DELETE
  TO authenticated
  USING (true);

-- Delivery mode on clients — additive, defaulted, so no existing client changes
-- behaviour (every current client is studio 1:1).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'studio_1to1'
  CHECK (delivery_mode IN ('studio_1to1', 'home_training'));
