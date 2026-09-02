-- CR-EF-097: availability pattern CONFIRMED BY CRAIG, 2026-08-31.
--
-- Supersedes both the mockup seed and my derived-from-bookings pattern.
-- Craig's rule, verbatim: "monday to saturday 8am start, 7.45 on friday to
-- accommodate becky, last bookable session is 12.30pm with emma the
-- exception running until 13:34 to accommodate her longer session".
--
-- So the whole week is one rule, not six derived windows:
--   * Start 08:00 every day, except Friday 07:45 (for Becky).
--   * Last bookable START is 12:30 every day. With 60-minute sessions that
--     puts the close at 13:30, which is what end_time encodes.
--   * Sunday closed.
--
-- EXCEPTIONS ARE PER-CLIENT, NOT PATTERN. Emma Atkinson starts at 12:30 like
-- everyone else; it is her session that is LONGER, running to ~13:34. That
-- must not widen the bookable window, or a 13:30 slot would be offered to
-- every client. Same reasoning for Sam Gibbons, the only other client in the
-- data booked past 12:30 (Thu 13:00, 8 sessions) - an arrangement, not
-- general availability.
--
-- This replaces my derived pattern, which had inferred per-day close times
-- from last-observed-start. That produced Mon 13:00 and Thu 14:00 - the
-- Thursday value being Sam's standing exception leaking into what looked
-- like general availability. Craig's single rule is both simpler and right.

DELETE FROM availability_pattern;

-- day_of_week: 0=Sun ... 6=Sat. end_time = last bookable start (12:30) + 60 min.
INSERT INTO availability_pattern (day_of_week, start_time, end_time, active, note, sort_order) VALUES
  (1, '08:00', '13:30', true,  'Confirmed by Craig 2026-08-31',                                 0),
  (2, '08:00', '13:30', true,  'Confirmed by Craig 2026-08-31',                                 1),
  (3, '08:00', '13:30', true,  'Confirmed by Craig 2026-08-31',                                 2),
  (4, '08:00', '13:30', true,  'Confirmed by Craig 2026-08-31',                                 3),
  (5, '07:45', '13:30', true,  'Early start to accommodate Becky (Craig, 2026-08-31)',          4),
  (6, '08:00', '13:30', true,  'Confirmed by Craig 2026-08-31',                                 5),
  (0, '00:00', '00:00', false, 'Closed Sundays',                                                6);

-- Session length and gap unchanged: 60-minute sessions on 90-minute spacing
-- (08:00, 09:30, 11:00, 12:30), confirmed on the live Microsoft Bookings form.
UPDATE booking_settings SET session_length = 60, gap_after = 30, updated_at = now();

COMMENT ON TABLE availability_pattern IS
  'Esther''s repeating weekly hours, CONFIRMED BY CRAIG 2026-08-31: 08:00 start Mon-Sat (07:45 Friday for Becky), last bookable start 12:30, closed Sunday. Slot start times are computed from these ranges minus gap_after, NOT stored. Longer or later individual arrangements (Emma to ~13:34, Sam Thu 13:00) are per-client and must NOT widen this pattern.';
