-- CR-EF-153: give training blocks a descriptive name instead of "Block N".
--
-- Esther names the block herself; when she leaves it blank, every surface
-- falls back to the block's real date span (derived from its sessions'
-- scheduled_at) or, if it has no dated sessions yet, an honest
-- "Not yet scheduled" label. See lib/block-name.ts for the shared display
-- logic every surface uses.
--
-- Plain Postgres, RLS disabled on this instance -- no CREATE POLICY here.
-- Idempotent: safe to run more than once.

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS title TEXT;
