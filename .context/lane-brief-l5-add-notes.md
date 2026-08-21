# Lane L5 — Scope-aware add workout + session-aware notes (CR-EF-079)

WO: `wo-ef-trainer-pwa-parity-2026-08-21` (repo `.context/workorder-ef-trainer-pwa-parity-2026-08-21.md`)
Mockups (signed off): `D:\apps\design-systems\ef-control-hub\mobile\clients\hub-m-add-workout.html`,
the Notes pane inside `hub-m-client-mode.html`, and the quick-note sheet added to
`D:\apps\design-systems\ef-control-hub\mobile\training\hub-m-train.html` (read this one's own
in-file "Design notes" callout — it documents the intended behaviour precisely).

This lane runs **in parallel with L4** (day-agenda calendar, a separate worktree) — do not touch
`app/hub/m/calendar/**`, `components/hub/MobileShell.tsx`, or the Calendar pane inside
`ClientModeView.tsx`. Everything below is scoped to Workouts, Notes, and the Train Screen.

## Key facts already found — do not re-derive these

- **Domain model** (Craig, restated 2026-08-20 — read `project_block_session_workout_model` if you
  have memory access, otherwise trust this summary): a session's identity is its date+time; a
  workout is content attached to a session. This lane's "add workout" flow attaches real prescription
  content to a session (new or existing) and optionally places it on a target day — it does not
  create the session's calendar identity from scratch (that's booking, a separate already-built
  concern). The signed-off mockup's future-day assignment stands; this note is about not conflating
  "add content" with "reserve a date" as the same action in your own code.
- **Three existing endpoints cover the three add-sources — use them, don't rebuild:**
  1. **From template library** → `POST /api/blocks/[id]/sessions` (`app/api/blocks/[id]/sessions/route.ts`)
     with `{ template_id, week }`. Template list comes from `GET /api/workout-templates` (check
     `app/hub/(protected)/clients/[id]/blocks/[blockId]/AddWorkoutDialog.tsx` for the exact fetch
     shape and how it renders folders/search — port that pattern to mobile, don't invent a new one).
  2. **From this client's block** → `POST /api/sessions/[id]/clone` (`app/api/sessions/[id]/clone/route.ts`).
     Pass the id of one of the client's existing sessions (e.g. one of the `WORKOUTS` entries already
     computed in `page.tsx`/`ClientModeView.tsx` — each has real session ids behind it, check how
     `workouts: WorkoutView[]` is built in `page.tsx` and get the underlying session id per archetype
     group, may need to add an `id` field to `WorkoutView`). Clones that session's exercise content
     into a fresh session row in the same block.
  3. **Build from scratch** → same `POST /api/blocks/[id]/sessions` but **omit `template_id`** — if
     L4 has landed by the time you start, that route already accepts this (creates an empty-content
     session). If L4 hasn't landed yet in your worktree, make this same change yourself (small,
     additive, backward-compatible — see L4's brief for the exact shape, or just: when `template_id`
     is absent, skip the template lookup and insert with empty `warm_up`/`main_block`/`cooldown`
     arrays and `focus_label: null`). After creating the blank session, route straight into the
     **existing** exercise editor at `app/hub/m/train/[sessionId]/edit/EditSheet.tsx` rather than
     building a new exercise-picker UI — "build from scratch" becomes "create blank, then use the
     editor we already have."
  4. **Placing on a target day**: whichever source, after preview-confirm, `PATCH /api/sessions/[id]`
     with `scheduled_at` set to the chosen day (existing route, already fires the Outlook sync
     automatically — no new plumbing).
- `Session` type / `data` shape: check `types/index.ts` for the `Session` interface used by
  `clone/route.ts` — match it, don't guess field names.
- **Preview needs `est. duration` and `exercise count`** — these don't exist as stored fields yet
  (known parity gap). Derive them client-side from the fetched template/session content: exercise
  count = length of `warm_up + main_block + cooldown`; est. duration = a simple heuristic (e.g. sum
  of `sets × (per-set seconds guess) + rest`, or just `exercises × 4 minutes` if the real prescription
  data doesn't carry per-set timing you can rely on — document whichever heuristic you pick in a
  comment, this is explicitly an approximation until real fields exist).

## `client_notes` migration + Notes upgrade

- New migration `supabase/migrations/20260821_client_notes_session_pin.sql`:
  `ALTER TABLE client_notes ADD COLUMN session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  ADD COLUMN pinned boolean NOT NULL DEFAULT false, ADD COLUMN author text;` — additive, nullable/defaulted,
  doesn't break existing rows or the current API route's callers.
  **Do not run this migration yourself against any live DB** — that's a standing gate (schema changes
  against live data need Craig's own review path per this repo's rules); write it, commit it, and say
  clearly in your handback that it's pending execution. (Note: L3 already had to hand-run
  `20260817_client_notes.sql` against the staging DB clone directly by hand as a one-off fix for a
  pre-existing drift bug — that was a narrow correction to an already-approved migration re-applied
  to the second environment, not the same thing as running a brand-new migration unreviewed. Don't
  conflate the two.)
- `app/api/client-notes/route.ts`: extend `POST` to accept optional `session_id`; `GET` unchanged
  (still filters by `client_id`) but now returns the new columns too since `select("*")`. Add a small
  `PATCH /api/client-notes/[id]/route.ts` (new file, check `app/api/client-notes/[id]/route.ts` for
  the existing DELETE pattern to match its auth/shape) that accepts `{ pinned: boolean }` only.
- `ClientNotesPane.tsx` (`app/hub/m/clients/[id]/ClientNotesPane.tsx`, built in L3): currently has the
  pin filter and search as UI-only stubs with comments marking them as such — read those comments,
  they tell you exactly what to wire up now that the columns exist. Add: pin toggle button per note
  (calls the new PATCH), session-titled rendering when `session_id` is present (fetch/join the
  session's `focus_label` the same way `sessionName()` does elsewhere — or simpler, have the POST
  from the Train Screen send the session's name as part of the note payload if that's cheaper than a
  join; your call, but be consistent with the existing `note`/`author` display pattern already in the
  component).
- **Author**: no real multi-user concept exists yet (Esther is the only hub user). Set `author` to the
  logged-in user's name/email from the existing session (`createClient().auth.getUser()` — check how
  other API routes surface the current user's display name, e.g. Better Auth's user object) — a
  literal fallback string like `"Esther Fair"` is acceptable if the real display name isn't trivially
  available server-side, but say so explicitly in the handback if you fall back.

## Train Screen quick-note wiring

`app/hub/m/train/[sessionId]/TrainScreen.tsx` currently has **no note-capture UI at all** — the
mockup addition (`hub-m-train.html`'s "Quick note" action-bar button + bottom sheet) was only ever
built in the static mockup, never in the real app. Build it for real here: an icon button in the
action bar (next to Edit) opens a bottom sheet, single textarea + Save, POSTs to `/api/client-notes`
with `client_id` (available from the page's existing client-loading logic — check how `TrainScreen`
or its parent page already knows the client), `session_id` (this session's id, from the route param),
and `note`. On success, close the sheet and toast — don't navigate away, the trainer is mid-session.

## Constraints

- Reuse `SessionStatusPill`/`deriveSessionStatus`/`focus_label` fallback chain where relevant — same
  standing rule as every other lane in this WO.
- No changes to `app/hub/m/calendar/**`, `MobileShell.tsx`, the Calendar pane, or `TrainScreen.tsx`'s
  logging internals (offline queue, rest timers, PB flagging, band-unit lock) — additive only.
- `tsc --noEmit` clean.
- Do not run the new migration against any database. Write it, commit it, stop.

**Budget guardrail:** the three add-source endpoints, the migration shape, and the exact stub
comments to replace are all given above. Start writing code within your first ~10 tool calls.

## VERIFY

- `npx tsc --noEmit` clean.
- On the dev server: add a workout from each of the 3 sources for a real client, confirm the preview
  step shows plausible duration/exercise-count, confirm "Add to {day}" actually creates/updates a
  session with the right `scheduled_at` and content.
- Notes: since the migration isn't run, the pin/session-title UI paths will error against the real DB
  until Craig applies it — verify this degrades honestly (e.g. the existing `try/catch` → stub
  behaviour, not a crash) rather than claiming it works end-to-end. Say this explicitly in the
  handback.

## Handback

State plainly: which of the 3 add-sources you got fully working vs. partially, whether "build from
scratch" successfully routes into the existing `EditSheet.tsx`, and that the notes upgrade is
code-complete but DB-migration-pending (not yet functionally verifiable).
