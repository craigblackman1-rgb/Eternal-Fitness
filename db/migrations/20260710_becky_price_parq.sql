-- Rebecca (Becky) Price — PAR-Q ported from MS Forms submission
-- Signed 20/05/2026. Moderate knee arthritis, back surgery 1998 (herniated disc), Mirena coil, HRT patches.
-- Trainer (Esther) assessed: no GP clearance required.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111003).

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
  'a1111111-1111-1111-1111-111111111003',
  'Rebecca Price',
  '1974-05-19',
  '10 Nursery Lane, Worthing, BN11 3HS',
  'beckyprice@live.com.au',
  '07748823451',
  'Nancy Price',
  '01777 228437',
  'Shelley Road Medical Group',
  'Shelley Road Medical Group',
  '01905 234844',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'yes', 'no', 'no', 'yes', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'Moderate arthritis in knees - February 2024; back surgery Aug 1998 for herniated disc',
  'HRT patches - estrogen only',
  'Mirena coil - August 2025',
  'No answer provided.',
  'No answer provided.',
  'No answer provided.',
  'Swimming 2-3/week (30 mins); walking 2-3/week (40 mins)',
  'Increased mobility, flexibility and stabilisation of knees',
  'no', 'no', 'no',
  'Rebecca Price',
  '2026-05-20',
  'R. Price',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111003'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111003';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111003';
