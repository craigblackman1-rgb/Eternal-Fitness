-- Odul Bozkurt — PAR-Q ported from MS Forms submission
-- Signed 01/06/2026. Occasional dizziness during/after exercise, largely resolved; no other conditions.
-- Trainer (Esther) assessed: no GP clearance required; monitor dizziness, pause before standing from floor work.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111010).

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
  'a1111111-1111-1111-1111-111111111010',
  'Ödül Bozkurt',
  '1970-03-29',
  '43 Upper High Street, Worthing BN11 1DR',
  'o.bozkurt@sussex.ac.uk',
  '07748297948',
  NULL,
  NULL,
  'Victoria Rd',
  '50 Victoria Road, Worthing, West Sussex BN11 1XE',
  '01903 230656',
  'no', 'no', 'no', 'yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'None',
  'None',
  'None',
  'None',
  'None',
  'I love Esther',
  'Personal Training with Eternal Fitness (1-2/week); cardio classes at South Downs Leisure (1/week or every other week)',
  'Get in shape, lose weight, build bone density, gain flexibility',
  'no', 'no', 'no',
  'Odul Bozkurt',
  '2026-06-01',
  'Odul Bozkurt',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111010'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111010';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111010';
