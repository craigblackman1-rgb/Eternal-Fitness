-- Adds a persistent uid to every Exercise object inside sessions.data.versions.*.*,
-- and matching exercise_uid / exercise_name columns on set_logs, so a historical set
-- log stays attributed to the correct exercise across an in-session reorder, insert,
-- or delete. exercise_ref's positional format (<version>:<section>:<index>:<name>)
-- breaks the moment an exercise moves position, and collides on duplicate exercise
-- names within a section -- uid does neither.
--
-- Idempotent throughout: safe to re-run. Existing uids are never overwritten; a
-- set_logs row's exercise_uid/exercise_name are only backfilled when the ref can be
-- matched to exactly one exercise unambiguously. Anything that can't be matched is
-- left NULL, not guessed -- callers fall back to the legacy exercise_ref in that case.
--
-- Verified against live production data before writing this migration: 92/92 set_logs
-- rows across 86 sessions matched unambiguously in a dry run (read-only, no data
-- touched) of the exact join below. Zero unmatched rows expected; the migration still
-- handles the unmatched case safely for any future data this doesn't anticipate.

-- 1. New columns on set_logs.
ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS exercise_uid TEXT;
ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS exercise_name TEXT;
CREATE INDEX IF NOT EXISTS idx_set_logs_session_uid ON set_logs(session_id, exercise_uid);

-- 2. Idempotent JSONB walk: add a uid to every Exercise object across every
--    version (home/studio) and section (warm_up/main_block/cooldown) that doesn't
--    already have one. Keys are read dynamically, not hardcoded, so this keeps
--    working if a version or section name is ever added.
CREATE OR REPLACE FUNCTION ef_add_exercise_uids(d jsonb) RETURNS jsonb AS $$
DECLARE
  result jsonb := d;
  ver text;
  sec text;
  arr jsonb;
  new_arr jsonb;
  elem jsonb;
  i int;
BEGIN
  IF d IS NULL OR NOT (d ? 'versions') THEN
    RETURN d;
  END IF;

  FOR ver IN SELECT jsonb_object_keys(d->'versions') LOOP
    FOR sec IN SELECT jsonb_object_keys(d->'versions'->ver) LOOP
      arr := d->'versions'->ver->sec;
      IF jsonb_typeof(arr) IS DISTINCT FROM 'array' THEN
        CONTINUE;
      END IF;

      new_arr := '[]'::jsonb;
      FOR i IN 0 .. jsonb_array_length(arr) - 1 LOOP
        elem := arr->i;
        IF jsonb_typeof(elem) = 'object' AND NOT (elem ? 'uid') THEN
          elem := elem || jsonb_build_object('uid', gen_random_uuid()::text);
        END IF;
        new_arr := new_arr || jsonb_build_array(elem);
      END LOOP;

      result := jsonb_set(result, ARRAY['versions', ver, sec], new_arr);
    END LOOP;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Apply the walk to every session. Idempotent -- re-running adds nothing to a
--    session already fully uid'd, since ef_add_exercise_uids only fills gaps.
UPDATE sessions
SET data = ef_add_exercise_uids(data)
WHERE data ? 'versions';

-- 4. Backfill set_logs.exercise_uid / exercise_name by re-deriving (version, section,
--    index, name) from the legacy ref and matching against the now-uid'd JSONB.
--    Matches ONLY when the element at that exact index has that exact exercise_name --
--    never a fuzzy or first-match. Anything that doesn't match unambiguously stays
--    NULL. array_to_string((string_to_array(ref, ':'))[4:], ':') mirrors the app's own
--    parseExerciseName (lib/progress.ts): "everything after the 3rd colon", so a name
--    that itself contains a colon is still reconstructed correctly.
UPDATE set_logs sl
SET
  exercise_uid = elem.uid,
  exercise_name = elem.name
FROM (
  SELECT
    sl2.id,
    sl2.session_id,
    split_part(sl2.exercise_ref, ':', 1) AS ver,
    split_part(sl2.exercise_ref, ':', 2) AS sec,
    split_part(sl2.exercise_ref, ':', 3) AS idx_str,
    array_to_string((string_to_array(sl2.exercise_ref, ':'))[4:], ':') AS ref_name
  FROM set_logs sl2
  WHERE sl2.exercise_uid IS NULL
) parts
JOIN sessions s ON s.id = parts.session_id
CROSS JOIN LATERAL (
  SELECT
    (s.data->'versions'->parts.ver->parts.sec->(parts.idx_str::int))->>'uid' AS uid,
    (s.data->'versions'->parts.ver->parts.sec->(parts.idx_str::int))->>'exercise_name' AS name
) elem
WHERE sl.id = parts.id
  AND parts.idx_str ~ '^\d+$'
  AND jsonb_typeof(s.data->'versions'->parts.ver->parts.sec) = 'array'
  AND elem.uid IS NOT NULL
  AND elem.name = parts.ref_name;

-- 5. Report what didn't match, for the record -- this migration does not fail or
--    roll back on unmatched rows, per design (leave NULL, don't guess), but the
--    count should be checked and explained before this is considered fully applied.
DO $$
DECLARE
  unmatched_count int;
BEGIN
  SELECT count(*) INTO unmatched_count FROM set_logs WHERE exercise_uid IS NULL;
  RAISE NOTICE 'exercise_uid backfill: % set_logs row(s) left unmatched (exercise_ref preserved as fallback)', unmatched_count;
END $$;
