# Scope of Work — Trainerize Historical Data Import

**Date:** 2026-08-02
**Requested by:** Craig
**Status:** Draft for review — not yet a Work Order

## The ask

Pull three things out of Trainerize for each client and get them into their hub profile:

1. **Historical training blocks/programs** — e.g. Amanda's `trainingPhase/38056627` under `trainingProgram/custom`
2. **Profile notes** — the free-text notes on the client's "View profile" screen
3. **Workout completion/history data** — what was actually logged against each session, so we can derive PBs and a real progression trail

This is a genuinely different ask from the exercise-library scrape already done — that pulled a shared catalogue (36 exercises, same for every client); this pulls **per-client historical data**, at whatever roster size Esther has in Trainerize.

## What already exists (reusable)

- `scripts/scrape-trainerize-exercises.mjs` — a working Playwright login + scrape pattern against `eternalfitness8.trainerize.com`. Credentials via env vars, resumable JSON export, DOM-click extraction from lazy-loaded/dialog UI. This is the technical template to extend, not rebuild.
- `blocks` / `sessions` / `set_logs` tables already model *live, app-driven* training blocks and per-set logging (`supabase/migrations/20260509_training_app.sql`, `20260725_session_set_logs.sql`).
- `exercises` table already has a `source` enum (`original` / `trainerize` / `custom`) and `trainerize_id` — the precedent for tagging imported data by origin already exists.

## What's genuinely new here

- No client/session/notes scraper exists. `.context/lane-a2-trainerize-export-plan.md` looked at this exact problem for basic client roster data and **Craig explicitly chose manual entry** at the time — nothing was ever built. This request is broader (full training history + logs, not just roster fields) and pushes back toward automation because manual re-typing of years of session history per client isn't realistic.
- No PB / personal-record table. PBs would need to be **derived**, not scraped directly — Trainerize doesn't have a "PB" page, it has logged sets; a PB is `max(weight)` / `max(reps)` / estimated 1RM per exercise per client, computed from the log history.
- No dedicated notes table — current schema keeps client narrative inside `clients.profile` JSONB, which is fine for hand-entered profile fields but wasn't designed to hold a chronological Trainerize notes feed.

## Phase 0 discovery — completed 2026-08-02

Ran a read-only recon against Amanda's account (`scripts/discover-trainerize-client-data.mjs` then `scripts/discover-trainerize-api.mjs`, both in this worktree). **This changes the technical approach significantly — for the better.**

**Trainerize's own frontend runs on an internal JSON API** (`https://api.trainerize.com/v03/*`), not server-rendered HTML. The Playwright login gets a session that can call this API directly — no DOM scraping/clicking needed at all for this data. Confirmed endpoints, called while browsing Amanda's dash/training-phase/profile/progress pages:

| Endpoint | What it returns |
|---|---|
| `program/getUserProgramTrainingPlanList` | **The full historical training-block list** — every block back to account creation (Amanda: March 2025 → present), each with id, name, start/end date, duration, plan type (`regular`/`timeOff`), and the free-text instructions/scaling notes Esther wrote for that block. This *is* the "historical training blocks" ask, directly. |
| `accomplishment/getList` | **PBs, already computed by Trainerize** — type `brokenRecords`, with exercise name, `recordType` (e.g. `strength`), `brokenRecordType` (`fiveRepMax`/`tenRepMax`/etc.), the value, the delta from the previous record, and date. This is a major scope reduction: **we don't need to derive PBs from raw set logs — Trainerize already tracks them per rep-range and exposes them directly.** |
| `Timeline/getList` | Workout completion activity feed — date, workout name, `status` (`completed`), RPE, count of PBs broken that session, linked `dailyWorkout.id`. This is the workout-completion-history piece. |
| `user/getClientSummary` | Aggregate stats (workoutsTotal, lastWeight/lastWeightDate, current `trainingPlan`, `goal`, etc.) — useful for a summary card, not the detail feed. |
| `user/getProfile` | Core client record (name, DOB, contact, trainer, tags, `attention` flag) — **no free-text notes field found here.** The "View profile" notes panel Craig referenced is a separate feature we haven't located the endpoint for yet (see gap below). |
| `calendar/getList` | Returned empty on page load — likely needs explicit date-range params to pull historical scheduled/completed sessions; not yet resolved. |

**No native export/download/CSV control was found** on any of the dash/training-phase/profile/progress pages (checked programmatically — zero matches). API replay is the way in, not a UI export button.

**What this means for effort:** this is meaningfully *cheaper* than the original DOM-scraping plan. Calling 3-4 JSON endpoints per client with a valid session and walking date ranges is far more robust than parsing rendered HTML, and PBs arrive pre-computed rather than needing to be derived from raw logs — the `personal_records` table becomes a straight import, not a computation pipeline.

**Remaining gaps from Phase 0** (small, targeted follow-ups, not blockers to scoping):
- **Per-block exercise/set detail** — `getUserProgramTrainingPlanList` gives the block list but not yet confirmed which endpoint returns the actual prescribed exercises/sets/reps *within* a block (needed to reconstruct full historical programs, not just block metadata). Very likely another `program/*` or `dailyWorkout/*` call, fireable by opening a block in the UI — one more short recon pass.
- **Actual notes endpoint** — the specific "View profile" notes panel from Craig's second link wasn't triggered by the URL guessed (`/profile` loaded core profile data, not a notes feed). Needs one more recon pass that actually clicks through the "View profile" link path Craig described, rather than guessing the URL.
- **`calendar/getList` params** — needs the right date-range query args to pull full history rather than an empty "on load" window.

These three are a half-day of targeted recon, not a redesign — worth doing before Phase 2 build starts so the scraper is built against confirmed endpoints, not guesses.

**Housekeeping note:** the recon scripts wrote raw output (including Amanda's real name/email/workout data) to `.context/` in the *shared main checkout* rather than this worktree, because of how the shell's working directory resolved — caught and deleted immediately, nothing was committed. Any follow-up recon should run with the worktree as cwd, and raw client-data captures should stay out of git entirely (add a `.context/trainerize-discovery-*` gitignore pattern before doing a full-roster pass).

### 1. Discovery pass (1 client, read-only, before committing to scope) — see completed findings above

Log into Trainerize as trainer, open Amanda's profile end-to-end, and confirm three things live, not from assumption:

- Does the tenant plan expose a **native export** (CSV/PDF) for training history or workout logs anywhere in the UI? If yes, that's cheaper and lower-risk than scraping and should be preferred wherever it covers the need.
- What's the actual DOM/API shape of the training-phase view, the profile-notes panel, and the workout-log/history view (network tab — Trainerize's frontend may call a JSON API even if there's no public partner API; if so, scraping can hit that JSON endpoint directly instead of parsing rendered DOM, which is far more robust).
- Roughly how much data per client (how many historical blocks, how many logged sessions) — this drives whether this is an afternoon job or a multi-day one across the full roster.

This should happen before writing a Work Order — it determines whether Phase 2 below is "extend the scraper" or "click one export button per client."

### 2. Extend/adapt the scraper

Three sub-scrapers, likely three separate scripts sharing the login helper from `scrape-trainerize-exercises.mjs`:

- **Training blocks/programs** — walk each client's `trainingProgram` history, extract block structure (name, dates, phases, exercises prescribed, sets/reps/weight targets).
- **Profile notes** — extract the notes feed with timestamps and author if shown.
- **Workout completion/history** — the highest-value and highest-effort piece: per-session actuals (date, exercise, sets, reps, weight, completed/skipped). This is what PBs get computed from.

Output: resumable per-client JSON, same pattern as the exercise scraper, written to `.context/` (never committed with identifiable client health/training data in a public-facing way — confirm repo visibility before this lands anywhere long-lived).

### 3. Data model — new tables, not overloading `blocks`/`sessions`

Recommend a **separate, clearly-labelled historical archive** rather than writing imported data into the live `blocks`/`sessions`/`set_logs` tables:

- Live `blocks` has app-driven status semantics (`draft`/`approved`/`active`/`complete`) and expects Esther-authored `session.data` JSONB shaped a specific way. Forcing years of Trainerize history through that pipe risks corrupting status logic or the auto-rebuild flow the app relies on.
- Proposed new tables (names indicative): `trainerize_training_blocks`, `trainerize_sessions`, `trainerize_set_logs`, `trainerize_client_notes` — same client_id FK, `source = 'trainerize'`, raw imported shape preserved, explicitly read-only/reference data.
- A derived `personal_records` table (client_id, exercise, metric, value, achieved_at, source) computed from **both** `trainerize_set_logs` and live `set_logs` once this lands — so PBs stay accurate going forward, not just at import time.

### 4. UI/design changes to consider

- New **"Training History"** tab (or a section within the existing Training tab) on the client detail page — chronological list of imported blocks, distinct visual treatment from live blocks so Esther/clients don't mistake historical Trainerize data for an active plan.
- **PB panel/badges** — likely a HubDataGrid or card grid keyed by exercise, showing current PB + date achieved + trend arrow if a PB was broken recently. This is genuinely new client-facing value (Trainerize doesn't surface this cleanly) and worth mocking against the design system before building — flag to design-parity-check against `hub-*.html` mockups once one exists, since no mockup currently covers this.
- **Notes timeline** — a simple reverse-chronological list, reusing whatever timeline/activity-feed pattern already exists in the hub (check `components/hub/` for a precedent before inventing a new one).
- Portal-side: decide whether historical PBs/notes surface to the **client portal** too (motivating for clients to see PB progress) or stay hub-only (notes especially — some Trainerize notes may be Esther's private clinical shorthand, not client-appropriate). This is a judgement call for Esther, not a technical one — flag as a question, don't default silently.

## Open questions to resolve before this becomes a Work Order

1. ~~Native export vs. scrape~~ — **resolved by Phase 0**: no native export exists; direct internal-API replay via an authenticated Playwright session is the approach.
2. **Roster scope** — all historical/active clients, or just currently active ones? Changes effort linearly.
3. **Notes visibility** — hub-only or also portal-visible to the client? (Privacy/clinical-content question for Esther.)
4. **One-time backfill vs. ongoing sync** — is this a single migration, or does Esther keep using Trainerize in parallel for some clients, requiring this to run repeatedly? If Trainerize is being fully retired, this is one-shot; if not, re-running the scraper needs to be idempotent (upsert on a stable Trainerize ID, not append-only).
5. ~~PB definition~~ — **resolved by Phase 0**: Trainerize already computes and exposes per-rep-range PBs (`fiveRepMax`, `tenRepMax`, etc.) via `accomplishment/getList`. Import Trainerize's own definition rather than re-deriving one — keeps parity with what Esther and clients already saw in-app.
6. **Trainerize ToS** — scraping an account you (Esther) own and pay for, for your own client data, is materially different from scraping a third party; still worth a one-line sanity check that this doesn't violate Trainerize's terms before running it at roster scale rather than one client.

## Addendum (2026-08-02) — live PB flagging + workout templates

Two more asks, both closer to home than the Trainerize import — they build on existing hub/portal code rather than external scraping.

### 5. Live PB flagging during a session

**Confirmed existing building blocks:**
- `lib/exercise-history.ts` already has `buildExerciseHistory(logs: SetLog[])`, returning `personalBests[]` (best weight per rep-count, or max duration for time-based sets) and `lastPerformed`. It's already consumed on two read-only pages (`app/hub/(protected)/clients/[id]/page.tsx` staff view, `app/portal/(protected)/exercise-history/page.tsx` client view) — **but it's not wired into the live logging flow at all today.**
- Live logging happens in `app/hub/log/[sessionId]/LiveSessionLog.tsx` (Esther, hub) and `TrainingClient` under `app/portal/(protected)/training/page.tsx` (client self-logging, home-training only). Both write completed sets via their respective `set-logs` API routes.

**Proposed approach:** on `handleSetDone` (the point a set gets marked complete with a weight/reps or duration value), run that set's value through the same `buildExerciseHistory` bests already computed for that client+exercise. If it beats the existing best for that rep-count (or duration bucket), show an inline "New PB" badge on that set row immediately, no page reload — this is a pure client-side comparison against data already being fetched, not a new backend concept. A small non-blocking toast plus a running "PBs this session: N" counter in the session header adds the celebratory element for both Esther's view and the client portal.

**Persistence:** rather than only computing on the fly, upsert into the `personal_records` table proposed above for the Trainerize import (§3) whenever a live set beats a record — this makes `personal_records` the single source of truth for both historically-imported PBs and ones set going forward, and enables a future "recent PBs across all clients" feed without re-scanning `set_logs` every time.

**Design note:** `reps` is free-text and sets can be `log_type: 'reps' | 'time'` — the PB check needs both paths (weight-at-rep-count vs. best/fastest duration), matching what `exercise-history.ts` already does for the historical view, so no new PB *definition* is needed, only wiring the existing one into a live UI moment.

### 6. Workout templates (reusable session structures)

**Confirmed: no existing concept.** Grepped the whole repo — every "template" hit today is the *document* engine (PAR-Q, consent, feedback, etc.), unrelated. The AI plan generator (`lib/planAgentPrompt.ts`) draws from the `exercises` table + `data/session-structure.json` directly; it doesn't have or use a library of pre-built sessions. This is genuinely new build, not a wiring job like §5.

**The naming problem, and the actual fix:** Esther already names sessions generically today (real examples pulled from Amanda's Trainerize history: "Workout 1", "Workout C GYM", "Gym - Workout A - Hinge") — she's told you herself this'll continue. **Don't solve this by asking her to name things better; solve it by making the display name irrelevant to findability:**

- Separate the free-text **display name** (can collide, that's fine) from **structured, filterable facets** — reuse the exact taxonomy already on the `exercises` table (`archetypes`, `movement_type`, `muscle_groups`, `equipment`, `difficulty`, `intensity_tiers`), auto-derived by aggregating the tags of whatever exercises are actually inside the template. Esther doesn't tag anything manually for this part — save the template, the facets populate themselves from its contents.
- Layer on a small set of **manually-set population/fit tags** for the "could someone else use this" question specifically — e.g. `shoulder-friendly`, `low-impact`, `seated-option`, `cancer-rehab-suitable` — pulled from the same condition vocabulary already used elsewhere in the app (Specialist Training conditions, exercise `default_mod`/`coaching_cue` fields). This is the direct answer to "how do I know if this fits client X" — filter by condition-fit tag, not by trying to remember which of twelve "Workout A"s was the joint-friendly one.
- Full-text search across exercise names *inside* the template, not just the title — so "Workout A" ambiguity stops mattering; Esther searches "hinge" or "kettlebell" or a client's name it was built for, not a title she can't remember.
- Reuse `app/hub/(protected)/exercises/exercise-browser.tsx`'s existing filter-chip pattern (search + multi-select facet chips + clear-filters) for a new template library page — it's already built for exactly this kind of faceted browsing, just pointed at a new table.

**Proposed schema:** `workout_templates` — id, name, `data JSONB` (same `SessionVersion` shape already used in `sessions.data`: `warm_up`/`main_block`/`cooldown` exercise arrays, so templates drop straight into an existing session editor with no transform step), auto-derived facet columns (archetypes/movement_type/muscle_groups/equipment/difficulty — arrays, computed on save), manual `condition_tags TEXT[]`, `source_client_id`/`source_session_id` (nullable, provenance — "originally built for X"), `used_with_client_ids TEXT[]` or a join table (lets Esther see "this has already worked for 3 different clients" as a trust signal), `usage_count`, timestamps.

**Workflow:** "Save as template" action from an existing session/block editor (captures the current `SessionVersion` as-is). "Apply template" when building a new block — inserts the template's exercises into the session editor pre-filled, then Esther customizes per-client from there same as always; templates are a starting point, never a locked structure. A lightweight duplicate-name nudge ("you already have 4 templates called 'Workout A' — want to see them, or auto-suggest a more specific name based on what's in this one?") is a nice-to-have, not load-bearing, since the facet/search system is what actually solves findability.

## Phased plan

| Phase | What | Gate |
|---|---|---|
| 0 | Trainerize discovery — **done 2026-08-02**, see findings above | None |
| 0b | Close remaining Phase 0 gaps: per-block exercise/set detail endpoint, real notes endpoint, `calendar/getList` date-range params | None — half-day recon, do before Phase 2 |
| 1 | Answer open questions with Esther/Craig (roster scope, notes visibility, one-time vs ongoing sync, ToS sanity check) | [GATE] |
| 2 | Build scraper(s)/API-replay client for blocks, notes, workout history | [AUTO] once Phase 1 answered |
| 3 | New DB schema: `trainerize_*` archive tables + shared `personal_records` table (also feeds §5 below) | [AUTO], standard migration |
| 4 | Import script: API data → DB, idempotent upsert | [AUTO] |
| 5a | Wire live PB flagging into `LiveSessionLog.tsx` + portal `TrainingClient` using existing `exercise-history.ts` logic + `personal_records` upsert | [AUTO] — no open questions, can start independently of the Trainerize phases |
| 5b | `workout_templates` schema + save/apply workflow + template library page (reusing `exercise-browser.tsx` filter pattern) | [AUTO] once condition-tag vocabulary is confirmed against existing Specialist Training tags |
| 6 | UI: Training History tab, PB panel/badges, notes timeline (surfaces both imported and live-set PBs from the shared `personal_records` table) | Design parity check against a mockup before calling done — none exists yet, needs one built or explicit sign-off to build without |
| 7 | Full-roster Trainerize import run + spot-check against Trainerize by eye for a sample of clients | Esther verification before calling the migration complete |

Phases 5a/5b don't depend on the Trainerize import finishing — they can run as their own lane in parallel, and 5a in particular is small enough to ship on its own if you want a quick win before the bigger import work starts.

## Effort signal

The Trainerize import (Phases 0–4, 6–7) is still a multi-day Work Order — three data surfaces, a new schema, a new UI surface, against a roster of unknown size (Phase 0b will pin the rest down). **Live PB flagging (5a) is small** — the derivation logic and the UI it plugs into both already exist; this is a focused single-lane task, not a Work Order. **Workout templates (5b) is medium** — new schema and a new library page, but it reuses an existing filter-UI pattern wholesale and has no external dependency, so it's a clean OpenCode lane once the condition-tag vocabulary question is settled. Recommend promoting the whole thing to a Work Order with 5a/5b as their own lane, independent of the Trainerize phases.
