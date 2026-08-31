-- CR-EF-121: Normalise superset set counts
--
-- Problem: exercises within a superset can have inconsistent set counts (e.g.
-- Arnold Press at 3 sets, Seated Chest Opener at 1 set) — migrated verbatim
-- from Trainerize. The round count is derived as max(sets) across the group, so
-- lower-set exercises silently vanish from later rounds.
--
-- Fix: bump every exercise within a superset to the group's round count (max sets).
-- Emit a change report as JSONB so Craig can review exactly what changed.
--
-- Scope: sessions.data JSONB (both studio and home versions) + workout_templates.data.
-- This migration is transactional — if anything fails, nothing is committed.

-- ── 1. Normalise one JSONB array of exercises ──────────────────────────────
-- Returns the normalised array. Caller must extract the report from the GUC
-- after calling this for each array.
CREATE OR REPLACE FUNCTION _cr121_normalise_one(arr JSONB)
RETURNS JSONB AS $$
DECLARE
  i INT := 0;
  j INT;
  n INT;
  grp_label TEXT;
  grp_start INT;
  max_s INT;
  item JSONB;
BEGIN
  n := jsonb_array_length(arr);
  IF n < 2 THEN RETURN arr; END IF;

  WHILE i < n LOOP
    item := arr->i;
    grp_label := item->>'group_label';

    IF grp_label IS NULL OR grp_label = '' THEN
      i := i + 1;
      CONTINUE;
    END IF;

    grp_start := i;
    max_s := GREATEST(COALESCE((item->>'sets')::INT, 1), 1);

    WHILE i < n LOOP
      item := arr->i;
      IF (item->>'group_label') IS NULL OR (item->>'group_label') = ''
         OR (item->>'group_label') <> grp_label THEN
        EXIT;
      END IF;
      max_s := GREATEST(max_s, GREATEST(COALESCE((item->>'sets')::INT, 1), 1));
      i := i + 1;
    END LOOP;

    IF i - grp_start > 1 THEN
      FOR j IN grp_start..i-1 LOOP
        item := arr->j;
        IF GREATEST(COALESCE((item->>'sets')::INT, 1), 1) < max_s THEN
          arr := jsonb_set(arr, ARRAY[j::TEXT, 'sets'], to_jsonb(max_s));
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN arr;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── 2. Build the change report ────────────────────────────────────────────
-- For a given array (before normalisation), extract which exercises changed.
CREATE OR REPLACE FUNCTION _cr121_build_report(
  arr JSONB,
  p_client TEXT, p_block INT, p_session INT, p_version TEXT, p_section TEXT,
  p_template_name TEXT DEFAULT NULL, p_template_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  report JSONB := '[]'::JSONB;
  i INT := 0;
  j INT;
  n INT;
  grp_label TEXT;
  grp_start INT;
  max_s INT;
  item JSONB;
  item_sets INT;
  item_name TEXT;
  sep_label TEXT;
  sep_rounds INT;
  section_label TEXT;
BEGIN
  n := jsonb_array_length(arr);
  IF n < 2 THEN RETURN '[]'::JSONB; END IF;

  WHILE i < n LOOP
    item := arr->i;
    grp_label := item->>'group_label';

    IF grp_label IS NULL OR grp_label = '' THEN
      i := i + 1;
      CONTINUE;
    END IF;

    grp_start := i;
    max_s := GREATEST(COALESCE((item->>'sets')::INT, 1), 1);

    WHILE i < n LOOP
      item := arr->i;
      IF (item->>'group_label') IS NULL OR (item->>'group_label') = ''
         OR (item->>'group_label') <> grp_label THEN
        EXIT;
      END IF;
      max_s := GREATEST(max_s, GREATEST(COALESCE((item->>'sets')::INT, 1), 1));
      i := i + 1;
    END LOOP;

    IF i - grp_start > 1 THEN
      sep_label := grp_label;
      sep_rounds := max_s;

      FOR j IN grp_start..i-1 LOOP
        item := arr->j;
        item_sets := GREATEST(COALESCE((item->>'sets')::INT, 1), 1);
        item_name := item->>'exercise_name';

        IF item_sets < max_s THEN
          section_label := CASE p_section
            WHEN 'warm_up' THEN 'Warm-up'
            WHEN 'main_block' THEN 'Main Block'
            WHEN 'cooldown' THEN 'Cooldown'
            ELSE p_section
          END;

          report := report || jsonb_build_object(
            'client_name', p_client,
            'block', p_block,
            'session', p_session,
            'version', p_version,
            'section', section_label,
            'superset', sep_label,
            'round_count', sep_rounds,
            'exercise', item_name,
            'old_sets', item_sets,
            'new_sets', max_s,
            'template_name', p_template_name,
            'template_id', p_template_id
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN report;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── 3. Run normalisation + collect report ──────────────────────────────────
DO $$
DECLARE
  r RECORD;
  section TEXT;
  ver_key TEXT;
  ver JSONB;
  arr JSONB;
  report JSONB := '[]'::JSONB;
  entry JSONB;
  client_name TEXT;
  path_arr TEXT[];
BEGIN
  -- ── Sessions ──────────────────────────────────────────────────────────
  FOR r IN
    SELECT s.id AS sid, s.session_number, s.data,
           c.first_name || ' ' || c.last_name AS client_name,
           b.block_number
    FROM sessions s
    JOIN blocks b ON b.id = s.block_id
    JOIN clients c ON c.id = b.client_id
    WHERE s.data ? 'versions'
  LOOP
    FOR ver_key IN SELECT jsonb_object_keys(r.data->'versions')
    LOOP
      ver := r.data->'versions'->ver_key;
      IF ver IS NULL OR jsonb_typeof(ver) != 'object' THEN CONTINUE; END IF;

      FOR section IN SELECT unnest(ARRAY['warm_up', 'main_block', 'cooldown'])
      LOOP
        arr := ver->section;
        IF arr IS NULL OR jsonb_typeof(arr) != 'array' THEN CONTINUE; END IF;
        IF jsonb_array_length(arr) < 2 THEN CONTINUE; END IF;

        -- Collect report from original array
        entry := _cr121_build_report(arr, r.client_name, r.block_number, r.session_number, ver_key, section);
        IF jsonb_array_length(entry) > 0 THEN
          report := report || entry;
        END IF;

        -- Normalise and apply
        arr := _cr121_normalise_one(arr);
        path_arr := ARRAY['versions', ver_key, section];
        r.data := jsonb_set(r.data, path_arr, arr);
      END LOOP;
    END LOOP;

    UPDATE sessions SET data = r.data WHERE id = r.sid;
  END LOOP;

  -- ── Workout templates ─────────────────────────────────────────────────
  FOR r IN
    SELECT id AS tid, data, name AS tname FROM workout_templates WHERE data IS NOT NULL
  LOOP
    FOR section IN SELECT unnest(ARRAY['warm_up', 'main_block', 'cooldown'])
    LOOP
      arr := r.data->section;
      IF arr IS NULL OR jsonb_typeof(arr) != 'array' THEN CONTINUE; END IF;
      IF jsonb_array_length(arr) < 2 THEN CONTINUE; END IF;

      entry := _cr121_build_report(arr, NULL, NULL, NULL, NULL, section, r.tname, r.tid);
      IF jsonb_array_length(entry) > 0 THEN
        report := report || entry;
      END IF;

      arr := _cr121_normalise_one(arr);
      r.data := jsonb_set(r.data, ARRAY[section], arr);
    END LOOP;

    UPDATE workout_templates SET data = r.data WHERE id = r.tid;
  END LOOP;

  -- Store report for extraction by the calling script
  PERFORM set_config('cr121.change_report', report::TEXT, true);

  RAISE NOTICE 'CR-EF-121: % change entries recorded.', jsonb_array_length(report);
END;
$$;

-- ── 4. Cleanup helper functions ────────────────────────────────────────────
DROP FUNCTION IF EXISTS _cr121_normalise_one(JSONB);
DROP FUNCTION IF EXISTS _cr121_build_report(JSONB, TEXT, INT, INT, TEXT, TEXT, TEXT, UUID);
