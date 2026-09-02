-- Migration: Add Trainerize identity mapping columns to clients and blocks
-- Date: 2026-09-02
-- Purpose: Replaces the fragile name-string matching and free-text provenance in
-- blocks.block_note with stable numeric foreign keys into the Trainerize archive
-- tables.  These columns are nullable and additive — no backfill of live data.
-- The reconciliation script (scripts/reconcile-trainerize-hub.mjs) uses these
-- for exact identity resolution when they are set, falling back to name matching
-- when they are not.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS trainerize_client_id BIGINT;
ALTER TABLE blocks  ADD COLUMN IF NOT EXISTS trainerize_phase_id  BIGINT;

CREATE INDEX IF NOT EXISTS idx_clients_trainerize_client_id ON clients(trainerize_client_id);
CREATE INDEX IF NOT EXISTS idx_blocks_trainerize_phase_id  ON blocks(trainerize_phase_id);
