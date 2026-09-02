-- Actual per-set logged results from completed Trainerize workouts -- what was
-- really performed (reps/weight/distance/time per set), not the prescribed
-- program (trainerize_exercises) or best-ever values (personal_records).
-- Source: dailyWorkout/get, keyed by the calendar's "tracked" dailyWorkout ids
-- (calendar/getList, chunked <1yr per Trainerize's own range limit).

CREATE TABLE IF NOT EXISTS trainerize_workout_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  trainerize_daily_workout_id BIGINT NOT NULL,
  workout_name TEXT,
  performed_date DATE,
  rpe INTEGER,
  trainerize_daily_exercise_id BIGINT NOT NULL,
  exercise_name TEXT,
  set_number INTEGER NOT NULL,
  reps NUMERIC,
  weight NUMERIC,
  distance NUMERIC,
  duration_seconds NUMERIC,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainerize_workout_results_client ON trainerize_workout_results(client_id);
CREATE INDEX IF NOT EXISTS idx_trainerize_workout_results_date ON trainerize_workout_results(client_id, performed_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainerize_workout_results_unique
  ON trainerize_workout_results(client_id, trainerize_daily_exercise_id, set_number);
