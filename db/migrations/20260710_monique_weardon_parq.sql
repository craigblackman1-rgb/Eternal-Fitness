-- Monique Weardon (signs as "Wearden") — PAR-Q ported from MS Forms submission
-- Signed 02/06/2026. COPD, high BP, high cholesterol, osteoporosis, gout, Type 2 diabetes, breast cancer (5+ yrs),
-- migraines. Multiple medications incl. Bisoprolol, Atorvastatin, Metformin, Nortriptyline.
-- Trainer (Esther) assessed: no GP clearance required; extensive in-session adaptations documented.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111009).

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
  'a1111111-1111-1111-1111-111111111009',
  'Monique Wearden',
  '1956-01-25',
  '9 Emerald Way, Leamington Spa, CV31 3LD',
  'Monique.wearden@yahoo.co.uk',
  '07891286810',
  'Jonathan Wearden',
  '01926339143',
  'Dr. Redfern',
  'Warwick Gates Healthcentre, Cressida Close, Leamington Spa',
  '01926461800',
  'no', 'no', 'no', 'no', 'no', 'yes', 'yes', 'no', 'no', 'yes', 'no',
  'yes', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'yes', 'yes', 'yes', 'no', 'no',
  'COPD, high blood pressure, high cholesterol, osteoporosis, gout, stomach acid, breast cancer (more than 5 years ago), migraines',
  'Allopurinol 100mg (gout), Amlodipine 5mg (BP), Atorvastatin 40mg (cholesterol), Bisoprolol (BP), Evacal (breast cancer), Metformin 500mg (T2 diabetes), Omeprazole 20mg (acid), Trimbow inhaler (COPD), Nortriptyline 10mg/day (migraine)',
  'No',
  'No answer provided.',
  'No answer provided.',
  'No answer provided.',
  'Gym 2x/week, PT once every 2 weeks',
  'Stay fit, mobile and healthy',
  'no', 'no', 'no',
  'Monique Wearden',
  '2026-06-02',
  'Monique Wearden',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111009'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111009';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111009';
