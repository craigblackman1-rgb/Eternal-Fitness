-- Links a hub task to a client so it can appear on both the global Tasks page
-- and that client's own profile (same record, not a copy). See
-- .context/brief-updates-due-opendesign.md.
--
-- NOT applied automatically. Run via the Coolify SSH tunnel against the
-- eternal_fitness DB with Craig's explicit per-session go-ahead.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks (client_id);
