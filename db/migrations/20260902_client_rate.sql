-- CR-EF-135: per-client rate override.
-- NULL means "use standard block price". Additive, nullable only — no backfill.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_rate NUMERIC;
