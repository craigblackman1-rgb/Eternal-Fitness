-- Migration: Trainerize historical import archive tables + personal records
-- Date: 2026-08-02
-- Creates read-only archive tables for imported Trainerize data plus a shared
-- personal_records table (also used by Lane 2 live PB flagging).
-- All tables follow the established convention: UUID PKs, timestamptz, 
-- IF NOT EXISTS guards, no RLS policies (app-layer auth).

CREATE TABLE IF NOT EXISTS trainerize_training_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  trainerize_phase_id INTEGER NOT NULL,
  phase_name TEXT,
  start_date DATE,
  end_date DATE,
  plan_type TEXT CHECK (plan_type IN ('regular', 'timeOff')),
  instruction TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trainerize_blocks_client ON trainerize_training_blocks(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainerize_blocks_phase ON trainerize_training_blocks(client_id, trainerize_phase_id);

CREATE TABLE IF NOT EXISTS trainerize_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainerize_block_id UUID NOT NULL REFERENCES trainerize_training_blocks(id) ON DELETE CASCADE,
  trainerize_workout_id INTEGER NOT NULL,
  workout_name TEXT,
  workout_index INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  workout_type TEXT,
  instruction TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trainerize_workouts_block ON trainerize_workouts(trainerize_block_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainerize_workouts_id ON trainerize_workouts(trainerize_block_id, trainerize_workout_id);

CREATE TABLE IF NOT EXISTS trainerize_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainerize_workout_id UUID NOT NULL REFERENCES trainerize_workouts(id) ON DELETE CASCADE,
  trainerize_exercise_id INTEGER,
  exercise_name TEXT,
  exercise_order INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  target_reps TEXT,
  target_type INTEGER,
  rest_time_seconds INTEGER,
  record_type TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trainerize_exercises_workout ON trainerize_exercises(trainerize_workout_id);

CREATE TABLE IF NOT EXISTS trainerize_client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('message', 'attention', 'program_instruction', 'workout_instruction')),
  content TEXT,
  source_date DATE,
  trainerize_message_id INTEGER,
  sender_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trainerize_notes_client ON trainerize_client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_trainerize_notes_source ON trainerize_client_notes(client_id, source);

-- personal_records already exists — created by Lane 2 (live PB flagging) with columns
-- (client_id, exercise, metric, value, rep_count, achieved_at, source, created_at) and
-- source CHECK IN ('live_log', 'trainerize_import'). Do NOT redefine it here with a
-- different column set — CREATE TABLE IF NOT EXISTS would silently no-op against the
-- real schema and any insert using exercise_name/record_type/unit below would fail at
-- runtime. The import script must write into the existing columns:
--   exercise (not exercise_name), metric = 'weight' (Trainerize accomplishments here are
--   all strength/weight PBs), rep_count parsed from brokenRecordType (e.g. 'tenRepMax' -> 10),
--   value = accomplishment.data.data, source = 'trainerize_import' (not 'trainerize').
