-- Complete client documents migration (idempotent)

-- STEP 1: Add client_number column (simple integer IDs)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_number INTEGER;

-- STEP 2: Assign sequential numbers to existing clients
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clients WHERE client_number IS NOT NULL) THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, name) as rn
      FROM clients
    )
    UPDATE clients SET client_number = numbered.rn
    FROM numbered WHERE clients.id = numbered.id;
  END IF;
END $$;

-- STEP 3: Add display_code column (initials)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS display_code TEXT;
UPDATE clients SET display_code = UPPER(
  LEFT(name, 1) || COALESCE(NULLIF(SPLIT_PART(name, ' ', 2), ''), '')
) WHERE display_code IS NULL;

-- STEP 4: Add client_id FK to document tables
ALTER TABLE client_tracker ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE signed_parq ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tracker_client_id ON client_tracker(client_id);
CREATE INDEX IF NOT EXISTS idx_agreements_client_id ON signed_agreements(client_id);
CREATE INDEX IF NOT EXISTS idx_parq_client_id ON signed_parq(client_id);

-- STEP 5: Link existing documents by name match
UPDATE signed_agreements SET client_id = c.id
FROM clients c WHERE signed_agreements.client_name = c.name
AND signed_agreements.client_id IS NULL;

UPDATE signed_parq SET client_id = c.id
FROM clients c WHERE signed_parq.full_name = c.name
AND signed_parq.client_id IS NULL;

UPDATE client_tracker SET client_id = c.id
FROM clients c WHERE client_tracker.client_name = c.name
AND client_tracker.client_id IS NULL;

-- STEP 6: Add status tracking fields
ALTER TABLE signed_agreements
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'sent', 'received', 'signed', 'expired')) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS sent_date DATE,
ADD COLUMN IF NOT EXISTS received_date DATE,
ADD COLUMN IF NOT EXISTS requires_update BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS update_notes TEXT;

ALTER TABLE signed_parq
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'sent', 'received', 'signed', 'expired', 'needs_update')) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS sent_date DATE,
ADD COLUMN IF NOT EXISTS received_date DATE,
ADD COLUMN IF NOT EXISTS requires_update BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS update_notes TEXT;

-- STEP 7: Auto-mark existing signed records
UPDATE signed_agreements SET status = 'signed'
WHERE client_signature_data IS NOT NULL AND status = 'draft';

UPDATE signed_parq SET status = 'signed'
WHERE client_signature_data IS NOT NULL AND status = 'draft';

-- STEP 8: Recreate view (uses client_number which now exists)
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
ORDER BY c.client_number;

-- STEP 9: RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can read clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can read clients" ON clients;
CREATE POLICY "Authenticated users can read clients" ON clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert signed agreements" ON signed_agreements;
DROP POLICY IF EXISTS "Authenticated users can read signed agreements" ON signed_agreements;
DROP POLICY IF EXISTS "Authenticated users can update signed agreements" ON signed_agreements;
DROP POLICY IF EXISTS "Authenticated users can delete signed agreements" ON signed_agreements;
DROP POLICY IF EXISTS "Authenticated users can insert signed agreements" ON signed_agreements;
CREATE POLICY "Authenticated users can insert signed agreements" ON signed_agreements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read signed agreements" ON signed_agreements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update signed agreements" ON signed_agreements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete signed agreements" ON signed_agreements FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert signed PAR-Q forms" ON signed_parq;
DROP POLICY IF EXISTS "Authenticated users can read signed PAR-Q forms" ON signed_parq;
DROP POLICY IF EXISTS "Authenticated users can update signed PAR-Q forms" ON signed_parq;
DROP POLICY IF EXISTS "Authenticated users can delete signed PAR-Q forms" ON signed_parq;
DROP POLICY IF EXISTS "Authenticated users can insert signed PAR-Q forms" ON signed_parq;
CREATE POLICY "Authenticated users can insert signed PAR-Q forms" ON signed_parq FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read signed PAR-Q forms" ON signed_parq FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update signed PAR-Q forms" ON signed_parq FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete signed PAR-Q forms" ON signed_parq FOR DELETE TO authenticated USING (true);
