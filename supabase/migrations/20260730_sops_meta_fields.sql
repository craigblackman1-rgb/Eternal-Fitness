-- g6-sop-backport — Add mockup-matched meta fields to sops
-- NOT applied automatically. Run via prod tunnel with explicit go-ahead.
-- Run: psql $DATABASE_URL -f supabase/migrations/20260730_sops_meta_fields.sql

alter table sops
  add column if not exists applies_to   text,
  add column if not exists review_date  text,
  add column if not exists linked_client text,
  add column if not exists source       text,
  add column if not exists status       text not null default 'active';
