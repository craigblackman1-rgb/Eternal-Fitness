-- Per-client update interval, for deriving "next update due" (never stored —
-- computed as latest sent_updates.sent_at + interval length, same pattern as
-- clients.annual_review_due_date). See .context/brief-updates-due-opendesign.md.
--
-- NOT applied automatically. Run via the Coolify SSH tunnel against the
-- eternal_fitness DB with Craig's explicit per-session go-ahead.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS update_interval TEXT
    CHECK (update_interval IS NULL OR update_interval IN ('4_week', '6_week', '12_week', '6_session', 'flexible'));

CREATE INDEX IF NOT EXISTS idx_clients_update_interval ON clients (update_interval);
