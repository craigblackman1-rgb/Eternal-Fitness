-- PAR-Q versioning + audit trail
-- Resubmissions now create a new versioned row instead of overwriting the old one,
-- preserving a full history of changes. Pattern mirrors client_documents versioning.

ALTER TABLE signed_parq
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES signed_parq(id),
  ADD COLUMN IF NOT EXISTS signed_by_ip TEXT,
  ADD COLUMN IF NOT EXISTS signed_by_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill: every existing row is version 1 (they already are via the default,
-- but be explicit for clarity).
UPDATE signed_parq SET version = 1 WHERE version IS NULL;

-- Allow 'superseded' alongside the existing status values.
ALTER TABLE signed_parq DROP CONSTRAINT IF EXISTS signed_parq_status_check;
ALTER TABLE signed_parq
  ADD CONSTRAINT signed_parq_status_check
  CHECK (status IN ('draft', 'sent', 'received', 'signed', 'expired', 'needs_update', 'superseded'));
