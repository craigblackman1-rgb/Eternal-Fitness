-- Widen sessions.week beyond the original 6-week assumption.
--
-- The block model was built around Esther's standard 6-week block, so `week` was
-- capped at 6. Real supplied programmes are longer: Nathan Wadey's 12-week plan
-- (Craig, 2026-08-18) is 1 session/week for 12 consecutive weeks, and
-- clients.package already allows a "24-week" package. Nothing in the hub UI
-- hardcodes 6 — the block page, print view and spreadsheet export all derive the
-- week list from the session rows — so widening the bound is enough.
--
-- 24 = the longest package the type union defines. Additive change: every
-- existing row (weeks 1-6) still satisfies it.

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_week_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_week_check CHECK (week >= 1 AND week <= 24);
