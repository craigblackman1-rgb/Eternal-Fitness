-- Simple migration: Link existing docs and add display codes

-- 1. Add display_code and client_number columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS display_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_number INTEGER;

-- 2. Assign sequential client numbers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM clients
)
UPDATE clients SET client_number = numbered.rn
FROM numbered WHERE clients.id = numbered.id
AND clients.client_number IS NULL;

-- 3. Generate simple display codes (first letter of each word)
UPDATE clients SET display_code = UPPER(
  LEFT(name, 1) || COALESCE(NULLIF(SPLIT_PART(name, ' ', 2), ''), '')
) WHERE display_code IS NULL;

-- 3. Link existing agreements to clients
UPDATE signed_agreements SET client_id = c.id
FROM clients c WHERE signed_agreements.client_name = c.name
AND signed_agreements.client_id IS NULL;

-- 4. Link existing PAR-Q to clients
UPDATE signed_parq SET client_id = c.id
FROM clients c WHERE signed_parq.full_name = c.name
AND signed_parq.client_id IS NULL;

-- 5. Link existing trackers to clients
UPDATE client_tracker SET client_id = c.id
FROM clients c WHERE client_tracker.client_name = c.name
AND client_tracker.client_id IS NULL;

-- 6. Mark existing signed records
UPDATE signed_agreements SET status = 'signed'
WHERE client_signature_data IS NOT NULL AND status = 'draft';

UPDATE signed_parq SET status = 'signed'
WHERE client_signature_data IS NOT NULL AND status = 'draft';

-- 7. Recreate the view
DROP VIEW IF EXISTS client_documents_summary;

CREATE VIEW client_documents_summary AS
SELECT 
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
  ct.id as tracker_id, ct.clearance_status, ct.clearance_required,
  ct.parq_received_date as tracker_parq_received, ct.contract_signed_date,
  ct.annual_review_due_date, ct.last_session_delivered, ct.notes as tracker_notes,
  GREATEST(
    COALESCE(sa.created_at, '1970-01-01'::timestamptz),
    COALESCE(sp.created_at, '1970-01-01'::timestamptz),
    COALESCE(ct.updated_at, '1970-01-01'::timestamptz)
  ) as last_updated
FROM clients c
LEFT JOIN LATERAL (
  SELECT * FROM signed_agreements WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1
) sa ON true
LEFT JOIN LATERAL (
  SELECT * FROM signed_parq WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1
) sp ON true
LEFT JOIN client_tracker ct ON c.id = ct.client_id
ORDER BY c.name;
