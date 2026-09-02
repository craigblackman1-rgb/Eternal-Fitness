-- Amanda Munday — PAR-Q ported from MS Forms submission
-- Signed 20/05/2026. High cholesterol, 2 hip replacements, Rosuvastatin, HRT, chronic insomnia/GAD.
-- Trainer (Esther) assessed: no GP clearance required.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111001).

INSERT INTO signed_parq (
  client_id, full_name, date_of_birth, address, email, phone,
  emergency_contact_name, emergency_contact_phone, gp_name, gp_surgery, gp_phone,
  q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11,
  q12, q13, q14, q15, q16, q17, q18,
  q19, q20, q21, q22, q23, q24, q25, q26,
  conditions, medications, devices, exercise_restrictions, surgeries, other_info,
  current_exercise, training_goals,
  q27, q28, q29,
  client_name_print, client_signature_date, client_typed_signature, status
)
SELECT
  'a1111111-1111-1111-1111-111111111001',
  'Amanda Munday',
  '1967-08-07',
  'The Barn, Church Lane, Sompting, BN15 0AZ',
  'Amanda.munday@hotmail.co.uk',
  '07710363410',
  'Nick Munday',
  '07710013893',
  'Dr Youngson',
  'Balltree Surgery, Western Road North, Sompting',
  '01903752200',
  'no', 'no', 'no', 'no', 'no', 'yes', 'no', 'no', 'no', 'no', 'no',
  'yes', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'yes', 'yes', 'yes', 'no', 'no',
  'Severe chronic insomnia; generalised anxiety disorder',
  '5mg Rosuvastatin; HRT',
  '2 hip replacements',
  'No answer provided.',
  'No answer provided.',
  'No answer provided.',
  'Walking one hour per day',
  'Maintaining mobility and core strength',
  'no', 'no', 'no',
  'Amanda Munday',
  '2026-05-20',
  'Amanda Munday',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111001'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111001';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111001';
