-- Scanned/paper document storage
-- Allows storing uploaded files (scans/photos of paper documents) against a
-- client. The binary data lives in a separate table so list queries on
-- client_documents stay light. Purely additive — no existing columns altered.

ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'generated'
  CHECK (source_type IN ('generated', 'scan'));
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS source_file_name TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS source_file_mime TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS source_file_size INT;

CREATE TABLE IF NOT EXISTS client_document_files (
  document_id UUID PRIMARY KEY REFERENCES client_documents(id) ON DELETE CASCADE,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS deliberately not enabled here: the existing client_documents table has
-- had RLS ON with zero working policies since the Supabase-to-plain-Postgres
-- migration (its "authenticated" role never carried over) — access control on
-- every document-engine table is enforced at the app layer (staff session
-- check in the API routes), not by Postgres RLS. Matching that real, working
-- pattern rather than adding an RLS statement that would only fail the same
-- way (confirmed live: CREATE POLICY ... TO authenticated errors with
-- "role authenticated does not exist" on this database).
