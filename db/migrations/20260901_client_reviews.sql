-- CR-EF-119 — Guided client review flow.
-- Records the outcome of each periodic review checkpoint.
-- A review that does not end in a decision has failed; this table
-- enforces that only completed decisions are stored.

CREATE TABLE IF NOT EXISTS client_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('continue', 'adjust', 'restart')),
  note TEXT NOT NULL CHECK (length(trim(note)) > 0),
  recorded_by UUID NOT NULL,
  recorded_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_reviews_client ON client_reviews(client_id, created_at DESC);

COMMENT ON TABLE client_reviews IS 'CR-EF-119 — Recorded decisions from the guided client review flow.';
COMMENT ON COLUMN client_reviews.decision IS 'continue = keep the current programme, adjust = modify the current programme, start a new programme = replace it entirely.';
COMMENT ON COLUMN client_reviews.recorded_by IS 'The staff member who recorded the decision (auth user id).';
COMMENT ON COLUMN client_reviews.recorded_by_name IS 'Denormalised display name for the staff member — avoids a join on the auth table.';
