-- Add surgery_date column to client_tracker for tracking recent surgery clearance requirements
-- May 19, 2026 - Updated to auto-flag clearance for surgery within 12 weeks

ALTER TABLE client_tracker
ADD COLUMN IF NOT EXISTS surgery_date DATE;

-- Add comment explaining the column
COMMENT ON COLUMN client_tracker.surgery_date IS 'Date of surgery. If within 12 weeks, triggers automatic clearance requirement before sessions.';
