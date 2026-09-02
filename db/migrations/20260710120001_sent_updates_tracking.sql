-- SendGrid open/click tracking + sending reliability
-- Adds columns to persist the SendGrid message ID and engagement events,
-- plus a 'sending' transient status for insert-first reliability.

-- SendGrid message ID — persisted on every real send so the webhook can match events.
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS sg_message_id TEXT;

-- Engagement tracking — populated by the /api/webhooks/sendgrid endpoint.
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS open_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;

-- 'sending' is a transient status set just before email dispatch, updated to
-- 'sent' or 'failed' immediately after. Guarantees a row exists even if the
-- process crashes between dispatch and the final status update.
-- (No schema change needed — status is TEXT with no CHECK constraint in this table.)
