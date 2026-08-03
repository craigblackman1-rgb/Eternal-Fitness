-- Workout templates: reusable SessionVersion prescriptions saved from any session
-- editor, with auto-derived facet tags for filtering in the template library.
-- data JSONB uses the same SessionVersion shape ({warm_up, main_block, cooldown})
-- already used by sessions.data.versions.studio/home — zero transform on apply.

CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  archetypes TEXT[] DEFAULT '{}',
  movement_type TEXT[] DEFAULT '{}',
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  difficulty INTEGER,
  condition_tags TEXT[] DEFAULT '{}',
  source_client_id UUID,
  source_session_id UUID,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
