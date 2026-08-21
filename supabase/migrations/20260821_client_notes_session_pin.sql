-- CR-EF-079 L5: session-aware notes + pin/author
-- Additive: nullable/defaulted columns, safe against existing rows.
-- NOT run against live DB in this lane — Craig executes after review.

ALTER TABLE client_notes
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author text;
