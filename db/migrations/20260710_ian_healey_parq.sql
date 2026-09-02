-- Ian Healey — PAR-Q ported from MS Forms submission
-- Signed 21/05/2026. CABG 2018, prostate cancer 2019 (clear), rotator cuff repair June 2025, high BP/cholesterol.
-- Trainer (Esther) assessed: GP CLEARANCE REQUIRED, requested but NOT yet received (payment/turnaround delays
-- documented in trainer notes, new turnaround estimated late July/Aug 2026). Sessions continuing under a
-- documented risk assessment signed by both parties pending clearance letter.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111008).

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
  'a1111111-1111-1111-1111-111111111008',
  'Ian Healey',
  '1949-02-04',
  '64 Livesay Crescent, Worthing, BN14 8AT',
  'ian.healey320@gmail.com',
  '07785 922127',
  'Ann Healey',
  '07909 228060',
  NULL,
  'Worthing Medical Group, 23 Shelley Rd, BN11 4BS',
  '01903 234 844',
  'yes', 'no', 'no', 'no', 'no', 'yes', 'yes', 'no', 'no', 'no', 'no',
  'yes', 'yes', 'no', 'no', 'no', 'no', 'no',
  'yes', 'no', 'no', 'yes', 'yes', 'yes', 'no', 'yes',
  'CABG 2018 (Mr Mody, surgeon); Prostate Cancer 2019 (clear after treatment); rotator cuff injury, surgery June 2025 Eastbourne General Hospital',
  'Aspirin 75mg (anticoagulant), Atorvastatin 80mg (cholesterol), Ramipril 10mg (BP), Esomeprazole 20mg (stomach protector), Ranolazine 500mg (anti-anginal), Bisoprolol 1.5mg (beta-blocker)',
  'NONE',
  'NONE',
  'Rotator cuff injury, tendon repair, 2025, Eastbourne General Hospital',
  'Residual right-shoulder pain.',
  'Cardio exercise 2-3x/week for 1 hour',
  'Maintaining general fitness, balance and coordination',
  'no', 'no', 'no',
  'Ian Healey',
  '2026-05-21',
  'Ian Healey',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111008'
);

UPDATE clients
SET medical_clearance_status = 'pending'
WHERE id = 'a1111111-1111-1111-1111-111111111008';

UPDATE client_tracker
SET clearance_status = 'PENDING', clearance_required = 'Y'
WHERE client_id = 'a1111111-1111-1111-1111-111111111008';
