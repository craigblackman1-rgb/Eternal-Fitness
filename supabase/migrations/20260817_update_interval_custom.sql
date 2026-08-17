-- Extend clients.update_interval with two more modes (CR-EF-023): an
-- arbitrary number of weeks, and a pinned explicit next-due date. Builds on
-- 20260801_client_update_interval.sql, same computed-not-stored pattern
-- (lib/updates-due.ts) — these two new columns are only ever read alongside
-- update_interval, never used to derive it.
--
-- NOT applied automatically. Run via the Coolify SSH tunnel against the
-- eternal_fitness DB with Craig's explicit per-session go-ahead, same
-- convention as every other clients-table migration.

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_update_interval_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_update_interval_check
    CHECK (update_interval IS NULL OR update_interval IN
      ('4_week', '6_week', '12_week', '6_session', 'flexible', 'custom_weeks', 'fixed_date'));

-- Used when update_interval = 'custom_weeks': next due = last sent + N weeks,
-- same recurring-computation pattern as the fixed presets.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS update_interval_weeks INTEGER
    CHECK (update_interval_weeks IS NULL OR update_interval_weeks > 0);

-- Used when update_interval = 'fixed_date': next due is this exact date,
-- set directly by Esther rather than computed from the last send. Does not
-- auto-advance after a send — re-set manually, same as any one-off deadline.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS update_interval_next_date DATE;
