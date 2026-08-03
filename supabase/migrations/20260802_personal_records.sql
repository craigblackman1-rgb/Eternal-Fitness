-- Lane 2 — personal records (PBs) table, shared with Lane 1 (Trainerize import) and Lane 3 (templates).
-- One row per client/exercise/metric combination. Metric = 'weight' records are per-rep-count
-- (one PB per rep bracket); metric = 'duration' records are per-exercise (one row, no rep_count).
--
-- PBs are derived from set_logs via buildExerciseHistory() in lib/exercise-history.ts, never
-- from a different PB definition. The API routes upsert here on every live-log save when the
-- just-saved set beats the existing best for that (client, exercise, metric, rep_count) key.

CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('weight', 'duration')),
  value NUMERIC NOT NULL,
  rep_count INT,
  achieved_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'live_log' CHECK (source IN ('live_log', 'trainerize_import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE personal_records IS
  'Per-client personal bests derived from completed set_logs, plus Trainerize-imported PBs. Upserted idempotently on every live set-log save — the API check re-derives from buildExerciseHistory each time.';

COMMENT ON COLUMN personal_records.metric IS
  '''weight'' = best weight_kg at a specific rep_count; ''duration'' = longest duration_seconds (rep_count is null).';
COMMENT ON COLUMN personal_records.source IS
  '''live_log'' = derived from set_logs by the live PB check; ''trainerize_import'' = imported from Trainerize''s accomplishment/getList endpoint.';

-- One PB per (client, exercise, metric, rep_count). NULLS NOT DISTINCT means a NULL rep_count
-- (duration PBs) is treated as equal to another NULL, not as an unknown — enabling a single
-- upsert target for both weight and duration records. The pg-client upsert uses
-- ON CONFLICT (client_id, exercise, metric, rep_count) DO UPDATE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_records_unique
  ON personal_records(client_id, exercise, metric, rep_count)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_personal_records_client_id ON personal_records(client_id);
