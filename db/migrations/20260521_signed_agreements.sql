-- Eternal Fitness Signed Agreements
-- Stores completed personal training agreements

CREATE TABLE IF NOT EXISTS signed_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_dob DATE,
  client_address TEXT,
  client_email TEXT,
  client_phone TEXT,
  trainer_name TEXT NOT NULL DEFAULT 'Esther Fair',
  business_name TEXT NOT NULL DEFAULT 'Eternal Fitness',
  start_date DATE,
  client_name_print TEXT,
  client_signature_date DATE,
  client_signature_data TEXT,
  client_typed_signature TEXT,
  trainer_name_print TEXT DEFAULT 'Esther Fair',
  trainer_signature_date DATE,
  trainer_signature_data TEXT,
  trainer_typed_signature TEXT DEFAULT 'Esther Fair',
  parq_completed TEXT CHECK (parq_completed IN ('yes', 'no', '')) DEFAULT '',
  parq_date DATE,
  parq_filed_by TEXT,
  medical_clearance TEXT CHECK (medical_clearance IN ('yes', 'na', '')) DEFAULT '',
  medical_clearance_date DATE,
  medical_clearance_from TEXT,
  agreed_to_terms BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agreements_client_name ON signed_agreements(client_name);
CREATE INDEX idx_agreements_signed_at ON signed_agreements(signed_at);

ALTER TABLE signed_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert signed agreements"
  ON signed_agreements FOR INSERT
  TO authenticated, anon
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
