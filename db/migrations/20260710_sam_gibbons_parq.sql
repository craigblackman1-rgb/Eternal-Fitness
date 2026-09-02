-- Sam (Samuel Thomas) Gibbons — PAR-Q ported from an OLDER-FORMAT Word doc (SamPAR-Q_v2.docx), not the
-- current 29-question MS Forms version, so several q1-q29 slots have no equivalent source question and are
-- left unanswered ('').
-- Client-signed 21/04/2026. HIGH-RISK PROFILE: polycythaemia rubra vera (blood disorder), daily Warfarin
-- (anticoagulant) + Simvastatin, monthly Peg Interferon injection, lumbar peritoneal shunt (implanted device,
-- avoid heavy abdominal/spinal impact), registered severely sight impaired since Dec 2022 (shunt surgery
-- Oct 2022 for vision-threatening pressure, optic nerve damage already done).
-- NO TRAINER SIGN-OFF EXISTS IN THE SOURCE DOCUMENT AT ALL — this form has no Section 7 clearance
-- assessment, no trainer notes, no trainer signature. Given the anticoagulant + blood disorder + shunt
-- combination, this should be treated as needing Esther's clinical review before it is treated as cleared —
-- imported as submitted with clearance PENDING, not assumed.
-- Client record already exists (seeded 20260603_seed_clients.sql, id a1111111-1111-1111-1111-111111111012).

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
  'a1111111-1111-1111-1111-111111111012',
  'Samuel Thomas Gibbons',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'no', 'no', '', 'no', '', '', '', 'no', '', '', '',
  'no', '', 'yes', '', '', '', 'yes',
  'yes', 'yes', 'yes', 'yes', '', 'yes', '', 'yes',
  'Polycythaemia rubra vera (blood condition)',
  'Warfarin (daily); Simvastatin (daily); Peg Interferon (monthly injection)',
  'Lumbar peritoneal shunt - inserted Oct 2022 following hospital admission for vision loss; avoid heavy impacts to abdomen and spine',
  'Avoid heavy impacts to abdomen and spine (shunt).',
  'Lumbar peritoneal shunt surgery, Oct 2022, admitted for reduced vision/raised intracranial pressure.',
  'Registered severely sight impaired since Dec 2022 - optic nerve damage from pre-shunt pressure, prior to successful surgery.',
  NULL,
  NULL,
  'no', '', 'no',
  NULL,
  '2026-04-21',
  'Samuel Thomas Gibbons',
  'signed'
WHERE NOT EXISTS (
  SELECT 1 FROM signed_parq WHERE client_id = 'a1111111-1111-1111-1111-111111111012'
);

UPDATE clients
SET medical_clearance_status = 'pending'
WHERE id = 'a1111111-1111-1111-1111-111111111012';

UPDATE client_tracker
SET clearance_status = 'PENDING', clearance_required = 'Y'
WHERE client_id = 'a1111111-1111-1111-1111-111111111012';
