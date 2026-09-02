-- Compliance unification: move per-client clearance fields off client_tracker (a
-- separate manually-maintained spreadsheet) onto clients, so they live alongside
-- the rest of the profile and can be administered from the client page.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS gp_letter_status TEXT
  CHECK (gp_letter_status IN ('not_required', 'requested', 'received'))
  DEFAULT 'not_required';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS gp_letter_requested_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gp_letter_received_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS annual_review_due_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS clearance_from TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS specialist_name TEXT;

-- One-time backfill from client_tracker (linked via client_id since 20260603).
-- client_tracker itself is left in place as historical record but is no longer
-- written to by the app going forward.
UPDATE clients c SET
  gp_letter_status = CASE
    WHEN ct.gp_letter_received_date IS NOT NULL THEN 'received'
    WHEN ct.gp_letter_requested_date IS NOT NULL THEN 'requested'
    ELSE 'not_required'
  END,
  gp_letter_requested_date = ct.gp_letter_requested_date,
  gp_letter_received_date = ct.gp_letter_received_date,
  annual_review_due_date = ct.annual_review_due_date,
  clearance_from = ct.clearance_from,
  specialist_name = ct.specialist_name
FROM client_tracker ct
WHERE ct.client_id = c.id;
