-- O2 — Capture seriesMasterId and event type from Microsoft Graph.
--
-- Recurring Outlook events arrive as individual occurrences. Graph exposes
-- seriesMasterId on every occurrence/exception, letting the app group all
-- occurrences that belong to the same recurring series. Without this, each
-- occurrence looks like an unrelated event in the reconcile queue.
--
-- event_type stores Graph's @odata.type discriminant:
--   "occurrence"    — a single occurrence of a recurring series
--   "exception"     — a modified occurrence of a recurring series
--   "seriesMaster"  — the master (template) event for a recurring series
--   "singleInstance" — a non-recurring event
--
-- Both columns are nullable so pre-existing rows (which have no Graph data
-- yet) continue to work without a backfill. The sync code fills them on
-- every subsequent upsert.

ALTER TABLE outlook_booking_events
  ADD COLUMN series_master_id TEXT,
  ADD COLUMN event_type TEXT;

COMMENT ON COLUMN outlook_booking_events.series_master_id IS
  'Graph seriesMasterId — groups occurrences of the same recurring series. Null for pre-existing rows and singleInstance events.';
COMMENT ON COLUMN outlook_booking_events.event_type IS
  'Graph event type: occurrence, exception, seriesMaster, or singleInstance.';
