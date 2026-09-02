-- Seed client data for Eternal Fitness
-- 14 clients with linked tracker records

INSERT INTO clients (id, name, age, gender, profile) VALUES
  ('a1111111-1111-1111-1111-111111111001', 'Amanda Munday', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111002', 'Anne Wareine', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111003', 'Becky Price', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111004', 'Camilla Arnold', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111005', 'Colin Farley', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111006', 'Ellie Wallwork', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111007', 'Emma Atkinson', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111008', 'Ian Healey', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111009', 'Monique Weardon', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111010', 'Odul Bozkurt', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111011', 'Saffron Somerset', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111012', 'Sam Gibbons', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111013', 'Sarah Tyler', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111014', 'Steph White', NULL, NULL, '{}'::jsonb),
  ('a1111111-1111-1111-1111-111111111015', 'Tom Putnam', NULL, NULL, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Create tracker records for each client
INSERT INTO client_tracker (client_id, client_name, clearance_status, clearance_required) VALUES
  ('a1111111-1111-1111-1111-111111111001', 'Amanda Munday', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111002', 'Anne Wareine', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111003', 'Becky Price', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111004', 'Camilla Arnold', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111005', 'Colin Farley', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111006', 'Ellie Wallwork', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111007', 'Emma Atkinson', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111008', 'Ian Healey', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111009', 'Monique Weardon', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111010', 'Odul Bozkurt', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111011', 'Saffron Somerset', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111012', 'Sam Gibbons', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111013', 'Sarah Tyler', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111014', 'Steph White', 'NOT YET REQUESTED', 'NA'),
  ('a1111111-1111-1111-1111-111111111015', 'Tom Putnam', 'NOT YET REQUESTED', 'NA')
ON CONFLICT DO NOTHING;
