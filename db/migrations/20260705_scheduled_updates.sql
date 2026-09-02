-- Update lifecycle: drafts, scheduled sends, and richer history.
--
-- The sent_updates table started life as a log of already-sent emails. This
-- migration turns it into the single record for an update across its whole
-- lifecycle: draft -> scheduled -> sent (or failed). Existing rows are all
-- historical sends, so they backfill to status 'sent'.

-- Lifecycle status. 'sent' covers both real emails and "logged only" rows
-- (the emailed flag distinguishes those). 'cancelled' is a soft-cancelled
-- schedule kept for the audit trail.
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent';

-- When a scheduled update should go out. NULL for drafts and immediate sends.
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Recipient captured at schedule/draft time so the cron dispatcher has it.
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Structured section values (keys match the template registry) so a draft or
-- scheduled update can be reopened in the editor and rebuilt. body_html is the
-- rendered version the dispatcher actually sends.
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS sections JSONB;

-- Last dispatch error, set when a scheduled send fails.
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS send_error TEXT;

ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- sent_at is now null until the update actually goes out (drafts/scheduled have
-- no sent time). It previously defaulted to NOW(); drop that so new draft rows
-- aren't stamped as sent. Existing rows keep their value.
ALTER TABLE sent_updates ALTER COLUMN sent_at DROP DEFAULT;
ALTER TABLE sent_updates ALTER COLUMN sent_at DROP NOT NULL;

-- Backfill: everything already in the table is a historical send.
UPDATE sent_updates SET status = 'sent' WHERE status IS NULL;

-- The dispatcher scans for due, still-scheduled rows.
CREATE INDEX IF NOT EXISTS idx_sent_updates_due
  ON sent_updates (scheduled_for)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_sent_updates_status ON sent_updates (status);

-- Editing a draft/scheduled update needs an UPDATE policy (the table only had
-- SELECT/INSERT/DELETE before).
DROP POLICY IF EXISTS "Users can update sent_updates" ON sent_updates;
CREATE POLICY "Users can update sent_updates"
  ON sent_updates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
