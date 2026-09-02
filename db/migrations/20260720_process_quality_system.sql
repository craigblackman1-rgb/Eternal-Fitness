-- Lane B — Process & Quality System (EF hub)
-- DB-backed so Esther can edit Process Register / SOPs / Improvement Log herself
-- without a code deploy. Mirrors the shape of decoded-ops-hub's
-- OperationsFramework.tsx, adapted to Eternal Fitness (single-brand, no "service line").
--
-- NOT applied automatically. Run via the Coolify SSH tunnel against the
-- eternal_fitness DB with Craig's explicit per-session go-ahead.

-- ─── Process Register ───────────────────────────────────────────────────────
create table if not exists process_entries (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique,                 -- e.g. PR-001
  name          text not null,
  owner         text not null default 'Esther Fair',
  area          text not null default 'General',     -- replaces Decoded Ops "service line"
  status        text not null default 'draft'
                check (status in ('active', 'draft', 'review', 'archived')),
  reviewed      text,                                 -- free-text review date, e.g. "Jul 2026"
  category      text not null default 'General',
  sop_ref       text,                                 -- FK-by-reference to sops.ref, nullable
  created_at    timestamptz not null default now()
);

create index if not exists idx_process_entries_status on process_entries (status);
create index if not exists idx_process_entries_category on process_entries (category);

-- ─── SOPs ───────────────────────────────────────────────────────────────────
create table if not exists sops (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,              -- e.g. SOP-001
  title           text not null,
  area            text not null default 'General',  -- replaces Decoded Ops "service line"
  trigger         text not null,
  owner           text not null default 'Esther Fair',
  last_updated    text,                              -- free-text, e.g. "Jul 2026"
  what            text not null,
  good_looks_like text not null,
  steps           jsonb not null default '[]'::jsonb, -- ordered list of plain-English steps
  prompt_template text,                             -- optional copy-paste prompt
  created_at      timestamptz not null default now()
);

create index if not exists idx_sops_area on sops (area);

-- ─── Improvement Log ─────────────────────────────────────────────────────────
create table if not exists improvement_log (
  id          uuid primary key default gen_random_uuid(),
  ref         text not null unique,                  -- e.g. IL-001
  title       text not null,
  entry_date  text,                                  -- free-text, e.g. "Jul 2026"
  process_ref text,                                  -- FK-by-reference to sops.ref or process_entries.ref
  broke       text not null,
  changed     text not null,
  result      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_improvement_log_process on improvement_log (process_ref);

-- Seed rows intentionally omitted — Esther/Craig supply EF-specific content.
-- Tables start empty; the UI renders an empty state and the admin form lets
-- Esther add the first entries with no code deploy.
