-- Client master consolidation
-- ---------------------------------------------------------------------------
-- Problem this fixes: the agreement edit screen (signed_agreements trainer-
-- fields) had become a shadow client record for operational state — package,
-- sessions, payment, medical clearance, risk, exercise modifications. An
-- agreement is an immutable signed document, not the master for living state.
--
-- Resolution: the `clients` row is the single source of truth. These columns
-- live on `clients`; the agreement is a read-only signed record.
--
-- NOTE: the 20260525 trainer-fields were never applied to this live DB (only
-- `client_id` exists on signed_agreements), so there is nothing to back-fill —
-- this migration simply establishes the columns on `clients` and rebuilds the
-- documents view. Idempotent; safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1. Commercial state (no prior home on clients) --------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS package_type TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sessions_purchased INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sessions_used INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sessions_remaining INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 60;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_status TEXT
  CHECK (payment_status IN ('paid', 'deposit', 'pending', 'overdue', 'suspended'))
  DEFAULT 'pending';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS block_expiry_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_status TEXT
  CHECK (client_status IN ('active', 'inactive', 'completed', 'suspended'))
  DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- 2. Clinical state (no prior home on clients as typed columns) ------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS medical_clearance_status TEXT
  CHECK (medical_clearance_status IN ('cleared', 'pending', 'not_required', 'not_yet_requested'))
  DEFAULT 'not_required';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS risk_level TEXT
  CHECK (risk_level IN ('low', 'medium', 'high'))
  DEFAULT 'low';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS exercise_modifications TEXT;

-- 3. Rebuild client_documents_summary to read clearance from clients ------------
--    (was reading from the deprecated client_tracker spreadsheet). Keeps the
--    agreement/parq document status joins; drops the stale tracker clearance.
DROP VIEW IF EXISTS client_documents_summary;

CREATE VIEW client_documents_summary AS
SELECT
  c.client_number,
  c.id as client_id,
  c.name as client_name,
  c.display_code,
  sa.id as agreement_id, sa.status as agreement_status,
  sa.sent_date as agreement_sent_date, sa.received_date as agreement_received_date,
  sa.signed_at as agreement_signed_at, sa.requires_update as agreement_requires_update,
  sa.update_notes as agreement_update_notes,
  sp.id as parq_id, sp.status as parq_status,
  sp.sent_date as parq_sent_date, sp.received_date as parq_received_date,
  sp.signed_at as parq_signed_at, sp.requires_update as parq_requires_update,
  sp.update_notes as parq_update_notes,
  -- clearance now sourced from clients (single source of truth)
  c.gp_letter_status, c.gp_letter_requested_date, c.gp_letter_received_date,
  c.annual_review_due_date, c.clearance_from, c.specialist_name,
  c.medical_clearance_status, c.risk_level,
  GREATEST(
    COALESCE(sa.created_at, '1970-01-01'::timestamptz),
    COALESCE(sp.created_at, '1970-01-01'::timestamptz),
    COALESCE(c.created_at, '1970-01-01'::timestamptz)
  ) as last_updated
FROM clients c
LEFT JOIN LATERAL (
  SELECT * FROM signed_agreements WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1
) sa ON true
LEFT JOIN LATERAL (
  SELECT * FROM signed_parq WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1
) sp ON true
ORDER BY c.client_number;
