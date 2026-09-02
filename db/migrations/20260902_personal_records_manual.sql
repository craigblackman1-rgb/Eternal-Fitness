-- CR-EF-131: manual PBs coexist with logged rows — unique key now excludes source='manual'
-- Manual rows are never deduped against each other or against logged rows.
-- Logged rows retain their one-per-(client, exercise, metric, rep_count) uniqueness.

ALTER TABLE personal_records DROP CONSTRAINT IF EXISTS personal_records_source_check;
ALTER TABLE personal_records ADD CONSTRAINT personal_records_source_check CHECK (source IN ('live_log','trainerize_import','manual'));

ALTER TABLE personal_records DROP CONSTRAINT IF EXISTS personal_records_metric_check;
ALTER TABLE personal_records ADD CONSTRAINT personal_records_metric_check CHECK (metric IN ('weight','duration','reps','band'));

ALTER TABLE personal_records ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE personal_records ADD COLUMN IF NOT EXISTS recorded_by TEXT;
ALTER TABLE personal_records ADD COLUMN IF NOT EXISTS band_colour TEXT;

DROP INDEX IF EXISTS idx_personal_records_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_records_unique ON personal_records(client_id, exercise, metric, rep_count) NULLS NOT DISTINCT WHERE source <> 'manual';
