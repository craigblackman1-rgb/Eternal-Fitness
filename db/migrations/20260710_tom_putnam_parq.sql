-- Thomas (Tom) Putnam — PAR-Q ported from MS Forms submission
-- Signed 20/05/2026. Rotator cuff injury (resolved Feb 2022), mixed anxiety/depressive disorder (2023),
-- Methylphenidate 27mg + Sertraline 100mg daily.
-- Trainer (Esther) assessed and signed same day: no GP clearance required.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111015).

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
  'a1111111-1111-1111-1111-111111111015',
  'Thomas David Putnam',
  '1989-12-25',
  '5 Queensmead, Franklin Road, Salvington, BN13 2PG',
  'tomputnam@hotmail.co.uk',
  '07900550245',
  'Roy Putnam',
  '07849061278',
  'Duty',
  'Lime Tree Surgery, Durrington Health Centre, Durrington Lane, Durrington',
  '01903264101',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'yes', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'yes', 'yes', 'no', 'no',
  'Rotator Cuff Injury - resolved by Feb 2022; mixed anxiety and depressive disorder, 2023',
  'Methylphenidate 27mg once daily; Sertraline 100mg once daily',
  'No answer provided.',
  'No answer provided.',
  'No answer provided.',
  'No answer provided.',
  'PT mostly, occasional run',
  'Maintain physical resilience',
  'no', 'no', 'no',
  'Thomas David Putnam',
  '2026-05-20',
  'Tom Putnam',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111015'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111015';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111015';
