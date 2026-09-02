-- Lane A: per-client resource visibility toggle.
-- Defaults to empty so no resources are visible until a trainer enables them.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS resource_visibility JSONB DEFAULT '{}'::jsonb;
