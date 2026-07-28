-- Email send/delivery event log — first-send vs. resend, plus delivery status.
--
-- Both sent_updates and client_documents previously stored a single mutable
-- sent_at/sg_message_id pair, overwritten on every resend — so "did this
-- actually get sent, and when" couldn't be answered once a resend happened.
-- This table is an append-only log: one row per send/resend/delivery event,
-- never updated in place.

CREATE TABLE IF NOT EXISTS email_send_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('update', 'document')),
  entity_id UUID NOT NULL,
  event TEXT NOT NULL
    CHECK (event IN ('sent', 'resent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  recipient TEXT,
  sg_message_id TEXT,
  meta JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_send_events_entity ON email_send_events(entity_type, entity_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_email_send_events_message ON email_send_events(sg_message_id);

-- client_documents never persisted a provider message id, so the webhook
-- (opens/clicks/delivered/bounced) had nothing to match document sends
-- against. sent_updates already has this column (20260710120001).
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS sg_message_id TEXT;
