-- Studio equipment governance catalog — replaces the hardcoded equipment list in
-- data/equipment.json with a DB-backed, editable catalog the Plan Agent reads at runtime.
-- See EF_Plan_Agent_Charter_Jul2026.md.

CREATE TABLE IF NOT EXISTS studio_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  detail TEXT,
  home_equivalent TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE studio_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read studio_equipment" ON studio_equipment;
CREATE POLICY "Users can read studio_equipment"
  ON studio_equipment FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert studio_equipment" ON studio_equipment;
CREATE POLICY "Users can insert studio_equipment"
  ON studio_equipment FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update studio_equipment" ON studio_equipment;
CREATE POLICY "Users can update studio_equipment"
  ON studio_equipment FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO studio_equipment (name, detail, home_equivalent, sort_order) VALUES
  ('Squat rack', NULL, NULL, 0),
  ('Olympic bar', NULL, 'Dumbbell or resistance band', 1),
  ('Trap bar', NULL, 'Dumbbell deadlift', 2),
  ('Weight plates', 'Up to 150kg total', 'Dumbbells', 3),
  ('Easy bar', 'EZ curl bar', 'Dumbbells, neutral grip', 4),
  ('Body pump bar', NULL, 'Dumbbells', 5),
  ('Dumbbells', '2kg – 40kg', 'Client''s own dumbbells', 6),
  ('Kettlebells', 'Singles: 2, 3, 4, 12, 16, 20, 24kg. Pairs: 2x6, 2x8, 2x10kg', 'Dumbbells', 7),
  ('Swiss exercise balls', 'x2', NULL, 8),
  ('Slam balls', '3, 5, 7, 10, 15kg', 'Dumbbell squat + press', 9),
  ('Battle ropes', NULL, 'Band squat + pull-apart', 10),
  ('Landmine', 'Custom videos needed for all landmine exercises', 'Single arm DB press / row', 11),
  ('Sissy squat', NULL, NULL, 12),
  ('Wobble cushion', NULL, NULL, 13),
  ('Mats', NULL, 'Client''s own mat', 14),
  ('Pull-up bar', NULL, NULL, 15),
  ('Parallel rings', NULL, NULL, 16),
  ('Adjustable steps', 'x2', 'Bottom stair', 17),
  ('Wooden boxes', '12" – 24"', 'Stairs or sturdy low step', 18),
  ('Resistance bands', 'Detachable handles; long bar attachment converts to a barbell', 'Client''s own resistance bands', 19),
  ('Cable machine', 'Non-adjustable high and low, fixed positions only. Attachments: neutral, wide, wide parallel, rope, straight bar, single handle', 'Resistance band (anchor needed)', 20),
  ('TRX', 'Adjustable', 'Resistance bands', 21),
  ('Bench', 'Incline only — NO decline', 'Floor, sofa or chair', 22),
  ('Hip thrust bench', NULL, 'Sofa or sturdy chair', 23),
  ('Booty bands', NULL, 'Client''s own booty bands', 24),
  ('Ab rollout wheel', NULL, 'Plank / dead bug', 25),
  ('Yoga blocks / foam rollers', NULL, NULL, 26)
ON CONFLICT DO NOTHING;
