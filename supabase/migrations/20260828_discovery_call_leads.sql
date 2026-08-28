-- CR-EF-097 — Discovery-call intake + booking leads.
--
-- Stores every submission from the public discovery-call booking page
-- (app/discovery-call). Each row captures the intake details Esther needs
-- to prepare for the call, plus the Outlook calendar event ID so the
-- booking can be cross-referenced or cancelled later.
--
-- No RLS — matches every other table on this plain-Postgres instance.

CREATE TABLE IF NOT EXISTS discovery_call_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  goals TEXT NOT NULL,
  activity_level TEXT NOT NULL,
  contact_method TEXT NOT NULL CHECK (contact_method IN ('phone', 'text', 'email')),
  health_notes TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  slot_start_utc TIMESTAMPTZ NOT NULL,
  slot_end_utc TIMESTAMPTZ NOT NULL,
  calendar_event_id TEXT,
  notification_emailed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discovery_call_leads_created_at ON discovery_call_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_discovery_call_leads_slot_start_utc ON discovery_call_leads(slot_start_utc);

COMMENT ON TABLE discovery_call_leads IS
  'CR-EF-097 -- intake submissions from the public discovery-call booking page. Each row is a confirmed booking (calendar event created) plus the details Esther needs to prepare for the call.';
COMMENT ON COLUMN discovery_call_leads.activity_level IS
  'One of: not-active, a-little, regularly — matching the <select> options on the intake form.';
COMMENT ON COLUMN discovery_call_leads.contact_method IS
  'How the lead wants to be contacted before the call: phone, text, or email.';
COMMENT ON COLUMN discovery_call_leads.calendar_event_id IS
  'Outlook event ID returned by confirmBooking(). NULL if calendar creation failed (should not happen — the API returns 503 in that case).';
COMMENT ON COLUMN discovery_call_leads.notification_emailed IS
  'Whether the best-effort notification email to Esther was actually sent (not dry-run). The booking is valid regardless — this flag is informational only.';
