-- CR-EF-028: confirm-before-sync gate for Outlook calendar
--
-- Extends the existing calendar_sync_pending_actions staging gate (which only
-- covered deletes) to also cover creates and updates when the
-- `confirm_before_sync` flag is enabled on the integration. When off, creates
-- and updates remain automatic — the flag gives Esther a toggle to pause the
-- sync and review every push before it reaches Outlook.

-- 1. Add the toggle column to integration_tokens (default false = automatic).
ALTER TABLE integration_tokens
  ADD COLUMN IF NOT EXISTS confirm_before_sync BOOLEAN NOT NULL DEFAULT false;

-- 2. Expand the pending actions table to support create/update.
ALTER TABLE calendar_sync_pending_actions
  DROP CONSTRAINT IF EXISTS calendar_sync_pending_actions_action_check;

ALTER TABLE calendar_sync_pending_actions
  ADD CONSTRAINT calendar_sync_pending_actions_action_check
  CHECK (action IN ('delete', 'create', 'update'));

-- event_id is no longer NOT NULL — create actions don't have one yet.
ALTER TABLE calendar_sync_pending_actions
  ALTER COLUMN event_id DROP NOT NULL;

-- event_input carries the CalendarEventInput payload for create/update
-- approval so the executor can replay the exact Graph call that was deferred.
ALTER TABLE calendar_sync_pending_actions
  ADD COLUMN IF NOT EXISTS event_input JSONB;
