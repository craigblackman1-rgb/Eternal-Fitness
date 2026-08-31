-- CR-EF-097: replace the provisional availability pattern with one DERIVED
-- from Esther's real bookings.
--
-- The previous rows came from the mockup and were materially wrong. This
-- matters because the pattern is what clients can book against.
--
-- METHOD (2026-08-31): grouped 131 non-cancelled sessions in the production
-- database by weekday and start time, in Europe/London. Session length and
-- gap were read off the live Microsoft Bookings form and confirmed by the
-- 90-minute spacing that every day runs on (08:00, 09:30, 11:00, 12:30 =
-- 60-minute session + 30-minute gap).
--
-- WHAT THE MOCKUP GOT WRONG:
--   * It invented evening blocks (Mon/Wed 16:00-19:00). ZERO real sessions
--     occur after 14:00 on any day. She is a mornings-only trainer, and
--     those blocks would have opened bookable slots she does not work.
--   * It started her at 07:00. Real earliest is 07:45, and only on Friday.
--   * It marked SATURDAY as alternate weeks. The data says Saturday is
--     regular (sessions in 11 distinct weeks) and WEDNESDAY is the sparse
--     day (5 weeks) - the opposite way round.
--
-- WHY NOT USE THE MICROSOFT BOOKINGS FORM DIRECTLY: that form exposes only
-- Mon/Tue/Wed/Sat for Personal Training, but Thursday (33 sessions) and
-- Friday (26) are among her busiest days. The form is the subset she opens
-- to public self-booking, not her working week. Deriving from real sessions
-- avoids hiding two of her busiest days.
--
-- STILL FOR ESTHER TO CONFIRM: the exact close time each day (end times here
-- are last observed start + one session), and whether Wednesday is genuinely
-- alternate-weeks or was just quiet in this sample.

DELETE FROM availability_pattern;

-- day_of_week: 0=Sun ... 6=Sat. End time = last observed start + 60 min.
INSERT INTO availability_pattern (day_of_week, start_time, end_time, active, note, sort_order) VALUES
  (1, '08:00', '13:00', true,  'Derived from 22 real sessions across 12 weeks',            0),
  (2, '08:00', '13:30', true,  'Derived from 30 real sessions across 11 weeks',            1),
  (3, '08:00', '13:30', true,  'Derived from 8 sessions across 5 weeks - confirm whether alternate weeks', 2),
  (4, '08:00', '14:00', true,  'Derived from 33 real sessions across 9 weeks - busiest day', 3),
  (5, '07:45', '13:30', true,  'Derived from 26 real sessions across 11 weeks - earliest start',           4),
  (6, '08:00', '13:30', true,  'Derived from 12 real sessions across 11 weeks - regular, not alternate',   5),
  (0, '00:00', '00:00', false, 'No sessions ever recorded on a Sunday',                    6);

-- Session length and gap confirmed from the live Bookings form (Personal
-- Training = 1 hour, Initial consult = 30 min) and corroborated by the
-- 90-minute spacing between consecutive real sessions.
UPDATE booking_settings SET session_length = 60, gap_after = 30, updated_at = now();

COMMENT ON TABLE availability_pattern IS
  'Esther''s repeating weekly hours. DERIVED 2026-08-31 from real production bookings, not from the mockup. Slot start times are computed from these ranges minus gap_after, NOT stored. End times are last-observed-start + one session and should be confirmed by Esther.';
