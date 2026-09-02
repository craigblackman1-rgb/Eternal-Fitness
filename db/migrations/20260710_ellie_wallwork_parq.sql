-- Ellie Wallwork — PAR-Q ported from MS Forms submission
-- Signed 21/05/2026. Registered blind; contraceptive implant; depression/anxiety (Fluoxetine 20mg).
-- Trainer (Esther) assessed: no medical clearance required.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111006).

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
  'a1111111-1111-1111-1111-111111111006',
  'Ellie Wallwork',
  '1999-12-31',
  '6 Longfellow Road, Worthing BN11 4NU',
  'elliewallwork@gmail.com',
  '07583 407509',
  'Doris Childs - mum',
  '07793 207238',
  NULL,
  'Heene Road Surgery/Worthing Medical',
  '01903 234 844',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'yes', 'no', 'no', 'no', 'yes',
  'no', 'no', 'no', 'no', 'yes', 'yes', 'no', 'no',
  'Depression & generalised anxiety',
  'Fluoxetine 20mg',
  'Contraceptive implant - left arm, due to be changed 2027. No restrictions given.',
  'N/a',
  'N/a',
  'Registered blind.',
  'Showdown training Monday eve 2.5 hours / Friday afternoon 2.5 hours',
  'Improve balance and flexibility (sit & reach hamstring goals)',
  'no', 'no', 'no',
  'Ellie Wallwork',
  '2026-05-21',
  'Ellie Wallwork',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111006'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111006';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111006';
