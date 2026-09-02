-- Camilla Arnold — PAR-Q ported from MS Forms submission
-- Signed 29/05/2026. Propranolol 40mg for anxiety (beta-blocker, HR response blunted - use RPE not HR).
-- Trainer (Esther) assessed: no GP clearance required.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111004).

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
  'a1111111-1111-1111-1111-111111111004',
  'Camilla Arnold',
  '1986-08-22',
  '6 Penstone Park, Lancing, West Sussex, BN15 9AG',
  'camilla.arnold@hotmail.co.uk',
  '07515173991',
  'Francesca Silvestri',
  '07880 360264',
  'Dr Starbuck',
  'New Pond Row Surgery, 35 South St, Lancing BN15 8AN',
  '01903 851073',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'yes', 'no', 'no', 'no',
  'N/A',
  'Propranolol 40mg for symptoms of anxiety',
  'N/A',
  'N/A',
  'N/A',
  'No answer provided.',
  'Walking everyday',
  'Improve overall strength and posture. Help ease issues with crunchy shoulders',
  'no', 'no', 'no',
  'Camilla Arnold',
  '2026-05-29',
  'CARNOLD',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111004'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111004';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111004';
