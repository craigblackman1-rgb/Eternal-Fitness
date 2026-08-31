-- CR-EF-099: Replace auto-cancel with auto-flag for human review.
-- Sessions past their slot with no logged activity are flagged, not cancelled.
-- Esther reviews each one case by case.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lapse_flagged_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_sessions_lapse_flagged ON sessions(lapse_flagged_at) WHERE lapse_flagged_at IS NOT NULL;
