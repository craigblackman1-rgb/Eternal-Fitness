-- Add Colin Farley client record, PAR-Q, and Agreement
-- Created from PDF submission on 03 June 2026

-- Step 1: Create client record (skip if already exists)
INSERT INTO clients (name, age, gender, profile, client_number)
SELECT
  'Colin Wesley Farley',
  65,
  'Male',
  '{}'::jsonb,
  COALESCE((SELECT MAX(client_number) FROM clients), 0) + 1
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Colin Wesley Farley');

-- Step 2: Insert PAR-Q form data linked to client
INSERT INTO signed_parq (
  client_id,
  full_name,
  date_of_birth,
  address,
  email,
  phone,
  emergency_contact_name,
  emergency_contact_phone,
  gp_name,
  gp_surgery,
  gp_phone,
  q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11,
  q12, q13, q14, q15, q16, q17, q18,
  q19, q20, q21, q22, q23, q24, q25, q26,
  q27, q28, q29,
  conditions,
  medications,
  devices,
  exercise_restrictions,
  surgeries,
  other_info,
  current_exercise,
  training_goals,
  client_name_print,
  client_signature_date,
  client_signature_data,
  client_typed_signature,
  status
) SELECT
  c.id,
  'Colin Wesley Farley',
  '1961-03-04',
  '140 New Road, Worthing, BN13 3HS',
  'colin.farley@sky.com',
  '07919402052',
  'Oliver Farley',
  '07731828300',
  'Worthing Medical Group',
  'Shelly Road, Worthing',
  '01903 234844',
  '', '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '',
  '', '', '', 'yes', 'yes', '', '', '',
  '', '', '',
  '',
  'Atorvastatin 40mg (evening)
Betahistine 16mg (once daily)',
  '',
  '',
  '',
  '',
  '',
  'Better mobility',
  'Colin Weslet Farley',
  NULL,
  NULL,
  'CWF',
  'signed'
FROM clients c
WHERE c.name = 'Colin Wesley Farley'
AND NOT EXISTS (
  SELECT 1 FROM signed_parq sp WHERE sp.full_name = 'Colin Wesley Farley'
);

-- Step 3: Insert corresponding agreement record linked to client
INSERT INTO signed_agreements (
  client_id,
  client_name,
  client_dob,
  client_address,
  client_email,
  client_phone,
  trainer_name,
  business_name,
  client_name_print,
  client_signature_date,
  client_signature_data,
  client_typed_signature,
  trainer_name_print,
  trainer_signature_date,
  trainer_signature_data,
  trainer_typed_signature,
  parq_completed,
  parq_date,
  parq_filed_by,
  medical_clearance,
  agreed_to_terms,
  signed_at,
  status
) SELECT
  c.id,
  'Colin Wesley Farley',
  '1961-03-04',
  '140 New Road, Worthing, BN13 3HS',
  'colin.farley@sky.com',
  '07919402052',
  'Esther Fair',
  'Eternal Fitness',
  'Colin Weslet Farley',
  NULL,
  NULL,
  'CWF',
  'Esther Fair',
  CURRENT_DATE,
  NULL,
  'Esther Fair',
  'yes',
  CURRENT_DATE,
  'Esther Fair',
  '',
  TRUE,
  NOW(),
  'signed'
FROM clients c
WHERE c.name = 'Colin Wesley Farley'
AND NOT EXISTS (
  SELECT 1 FROM signed_agreements sa WHERE sa.client_name = 'Colin Wesley Farley'
);
