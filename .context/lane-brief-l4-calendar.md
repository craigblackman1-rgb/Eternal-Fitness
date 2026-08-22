# Lane L4 — Trainer PWA day-agenda calendar + Book Session (CR-EF-079)

WO: `wo-ef-trainer-pwa-parity-2026-08-21` (repo `.context/workorder-ef-trainer-pwa-parity-2026-08-21.md`)
Mockups (source of truth, signed off by Craig): `D:\apps\design-systems\ef-control-hub\mobile\calendar\hub-m-calendar.html`
(trainer scope) and the Calendar pane inside `D:\apps\design-systems\ef-control-hub\mobile\clients\hub-m-client-mode.html`
(client scope). Also read `mobile\clients\hub-m-book-session.html` for the booking form shape.

## Key facts already found — do not re-derive these

- **L3 already shipped and is live** (staging + production). `app/hub/m/clients/[id]/page.tsx`,
  `ClientModeView.tsx`, `ClientNotesPane.tsx` exist. The Calendar pane inside `ClientModeView.tsx`
  (around line 283) is currently a labelled stub — `<section className={\`pane${tab === "calendar" ? " on" : ""}\`}>`
  with a plain list of `calendarSessions`. **Replace that stub's contents with the real day-agenda**,
  keep the section wrapper and the `tab === "calendar"` pane-switching pattern.
- `components/hub/MobileShell.tsx` currently has 3 trainer tabs (Today/Train/Clients). **Add a 4th,
  "Calendar", between Today and Train** — matches the mockup's tab order exactly
  (Today/Calendar/Train/Clients). It's a plain `Link` like the others, pointing at a new route
  `app/hub/m/calendar/page.tsx`. `MobileShell`'s `inClientMode` logic (suppresses the trainer bar
  while inside a client) needs no change.
- `deriveSessionStatus` (`lib/session-status.ts`) and `SessionStatusPill` (`components/hub/SessionStatusPill.tsx`)
  already exist and match the mockup's 5-state pill exactly — use them, don't reinvent.
- Session names are `focus_label`, with `DEFAULT_ARCHETYPE_FOCUS_LABELS` (`lib/planAgentPrompt.ts`)
  and `Session {n}` as fallbacks, in that order — same pattern `ClientModeView.tsx`'s `sessionName()`
  already uses (look at it, reuse the same logic rather than re-deriving).
- **Domain model — read this carefully, it governs how "Book session" must behave**: per Craig's
  restated rule (2026-08-20), a **session is a booked calendar slot whose identity is its date+time**;
  a **workout is content attached to a session, normally on the day, not in advance**. So "Book
  session" creates a session with **no prescription content** — just a date/time and a block
  association. It is NOT the same action as "add a workout" (that's a separate, later lane — do not
  build workout-content selection into the booking form, the mockup's own booking form has no
  exercise/template fields, only client → block → date → time).
- No existing endpoint creates a session with empty content. `POST /api/blocks/[id]/sessions`
  (`app/api/blocks/[id]/sessions/route.ts`) currently **requires** `template_id`. Extend it: make
  `template_id` optional — when absent, skip the template lookup/steps and insert a session with
  empty `warm_up`/`main_block`/`cooldown` arrays, `focus_label: null`, and (new) accept an optional
  `scheduled_at` in the body to set on the created row. This must stay backward compatible — every
  existing caller (`AddWorkoutDialog.tsx` on desktop) always passes `template_id`, so its behaviour
  is unchanged.
- Outlook sync: `PATCH /api/sessions/[id]` already fires the Outlook push automatically whenever
  `scheduled_at` changes (`app/api/sessions/[id]/route.ts`) — this happens for free, no new plumbing
  needed if you PATCH an existing session's `scheduled_at`. For a **newly created** session, set
  `scheduled_at` directly in the `POST` insert (see above) — the cron will pick it up within 15 min
  even without an immediate push; that's acceptable for this lane (don't build a synchronous push
  from the POST route, out of scope).
- The client's current block is already computed in `page.tsx` (`currentBlock`) and passed to
  `ClientModeView` as the `block` prop (`BlockView`) — it only carries `number`/`focus`/`done`/`total`/`pct`
  today. You'll need the block's real `id` (UUID) too for the booking POST — add it to `BlockView`
  and thread it through from `page.tsx`.

## What this lane builds

### 1. Trainer-scope Calendar tab — `app/hub/m/calendar/page.tsx` (new)

Server component. Query `sessions` joined to `clients` and `blocks` (or however the existing
patterns in this codebase do a 3-way join — check `app/hub/(protected)/schedule/ScheduleCalendar.tsx`
for the query shape, don't invent a new one) across a window (mirror the mockup's `-4d`..`+7d`
default). Render the day-agenda: one row per day, week-band headers (`date-fns startOfWeek`,
`weekStartsOn: 1`), empty days render as a muted add-target card, sessions show time/client
name/session name (`focus_label`)/status pill. Match `hub-m-calendar.html` markup/class names —
reuse the CSS classes already added to `app/hub/m/mobile.css` for the client-scope agenda in L3's
stub if any exist, otherwise port the mockup's `.agenda`/`.drow`/`.week-band`/`.dsess` classes into
`mobile.css` (check the file first — some may already be there from L3, don't duplicate).

A floating "Book session" action (FAB, matching the mockup) opens the booking flow (see §3).
**Trainer scope offers ONLY booking** — no add-workout option here (that's client-scope only, and
even there it's a later lane — see Constraints).

### 2. Client-scope Calendar pane — inside `ClientModeView.tsx`

Same agenda component, filtered to one client (reuse `calendarSessions` — already computed in
`page.tsx`, already has `id/day/month/time/name/status`). If the trainer-scope agenda is built as a
real shared component (e.g. `components/hub/DayAgenda.tsx`), use it here too — **one component, two
scopes**, per the brief. A "Book for {firstName}" button opens the same booking flow, pre-filled to
this client.

### 3. Book Session flow

A route or modal (your call — a dedicated page `app/hub/m/clients/[id]/book/page.tsx` matching the
mockup's `hub-m-book-session.html` is the safer bet, mirrors how L3 structured client-scoped
sub-routes) that: picks a client (client-scope: pre-filled and locked; trainer-scope: a picker),
picks that client's block (query blocks for the client, `status IN ('active','approved')` or
whatever the existing "current block" logic uses — reuse `page.tsx`'s pattern), picks a date + time.
On submit, `POST /api/blocks/[id]/sessions` with no `template_id`, the chosen `scheduled_at`. Redirect
back to the calendar (client-scope: back into client mode's Calendar tab; trainer-scope: back to
`/hub/m/calendar`) on success.

## Constraints

- **Do not build workout-content selection anywhere in this lane.** No template picker, no "add
  workout" sheet. That's explicitly a later lane (see the domain-model note above — booking and
  content-attachment are two different actions, and conflating them was flagged as a repeated past
  mistake).
- **No client_notes changes.** Unrelated to this lane.
- **No Outlook badge/triage UI.** That's a separate lane (L6). This lane only needs the existing
  automatic Outlook push to keep working (verify it isn't broken, don't build new UI for it).
- Reuse `deriveSessionStatus`/`SessionStatusPill`/`focus_label` fallback chain — don't reinvent.
- `tsc --noEmit` clean.
- No changes to `TrainScreen.tsx`, `app/portal/**`, or the desktop hub.

**Budget guardrail:** you have everything you need above — the query pattern to mirror
(`ScheduleCalendar.tsx`), the API extension shape, the component boundaries. Start writing code
within your first ~10 tool calls. If you're still only reading past that, stop and ship what you
have with gaps clearly labelled rather than continuing to explore.

## VERIFY

- `npx tsc --noEmit` clean.
- On the dev server: `/hub/m/calendar` renders a real multi-day agenda with real session data, week
  bands are genuinely Monday-Sunday, an empty day is tappable.
- Book a session (trainer scope, then client scope) end-to-end against a real dev-server client and
  confirm the new row appears in `sessions` with `scheduled_at` set and no prescription content.
- Confirm the existing `POST /api/blocks/[id]/sessions` callers (desktop `AddWorkoutDialog.tsx`)
  still work unchanged — read the route diff and confirm the `template_id`-present path is
  byte-for-byte the same behaviour as before.

## Handback

State explicitly whether the trainer-scope and client-scope agendas ended up sharing one real
component or two similar-but-separate ones, and why. If time ran out before wiring the booking POST
end-to-end, say so precisely (which half works, which doesn't) rather than reporting it as done.
