-- CR-EF-125 — per-client supplementary workouts.
-- A client has a list of workout templates that auto-attach as sub-sessions
-- to every session created for that client, never drawing a paid session.

CREATE TABLE client_supplementary_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workout_template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by TEXT,
  removed_at TIMESTAMPTZ,
  removed_by TEXT
);

CREATE UNIQUE INDEX client_supplementary_workouts_active_uniq
  ON client_supplementary_workouts (client_id, workout_template_id) WHERE removed_at IS NULL;

CREATE INDEX client_supplementary_workouts_client_idx
  ON client_supplementary_workouts (client_id) WHERE removed_at IS NULL;

-- Back-reference from sub-sessions to the supplementary row that created them.
-- ON DELETE SET NULL: if the supplementary row is deleted, the sub-session keeps
-- its history but loses the "Every session" provenance tag.
ALTER TABLE sessions ADD COLUMN supplementary_source_id UUID
  REFERENCES client_supplementary_workouts(id) ON DELETE SET NULL;

CREATE INDEX sessions_supplementary_source_idx
  ON sessions (supplementary_source_id) WHERE supplementary_source_id IS NOT NULL;
