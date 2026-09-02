-- client_notes — timestamped free-text notes against a client (CR-EF-017).
-- "spoke to X" / quick captures, surfaced on the PWA client profile front page
-- (above the fold) and the desktop client page. Append-only in practice: rows
-- are created and deleted, never edited.
--
-- NOT applied automatically. Run via the Coolify SSH tunnel against the
-- eternal_fitness DB, same convention as every other schema migration.

CREATE TABLE IF NOT EXISTS client_notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes (client_id, created_at DESC);
