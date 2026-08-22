# Lane L6 — Outlook bookings badge + mobile triage (CR-EF-079)

WO: `wo-ef-trainer-pwa-parity-2026-08-21` (repo `.context/workorder-ef-trainer-pwa-parity-2026-08-21.md`)
Mockups (signed off): the Outlook badge + triage sheet inside
`D:\apps\design-systems\ef-control-hub\mobile\calendar\hub-m-calendar.html` and
`D:\apps\design-systems\ef-control-hub\mobile\today\hub-m-today.html`.

**This is the last lane in the WO.** L3 (client mode), L4 (calendar + booking), L5 (add-workout +
notes) are all done and live-verified on staging. You're building on top of all of them — this
worktree is branched from `origin/staging`, not `main`.

## Key facts already found — do not re-derive these

- **The backend is complete and already live on `main`** (shipped separately as CR-EF-050, merged
  today). Nothing to build server-side except one small addition (see below):
  - `GET /api/outlook-bookings?status=open` — returns the queue, each row shaped like
    `{ id, event_id, subject, start_at, end_at, parsed_name, client_id, status, session_id, clients: {id, name, client_number, email} | null }`.
    `clients` is populated (an embed) only once `client_id` is set — for a genuinely unmatched
    booking it's `null` and `parsed_name` is your only clue who it might be.
  - `POST /api/outlook-bookings/[id]/confirm` — body `{ clientId, blockId }` (both required).
    Creates a real session at `booking.start_at` (**no date/time picker needed or wanted** — the
    time comes from the Outlook event itself, that's the whole point of reconciling it), adopts the
    existing Outlook event (doesn't duplicate it), marks the booking `confirmed`. Returns 409 if the
    booking isn't still `open` (someone else already resolved it — handle this response, don't just
    show a generic error).
  - `POST /api/outlook-bookings/[id]/dismiss` — no body. Marks `dismissed`.
  - `POST /api/outlook-bookings/[id]/undismiss` — check this file exists (`app/api/outlook-bookings/[id]/undismiss/route.ts`) before assuming its shape; not needed for this lane's UI but don't break it.
  - `POST /api/outlook-bookings/[id]/link` — re-matches a booking to a different client without
    creating a session yet (check the route for its exact body shape if you use it — optional for
    this lane, the mockup's triage flow goes straight to confirm).
- **`app/hub/m/book/page.tsx` already exists** (built in L4) — a full client-picker → block-picker →
  when-picker → confirm flow for creating a *new* booking. **Extend this same file**, don't build a
  parallel one: when the URL carries a `booking=<id>` param, switch into "confirm this Outlook
  booking" mode — same client+block pickers (reuse verbatim, they already do dual client_number/UUID
  lookup via `/api/clients/[id]/blocks`), but:
  - Fetch the booking via `GET /api/outlook-bookings?status=all` and find the matching id (there's no
    single-booking GET route — don't add one just for this, filtering the list client-side is fine
    at this scale).
  - Show the raw Outlook subject + `start_at` (formatted) as context, not editable.
  - **Hide the date/time fields entirely** in this mode — the mockup's `hub-m-book-session.html`
    booking-confirm state has no when-picker, it's fixed from the Outlook event.
  - If `booking.parsed_name` matches a real client 1:1, pre-select that client (case-insensitive
    full-name match against `/api/clients`) — same "confidence" idea the mockup shows, but you're
    deriving the match client-side since the API doesn't pre-resolve it for you.
  - Submit calls `POST /api/outlook-bookings/[id]/confirm` instead of
    `POST /api/blocks/[id]/sessions`. On success, redirect to `/hub/m/calendar` (trainer scope only
    — this triage flow is trainer-scope, there's no client-scope entry point per the mockup).
  - On a 409, show "Someone already resolved this booking" and redirect back rather than retrying.
- **`app/hub/m/calendar/page.tsx` and `app/hub/m/TodayScreen.tsx` already exist** (L4 built calendar;
  Today predates this WO). Both need the badge — read `TodayScreen.tsx` for its existing pattern
  (it already has a similar clash-alert; match that visual language, don't invent new CSS if the
  existing alert classes already do the job — check `mobile.css` for `.alert`/`.a-warning` first).

## What this lane builds

### 1. Badge / alert card — Today tab and Calendar tab

Both are Server Components already fetching their own data — add one more query,
`supabase.from("outlook_booking_events").select("id", { count: "exact", head: true }).eq("status", "open")`,
and render a small alert card when count > 0 ("N booking(s) waiting to be matched"), hidden at zero.
Tapping it navigates to the triage sheet (see below) — on Calendar, that can be inline; on Today, a
link to `/hub/m/calendar` (which then opens triage) is fine, don't duplicate the triage UI on Today.

### 2. Triage sheet — Calendar tab

A bottom sheet (reuse the `.sheet`/`.sheet-overlay` pattern already in `mobile.css` from L3/L4 — check
it's there before adding a duplicate) listing every `open` booking: raw subject, parsed name, formatted
`start_at`, and a "Matched to {client}" / "No client matched" pill depending on whether `client_id` is
set. Tapping a row navigates to `/hub/m/book?scope=trainer&booking=<id>`. A dismiss action per row
calls the dismiss route directly from the sheet (optimistic remove, matching the pattern
`ClientNotesPane.tsx`'s pin toggle already uses) — don't require opening the confirm page just to
dismiss.

## Constraints

- No changes to `TrainScreen.tsx`, `add-workout/page.tsx`, `ClientModeView.tsx`, or the desktop
  Outlook queue (`app/hub/(protected)/schedule/outlook/**`) — this lane only touches Today, Calendar,
  and extends the existing mobile Book page.
- Reuse `SessionStatusPill`/`deriveSessionStatus` where relevant, `focus_label` fallback chain — same
  standing rule as every prior lane.
- `tsc --noEmit` clean **and a full `next build`** — a prior lane in this WO shipped a real production
  build failure (a Server Component passing a function prop to a Client Component) that tsc could not
  catch. Run `node node_modules/next/dist/bin/next build` yourself before handing back, don't rely on
  tsc alone.

**Budget guardrail:** the API is fully documented above — you should not need to explore
`app/api/outlook-bookings/**` beyond a confirming glance. Start writing code within your first ~8 tool
calls.

## VERIFY

- `npx tsc --noEmit` clean, then a full `next build` clean.
- On the dev server: the badge is genuinely hidden when the queue is empty, and shows the real count
  when it isn't.
- Triage sheet lists real queue rows with correct subject/parsed-name/time/matched-state.
- Dismissing a row removes it from the list without a full reload.
- Tapping a row reaches the extended book page in confirm mode, with no date/time fields, the booking
  context visible, and (if you implement the name-match pre-select) the right client pre-picked when
  the parsed name matches exactly.

## Handback

State plainly whether you implemented the parsed-name pre-select or left it as a manual pick every
time — either is acceptable, just say which. Confirm the 409-conflict path was actually exercised
(two tabs / a stale confirm) or say if it's untested.
