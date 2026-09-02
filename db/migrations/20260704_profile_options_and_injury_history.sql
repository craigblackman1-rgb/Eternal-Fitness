-- Reusable, growable option lists for client profile multiselect fields
-- (conditions, movement quality flags, milestones, programming adaptations).
-- Esther can add a new value from any dropdown and it's saved here for reuse.

CREATE TABLE IF NOT EXISTS profile_option_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('condition', 'movement_quality_flag', 'milestone', 'adaptation')),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (category, value)
);

CREATE INDEX IF NOT EXISTS idx_profile_option_lists_category ON profile_option_lists(category);

ALTER TABLE profile_option_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read profile_option_lists" ON profile_option_lists;
CREATE POLICY "Users can read profile_option_lists"
  ON profile_option_lists FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert profile_option_lists" ON profile_option_lists;
CREATE POLICY "Users can insert profile_option_lists"
  ON profile_option_lists FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Seed from whatever values already exist across client profiles, so nothing is lost.
INSERT INTO profile_option_lists (category, value)
SELECT DISTINCT 'condition', value
FROM clients, jsonb_array_elements_text(COALESCE(profile->'health'->'conditions', '[]'::jsonb)) AS value
WHERE value <> ''
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO profile_option_lists (category, value)
SELECT DISTINCT 'movement_quality_flag', value
FROM clients, jsonb_array_elements_text(COALESCE(profile->'physical_baseline'->'movement_quality_flags', '[]'::jsonb)) AS value
WHERE value <> ''
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO profile_option_lists (category, value)
SELECT DISTINCT 'milestone', value
FROM clients, jsonb_array_elements_text(COALESCE(profile->'goals'->'milestones', '[]'::jsonb)) AS value
WHERE value <> ''
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO profile_option_lists (category, value)
SELECT DISTINCT 'adaptation', value
FROM clients, jsonb_array_elements_text(COALESCE(profile->'programming_adaptations', '[]'::jsonb)) AS value
WHERE value <> ''
ON CONFLICT (category, value) DO NOTHING;

-- Starter values for a clinical/adaptive-training population, beyond what's already in use.
INSERT INTO profile_option_lists (category, value) VALUES
  ('condition', 'Type 2 diabetes'),
  ('condition', 'Hypertension'),
  ('condition', 'Osteoarthritis'),
  ('condition', 'Osteoporosis'),
  ('condition', 'Fibromyalgia'),
  ('condition', 'Chronic fatigue syndrome / ME'),
  ('condition', 'Multiple sclerosis'),
  ('condition', 'Parkinson''s'),
  ('condition', 'Post-stroke'),
  ('condition', 'COPD / respiratory condition'),
  ('condition', 'Cardiac condition'),
  ('condition', 'Visual impairment'),
  ('condition', 'Hearing impairment'),
  ('condition', 'Anxiety / depression'),
  ('condition', 'Chronic lower back pain'),
  ('movement_quality_flag', 'Limited hip flexion'),
  ('movement_quality_flag', 'Limited hip extension'),
  ('movement_quality_flag', 'Knee valgus under load'),
  ('movement_quality_flag', 'Restricted shoulder flexion'),
  ('movement_quality_flag', 'Restricted shoulder rotation'),
  ('movement_quality_flag', 'Poor scapular control'),
  ('movement_quality_flag', 'Limited ankle dorsiflexion'),
  ('movement_quality_flag', 'Poor core bracing / anterior pelvic tilt'),
  ('movement_quality_flag', 'Balance deficit — static'),
  ('movement_quality_flag', 'Balance deficit — dynamic'),
  ('movement_quality_flag', 'Asymmetrical loading (left/right)'),
  ('movement_quality_flag', 'Reduced thoracic rotation'),
  ('movement_quality_flag', 'Poor squat depth / mobility'),
  ('movement_quality_flag', 'Excessive lumbar flexion under load'),
  ('milestone', 'Consistency — attending sessions regularly'),
  ('milestone', 'Improved balance'),
  ('milestone', 'Improved confidence'),
  ('milestone', 'Increased independence in daily tasks'),
  ('milestone', 'Reduced pain during activity'),
  ('milestone', 'Improved sleep'),
  ('milestone', 'Return to a specific activity/hobby'),
  ('milestone', 'Increased strength — functional tasks'),
  ('milestone', 'Increased cardiovascular capacity'),
  ('milestone', 'Improved posture'),
  ('adaptation', 'Reduce load/volume following treatment (e.g. IVIG, chemo)'),
  ('adaptation', 'Avoid overhead loading'),
  ('adaptation', 'Avoid high-impact / plyometric work'),
  ('adaptation', 'Seated or supported alternatives available'),
  ('adaptation', 'Pause before standing — dizziness risk'),
  ('adaptation', 'Extra warm-up time for joint stiffness'),
  ('adaptation', 'Shorter rest periods monitored for fatigue'),
  ('adaptation', 'Avoid exercises requiring fine balance unsupervised'),
  ('adaptation', 'Check medication/treatment schedule before each block'),
  ('adaptation', 'Reduce ROM around affected joint')
ON CONFLICT (category, value) DO NOTHING;

-- Injury history: was a flat string[], now a structured record per entry
-- ({id, date, description, body_area, status}) so there's a real history, not a
-- comma-soup of free text. Migrate existing string entries in place.
UPDATE clients
SET profile = jsonb_set(
  profile,
  '{health,injury_history}',
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', gen_random_uuid()::text,
      'date', NULL,
      'description', elem,
      'body_area', '',
      'status', 'resolved'
    )), '[]'::jsonb)
    FROM jsonb_array_elements_text(profile->'health'->'injury_history') AS elem
  )
)
WHERE jsonb_typeof(profile->'health'->'injury_history') = 'array'
  AND jsonb_array_length(profile->'health'->'injury_history') > 0
  AND jsonb_typeof(profile->'health'->'injury_history'->0) = 'string';
