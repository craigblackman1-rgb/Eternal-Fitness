-- Hub to-do task list (EF hub)
-- Staff-only kanban so Esther can create tasks and assign each one to a person,
-- and both Esther and Craig can track progress via status buckets.
--
-- NOT applied automatically. Run via the Coolify SSH tunnel against the
-- eternal_fitness DB with Craig's explicit per-session go-ahead.

CREATE TABLE IF NOT EXISTS tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'done')),
  assignee    text
              check (assignee is null or assignee in ('Esther Fair', 'Craig Blackman')),
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee);
