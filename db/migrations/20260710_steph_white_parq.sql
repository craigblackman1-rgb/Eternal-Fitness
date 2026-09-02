-- Stephanie (Steph) White — PAR-Q ported from MS Forms submission
-- Client signed 20/05/2026. Underactive thyroid, rheumatoid arthritis, mild asthma, chronic pain affecting
-- exercise, broken ankle 2022. Thyroxine 150mg/day.
-- NOTE: trainer sign-off fields (57-59) are blank in the source document — Esther has not yet formally
-- reviewed/signed this form. Imported as submitted; clearance left PENDING given the chronic-pain and
-- rheumatoid arthritis disclosures have not been assessed on file.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111014).

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
  'a1111111-1111-1111-1111-111111111014',
  'Stephanie White',
  '1967-10-04',
  '15 Penhill Road, BN15 8HA',
  'Stephiewhite67@yahoo.co.uk',
  '07850421232',
  'Jeremy Kocaba',
  '07788839470',
  'Dr Hall',
  'New Pond Row, South Street, Lancing',
  NULL,
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'yes', 'yes', 'no', 'no', 'no', 'yes', 'no',
  'no', 'no', 'no', 'no', 'yes', 'no', 'no', 'no',
  'Under active thyroid; rheumatoid arthritis; mild asthma',
  'Thyroxine 150mg per day',
  'None',
  'None',
  'Broken ankle in 2022',
  'No answer provided.',
  'Strength once a week',
  'Fitness, weight loss',
  'no', 'no', 'no',
  'Stephanie White',
  '2026-05-20',
  'S white',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111014'
);

UPDATE clients
SET medical_clearance_status = 'pending'
WHERE id = 'a1111111-1111-1111-1111-111111111014';

UPDATE client_tracker
SET clearance_status = 'PENDING', clearance_required = 'Y'
WHERE client_id = 'a1111111-1111-1111-1111-111111111014';
