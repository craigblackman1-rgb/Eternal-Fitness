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
