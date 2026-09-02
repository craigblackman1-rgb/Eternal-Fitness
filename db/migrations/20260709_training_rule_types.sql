-- Structured, governable rule taxonomy for the Plan Agent — replaces free-prose
-- programming_adaptations with typed, severity-marked rules the agent can apply
-- systematically instead of parsing a paragraph. See EF_Plan_Agent_Charter_Jul2026.md.

CREATE TABLE IF NOT EXISTS training_rule_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('exclusion', 'restriction', 'emphasis', 'structural', 'coaching_style', 'general')),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_rule_types_bucket ON training_rule_types(bucket);

ALTER TABLE training_rule_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read training_rule_types" ON training_rule_types;
CREATE POLICY "Users can read training_rule_types"
  ON training_rule_types FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert training_rule_types" ON training_rule_types;
CREATE POLICY "Users can insert training_rule_types"
  ON training_rule_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update training_rule_types" ON training_rule_types;
CREATE POLICY "Users can update training_rule_types"
  ON training_rule_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO training_rule_types (label, bucket, description) VALUES
  ('Exercise / movement exclusion', 'exclusion', 'An exercise, exercise family, or movement pattern the client must never be given (e.g. "no foam rolling", "no lunges").'),
  ('Position / movement restriction', 'restriction', 'A position or transition that must be handled with a specific modification rather than avoided outright (e.g. "kneeling only briefly, thick mat + towel").'),
  ('Equipment note', 'structural', 'A piece of equipment that is off-limits, required, or needs a specific setup for this client.'),
  ('Muscle-group emphasis', 'emphasis', 'A muscle group or movement pattern that should be prioritised for this client''s goals (e.g. "glutes — knee health priority").'),
  ('Session structure requirement', 'structural', 'How the session itself should be sequenced or paced for this client (e.g. "cluster all floor-based exercises together").'),
  ('Coaching / communication style', 'coaching_style', 'How Esther should talk to or reassure this client during the session — not exercise content, but delivery.'),
  ('General / unclassified note', 'general', 'Migrated from the old free-text programming_adaptations list — review and re-categorise into a more specific type above when possible.')
ON CONFLICT DO NOTHING;

-- Migrate every client's existing free-text programming_adaptations (string[]) into the
-- new structured shape ({id, rule_type_id, detail, severity}[]), tagged as "General /
-- unclassified note" / hard so nothing is lost. Trainers re-categorise from there.
DO $$
DECLARE
  general_rule_type_id UUID;
BEGIN
  SELECT id INTO general_rule_type_id FROM training_rule_types WHERE label = 'General / unclassified note';

  UPDATE clients
  SET profile = jsonb_set(
    profile,
    '{programming_adaptations}',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'rule_type_id', general_rule_type_id::text,
            'detail', value,
            'severity', 'hard'
          )
        )
        FROM jsonb_array_elements_text(COALESCE(profile->'programming_adaptations', '[]'::jsonb)) AS value
      ),
      '[]'::jsonb
    )
  )
  WHERE jsonb_typeof(COALESCE(profile->'programming_adaptations', '[]'::jsonb)) = 'array'
    -- only touch rows that are still the old bare-string shape (skip if already migrated)
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(profile->'programming_adaptations', '[]'::jsonb)) AS elem
      WHERE jsonb_typeof(elem) = 'object'
    );
END $$;
