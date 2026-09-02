-- Hub task buckets — user-creatable groupings that sit alongside the
-- status-column kanban.  A task belongs to zero or one bucket (nullable).
--
-- NOT applied automatically. Run via the Coolify SSH tunnel against the
-- eternal_fitness DB with Craig's explicit per-session go-ahead.

CREATE TABLE IF NOT EXISTS task_buckets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS bucket_id uuid REFERENCES task_buckets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_bucket_id ON tasks (bucket_id);
