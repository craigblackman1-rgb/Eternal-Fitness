-- CR-EF-014 follow-up: replace the provisional band seed with a real set.
--
-- The original seed in 20260831_bands_table.sql was an explicitly-flagged
-- placeholder invented by the mockup. Craig supplied the actual band type
-- (Fitense 6-level TPE set) on 2026-08-31; its order is close to INVERTED
-- versus the placeholder (Blue was 4th but is lightest; Yellow was lightest
-- but is 4th) and it contains Purple, which the placeholder lacked, while
-- lacking Silver, which the placeholder invented.
--
-- This matters because a band PB is defined as moving UP a colour, so
-- sort_order is load-bearing: the placeholder would have reported wrong
-- personal bests with full confidence.
--
-- Tensions are manufacturer RANGES in lb, not point values. tension_label
-- carries the range verbatim for display; tension_kg holds the range midpoint
-- converted to kg, for coarse sorting only. sort_order remains the sole
-- source of truth for PB comparison.
--
-- STILL TO CONFIRM: Esther must verify these against the bands physically in
-- the studio. This is the right band FAMILY per Craig, not a confirmed
-- inventory. The BandManager settings screen exists for her to correct it.

-- Safe to replace wholesale: verified zero set_logs rows carry band_colour
-- at the time of writing (feature shipped same day, nothing logged yet).
DELETE FROM bands;

INSERT INTO bands (colour, colour_hex, tension_label, tension_kg, sort_order) VALUES
  ('Blue',   '#2F6FB5', '15-25 lb',  9.1,  1),
  ('Green',  '#3E8E5A', '20-35 lb',  12.5, 2),
  ('Purple', '#7A5AA8', '30-50 lb',  18.1, 3),
  ('Yellow', '#F2C230', '40-80 lb',  27.2, 4),
  ('Red',    '#C8443C', '50-125 lb', 39.7, 5),
  ('Black',  '#2A2D33', '60-170 lb', 52.2, 6);

COMMENT ON TABLE bands IS
  'Colour-coded resistance bands. sort_order is the SOLE source of truth for band PB comparison (a PB = moving up a colour). tension_kg is a midpoint approximation of the manufacturer lb range and must not be used for PB logic. Seeded from the Fitense 6-level set 2026-08-31; pending Esther confirming against the studio inventory.';
