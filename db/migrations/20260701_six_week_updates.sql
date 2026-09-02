-- 6-Week Client Update Emails
-- Adds block_summaries JSONB field to clients for structured 6-week update data
-- Creates sent_updates table for history of sent emails

-- Block summaries: trainer-provided structured data per training block period
ALTER TABLE clients ADD COLUMN IF NOT EXISTS block_summaries JSONB DEFAULT '[]'::jsonb;

-- Sent updates history
CREATE TABLE IF NOT EXISTS sent_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sent_updates_client_id ON sent_updates(client_id);

ALTER TABLE sent_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read sent_updates"
  ON sent_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert sent_updates"
  ON sent_updates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete sent_updates"
  ON sent_updates FOR DELETE
  TO authenticated
  USING (true);
