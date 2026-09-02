-- CR-EF-050 — Outlook Bookings reconciliation queue.
--
-- Clients book sessions through a Microsoft Bookings form; the appointment
-- lands in the same Outlook calendar the app already syncs *to* (one-way,
-- app -> Outlook, lib/calendar-sync.ts) but the app never reads anything
-- back. This table is the read-back side: one row per Bookings-originated
-- Outlook event, holding Esther's reconciliation decision (open / dismissed
-- / confirmed) so the 15-minute sync doesn't keep re-surfacing something
-- she already handled.
--
-- client_id follows this project's embed-shorthand convention (lib/pg-client.ts
-- infers "clients(...)" embeds from a "<singular>_id" column), not a
-- descriptive name like matched_client_id.
--
-- No RLS -- matches every other table on this plain-Postgres instance
-- (access control is enforced at the app layer, see 20260725_session_scheduling.sql).

CREATE TABLE IF NOT EXISTS outlook_booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  calendar_id TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  parsed_name TEXT,
  client_id UUID REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'confirmed')),
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outlook_booking_events_status ON outlook_booking_events(status);
CREATE INDEX IF NOT EXISTS idx_outlook_booking_events_start_at ON outlook_booking_events(start_at);

COMMENT ON TABLE outlook_booking_events IS
  'Reconciliation queue for Microsoft Bookings appointments read back from Outlook. See CR-EF-050.';
COMMENT ON COLUMN outlook_booking_events.parsed_name IS
  'Client name parsed from the event subject ("Personal Training - {name}" / "Initial consult - {name}"). The client''s real email never appears on these events -- matching is name-based, not email-based.';
COMMENT ON COLUMN outlook_booking_events.status IS
  'open = awaiting a decision. dismissed = Esther marked it not a client booking. confirmed = a sessions row was created from it (see session_id).';
