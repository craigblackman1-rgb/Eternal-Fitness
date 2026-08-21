-- CR-EF-028 — Outlook duplicate-event reconciliation queue.
--
-- Mirror image of CR-EF-050's outlook_booking_events: there, an Outlook event
-- has no session; here, a session is about to push its own Outlook event but
-- Esther already has a same-day, name-matching personal entry of her own. One
-- row per session whose push-sync is paused pending her decision.
--
-- No RLS -- matches every other table on this plain-Postgres instance.

CREATE TABLE IF NOT EXISTS outlook_duplicate_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  existing_event_id TEXT NOT NULL,
  existing_calendar_id TEXT NOT NULL,
  existing_subject TEXT NOT NULL DEFAULT '',
  existing_start_at TIMESTAMPTZ,
  flag TEXT NOT NULL DEFAULT 'off' CHECK (flag IN ('same', 'off')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'linked', 'kept_separate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outlook_duplicate_candidates_status ON outlook_duplicate_candidates(status);

COMMENT ON TABLE outlook_duplicate_candidates IS
  'CR-EF-028 -- sessions whose push-sync is paused because a same-day, name-matching Outlook event (Esther''s own personal note) already exists. flag=same means the existing event is at/near the same time (strong signal); flag=off means a different time (likely a first-name coincidence).';
COMMENT ON COLUMN outlook_duplicate_candidates.status IS
  'open = sync paused, awaiting Esther''s choice. linked = she adopted the existing event (session_calendar_events now maps to existing_event_id). kept_separate = false positive confirmed; normal push-sync proceeded and created its own event.';
