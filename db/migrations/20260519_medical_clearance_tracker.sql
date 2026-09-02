-- Eternal Fitness Medical Clearance Tracker
-- Apply this in your Supabase project SQL editor

CREATE TABLE IF NOT EXISTS client_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  date_of_birth DATE,
  parq_received_date DATE,
  contract_signed_date DATE,
  clearance_required TEXT CHECK (clearance_required IN ('Y', 'N', 'NA')) DEFAULT 'NA',
  conditions_requiring_clearance TEXT,
  clearance_from TEXT,
  specialist_name TEXT,
  gp_letter_requested_date DATE,
  gp_letter_received_date DATE,
  clearance_status TEXT CHECK (clearance_status IN ('CLEARED', 'PENDING', 'NOT YET REQUESTED', 'NOT REQUIRED')) DEFAULT 'NOT REQUIRED',
  clearance_filed TEXT CHECK (clearance_filed IN ('Y', 'N')) DEFAULT 'N',
  annual_review_due_date DATE,
  last_session_delivered DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracker_clearance_status ON client_tracker(clearance_status);
CREATE INDEX idx_tracker_annual_review ON client_tracker(annual_review_due_date);

ALTER TABLE client_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read client_tracker"
  ON client_tracker FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert client_tracker"
  ON client_tracker FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update client_tracker"
  ON client_tracker FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete client_tracker"
  ON client_tracker FOR DELETE
  TO authenticated
  USING (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_tracker_updated_at
  BEFORE UPDATE ON client_tracker
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
