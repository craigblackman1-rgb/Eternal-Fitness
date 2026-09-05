-- Programs: reusable named training content — an ordered queue of workout slots
-- with per-week progression bands. CR-EF-154 P2.
-- NO RLS / policies / authenticated role — plain Postgres.

-- ─────────────────────────────────────────────────────────────────────
-- 1. programs
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  client_id  UUID NULL REFERENCES clients(id),  -- NULL = library / reusable
  weeks      INTEGER NOT NULL DEFAULT 6 CHECK (weeks BETWEEN 1 AND 52),
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. program_slots — ordered workout slots within a program
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS program_slots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL CHECK (position >= 1),
  label      TEXT,           -- e.g. 'Workout A', 'Workout B'
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (program_id, position)
);

-- ─────────────────────────────────────────────────────────────────────
-- 3. indexes
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_program_slots_program_id ON program_slots(program_id);
CREATE INDEX IF NOT EXISTS idx_programs_client_id ON programs(client_id) WHERE client_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 4. client ↔ program link
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS active_program_id UUID REFERENCES programs(id);

-- ─────────────────────────────────────────────────────────────────────
-- 5. session program pointer
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS program_id     UUID REFERENCES programs(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS program_slot_id UUID REFERENCES program_slots(id);

CREATE INDEX IF NOT EXISTS idx_sessions_program_id ON sessions(program_id) WHERE program_id IS NOT NULL;
