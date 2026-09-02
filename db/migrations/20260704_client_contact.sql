-- Contact details on the client master record.
-- Email is used to prefill the "send to" address on 6-week updates (falling back
-- to the signed PAR-Q / agreement email when empty) and is remembered on each
-- send so it's instant next time. Phone added for completeness.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
