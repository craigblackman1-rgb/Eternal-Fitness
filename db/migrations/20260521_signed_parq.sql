-- Eternal Fitness Signed PAR-Q Forms
-- Stores completed PAR-Q / Medical Health Screening forms

CREATE TABLE IF NOT EXISTS signed_parq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  email TEXT,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  gp_name TEXT,
  gp_surgery TEXT,
  gp_phone TEXT,

  -- Section 2: Cardiovascular and General Health
  q1 TEXT CHECK (q1 IN ('yes', 'no', '')) DEFAULT '',
  q2 TEXT CHECK (q2 IN ('yes', 'no', '')) DEFAULT '',
  q3 TEXT CHECK (q3 IN ('yes', 'no', '')) DEFAULT '',
  q4 TEXT CHECK (q4 IN ('yes', 'no', '')) DEFAULT '',
  q5 TEXT CHECK (q5 IN ('yes', 'no', '')) DEFAULT '',
  q6 TEXT CHECK (q6 IN ('yes', 'no', '')) DEFAULT '',
  q7 TEXT CHECK (q7 IN ('yes', 'no', '')) DEFAULT '',
  q8 TEXT CHECK (q8 IN ('yes', 'no', '')) DEFAULT '',
  q9 TEXT CHECK (q9 IN ('yes', 'no', '')) DEFAULT '',
  q10 TEXT CHECK (q10 IN ('yes', 'no', '')) DEFAULT '',
  q11 TEXT CHECK (q11 IN ('yes', 'no', '')) DEFAULT '',

  -- Section 3: Musculoskeletal, Neurological, and Surgical
  q12 TEXT CHECK (q12 IN ('yes', 'no', '')) DEFAULT '',
  q13 TEXT CHECK (q13 IN ('yes', 'no', '')) DEFAULT '',
  q14 TEXT CHECK (q14 IN ('yes', 'no', '')) DEFAULT '',
  q15 TEXT CHECK (q15 IN ('yes', 'no', '')) DEFAULT '',
  q16 TEXT CHECK (q16 IN ('yes', 'no', '')) DEFAULT '',
  q17 TEXT CHECK (q17 IN ('yes', 'no', '')) DEFAULT '',
  q18 TEXT CHECK (q18 IN ('yes', 'no', '')) DEFAULT '',

  -- Section 4: Blood Conditions, Medications, and Diagnosed Conditions
  q19 TEXT CHECK (q19 IN ('yes', 'no', '')) DEFAULT '',
  q20 TEXT CHECK (q20 IN ('yes', 'no', '')) DEFAULT '',
  q21 TEXT CHECK (q21 IN ('yes', 'no', '')) DEFAULT '',
  q22 TEXT CHECK (q22 IN ('yes', 'no', '')) DEFAULT '',
  q23 TEXT CHECK (q23 IN ('yes', 'no', '')) DEFAULT '',
  q24 TEXT CHECK (q24 IN ('yes', 'no', '')) DEFAULT '',
  q25 TEXT CHECK (q25 IN ('yes', 'no', '')) DEFAULT '',
  q26 TEXT CHECK (q26 IN ('yes', 'no', '')) DEFAULT '',

  -- Section 5: Full Details
  conditions TEXT,
  medications TEXT,
  devices TEXT,
  exercise_restrictions TEXT,
  surgeries TEXT,
  other_info TEXT,

  -- Section 6: Lifestyle and Physical Activity
  current_exercise TEXT,
  training_goals TEXT,
  q27 TEXT CHECK (q27 IN ('yes', 'no', '')) DEFAULT '',
  q28 TEXT CHECK (q28 IN ('yes', 'no', '')) DEFAULT '',
  q29 TEXT CHECK (q29 IN ('yes', 'no', '')) DEFAULT '',

  -- Section 9: Declaration and Signature
  client_name_print TEXT,
  client_signature_date DATE,
  client_signature_data TEXT,
  client_typed_signature TEXT,

  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parq_full_name ON signed_parq(full_name);
CREATE INDEX idx_parq_signed_at ON signed_parq(signed_at);
CREATE INDEX idx_parq_dob ON signed_parq(date_of_birth);

ALTER TABLE signed_parq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert signed PAR-Q forms"
  ON signed_parq FOR INSERT
  TO authenticated, anon
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
