-- Additive: store client consent choices for the Consent document type.
-- One JSONB column on client_documents; no existing data is touched.
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS consent_choices jsonb;
