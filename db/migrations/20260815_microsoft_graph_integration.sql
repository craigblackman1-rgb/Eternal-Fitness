-- Microsoft Graph / Outlook calendar integration (WO hub-mobile-session-pwa, Lane L6)
--
-- One-way push: hub sessions.scheduled_at -> a dedicated Outlook calendar.
-- Outlook is a VIEW of the training plan, never a source of truth — there is no
-- pull/reconciliation path in this design (a two-way sync's failure mode is a
-- loop rewriting scheduled_at).
--
-- integration_tokens holds OAuth bearer credentials to Esther's whole calendar.
-- Reads are constrained to the server-only lib/graph-client.ts; no API route may
-- return a row from this table. Microsoft ROTATES refresh tokens on use — the
-- refresh path must persist the replacement token on every refresh or the
-- integration dies after the first renewal.
--
-- RLS deliberately not enabled: plain-Postgres instance, access control is at
-- the app layer (no `authenticated` role exists here).

CREATE TABLE IF NOT EXISTS integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  account_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  -- The dedicated "Eternal Fitness" calendar events sync into. Null until
  -- picked in Settings -> Integrations; sync is a no-op while null.
  calendar_id TEXT,
  calendar_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One connection per provider, enforced.
CREATE UNIQUE INDEX IF NOT EXISTS integration_tokens_provider_key
  ON integration_tokens (provider);

-- session -> Outlook event mapping. sync_hash is a digest of everything that
-- feeds the event payload, so the recurring sync is a cheap no-op when nothing
-- changed.
CREATE TABLE IF NOT EXISTS session_calendar_events (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  sync_hash TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
