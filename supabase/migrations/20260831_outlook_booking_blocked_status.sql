-- A5 — Add 'blocked' status to outlook_booking_events.
--
-- The sync cron (CR-EF-090) auto-confirms Outlook bookings into sessions.
-- When a block already has the maximum 18 sessions, materializeBookingSession
-- throws. The catch block left the booking 'open', causing the 15-minute cron
-- to retry and fail indefinitely. 'blocked' lets the cron skip these bookings
-- on subsequent runs while still surfacing them in the hub for manual review.

ALTER TABLE outlook_booking_events
  DROP CONSTRAINT IF EXISTS outlook_booking_events_status_check;

ALTER TABLE outlook_booking_events
  ADD CONSTRAINT outlook_booking_events_status_check
  CHECK (status IN ('open', 'dismissed', 'confirmed', 'blocked'));

COMMENT ON COLUMN outlook_booking_events.status IS
  'open = awaiting a decision. dismissed = Esther marked it not a client booking. confirmed = a sessions row was created from it (see session_id). blocked = auto-confirm failed because the target block is full (18 sessions) — needs manual handling.';
