-- Support named update template kinds and logging updates that weren't
-- actually emailed (SMTP relay is a temporary borrowed credential — history
-- should still be kept even when a real send isn't possible right now).

ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS template_kind TEXT NOT NULL DEFAULT 'six_week_update';
ALTER TABLE sent_updates ADD COLUMN IF NOT EXISTS emailed BOOLEAN NOT NULL DEFAULT true;
