# Lane L3 — Trainer PWA client-mode shell (CR-EF-079)

WO: `wo-ef-trainer-pwa-parity-2026-08-21` (repo `.context/workorder-ef-trainer-pwa-parity-2026-08-21.md`)
Mockup (source of truth, signed off by Craig 2026-08-21): `D:\apps\design-systems\ef-control-hub\mobile\clients\hub-m-client-mode.html`
Related mockups for reference: `hub-m-clients.html` (the entry point), `hub-m-calendar.html` (the agenda pattern this reuses in client scope).

## Goal

Build the "client mode" shell described in the mockup: tapping a client from `/hub/m/clients` enters
a client-scoped mode with its own 4-tab bar (Overview / Calendar / Workouts / Notes), a persistent
"you're viewing Joan Mercer" scope banner with an unmistakable exit, and content matching the mockup's
Overview pane exactly (medical flags first, block progress, pinned note, recent sessions, the
"true admin stays on desktop" notice).

## Key facts already found (skip re-discovering these — a prior run of this
## lane spent its entire budget on exploration and wrote nothing; don't repeat that)

- `components/hub/SessionStatusPill.tsx` **already exists and already matches the mockup's
  `.s-pill` exactly** (5 states, same colours/icons). Use it directly for any status pill in
  client mode — do not port the mockup's inline SVG/CSS version.
- `lib/session-status.ts` exports `deriveSessionStatus(source)` — use this to get a session's
  status from a `sessions` row (handles the `status` column vs. legacy `session_log.completed_at`
  precedence). Don't hand-roll status derivation.
- `app/hub/m/clients/[id]/page.tsx` already has the medical-flags logic
  (`computeComplianceFlags` from `lib/compliance.ts`, `buildMedicalFlags` from
  `lib/mobile-client-flags.ts`) and the block/history queries you need — read this file once,
  fully, and lift its query shape rather than re-deriving it. It queries `clients` by
  `client_number` (the route's `[id]` param, NOT the client's UUID `id`), then `blocks`/`sessions`
  by the client's UUID.
- `components/hub/MobileShell.tsx` — the trainer-level 3-tab bar (Today/Train/Clients). Its
  `.tab`/`.tabbar` CSS classes live in `app/hub/m/mobile.css` — check that file once for the
  existing tab-bar styling before writing new CSS for the client-mode tab bar; reuse tokens/classes
  where they already match the mockup rather than duplicating rules.
- `app/hub/m/TodayScreen.tsx` has the `.mtop`/`.mbrand-sub` top-bar pattern already in use — the
  client-mode scope banner sits directly below a similar top bar in the mockup.
- Session names: use `focus_label` (56 existing usages in the codebase — it's already the
  established pattern, not something to introduce). Never render `Block {n} · S{n}`.
- `client_notes` table today is exactly `id, client_id, note, created_at` — no `session_id`,
  `author`, or `pinned` columns yet (that migration is a later lane). Build the Notes tab pane
  against this real shape; anything the mockup shows that needs a column which doesn't exist yet
  (pin toggle, session-title) is a UI-only stub for now — say so in your handback, don't fake it
  against a schema that isn't there.

**Budget guardrail:** cap exploration at reading the specific files named above, `hub-m-client-mode.html`,
and the WO doc. Do not re-derive facts already given here. Start writing code within your first few
tool calls after that — if you're still only reading past turn ~15, stop and write what you have with
the stubs clearly marked, rather than continuing to explore.

## Files

- `components/hub/MobileShell.tsx` — currently 3 trainer-level tabs (Today/Train/Clients), no concept
  of client scope. Do NOT add a 4th trainer-level tab here for "Calendar" — that's a separate lane (L4).
  This lane only needs client mode to render *inside* the existing Clients flow.
- `app/hub/m/clients/[id]/page.tsx` — currently a read-only glance ending in a "deliberately not here"
  panel. This page's route becomes the client-mode entry point OR gets superseded by a new client-mode
  layout — your call on the cleanest Next.js App Router shape (a nested layout under
  `app/hub/m/clients/[id]/` that owns its own tab bar is probably right; look at how `MobileShell`
  currently renders the trainer tab bar for the pattern to mirror).
  **`[id]` here is `client_number`, not the client's UUID `id`** — check the existing page's query
  (`.eq("client_number", clientNumber)`) before writing any new query.
- `app/hub/m/clients/[id]/NotesPanel.tsx` — existing notes component, hits `/api/client-notes`. The
  Notes tab in client mode should build on this, not duplicate it — but the mockup's Notes tab has
  pinning, search, and session-titled notes that don't exist on `client_notes` yet. **That schema
  change (`session_id`, `author`, `pinned` columns) is out of scope for THIS lane** — build the Notes
  tab UI to the mockup, but it's fine if pin/search are UI-only (no-op or client-side-only) until the
  migration lands in L5. Flag clearly in your handback which parts are UI-only stubs.
- `app/hub/m/clients/[id]/TasksPanel.tsx` — existing, not part of the mockup's client-mode tabs. Leave
  it out of client mode entirely (it doesn't appear in `hub-m-client-mode.html`).

## What this lane does NOT include (later lanes / out of scope)

- The Calendar tab's actual day-agenda data — L4 builds the real agenda component. For THIS lane,
  the Calendar tab pane can render a simple placeholder or a minimal read of the client's `sessions`
  rows in whatever shape is fastest to ship correctly — do not block on building the full agenda.
- The Workouts tab's "add workout" flow (L5) — for this lane, the Workouts pane just lists the
  client's current block's workouts (read-only), matching the mockup's `WORKOUTS` array shape
  (name, archetype/emphasis label, "N of M delivered" meta). No add/preview/confirm flow yet.
- `client_notes` schema changes (L5).
- The scope-aware add sheet / book-session flow (L5).
- Outlook badge (L6).

## MUST

- Match `hub-m-client-mode.html` section-by-section: the Overview pane's panel order and content
  (Medical & compliance → Block progress → Pinned note [stub OK] → Recent sessions → the "true admin
  stays on desktop" notice), the scope banner's copy and behaviour, the 4-tab bar.
- Reuse the existing medical-flags logic from `app/hub/m/clients/[id]/page.tsx`
  (`computeComplianceFlags`, `buildMedicalFlags`) — don't reimplement.
- The scope banner must make it impossible to be unsure which client you're in — this was Craig's
  explicit concern (CR-EF-079 G2). Follow the mockup's persistent rose banner pattern exactly.
- `tsc --noEmit` clean.
- No changes to `app/portal/**`, the desktop hub, or `TrainScreen.tsx`'s internals.
- No DB writes in this lane — reads only (existing tables, no migration).

## VERIFY

- `npx tsc --noEmit` clean.
- Visit `/hub/m/clients` on the dev server, tap a client, confirm you land in client mode with the
  4 tabs, the scope banner shows the right name, and each tab renders without crashing.
- Confirm leaving client mode (the exit affordance) returns to the Clients list, not a dead end.
- Confirm the Overview pane's content and panel order match the mockup exactly — do a real
  section-by-section comparison against `hub-m-client-mode.html`, not a glance.

## Handback

List explicitly: what's real vs. what's a stub (Calendar tab data, Workouts add flow, notes
pin/search). Do not report this as visually complete without naming the stubs — the reviewer needs
to know what L4/L5 still owe.
