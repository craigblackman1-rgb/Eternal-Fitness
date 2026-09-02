-- Anne Wareing — PAR-Q ported from MS Forms submission
-- Signed 23/05/2026. Follicular lymphoma (remission since Oct 2019), IVIG every 6-8 weeks, Citalopram.
-- Trainer (Esther) assessed: no GP clearance required — lymphoma in remission 6+ years, no cardiovascular issues.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111002; seed name has a typo, "Wareine").

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
  'a1111111-1111-1111-1111-111111111002',
  'Anne Wareing',
  '1973-06-19',
  '19 Moyser Rd, Furzedown, SW16 6RQ',
  'wareing_anne@hotmail.com',
  '07808169467',
  'Elizabeth Wareing',
  '07933 408386',
  'Dr Mackenzie - Greyswood Practice',
  '66 Eastwood St, Streatham SW16 6PX',
  '0208 7690845',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'no', 'yes', 'yes', 'no', 'yes', 'no', 'no', 'yes',
  'Follicular lymphoma - March 2019 - Dr Pettengell, St George''s Hospital Tooting. Treated with chemotherapy and immunotherapy - complete metabolic remission Oct 2019.',
  'Citalopram 20mg OD - low mood/depression; IVIG every 6-8 weeks for acquired immune deficiency',
  'none',
  'none',
  'No answer provided.',
  'No answer provided.',
  '1 hour yoga weekly; 1-2 Fit On workouts per week (cardio/weights, 30 mins); occasional swimming; cycles to work 3 days/week (14 miles/day)',
  'Consistency, improved balance, adapting exercise around IVIG/illness',
  'no', 'yes', 'no',
  'anne wareing',
  '2026-05-23',
  'A Wareing',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111002'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111002';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111002';
