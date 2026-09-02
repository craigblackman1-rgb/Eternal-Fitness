-- Staging gate for calendar sync deletions (WO calendar-sync-window-fix)
--
-- syncCalendar() now queues delete actions here instead of executing them
-- immediately. A hub UI or manual approval step processes approved rows
-- before any Outlook event is actually deleted.
--
-- Creates and updates remain automatic (low risk). Only deletes — the
-- operation that silently wiped 25 real events on 2026-08-28 — are gated.

CREATE TABLE IF NOT EXISTS calendar_sync_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('delete')),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_pending_actions_session
  ON calendar_sync_pending_actions (session_id);

-- Index for the calendar mismatch check in syncCalendar step 1.
CREATE INDEX IF NOT EXISTS idx_session_calendar_events_calendar_id
  ON session_calendar_events (calendar_id);
