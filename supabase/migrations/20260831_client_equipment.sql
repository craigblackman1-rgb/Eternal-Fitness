-- CR-EF-108 — Per-client equipment access.
-- Adds a JSONB array column to `clients` recording which equipment items the
-- client has available. Values are equipment names matching studio_equipment.name.
-- NULL = not yet configured — plan generation falls back to the full unconstrained
-- exercise pool. Empty array = client has no equipment (bodyweight only).
--
-- CR-EF-116 (equipment sets with tension/colour) will extend this later; the
-- array-of-names shape accommodates that without schema changes.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT NULL;

COMMENT ON COLUMN clients.equipment IS
  'CR-EF-108 — array of equipment names the client has available (matching studio_equipment.name). NULL = not configured (unconstrained generation). Empty array = bodyweight only.';
