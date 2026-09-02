# BUG-EF-112 — Emma Atkinson block 1: findings + proposed SQL (NOT executed)

Generated 2026-09-02 from prod (`eternal_fitness`), read-only. Client `a1111111-1111-1111-1111-111111111007`, block 1 `a2ece082-2b2b-4786-821b-fc28b9784210` (status `complete`, note "Upper body focus — post foot surgery (29 Jul 2026), 2x/week").

## (a) Current state — prod

| session | sess# | scheduled_at | started_at | completed_at | status | parent_session_id | set_logs |
|---|---|---|---|---|---|---|---|
| 360f8721 | 1 | 2026-08-03 09:00Z | 2026-08-03 11:43:31.179Z | 2026-08-03 12:53:10Z | completed | NULL | 21 |
| fd8dd288 | 3 | NULL | 2026-08-03 11:43:31.179Z (identical to 360f8721) | 2026-08-10 12:41:07Z | completed | **NULL** | 22 |

- `parent_session_id` on fd8dd288 is **already NULL on prod and on staging** (13 other prod sessions do have parents, so the column is in use — just not on this row). The brief's "now has parent_session_id = 360f8721, set today" does not match prod at 2026-09-02 ~17:00 UTC — either it was reverted, or the new `trg_sessions_block_reparent_completed` trigger (present on prod) rejected it, which is exactly the transition it blocks. No restore of that field is needed unless it re-appears.
- Both rows' `data.session_number` is `"1"` and both carry the same `focus_label` ("Workout A — Upper Body Push/Pull + Glutes (Week 1)") and the same `session_log.notes` ("First session post op - weight bearing. Feeling good"). fd8dd288 is a clone of 360f8721.
- The named archive `db-archives\eternal_fitness\2026-09-02-pre-emma-tidy.dump` **does not exist** (nothing named *emma* under `db-archives\`; `pg_restore` is not installed either). The only prior-state captures are the two 2026-09-01 JSON archives, which hold `{id, data}` only — no `parent_session_id`/`scheduled_at` columns.

### set_logs on fd8dd288 — the real problem
- 17 of 22 rows are millisecond-exact copies of 360f8721's 3 Aug logs (same `logged_at`, reps, weights), all `created_at 2026-08-10 15:50:49.437Z` in one batch (`set_log_revisions` shows 21 INSERTs at that instant).
- Only 5 rows were genuinely logged on 10 Aug (12:35:35–12:35:54Z): Dead Bug set 1 (completed), Mini Band Glute Bridge sets 1–2 and Booty Band Clamshells sets 1–2 (all `completed = false`).
- The uids differ between the two sessions (no shared uid; every fd8dd288 log references a uid that lives only in fd8dd288's JSON) — so this is **not** the BUG-EF-111 shared-uid pattern; it is a duplicated-log batch, same shape as the 2026-08-19 Emma block-2 incident (`.context\backups\emma-duplicate-logs-2026-08-19.json`).
- Human decision needed: are the 17 copied rows to be deleted (client-entered data → standing gate, DO-SOP-012 does not cover it)? Not proposed here.

## (b) Booked date/time for fd8dd288 — NOT derivable
- Trainerize: Emma's last Trainerize block ("2026 - Block 4") ended 2026-07-28; last `trainerize_workout_results` row is 2026-07-27. Nothing for 10 Aug. `clients.trainerize_client_id` is NULL.
- Outlook: no `outlook_booking_events` row for Emma before 2026-08-28; no `session_calendar_events` row for fd8dd288.
- Only circumstantial evidence: first genuine log 12:35:35Z (13:35 BST), `completed_at` 12:41Z; her block-2 slots were 11:30Z. That is not a booking record — **do not set `scheduled_at` from it**. Leave NULL until Esther confirms the slot.

## (c) Proposed SQL — DO-SOP-012 shape (count → dump → transaction → verify). NOT executed.

Scope: 1 row in `sessions`. `parent_session_id` is already NULL (statement kept as a guard, expected 0 change). Renumber 3 → 2 (no unique constraint on `(block_id, session_number)`; CHECK 1..18 satisfied). `data.session_number` corrected to match the column, since the JSON currently says `1` for both sessions.

```
-- 1. COUNT (expect 2 rows: session_numbers {1,3}; exactly 1 row = fd8dd288 with session_number 3)
SELECT id, session_number, scheduled_at, parent_session_id
FROM sessions WHERE block_id = 'a2ece082-2b2b-4786-821b-fc28b9784210' ORDER BY session_number;

-- 2. DUMP (pg_dump not on PATH locally — run on db-vps or via the tunnel host with pg tools):
pg_dump "$DATABASE_URL" --format=custom --table=sessions --table=set_logs --table=set_log_revisions \
  --file="D:\apps\infrastructure\db-archives\eternal_fitness\2026-09-02-sessions-setlogs-bug-ef-112-emma-block1.dump"
-- fallback without pg tools (node, same shape as the 2026-09-01 archives):
--   SELECT row_to_json(s) FROM sessions s WHERE block_id='a2ece082-...' ; SELECT row_to_json(l) FROM set_logs l WHERE session_id IN (the two ids)
--   → 2026-09-02-emma-block1-sessions-setlogs-bug-ef-112.json ; verify 2 session rows + 43 set_log rows.

-- 3. TRANSACTION
BEGIN;
UPDATE sessions
SET parent_session_id = NULL,
    session_number = 2,
    data = jsonb_set(data, '{session_number}', to_jsonb(2))
WHERE id = 'fd8dd288-8dd0-4df2-9f46-50c3b210ffa0'
  AND block_id = 'a2ece082-2b2b-4786-821b-fc28b9784210'
  AND session_number = 3;
-- expect UPDATE 1, else ROLLBACK
-- scheduled_at deliberately untouched (not derivable; see (b)). If Esther confirms the slot, add:
--   , scheduled_at = '<confirmed timestamptz>'
COMMIT;

-- 4. VERIFY (expect {1,2}, fd8dd288 parent NULL, data.session_number = 2, set_log counts unchanged 21 / 22)
SELECT s.id, s.session_number, s.data->>'session_number' json_sn, s.scheduled_at, s.parent_session_id,
       (SELECT count(*) FROM set_logs sl WHERE sl.session_id = s.id) set_logs
FROM sessions s WHERE s.block_id = 'a2ece082-2b2b-4786-821b-fc28b9784210' ORDER BY s.session_number;
-- app check: /hub client Emma → block 1 shows sessions 1 and 2 in date order, no supplementary badge.

-- 5. ATTEST: wo attest gate:eternal_fitness:bug-ef-112-emma-block1 --note "sessions 1 row updated 3→2, dump <path>, counts 21/22 unchanged"
```

Staging: `eternal_fitness_staging` was refreshed from prod today (pre-refresh dump 14:23) and holds the same two rows with the same ids and the same state (1 / 3, parent NULL, 21 / 22 set_logs) — the identical statements apply there.
