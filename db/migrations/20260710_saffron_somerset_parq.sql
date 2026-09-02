-- Saffron Somerset — PAR-Q ported from MS Forms submission
-- Client signed 28/05/2026. Only flagged item: high blood pressure (Q19 = yes). No other conditions disclosed.
-- NOTE: trainer sign-off fields (57-59) are blank in the source document — Esther has not yet formally
-- reviewed/signed this form. Imported as submitted; clearance left PENDING for Esther's review rather than
-- assumed not-required, since the one Yes answer (blood pressure) has not been assessed on file.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111011).

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
  'a1111111-1111-1111-1111-111111111011',
  'Saffron Somerset',
  '1995-03-15',
  'Clapham Farmhouse, The Street, Clapham, Worthing, BN13 3UU',
  'saffronlsomerset@gmail.com',
  '07471766257',
  'William Somerset',
  '07470333673',
  NULL,
  'Lime Tree Surgery, Findon',
  '01903264101',
  'no', 'no', 'no', 'no', 'no', 'no', 'yes', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'No answer provided.',
  'No answer provided.',
  'No answer provided.',
  'No answer provided.',
  'No answer provided.',
  '',
  '1 workout per week',
  'Fitness, mobility',
  'no', 'no', 'no',
  'Saffron Somerset',
  '2026-05-28',
  'Saffron Somerset',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111011'
);

UPDATE clients
SET medical_clearance_status = 'pending'
WHERE id = 'a1111111-1111-1111-1111-111111111011';

UPDATE client_tracker
SET clearance_status = 'PENDING', clearance_required = 'Y'
WHERE client_id = 'a1111111-1111-1111-1111-111111111011';
