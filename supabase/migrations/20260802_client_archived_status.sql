-- Adds 'archived' as a valid clients.client_status value — for historical
-- clients pulled in from Trainerize (or elsewhere) for record-keeping only,
-- not active/inactive/completed/suspended in the operational sense. Archived
-- clients are excluded from the default hub client list (see clients-table.tsx)
-- but remain fully queryable/visible via a "Show archived" toggle. Reusable
-- for any future former-client backfill, not just this one.

ALTER TABLE clients DROP CONSTRAINT clients_client_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_client_status_check
  CHECK (client_status = ANY (ARRAY['active', 'inactive', 'completed', 'suspended', 'archived']));
