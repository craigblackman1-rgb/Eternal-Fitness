-- Widen profile_option_lists to also cover Contraindications and Pain Points,
-- so those fields can move from free-text Inputs to the same TagMultiSelect
-- pattern already used for Conditions/Movement Flags/Milestones/Adaptations.

ALTER TABLE profile_option_lists DROP CONSTRAINT profile_option_lists_category_check;
ALTER TABLE profile_option_lists ADD CONSTRAINT profile_option_lists_category_check
  CHECK (category IN ('condition', 'movement_quality_flag', 'milestone', 'adaptation', 'contraindication', 'pain_point'));

INSERT INTO profile_option_lists (category, value)
SELECT DISTINCT 'contraindication', value
FROM clients, jsonb_array_elements_text(COALESCE(profile->'health'->'contraindications', '[]'::jsonb)) AS value
WHERE value <> ''
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO profile_option_lists (category, value)
SELECT DISTINCT 'pain_point', value
FROM clients, jsonb_array_elements_text(COALESCE(profile->'health'->'pain_points', '[]'::jsonb)) AS value
WHERE value <> ''
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO profile_option_lists (category, value) VALUES
  ('contraindication', 'No overhead loading'),
  ('contraindication', 'No high-impact / plyometric work'),
  ('contraindication', 'No spinal flexion under load'),
  ('contraindication', 'No breath-holding / Valsalva'),
  ('contraindication', 'No unsupervised balance work'),
  ('contraindication', 'Avoid direct pressure on affected limb'),
  ('pain_point', 'Lower back'),
  ('pain_point', 'Left knee'),
  ('pain_point', 'Right knee'),
  ('pain_point', 'Left shoulder'),
  ('pain_point', 'Right shoulder'),
  ('pain_point', 'Left hip'),
  ('pain_point', 'Right hip'),
  ('pain_point', 'Neck')
ON CONFLICT (category, value) DO NOTHING;
