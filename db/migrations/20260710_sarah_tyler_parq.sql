-- Sarah Tyler — PAR-Q ported from MS Forms submission
-- Signed 29/05/2026, all health questions answered No — no medical clearance required.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111013).

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
  conditions,
  medications,
  devices,
  exercise_restrictions,
  surgeries,
  other_info,
  current_exercise,
  training_goals,
  q27, q28, q29,
  client_name_print,
  client_signature_date,
  client_typed_signature,
  status
)
SELECT
  'a1111111-1111-1111-1111-111111111013',
  'Sarah Tyler',
  '1997-01-21',
  '14 The Plantation',
  'sarah.tyler97@outlook.com',
  '07743431140',
  'Kate Honey',
  '07435968734',
  'Dr Angeli E D Malhotra',
  'Broadwater Medical Centre, 5-11 Broadwater Boulevard, Worthing, West Sussex, BN14 8JE',
  '01903826926',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  '', '', '', '', '', '',
  'Swimming once a week for 1 hour',
  'Feel and look healthier',
  'no', 'no', 'no',
  'Sarah Tyler',
  '2026-05-29',
  'Sarah tyler',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111013'
);

-- No YES answers anywhere in Sections 2-4 or 6b — no clearance letter to chase.
UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111013';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111013';
