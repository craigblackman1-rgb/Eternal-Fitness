-- CR-EF-106 — Add structured session cadence (frequency) to client profiles.
--
-- The `frequency` field lives inside the `profile` JSONB column alongside the
-- existing `logistics.sessions_per_week`. This migration backfills all existing
-- clients so their profile carries both fields, with `frequency` derived from
-- the current `sessions_per_week` value.
--
-- New code reads `frequency` first and falls back to `sessions_per_week` for
-- backward compatibility. Once all code paths use `frequency`, the legacy
-- `sessions_per_week` field can be retired in a future migration.

UPDATE clients
SET profile = jsonb_set(
  profile,
  '{logistics,frequency}',
  jsonb_build_object(
    'unit', 'week',
    'per_unit', COALESCE((profile->'logistics'->>'sessions_per_week')::int, 2)
  )
)
WHERE profile->'logistics' IS NOT NULL
  AND profile->'logistics'->>'sessions_per_week' IS NOT NULL
  AND profile->'logistics'->'frequency' IS NULL;
