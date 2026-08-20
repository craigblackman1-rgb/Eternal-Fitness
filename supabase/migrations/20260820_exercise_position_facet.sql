-- G2 (wo-ef-consolidated-2026-08-20): the workout-templates browser's
-- "difficulty" facet was meant to show Seated/Supported/Standing (relevant
-- for cancer-rehab/mobility clients), but no such concept existed anywhere --
-- workout_templates.difficulty (max of composed exercises.difficulty, see
-- lib/workout-template-facets.ts) is a genuine 1-5 Beginner-Expert intensity
-- scale, a different, still-used feature (the exercise library keeps its own
-- difficulty filter, untouched by this migration).
--
-- Adds a new, separate `position` facet rather than repurposing difficulty:
-- no clean mapping exists between an intensity score and a physical position.
-- exercises.position is set per-exercise by Esther via the exercise library
-- (nullable, not backfilled -- there is no existing signal to derive it from,
-- and guessing per-exercise values would be fabricated data). workout_templates
-- .position is a derived SET across the template's composed exercises (like
-- archetypes/muscle_groups/equipment), not a MAX like difficulty -- a template
-- can legitimately mix seated and standing exercises.

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS position TEXT
  CHECK (position IS NULL OR position IN ('seated', 'supported', 'standing'));

ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS position TEXT[] NOT NULL DEFAULT '{}';
