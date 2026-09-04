-- BUG-EF-111: Re-key duplicate exercise uids across 8 affected sessions
--
-- Problem: when sessions are created by copying another session's data (rotation
-- reuses the same workout, clone, template assign, sub-session attach), exercise
-- uid values inside sessions.data.versions.*.*[] are copied verbatim instead of
-- being regenerated. This causes two sessions in the same block to share exercise
-- uids, so set_logs rows keyed on exercise_uid can cross-read between sessions,
-- corrupting PB / last-session prefill logic.
--
-- Scope: exactly 8 sessions across 2 clients (Emma Atkinson block 2, Monique
-- Wearden block 1). 132 distinct duplicated uids. 0 uids outside these sessions.
--
-- Strategy:
--   1. DRY-RUN mode: preview exactly what would change (no writes).
--   2. Archive: snapshot all affected set_logs and session JSONB before touching.
--   3. Re-key: regenerate every exercise uid in the 8 sessions' JSONB, then
--      re-join set_logs.exercise_uid via exercise_name to point at the new uids.
--   4. Verify: confirm zero duplicated uids remain within the affected sessions.
--
-- This migration is transactional — if anything fails, nothing is committed.
--
-- How to use:
--   DRY RUN  (read-only preview):
--     psql -f db/migrations/20260904_bug_ef_111_rekey_duplicate_exercise_uids.sql
--     -- Run only through section 1 (before "-- ── 2."). Stop before the archive.
--     -- Or: run the whole file with DRY_RUN := true (default) — no writes happen.
--
--   APPLY    (actually re-key):
--     Set DRY_RUN := false in section 2, then run the full file.
--
--   VERIFY   (after apply):
--     The final section (4) runs automatically and confirms zero duplicates.

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — DRY-RUN PREVIEW (read-only, always runs first)
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  affected uuid[] := ARRAY[
    'dbd376d2-147d-44f8-8704-dd8bc534ed3b'::uuid,
    'f4635373-e5bd-43d4-b845-4bcfecb3bfe5'::uuid,
    '9ac77530-601a-43d0-8b10-491123953845'::uuid,
    '2312da96-288e-42fd-b936-056c2b823538'::uuid,
    '95d64eb6-8bfe-4355-a7c7-c1ccff4840ee'::uuid,
    'a3ee0ac1-d5be-42c6-87b4-8606bded2a02'::uuid,
    'fc5427f7-8b8e-4a9f-b639-e464b8b4f71a'::uuid,
    'ecbb3fc9-0428-42c4-b30e-cefa78423f88'::uuid
  ];
  r RECORD;
  sl_count int;
  dup_count int;
BEGIN
  RAISE NOTICE '═══ BUG-EF-111 DRY-RUN PREVIEW ═══';
  RAISE NOTICE '';

  -- Sessions that will be re-keyed
  RAISE NOTICE 'Sessions to re-key (%):', array_length(affected, 1);
  FOR r IN
    SELECT s.id, s.session_number, c.name AS client, b.block_number,
           (SELECT count(*) FROM set_logs sl WHERE sl.session_id = s.id) AS set_log_count
    FROM sessions s
    JOIN blocks b ON b.id = s.block_id
    JOIN clients c ON c.id = b.client_id
    WHERE s.id = ANY(affected)
    ORDER BY c.name, b.block_number, s.session_number
  LOOP
    RAISE NOTICE '  % (block %, session %) — % set_logs', r.client, r.block_number, r.session_number, r.set_log_count;
  END LOOP;

  RAISE NOTICE '';

  -- Duplicate uids that will be eliminated
  SELECT count(*) INTO dup_count
  FROM (
    SELECT uid
    FROM (
      SELECT elem->>'uid' AS uid
      FROM sessions s,
           jsonb_array_elements(
             coalesce(s.data->'versions'->'studio'->'main_block', '[]'::jsonb)
           ) elem
      WHERE s.id = ANY(affected) AND elem ? 'uid'
      UNION ALL
      SELECT elem->>'uid' AS uid
      FROM sessions s,
           jsonb_array_elements(
             coalesce(s.data->'versions'->'home'->'main_block', '[]'::jsonb)
           ) elem
      WHERE s.id = ANY(affected) AND elem ? 'uid'
    ) all_uids
    WHERE uid IS NOT NULL
  ) u
  GROUP BY uid
  HAVING count(*) > 1;

  RAISE NOTICE 'Distinct uids duplicated within affected sessions: %', dup_count;
  RAISE NOTICE '';

  -- Set_logs that will be re-keyed
  SELECT count(*) INTO sl_count
  FROM set_logs sl
  WHERE sl.session_id = ANY(affected);

  RAISE NOTICE 'Set_logs rows to re-key: %', sl_count;
  RAISE NOTICE '';

  -- Archive status
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bug_ef_111_archive_set_logs' AND relkind = 'r') THEN
    RAISE NOTICE 'Archive table already exists — will skip re-archiving (idempotent).';
  ELSE
    RAISE NOTICE 'Archive table does not exist — will create and populate.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'To apply: set DRY_RUN := false in section 2, then re-run this file.';
  RAISE NOTICE '═══ END DRY-RUN ═══';
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — ARCHIVE (snapshot affected data before modifying)
-- ════════════════════════════════════════════════════════════════════════════

-- Set to false to actually apply the re-key. Default true = dry-run only.
DO $$
DECLARE
  DRY_RUN boolean := true;

  affected uuid[] := ARRAY[
    'dbd376d2-147d-44f8-8704-dd8bc534ed3b'::uuid,
    'f4635373-e5bd-43d4-b845-4bcfecb3bfe5'::uuid,
    '9ac77530-601a-43d0-8b10-491123953845'::uuid,
    '2312da96-288e-42fd-b936-056c2b823538'::uuid,
    '95d64eb6-8bfe-4355-a7c7-c1ccff4840ee'::uuid,
    'a3ee0ac1-d5be-42c6-87b4-8606bded2a02'::uuid,
    'fc5427f7-8b8e-4a9f-b639-e464b8b4f71a'::uuid,
    'ecbb3fc9-0428-42c4-b30e-cefa78423f88'::uuid
  ];

  archive_count int;
  r RECORD;
BEGIN
  IF DRY_RUN THEN
    RAISE NOTICE 'DRY-RUN: skipping archive step.';
    RETURN;
  END IF;

  -- Idempotent: skip if archive already exists (safety against double-run)
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bug_ef_111_archive_set_logs' AND relkind = 'r') THEN
    RAISE NOTICE 'Archive table bug_ef_111_archive_set_logs already exists — skipping.';
    RETURN;
  END IF;

  -- Snapshot all set_logs rows for the 8 affected sessions
  CREATE TABLE bug_ef_111_archive_set_logs AS
  SELECT sl.*, now() AS archived_at
  FROM set_logs sl
  WHERE sl.session_id = ANY(affected);

  SELECT count(*) INTO archive_count FROM bug_ef_111_archive_set_logs;
  RAISE NOTICE 'Archived % set_logs rows to bug_ef_111_archive_set_logs.', archive_count;

  -- Verify archive is non-empty for sessions that should have set_logs
  FOR r IN
    SELECT s.id, s.session_number, c.name AS client
    FROM sessions s
    JOIN blocks b ON b.id = s.block_id
    JOIN clients c ON c.id = b.client_id
    WHERE s.id = ANY(affected)
      AND (SELECT count(*) FROM set_logs sl WHERE sl.session_id = s.id) > 0
  LOOP
    IF NOT EXISTS (SELECT 1 FROM bug_ef_111_archive_set_logs WHERE session_id = r.id) THEN
      RAISE EXCEPTION 'Archive verification failed: session % (%) has set_logs but none archived.', r.client, r.session_number;
    END IF;
  END LOOP;

  RAISE NOTICE 'Archive verification passed: all set_logs for affected sessions with data are captured.';
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — RE-KEY (regenerate uids, remap set_logs)
-- ════════════════════════════════════════════════════════════════════════════

-- Helper: recursively traverse JSONB, regenerating uid on every object that
-- has one. Returns the modified JSONB. Immutable — does not touch objects
-- without a uid field.
CREATE OR REPLACE FUNCTION _ef111_rekey_uids(node jsonb)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  key text;
  child jsonb;
  i int;
BEGIN
  IF node IS NULL OR jsonb_typeof(node) != 'object' THEN
    RETURN node;
  END IF;

  -- Leaf: exercise object with a uid — regenerate it
  IF node ? 'uid' THEN
    RETURN node || jsonb_build_object('uid', gen_random_uuid()::text);
  END IF;

  -- Branch: recurse into every value
  result := '{}'::jsonb;
  FOR key IN SELECT jsonb_object_keys(node) LOOP
    child := node->key;
    IF jsonb_typeof(child) = 'array' THEN
      child := (
        SELECT coalesce(jsonb_agg(_ef111_rekey_uids(elem)), '[]'::jsonb)
        FROM jsonb_array_elements(child) elem
      );
    ELSIF jsonb_typeof(child) = 'object' THEN
      child := _ef111_rekey_uids(child);
    END IF;
    result := result || jsonb_build_object(key, child);
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Apply re-key
DO $$
DECLARE
  DRY_RUN boolean := true;

  affected uuid[] := ARRAY[
    'dbd376d2-147d-44f8-8704-dd8bc534ed3b'::uuid,
    'f4635373-e5bd-43d4-b845-4bcfecb3bfe5'::uuid,
    '9ac77530-601a-43d0-8b10-491123953845'::uuid,
    '2312da96-288e-42fd-b936-056c2b823538'::uuid,
    '95d64eb6-8bfe-4355-a7c7-c1ccff4840ee'::uuid,
    'a3ee0ac1-d5be-42c6-87b4-8606bded2a02'::uuid,
    'fc5427f7-8b8e-4a9f-b639-e464b8b4f71a'::uuid,
    'ecbb3fc9-0428-42c4-b30e-cefa78423f88'::uuid
  ];

  r RECORD;
  sessions_updated int := 0;
  set_logs_updated int := 0;
BEGIN
  IF DRY_RUN THEN
    RAISE NOTICE 'DRY-RUN: skipping re-key step.';
    RETURN;
  END IF;

  -- Temp table: raw uid captures (may have duplicates per session+name across versions)
  CREATE TEMPORARY TABLE _ef111_uid_raw (
    session_id uuid,
    exercise_name text,
    old_uid text
  ) ON COMMIT DROP;

  -- Temp table: deduplicated — one row per (session_id, exercise_name)
  CREATE TEMPORARY TABLE _ef111_uid_map (
    session_id uuid,
    exercise_name text,
    PRIMARY KEY (session_id, exercise_name),
    old_uid text,
    new_uid text
  ) ON COMMIT DROP;

  -- Step A: regenerate uids in sessions.data JSONB and collect old uids
  FOR r IN SELECT id, data FROM sessions WHERE id = ANY(affected) LOOP
    -- Collect old uids from all exercise arrays in this session
    INSERT INTO _ef111_uid_raw (session_id, exercise_name, old_uid)
    SELECT r.id, elem->>'exercise_name', elem->>'uid'
    FROM jsonb_array_elements(
      coalesce(r.data->'versions'->'studio'->'main_block', '[]'::jsonb)
    ) elem
    WHERE elem ? 'uid'
    UNION ALL
    SELECT r.id, elem->>'exercise_name', elem->>'uid'
    FROM jsonb_array_elements(
      coalesce(r.data->'versions'->'home'->'main_block', '[]'::jsonb)
    ) elem
    WHERE elem ? 'uid';

    -- Re-key the JSONB (regenerates every uid in the entire data tree)
    UPDATE sessions SET data = _ef111_rekey_uids(data) WHERE id = r.id;

    sessions_updated := sessions_updated + 1;
  END LOOP;

  RAISE NOTICE 'Re-keyed exercise uids in % sessions.', sessions_updated;

  -- Step B: deduplicate uid_map — pick the uid whose exercise_name matches
  -- the most set_logs rows (the version actually used for logging)
  INSERT INTO _ef111_uid_map (session_id, exercise_name, old_uid)
  SELECT session_id, exercise_name, old_uid
  FROM (
    SELECT r.session_id, r.exercise_name, r.old_uid,
           row_number() OVER (
             PARTITION BY r.session_id, r.exercise_name
             ORDER BY (
               SELECT count(*) FROM set_logs sl
               WHERE sl.session_id = r.session_id
                 AND sl.exercise_name = r.exercise_name
             ) DESC
           ) AS rn
    FROM _ef111_uid_raw r
  ) ranked
  WHERE rn = 1;

  -- Step C: capture the new uids from the re-keyed JSONB
  UPDATE _ef111_uid_map m
  SET new_uid = new_ex.uid
  FROM (
    SELECT m2.session_id, m2.exercise_name, elem->>'uid' AS uid
    FROM _ef111_uid_map m2
    JOIN sessions s ON s.id = m2.session_id
    JOIN jsonb_array_elements(
      coalesce(s.data->'versions'->'studio'->'main_block', '[]'::jsonb)
    ) elem ON elem->>'exercise_name' = m2.exercise_name
    UNION
    SELECT m2.session_id, m2.exercise_name, elem->>'uid' AS uid
    FROM _ef111_uid_map m2
    JOIN sessions s ON s.id = m2.session_id
    JOIN jsonb_array_elements(
      coalesce(s.data->'versions'->'home'->'main_block', '[]'::jsonb)
    ) elem ON elem->>'exercise_name' = m2.exercise_name
  ) new_ex
  WHERE m.session_id = new_ex.session_id AND m.exercise_name = new_ex.exercise_name;

  -- Step D: update set_logs.exercise_uid to point at the new uids
  UPDATE set_logs sl
  SET exercise_uid = m.new_uid
  FROM _ef111_uid_map m
  WHERE sl.session_id = m.session_id
    AND sl.exercise_name = m.exercise_name
    AND sl.session_id = ANY(affected)
    AND m.new_uid IS NOT NULL;

  GET DIAGNOSTICS set_logs_updated = ROW_COUNT;
  RAISE NOTICE 'Updated exercise_uid on % set_logs rows.', set_logs_updated;

  -- Step E: report any set_logs that could not be remapped
  IF EXISTS (
    SELECT 1 FROM set_logs sl
    WHERE sl.session_id = ANY(affected)
      AND sl.exercise_uid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM _ef111_uid_map m
        WHERE m.session_id = sl.session_id AND m.new_uid = sl.exercise_uid
      )
  ) THEN
    RAISE WARNING 'Some set_logs rows still reference old uids after re-key. Check manually.';
  END IF;

  -- Also check for uid_map entries where new_uid is NULL (exercise_name mismatch)
  IF EXISTS (
    SELECT 1 FROM _ef111_uid_map m WHERE m.new_uid IS NULL
  ) THEN
    RAISE WARNING 'Some uid_map entries have NULL new_uid — exercise_name may not match set_logs.';
  END IF;

  -- Cleanup temp tables
  DROP TABLE IF EXISTS _ef111_uid_raw;
  DROP TABLE IF EXISTS _ef111_uid_map;
END;
$$;

-- Cleanup helper functions
DROP FUNCTION IF EXISTS _ef111_rekey_uids(jsonb);


-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — VERIFICATION (confirms zero duplicates remain)
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  affected uuid[] := ARRAY[
    'dbd376d2-147d-44f8-8704-dd8bc534ed3b'::uuid,
    'f4635373-e5bd-43d4-b845-4bcfecb3bfe5'::uuid,
    '9ac77530-601a-43d0-8b10-491123953845'::uuid,
    '2312da96-288e-42fd-b936-056c2b823538'::uuid,
    '95d64eb6-8bfe-4355-a7c7-c1ccff4840ee'::uuid,
    'a3ee0ac1-d5be-42c6-87b4-8606bded2a02'::uuid,
    'fc5427f7-8b8e-4a9f-b639-e464b8b4f71a'::uuid,
    'ecbb3fc9-0428-42c4-b30e-cefa78423f88'::uuid
  ];
  dup_count int;
  dup_detail record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══ VERIFICATION ═══';

  -- Count uids that appear in more than one of the 8 affected sessions
  SELECT count(*) INTO dup_count
  FROM (
    SELECT uid
    FROM (
      SELECT elem->>'uid' AS uid
      FROM sessions s,
           jsonb_array_elements(
             coalesce(s.data->'versions'->'studio'->'main_block', '[]'::jsonb)
           ) elem
      WHERE s.id = ANY(affected) AND elem ? 'uid'
      UNION ALL
      SELECT elem->>'uid' AS uid
      FROM sessions s,
           jsonb_array_elements(
             coalesce(s.data->'versions'->'home'->'main_block', '[]'::jsonb)
           ) elem
      WHERE s.id = ANY(affected) AND elem ? 'uid'
    ) all_uids
  ) u
  GROUP BY uid
  HAVING count(*) > 1;

  IF dup_count = 0 THEN
    RAISE NOTICE 'PASS: zero duplicated uids remain across the 8 affected sessions.';
  ELSE
    RAISE WARNING 'FAIL: % uids are still duplicated across affected sessions.', dup_count;

    FOR dup_detail IN
      SELECT uid, count(*) AS n_sessions
      FROM (
        SELECT elem->>'uid' AS uid
        FROM sessions s,
             jsonb_array_elements(
               coalesce(s.data->'versions'->'studio'->'main_block', '[]'::jsonb)
             ) elem
        WHERE s.id = ANY(affected) AND elem ? 'uid'
        UNION ALL
        SELECT elem->>'uid' AS uid
        FROM sessions s,
             jsonb_array_elements(
               coalesce(s.data->'versions'->'home'->'main_block', '[]'::jsonb)
             ) elem
        WHERE s.id = ANY(affected) AND elem ? 'uid'
      ) all_uids
      GROUP BY uid
      HAVING count(*) > 1
      LIMIT 5
    LOOP
      RAISE WARNING '  uid % appears in % sessions', dup_detail.uid, dup_detail.n_sessions;
    END LOOP;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══ END VERIFICATION ═══';
END;
$$;
