-- CR-EF-152: pot opening balance absorbs pre-hub Trainerize consumption
-- The typed pot (sessions_purchased / sessions_used / sessions_remaining) is
-- per-package: renewal resets sessions_used to 0. Clients migrated from
-- Trainerize consumed sessions before the hub existed, so the typed pot
-- disagrees with the hub-derived count. pot_baseline_used captures the number
-- of sessions consumed before the hub, part of the CURRENT pot.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS pot_baseline_used integer NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pot_baseline_note text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pot_baseline_at timestamptz;

-- Backfill: for every client with sessions_used IS NOT NULL, set
-- pot_baseline_used = GREATEST(0, sessions_used - hub_used) where hub_used =
-- count of sessions completed OR cancelled-and-charged (charged_free <> 'free')
-- across all their hub sessions. Idempotent (safe to re-run).
UPDATE clients c
SET
  pot_baseline_used = GREATEST(0, c.sessions_used - hub_used.cnt),
  pot_baseline_note = 'Trainerize cutover 2026-09-06',
  pot_baseline_at = now()
FROM (
  SELECT
    b.client_id,
    COUNT(*) AS cnt
  FROM sessions s
  JOIN blocks b ON s.block_id = b.id
  WHERE s.status = 'completed'
     OR (s.status = 'cancelled' AND COALESCE(s.charged_free, '') <> 'free')
  GROUP BY b.client_id
) hub_used
WHERE c.id = hub_used.client_id
  AND c.sessions_used IS NOT NULL;
