-- Link clients, medical tracker, and agreements
-- Adds client_id foreign keys to join all document tables

-- Add client_id to client_tracker
ALTER TABLE client_tracker 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tracker_client_id ON client_tracker(client_id);

-- Add client_id to signed_agreements
ALTER TABLE signed_agreements 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agreements_client_id ON signed_agreements(client_id);

-- Add client_id to signed_parq
ALTER TABLE signed_parq 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_parq_client_id ON signed_parq(client_id);

-- Add document status tracking fields
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

-- Create a unified client documents view for easy querying
-- Uses latest document per client to avoid duplicate rows
DROP VIEW IF EXISTS client_documents_summary;
DROP VIEW IF EXISTS client_documents_summary;

CREATE VIEW client_documents_summary AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  
  -- Agreement data (latest)
  sa.id as agreement_id,
  sa.status as agreement_status,
  sa.sent_date as agreement_sent_date,
  sa.received_date as agreement_received_date,
  sa.signed_at as agreement_signed_at,
  sa.requires_update as agreement_requires_update,
  sa.update_notes as agreement_update_notes,
  
  -- PAR-Q data (latest)
  sp.id as parq_id,
  sp.status as parq_status,
  sp.sent_date as parq_sent_date,
  sp.received_date as parq_received_date,
  sp.signed_at as parq_signed_at,
  sp.requires_update as parq_requires_update,
  sp.update_notes as parq_update_notes,
  
  -- Medical clearance data
  ct.id as tracker_id,
  ct.clearance_status,
  ct.clearance_required,
  ct.parq_received_date as tracker_parq_received,
  ct.contract_signed_date,
  ct.annual_review_due_date,
  ct.last_session_delivered,
  
  -- Latest document timestamps
  GREATEST(
    COALESCE(sa.created_at, '1970-01-01'::timestamptz),
    COALESCE(sp.created_at, '1970-01-01'::timestamptz),
    COALESCE(ct.updated_at, '1970-01-01'::timestamptz)
  ) as last_updated

FROM clients c
LEFT JOIN LATERAL (
  SELECT * FROM signed_agreements 
  WHERE client_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
) sa ON true
LEFT JOIN LATERAL (
  SELECT * FROM signed_parq 
  WHERE client_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
) sp ON true
LEFT JOIN client_tracker ct ON c.id = ct.client_id
ORDER BY c.name;

-- Update RLS policies to ensure documents are not publicly accessible
-- Only authenticated users can access client documents

-- Clients table - already has RLS, ensure it's restrictive
DROP POLICY IF EXISTS "Users can read clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can read clients" ON clients;
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- Signed agreements - restrict to authenticated only
DROP POLICY IF EXISTS "Anyone can insert signed agreements" ON signed_agreements;
DROP POLICY IF EXISTS "Authenticated users can read signed agreements" ON signed_agreements;
DROP POLICY IF EXISTS "Authenticated users can update signed agreements" ON signed_agreements;
DROP POLICY IF EXISTS "Authenticated users can delete signed agreements" ON signed_agreements;
DROP POLICY IF EXISTS "Authenticated users can insert signed agreements" ON signed_agreements;

CREATE POLICY "Authenticated users can insert signed agreements"
  ON signed_agreements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read signed agreements"
  ON signed_agreements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update signed agreements"
  ON signed_agreements FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete signed agreements"
  ON signed_agreements FOR DELETE
  TO authenticated
  USING (true);

-- Signed PAR-Q - restrict to authenticated only
DROP POLICY IF EXISTS "Anyone can insert signed PAR-Q forms" ON signed_parq;
DROP POLICY IF EXISTS "Authenticated users can read signed PAR-Q forms" ON signed_parq;
DROP POLICY IF EXISTS "Authenticated users can update signed PAR-Q forms" ON signed_parq;
DROP POLICY IF EXISTS "Authenticated users can delete signed PAR-Q forms" ON signed_parq;
DROP POLICY IF EXISTS "Authenticated users can insert signed PAR-Q forms" ON signed_parq;

CREATE POLICY "Authenticated users can insert signed PAR-Q forms"
  ON signed_parq FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read signed PAR-Q forms"
  ON signed_parq FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update signed PAR-Q forms"
  ON signed_parq FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete signed PAR-Q forms"
  ON signed_parq FOR DELETE
  TO authenticated
  USING (true);

-- Client tracker - already restricted to authenticated
