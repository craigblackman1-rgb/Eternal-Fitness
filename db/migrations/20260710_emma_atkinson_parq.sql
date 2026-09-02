-- Emma Atkinson — PAR-Q ported from MS Forms submission
-- Signed 20/05/2026. Crohn's disease (+15 years), Mounjaro (weight loss) + Mesalazine; foot surgery Dec 2025.
-- Trainer (Esther) assessed: no GP clearance required.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111007).

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
  'a1111111-1111-1111-1111-111111111007',
  'Emma Jane Atkinson',
  '1967-10-13',
  '2 Warwick Gardens, Worthing BN11 1PE',
  'em.atkinson67@gmail.com',
  '07383023202',
  'Phil Atkinson',
  '07845405549',
  NULL,
  'Worthing Medical Group, Shelley Road, Worthing',
  '01903 234844',
  'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no',
  'yes', 'yes', 'no', 'no', 'no', 'no', 'no',
  'no', 'no', 'yes', 'no', 'yes', 'yes', 'no', 'yes',
  'Crohn''s Disease - diagnosed +15 years ago, no named consultant',
  'GLP1 (Mounjaro) for weight loss; Mesalazine for Crohn''s',
  'N/A',
  'N/A',
  'Surgery early December 2025 at Nuffield Haywards Heath, left foot big/second toes reset',
  'N/A',
  'Rowing machine 1-2 times a week',
  'Maintaining strength and fitness',
  'no', 'no', 'no',
  'Emma Atkinson',
  '2026-05-20',
  'Emma Atkinson',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111007'
);

UPDATE clients
SET medical_clearance_status = 'not_required'
WHERE id = 'a1111111-1111-1111-1111-111111111007';

UPDATE client_tracker
SET clearance_status = 'NOT REQUIRED', clearance_required = 'N'
WHERE client_id = 'a1111111-1111-1111-1111-111111111007';
