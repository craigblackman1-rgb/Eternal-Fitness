-- CR-EF-116: Band sets as first-class records.
-- Previously bands were a single global table with no owner association.
-- Now each band belongs to a band_set, and each client is linked to one set.

-- 1. Create band_sets table
CREATE TABLE IF NOT EXISTS band_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'studio' CHECK (owner_type IN ('studio', 'client')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Seed the "EF Studio" set (the existing global bands become this set)
INSERT INTO band_sets (id, name, owner_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'EF Studio', 'studio')
ON CONFLICT DO NOTHING;

-- 3. Add band_set_id to bands
ALTER TABLE bands ADD COLUMN IF NOT EXISTS band_set_id UUID REFERENCES band_sets(id) ON DELETE CASCADE;

-- 4. Migrate all existing bands into the EF Studio set
UPDATE bands SET band_set_id = '00000000-0000-0000-0000-000000000001'
WHERE band_set_id IS NULL;

-- 5. Add band_set_id to clients (nullable — NULL means "EF Studio" by default)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS band_set_id UUID REFERENCES band_sets(id) ON DELETE SET NULL;

-- 6. Index for efficient band-set lookups
CREATE INDEX IF NOT EXISTS idx_bands_band_set_id ON bands(band_set_id);
CREATE INDEX IF NOT EXISTS idx_clients_band_set_id ON clients(band_set_id);

COMMENT ON TABLE band_sets IS 'CR-EF-116: Named collections of resistance bands. Each set has a name (e.g. "EF Studio", "Client home set") and is owned by studio or a specific client.';
COMMENT ON COLUMN bands.band_set_id IS 'CR-EF-116: Which band set this band belongs to.';
COMMENT ON COLUMN clients.band_set_id IS 'CR-EF-116: Which band set this client uses. NULL defaults to the studio set.';
