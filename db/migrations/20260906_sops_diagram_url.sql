-- g6-sop-diagram — Add optional flow-diagram image to sops
-- NOT applied automatically. Run via prod tunnel with explicit go-ahead.
-- Run: psql $DATABASE_URL -f db/migrations/20260906_sops_diagram_url.sql

alter table sops
  add column if not exists diagram_url text;
