# Work Order — Trainer PWA: client mode, calendar spine, quick capture

**Slug:** `wo-ef-trainer-pwa-parity-2026-08-21`
**Apps:** `eternal-fitness-website` (+ `design-systems` for mockups)
**Owner:** Claude (orchestrator) · OpenCode lanes for scoped implementation
**CR:** CR-EF-079 · **Brief:** `.context/brief-trainer-pwa-parity-opendesign.md`
**Extends:** `wo-ef-workout-consolidation-pwa-2026-08-15` (calendar-spine model, §3.2 of
`.context/assessment-workout-unification-2026-08-17.md`)

## GOAL

Esther can run her day from her phone: open a client, see and move their sessions on a calendar,
put a workout on a specific day, book a session (which reaches Outlook), and capture a note against
the session she just delivered — without opening the desktop hub.

## The problem being solved

Craig, 2026-08-21, after Esther asked for the PWA to work more like Trainerize. A live walkthrough of
Trainerize on Esther's own tenant (findings in the brief, §1) against our `/hub/m` tree found:

| Esther wants | Trainerize | Us today |
|---|---|---|
| Open a client and act on them | Client mode with edit controls | Read-only glance; page literally says "any admin action lives on the desktop hub" |
| See a client's sessions by day | Infinite day-agenda calendar | **No calendar anywhere in the PWA** |
| Put a workout on a day | 4 taps, preview → "Add to Today" | Not possible on mobile at all |
| Book a session | ✚ → Appointment | Not possible on mobile; mobile has never once triggered the Outlook sync |
| Note against a workout | Notes titled by workout, 2-tap capture | Notes exist and share the desktop store, but `client_notes` has no session link, no author, no pin |

The `/hub/m` tree is byte-identical on `main` and `staging` — none of this has been started.

## MUST

- **Mockup first, then build.** No lane builds until its mockup is signed off (Design Parity Gate).
- **Trainer PWA only. The client portal is out of scope** (Craig's 2026-08-21 decision; deferred item
  `dmt2qo93nzo`). Client mode is built from staff-shaped components, never portal screen reuse.
- **Train Screen must not regress** — offline queue, idempotency, rest timers, PB flagging,
  warm-up exclusion, band-unit lock. This WO adds ways to *reach* it, never changes what it does.
- **One status pill**, the shared 5-state component from the unification brief. No mobile variant.
- **Session names are `focus_label`**, never `Block {n} · S{n}`.
- **No phase concept** — Esther works at the workout level (every one of her Trainerize programs
  returns "No training phase in this program").
- Reuse the existing `workout_templates` browser and paste-and-assign path for workout selection —
  no parallel picker.
- Every lane in its own worktree under `D:\apps\worktrees\eternal-fitness-website\` (DO-SOP-010);
  `staging` first, verify on development.eternal-fitness.co.uk, then `main`.

## DECIDE YOURSELF

- Component structure of client mode (how the shell swaps tab sets; whether `MobileShell` takes a
  scope prop or a nested layout under `app/hub/m/clients/[id]/`).
- The agenda component's data-fetch/windowing strategy (how far forward/back, pagination).
- Whether the week boundary in the agenda is a sticky header or an inline divider.
- Migration shape for `client_notes` (`session_id`, `author`, `pinned`).

## ASK FIRST (gates)

- **G1 — mockup sign-off** (one batch, not drip-fed).
- **G2 — the scope-indicator affordance.** How Esther knows which client she's in, on a phone,
  without a drawer. Getting this wrong means logging against the wrong client. Propose, don't decide.
- **G3 — Outlook booking confirm-on-mobile.** Confirming a queued booking needs a client *and* a
  block picked; on a phone that's the hard part. Behaviour is Esther-facing — her call via Craig.

## LANES

Dependencies: **L1 → L2 → (L3 ‖ L4 ‖ L5 ‖ L6)**.

### L1 — Register + reconcile `[AUTO]`
Register CR-EF-079 against the **current** register (this worktree is behind — it stops at CR-EF-072,
`origin/staging` runs to CR-EF-078). Rebase onto staging or land the row there directly. Confirm
whether `18b013d` (CR-EF-050 Outlook reconciliation queue, on `staging` not `main`) is held by the
standing staging-only decision or is a stall — L6 depends on the answer.
**VERIFY:** `git show origin/staging:.context/change-requests.md` contains CR-EF-079; no CR numbers lost.

### L2 — Mockups `[GATE → G1, G2]`
`design-systems/brand-staging-2662e9`: client mode shell + tabs, the day-agenda calendar in both
scopes, the scope-aware add flow incl. preview-then-confirm, notes capture + pinned/search, Outlook
badge + mobile triage. Real data, incl. the honest hard cases named in the brief.
**VERIFY:** section-by-section Design Parity review against the brief before G1 is signed.

### L3 — Client mode shell `[AUTO once G1/G2 answered]`
Scope-aware `MobileShell`, client-scoped tab set, persistent scope indicator, revise (don't delete)
the "deliberately not here" panel to reflect what genuinely stays on desktop.
**VERIFY:** tsc + build; enter/leave client mode from every entry point; no route lands scopeless.

### L4 — Day-agenda calendar `[AUTO once G1 answered]`
One component, two scopes (trainer tab + client tab). Day rows incl. empty days, Today affordance,
derived Mon–Sun week boundaries, status pills, completed-vs-untouched at a glance.
**VERIFY:** against real prod-shaped data — a day with two sessions, a cancelled session carrying
logged sets, a client with no block.

### L5 — Scope-aware add + notes `[AUTO once G1 answered]`
Add-workout (template library / this client's block / from scratch) → preview (name, est. duration,
exercise count, equipment, exercise list) → confirm naming the real day. Book session writing
`scheduled_at` through the existing `PATCH /api/sessions/[id]` so Outlook push fires for free.
`client_notes` migration (`session_id`, `author`, `pinned`) + session-titled rendering + search.
**VERIFY:** book a session on development and confirm the Outlook event actually appears (not just a
200); add a workout to a future day and confirm it renders on both mobile and desktop; capture a note
from inside a session and confirm it titles correctly on the desktop client page too.

### L6 — Outlook bookings badge `[AUTO once L1 confirms branch state · GATE G3]`
Surface the unmatched-bookings queue on the trainer PWA; mobile confirm/link/dismiss triage.
**VERIFY:** a real unmatched Bookings event triaged end-to-end on development.

## DONE

- Esther can open a client on her phone and land in client mode, with no doubt whose record she's in.
- A day-agenda calendar exists in the PWA in both trainer and client scope.
- A workout can be put on a specific day from the phone, via preview-then-confirm.
- A session can be booked from the phone and the Outlook event verifiably appears.
- A note captured from a session is titled with that session and reads correctly on desktop too.
- Unmatched Outlook bookings are visible and triageable on mobile.
- All verified on development.eternal-fitness.co.uk, then live on `main`, ledger updated.

## SCOPE (declared, for overlap checking)

`app/hub/m/**`, `components/hub/MobileShell.tsx`, `app/api/client-notes/**`,
a `client_notes` migration, and read-only reuse of `workout_templates` / `sessions` APIs.
**Does not touch:** `app/portal/**`, the desktop hub layout, `TrainScreen`'s logging internals.

## OUT OF SCOPE

Client portal (any form) · Meals/Water/Body Stats/Photos/Goals/Forms · group/class booking ·
the Trainerize-style activity feed (parked — needs a notifications model we don't have).

## LEDGER

- 2026-08-21 — Trainerize walkthrough run on Craig's mirrored phone (Phone Link + computer-use),
  Esther's live tenant. Findings + Open Design brief written
  (`.context/brief-trainer-pwa-parity-opendesign.md`, CR-EF-079) and sent to Craig to run.
  Craig scoped it to the trainer PWA; client portal deferred (`dmt2qo93nzo`). WO registered.
  Confirmed hub→Outlook push already fires on any `scheduled_at` PATCH, so L5's booking needs no new
  Outlook plumbing — mobile just has never sent that field. Awaiting Craig's Open Design run (G1).
- 2026-08-21 (later) — Craig: designs done and returned. All 6 mockups present under
  `design-systems/ef-control-hub/mobile/` (`today/hub-m-today.html` revised,
  `calendar/hub-m-calendar.html`, `clients/hub-m-clients.html`, `clients/hub-m-client-mode.html`,
  `clients/hub-m-add-workout.html`, `clients/hub-m-book-session.html`). Ran the Design Parity Gate —
  section-by-section against the brief's §3.1–3.5 and §4 constraints (full detail:
  `wo attest amt2s0ghiai`). **Verdict: strong return, matches or exceeds the brief** — scope
  indicator, derived Mon–Sun agenda in both scopes, scope-aware add (3 sources, preview-then-confirm,
  Start now), session-titled/pinned/searchable notes, Outlook badge + triage + client/block confirm
  flow, one verbatim shared status pill, no phase concept, `focus_label` naming throughout, honest
  hard-case data (cancelled-with-logged-data, 2-session day, 200-char note, non-demo-client banner).
  **2 real gaps found, queued to Craig as a batched G1 decision (`qmt2s0l3m0m`)** rather than
  blocking: (1) `hub-m-clients.html` carries ~100 lines of orphaned detail-view JS that live
  navigation never reaches — the "true admin stays on desktop" panel content only exists there, not
  in the reachable client-mode file; (2) no mockup shows the note quick-capture entry point from
  inside the Train Screen, which is the headline case for session-aware notes (§3.4). L3–L6 build
  hold until G1 answered — dead-code cleanup and the missing entry point don't block the client-mode
  shell or the calendar work regardless of which option Craig picks, so build can start on those the
  moment he answers even if he sends part of it back.
- 2026-08-21 (later still) — Craig: fix the 2 gaps directly rather than round-tripping through Open
  Design. Done: (1) `hub-m-clients.html` — stripped the orphaned `detailHtml()` state machine
  (~100 lines: `view`/`current` state, dead `data-action="open"`/`"back"` handlers, unused ICOs);
  the file now only ever renders the list, matching what the live `ccard` links actually do.
  (2) `hub-m-client-mode.html` — added the "true admin stays on desktop" panel to the reachable
  Overview pane (it only existed in the dead code removed in (1)). (3) `hub-m-train.html` — added
  the missing note quick-capture entry point: a "Quick note" icon button in the action bar opens a
  bottom-sheet composer (sheet pattern copied verbatim from hub-m-calendar.html), auto-titled with
  the session's `focus_label`, writing to the same `client_notes` store the client-mode Notes tab
  reads — distinct from the existing per-exercise note toggle, documented as such in the screen's
  own design-notes callout. **Verified via a local static server + programmatic click** (the
  Browser pane's coordinate-click tool wasn't landing since the pane isn't displayed in this
  session — confirmed via `element.click()` in devtools instead): client list renders with no dead
  code, client-mode Overview shows the admin-stays-on-desktop notice, and the Train Screen sheet
  opens/saves/toasts correctly with the right session + client name. Committed narrowly to the
  shared `design-systems` repo (12 files — the 6 CR-EF-079 mockups + the 3 fixed files; left every
  unrelated in-flight file from other concurrent sessions untouched) and pushed: `47ea922`.
  **G1 effectively resolved** — mockups now match the brief with no open gaps. L3–L6 build can
  start.
- 2026-08-21 (later) — Craig confirmed designs signed off in chat. L3 (client-mode shell) dispatched
  to an OpenCode lane (`opencode-go/deepseek-v4-pro`) in worktree
  `D:\apps\worktrees\eternal-fitness-website\trainer-pwa-client-mode-l3`. **First run wrote zero
  files** — burned its entire turn budget on exploration (60+ reads/greps) then stopped cleanly
  (exit 0), the known deepseek-reliability failure mode where a green exit isn't evidence of
  progress. Not silently re-run: tightened the brief with the exact facts it wasted its budget
  rediscovering (`SessionStatusPill`/`deriveSessionStatus` already exist, real `client_notes`
  schema, `focus_label` convention) plus a hard budget guardrail. Relaunched as
  `l3-client-mode-retry` — this run produced real code.
- 2026-08-21 (later still) — **L3 shipped to staging (`9ad67a6`), verified live.** Hand-review of
  the retry's diff found it reused real existing helpers (not hallucinated) — `SessionStatusPill`,
  `deriveSessionStatus`, `computeComplianceFlags`, `DEFAULT_ARCHETYPE_FOCUS_LABELS`, the
  `--color-white` token — and honestly labelled its 3 stubs (Calendar tab = plain read not the real
  agenda, Workouts = read-only, notes pin/session-title = UI-only pending the L5 migration). Deleted
  2 now-orphaned files (`NotesPanel.tsx`/`TasksPanel.tsx`, zero importers left). tsc clean. Rebased
  cleanly onto `origin/staging` (no file overlap with its divergence, checked before rebasing).
  Design Parity Gate + scope-diff attested, pushed to staging. **Deploy Verification Gate run
  properly** — `mcp__coolify__deployment get` on the actual deployment (not just a push) confirmed
  `status: finished`, commit matches exactly, not just assumed from a green push.
  **Live click-through with Craig's real Chrome session** (claude-in-chrome, not a faked/bypassed
  hub session — the sandboxed Browser pane has no path to real hub auth, per standing project rule):
  client mode works end-to-end for a real client, banner/tabs/panel order all match the mockup.
  Found and fixed 2 real issues live: (1) `client_notes` 500'd — the 2026-08-17 migration was
  applied to prod but never run against the separate `eternal_fitness_staging` DB clone (pre-existing
  drift, not caused by this lane — the same table/route predates it, just never previously exercised
  on staging). Fixed by running the migration against staging only
  (`scripts/run-client-notes-migration-staging.mjs`, committed for the record); verified the table
  now exists, then a real note POST/GET/delete round-trip through the actual UI, test note cleaned
  up after. (2) Workouts empty-state said "no current block" for a block that exists with zero
  sessions — fixed to say so honestly. Second gate attestation covers both the live verification and
  the fix, pushed as `9ad67a6`. **L3 done.** L4 (day-agenda calendar) next.
- 2026-08-21 (later) — **Correction from a different session** (`eternal-fitness-feature-request-f3bea2`,
  CR-EF-073 promotion) flagged in the registry: an unrelated reconcile-with-staging merge on its way
  to `main` carried L3's `app/hub/m/**` code onto production earlier than this WO's planned
  staging-then-main sequence. Assessed low-risk by that session (staff-auth-gated, additive) but not
  reverted, and asked for prod to be re-verified live before calling L3 done. **Done**: confirmed
  `ff12067` (includes `9ad67a6`) is the live commit on the `eternal-fitness` Coolify app
  (deployment healthy, `mcp__coolify__deployment get`), then live-checked `/hub/m/clients/1` on
  `eternal-fitness.co.uk` itself (Craig's real prod client, not the staging clone) — client mode
  renders correctly, `/api/client-notes` returns 200 (not 500, confirming prod already had the
  2026-08-17 migration all along — only staging was missing it). No write test on prod (real client
  data; the staging round-trip already proved the write path). L3 is genuinely done on both
  environments now, not just staging.
