-- CR-EF-099 — Grace-period extension history for block expiry.
--
-- Extending a block's expiry must NEVER touch session counts. This adds a
-- JSONB column to track the history of extensions so they can be displayed.
-- Each entry: { from: "YYYY-MM-DD", to: "YYYY-MM-DD", at: "ISO-timestamp", reason: "..." }

ALTER TABLE clients ADD COLUMN IF NOT EXISTS block_expiry_extensions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN clients.block_expiry_extensions IS
  'CR-EF-099 — history of block expiry extensions. Array of {from, to, at, reason} objects. Extending block_expiry_date must NEVER touch session counts.';
