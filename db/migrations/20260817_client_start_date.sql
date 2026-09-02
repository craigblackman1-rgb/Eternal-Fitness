-- clients.start_date — the date the client's training account began (CR-EF-022).
-- Distinct from clients.created_at (when the row was inserted into the system).
-- Nullable: existing clients start blank until backfilled from Esther's records.
--
-- NOT applied automatically. Run via the Coolify SSH tunnel against the
-- eternal_fitness DB, same convention as every other clients-table migration.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS start_date DATE;
