-- CR-EF-014: Bands table — configurable colour→tension→order mapping.
-- The mockup's values are PROVISIONAL placeholders — Esther must confirm
-- her actual band set before go-live. The ORDER is load-bearing: a band PB
-- means moving UP a colour (higher sort_order = heavier).

CREATE TABLE bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colour TEXT NOT NULL UNIQUE,         -- e.g. 'Yellow', 'Red', 'Green'
  colour_hex TEXT NOT NULL,            -- CSS colour for the swatch, e.g. '#F2C230'
  tension_label TEXT NOT NULL,         -- human-readable, e.g. '1.3 kg'
  tension_kg NUMERIC(4,1),            -- numeric for future sorting/comparison
  sort_order INT NOT NULL UNIQUE,     -- 1=lightest, N=heaviest — drives PB order
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provisional seed — EXPLICITLY FLAGGED as placeholder data.
-- Esther must update these against her actual studio bands.
INSERT INTO bands (colour, colour_hex, tension_label, tension_kg, sort_order) VALUES
  ('Yellow',  '#F2C230', '1.3 kg', 1.3, 1),
  ('Red',     '#C8443C', '1.7 kg', 1.7, 2),
  ('Green',   '#3E8E5A', '2.1 kg', 2.1, 3),
  ('Blue',    '#2F6FB5', '2.6 kg', 2.6, 4),
  ('Black',   '#2A2D33', '3.3 kg', 3.3, 5),
  ('Silver',  '#A2A8B2', '4.6 kg', 4.6, 6);

-- Add band_colour to set_logs — stores the colour id (e.g. 'Yellow') for
-- banded exercises. NULL for non-banded exercises.
ALTER TABLE set_logs ADD COLUMN band_colour TEXT;
