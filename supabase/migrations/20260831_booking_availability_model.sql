-- CR-EF-097 — Native booking availability model.
--
-- Three tables that define Esther's diary:
--   booking_settings     = global knobs (session length, gap, notice period, etc.)
--   availability_pattern = her repeating weekly hours (the baseline)
--   availability_overrides = time off and one-off extra hours
--
-- Slot start times are NEVER stored. They are derived from pattern ranges
-- minus overrides, filtered by session_length + gap. This matches the
-- mockup design position: "Availability derives, it does not store."

-- ── 1. Booking settings (singleton row — one row per studio) ─────────────
CREATE TABLE IF NOT EXISTS booking_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_length  INTEGER NOT NULL DEFAULT 60,       -- minutes
  gap_after       INTEGER NOT NULL DEFAULT 15,       -- minutes
  notice_hours    INTEGER NOT NULL DEFAULT 24,       -- cancellation notice window
  lead_hours      INTEGER NOT NULL DEFAULT 12,       -- earliest a client can book
  horizon_weeks   INTEGER NOT NULL DEFAULT 8,        -- how far ahead clients can book
  max_per_day     INTEGER NOT NULL DEFAULT 5,        -- hard cap on sessions per day
  intro_holdback  INTEGER NOT NULL DEFAULT 2,        -- slots held back for new enquiries per week
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE booking_settings IS
  'Global booking rules — the single source of truth for session length, gap, notice period, and client-facing constraints. One row.';

-- Seed with defaults matching the mockups.
INSERT INTO booking_settings (session_length, gap_after, notice_hours, lead_hours, horizon_weeks, max_per_day, intro_holdback)
VALUES (60, 15, 24, 12, 8, 5, 2)
ON CONFLICT DO NOTHING;

-- ── 2. Availability pattern (Esther''s normal week) ─────────────────────
CREATE TABLE IF NOT EXISTS availability_pattern (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun … 6=Sat
  start_time  TEXT NOT NULL,  -- "HH:MM" in Europe/London
  end_time    TEXT NOT NULL,  -- "HH:MM" in Europe/London
  active      BOOLEAN NOT NULL DEFAULT true,
  note        TEXT,           -- e.g. "alternate weeks"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE availability_pattern IS
  'Esther''s repeating weekly hours. Multiple rows per day allowed (e.g. morning + afternoon ranges). Slot start times are derived from these ranges minus gap_after, NOT stored.';

CREATE INDEX IF NOT EXISTS idx_avail_pattern_dow ON availability_pattern(day_of_week);

-- Seed matching the mockup pattern.
INSERT INTO availability_pattern (day_of_week, start_time, end_time, active, note, sort_order) VALUES
  (1, '07:00', '12:00', true,  NULL, 0),
  (1, '16:00', '19:00', true,  NULL, 1),
  (2, '07:00', '13:00', true,  NULL, 2),
  (3, '07:00', '12:00', true,  NULL, 3),
  (3, '16:00', '19:00', true,  NULL, 4),
  (4, '08:00', '13:00', true,  NULL, 5),
  (5, '07:00', '12:00', true,  NULL, 6),
  (6, '08:00', '11:00', true,  'alternate weeks', 7),
  (0, '00:00', '00:00', false, NULL, 8)
ON CONFLICT DO NOTHING;

-- ── 3. Availability overrides (time off + extra hours) ──────────────────
CREATE TABLE IF NOT EXISTS availability_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_type TEXT NOT NULL CHECK (override_type IN ('time_off', 'extra_hours')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,          -- inclusive; single-day overrides have start = end
  start_time  TEXT,                   -- NULL = whole day; "HH:MM" for partial day
  end_time    TEXT,                   -- NULL = whole day; "HH:MM" for partial day
  reason      TEXT,                   -- e.g. "Annual leave", "Physio appointment"
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE availability_overrides IS
  'Time off (holidays, appointments) and one-off extra hours. Overrides are subtracted from / added to the weekly pattern when deriving available slots.';

CREATE INDEX IF NOT EXISTS idx_avail_override_dates ON availability_overrides(start_date, end_date);

-- Seed matching the mockup.
INSERT INTO availability_overrides (override_type, start_date, end_date, reason) VALUES
  ('time_off', '2026-09-14', '2026-09-20', 'Annual leave'),
  ('time_off', '2026-09-04', '2026-09-04', 'Physio appointment')
    -- The physio is partial day (12:00–14:00) but the override model handles
    -- this via start_time/end_time. We'll set it to whole-day in the UI.
ON CONFLICT DO NOTHING;

INSERT INTO availability_overrides (override_type, start_date, end_date, start_time, end_time, reason) VALUES
  ('extra_hours', '2026-09-05', '2026-09-05', '08:00', '11:00', 'Extra hours opened outside the normal week')
ON CONFLICT DO NOTHING;

-- ── RLS deliberately not enabled ────────────────────────────────────────
-- Matches the confirmed pattern across all tables in this repo. Plain
-- Postgres instance; "authenticated" role does not exist. Access control
-- enforced at the API layer.
