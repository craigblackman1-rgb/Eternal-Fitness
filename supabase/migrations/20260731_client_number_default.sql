-- clients.client_number had no default, so new client creation left it NULL,
-- breaking every /hub/clients/[client_number] route (redirects to /hub/clients/null).
-- Add a sequence-backed default, seeded past the current max, mirroring how
-- clients.id already auto-generates via gen_random_uuid().

CREATE SEQUENCE IF NOT EXISTS clients_client_number_seq;

SELECT setval('clients_client_number_seq', (SELECT COALESCE(MAX(client_number), 0) FROM clients));

ALTER TABLE clients ALTER COLUMN client_number SET DEFAULT nextval('clients_client_number_seq');

ALTER SEQUENCE clients_client_number_seq OWNED BY clients.client_number;

-- Backfill the one existing row left NULL by the bug (Nathan Wadey).
UPDATE clients SET client_number = nextval('clients_client_number_seq') WHERE client_number IS NULL;
