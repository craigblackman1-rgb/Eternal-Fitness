# OpenCode lane brief — Session editor drag/log-type fixes + standalone live logging screen
2026-08-01 · one lane, one worktree, sequential units

**Read this whole file before touching anything.**

## Why this exists — important context, read first

Two prior Work Orders in this repo (`.context/workorder-session-logging-2026-07-25.md` and
`.context/workorder-hub-design-alignment-session-editor-2026-07-26.md`) both claim, with `[x]`
checkmarks, that cross-section drag-and-drop and superset atomic-drag were fully built and deployed
in the session editor (commit `d105e29`). **This is not true of the code as it exists right now.**
Verified directly today by grep of the live file:
`app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/SessionEditor.tsx` —
the drop handler is gated `dragBlockKey && dragSection === sec.key`, i.e. drag only works **within**
a section. There is also no `logType`/`log_type` field anywhere in that file or in `types.ts`.

Both prior WOs explicitly flagged themselves as never click-tested live. Trust the code, not the
checkmarks. Do not assume anything described in those two files as "done" actually works — if your
work touches something they claim is finished and you find it isn't, that's expected, not a bug you
introduced.

## Scope — three units, do them in order

### Unit 1 — Explicit per-exercise log type (`reps` | `time`)
Currently `isTimeBasedReps()` (in the session detail page) guesses reps-vs-time from a regex on the
free-text `reps` string. Replace the guess with an explicit field the trainer sets.

- Add `log_type?: 'reps' | 'time'` to the `Exercise` type in `types/index.ts` (optional — old data
  has no value, default to the existing regex guess as a fallback so nothing breaks for
  already-authored sessions).
- In `SessionEditor.tsx` edit mode, add a small segmented toggle per exercise row (Reps & weight /
  Time) that sets `log_type` on the exercise object — see `hub-session-editor.html`
  (`D:\apps\design-systems\ef-control-hub\hub-session-editor.html`, search `log-toggle` /
  `logTypeHtml` in its embedded script) for the exact interaction and visual treatment. In read-only
  (non-edit) mode, render the small badge (`log-badge`) instead of the toggle — same file, same
  function.
- In the read-only session page, `isTimeBasedReps()` should check `exercise.log_type === 'time'`
  first and only fall back to the regex when `log_type` is unset.
- No DB migration — `log_type` is just a new key inside the `sessions.data` JSONB, same as every
  other `Exercise` field.

### Unit 2 — Cross-section drag
Extend the existing drag-and-drop so dropping an exercise (or a whole superset block) into a
**different** section's list re-sections it — same end result as the existing "⋯ → Move to…" dropdown
action, just reachable by drag too. The dropdown action must keep working exactly as it does today —
this is additive.

- The block is `dragSection === sec.key` in the `onDrop` handlers (two occurrences, main list and
  superset group list — see the grep output above, lines ~371-380 and ~436-445 of
  `SessionEditor.tsx`). Remove that restriction; when a drop lands on a different section, run the
  same section-reassignment logic the "Move to…" menu action already uses, then insert at the
  dropped position (reuse `reorderSection`'s position logic where you can rather than duplicating
  it).
- A superset dragged this way moves as one atomic unit into the new section — but supersets are
  `main_block`-only (`allowGroups = sectionKey === "main_block"` in the current code), so dragging a
  group OUT of main_block must resolve the group first (same `group_label` clearing + toast behaviour
  the existing "Move to…" path already has for a single member — check `normalizeGroupsList` /
  wherever that toast already fires and reuse it, don't reinvent).
- Visual drop-target treatment: `.sec-list.drop-ok` / dashed outline in the mockup — match it.
- VERIFY: drag an exercise from warm-up into main_block and back; drag a 2-exercise superset from
  main_block into cooldown and confirm it resolves (both members become standalone, toast shown);
  confirm the existing "⋯ → Move to…" dropdown still works unchanged; `tsc --noEmit` clean.

### Unit 3 — Calendar → session deep link + standalone live logging screen
Currently `ScheduleCalendar.tsx` links every entry to the **client page**
(`/hub/clients/[clientNumber]`), not the session — there is no way to open a session for logging
directly from the calendar today. Fix that, then build the new logging screen it should point to.

- **3a. Calendar link.** In `ScheduleCalendar.tsx`
  (`app/hub/(protected)/schedule/ScheduleCalendar.tsx`), change each entry's link from the client
  page to the new logging route (3b). Keep whatever data the calendar already fetches — you need the
  session's real id, not just client/session-number, so check what the calendar's query currently
  selects from `sessions` and add `id` if it isn't already selected.
- **3b. New route** — a live logging screen, reachable by real session id, e.g.
  `app/hub/(protected)/log/[sessionId]/page.tsx` (pick whatever path fits this app's existing routing
  conventions — check how the block/session routes are structured first, e.g. does this repo use
  `(protected)` route groups consistently — match that). This is a **new page**, not a mode of the
  session editor — no sidebar, no desktop chrome, mobile/tablet-first. Reference implementation:
  `D:\apps\design-systems\ef-control-hub\hub-session-log.html` — read the whole file, including its
  embedded script, it's a complete interactive prototype of every state (pending/done/skipped sets,
  section collapse, per-exercise notes, RPE/fatigue/notes, the "mark complete" confirm overlay,
  progress bar). Match its structure and behaviour, wired to real data instead of the mock `DATA`
  object in its script.
- **Data**: this screen reads the session's prescription (`sessions.data`, same shape the editor
  already reads) read-only — no add/remove/reorder here, this is a logging surface, not an editor.
  Each exercise's sets read from and write to the existing `set_logs` table via the existing
  `/api/sessions/[id]/set-logs` route (GET/POST/PATCH) — this table and route already exist and
  already have separate `reps`, `duration_seconds`, `weight_kg`, `completed` columns, built in the
  2026-07-25 Work Order. Read `exercise_ref`'s convention before writing
  (`<version>:<section>:<index>:<exercise_name>` — documented in
  `supabase/migrations/20260725_session_set_logs.sql`) and reuse it; do not invent a different key
  shape.
- **Log type drives the fields**: use the exercise's `log_type` from Unit 1 (fallback to the regex
  guess if unset) to decide whether a set's inputs are reps+weight or a single duration field —
  exactly like the mockup's `setRowHtml()`.
- **Session-level summary** (RPE, fatigue, notes, "mark complete"): this already exists as a card on
  the session detail page (`page.tsx`, the `Session Log` card, `saveLog`/`session_log` in
  `sessions.data`) — reuse that exact save path from the new screen, don't build a second one.
  "Mark complete" stamps `completed_at`, same as today.
- **No new dependencies.** Native drag/touch and plain React state are enough, same as the existing
  editor.
- VERIFY: opening a session from the calendar lands on this new screen (not the client page); logging
  a set writes to `set_logs` and is visible if you reopen the session editor's existing inline
  per-set logger (they must read the same table, values should match); marking complete stamps
  `session_log.completed_at` and is visible in the existing session detail page's status; `tsc
  --noEmit` clean.

## Hard rules (standing, this repo)

1. Work only in this worktree (`D:\apps\eternal-fitness-website-worktrees\session-log-live`,
   branch `feat/session-editor-live-logging`). Never the shared checkout.
2. Never run a dev server, `next build`, Playwright, or any browser. Verification is `npx tsc
   --noEmit` and reading your own diff. Live/visual checking is Claude's job after you hand back.
3. Never `npm install` / `pnpm install`. `node_modules` is already junctioned in from the shared
   checkout — if something looks missing, that's a blocker to report, not a task.
4. No new hex colours — every colour comes from `app/globals.css` (`.hub-shell` tokens) or the
   existing component library (`components/hub/**`). The mockups' `:root` custom properties are
   reference-only, they exist so the mockup previews standalone — map them to the real app tokens,
   don't copy the hex values in.
5. Reuse existing components (`HubCard`, `HubCardHeader`, icon-button patterns, etc.) rather than
   inventing new ones, except where the new logging screen genuinely needs its own chrome (it does —
   that's the point, see 3b).
6. No DB migration in this lane. If you find a genuine need for one, stop and report it as a blocker
   — do not write or run one.
7. **Do not push to `main`, do not merge.** Commit to the lane branch only, one commit per unit,
   message format `feat(session-editor): <unit summary>`. Claude reviews and merges.
8. If a unit turns out to need something outside this brief's scope (schema change, new dependency,
   touching client-portal/public-site code), stop that unit and report it as a blocker — do not
   improvise.

## Verification checklist (every unit, before considering it done)

```bash
npx tsc --noEmit
git diff -U0 | grep '^+' | grep -E '#[0-9a-fA-F]{3,8}\b'   # no raw hex introduced
grep -ohE 'var\(--[a-z0-9-]+' <files-you-changed> | sort -u | \
  while read -r v; do n="${v#var(}"; \
    grep -q -- "$n:" app/globals.css || echo "UNDEFINED: $n"; done
```

## Report format

Append to `.context/loop-status.md` in this repo, and print the same block at the end of the run:

```
LANE: session-editor-live-logging · BRANCH: feat/session-editor-live-logging
UNITS DONE: <unit> (<commit sha>), ...
BLOCKERS: <unit> — <what stopped you and what you'd need>
TYPECHECK: clean | <error count>
```
