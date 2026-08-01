# Functionality brief: updates-due tracking + client task list (for OpenDesign)

This is a **functionality + constraints spec**, not a visual spec — no layout, colour, or component
opinions here. Hand this to OpenDesign to produce mockups; bring them back and I'll implement against
the real hub codebase and data.

## What this is

Esther currently tracks recurring client updates (6-week, 4-week, 12-week/end-of-block, 6-session
block) in a manual spreadsheet with Date From / Date To / Sent / Next Update Due columns. Nothing in
the app currently knows when an update is due — she works it out by hand. We're automating that: once
an update is sent, the system derives when the next one is due from the interval type, surfaces it in
several places, and reminds Esther before it's missed.

Alongside this, the existing global Tasks page (`/hub/tasks`) has no concept of "this task belongs to
a client" — we're extending it so tasks can optionally link to a client, and those linked tasks appear
in **both** the global Tasks page and that client's own profile, kept in sync (create/edit either side,
see it on both).

## Where things live today (for context, not to be redesigned wholesale)

- Hub dashboard: `app/hub/(protected)/page.tsx` — already has tiles for "needs attention",
  quiet home-training clients, and "reviews due" (annual review). A new "Updates Due" tile joins these.
- Cross-client updates report: `app/hub/(protected)/reports/updates/page.tsx` — a table of past sent
  updates. Gets extended with due-date/status columns, or a new adjacent view.
- Client detail page: `app/hub/(protected)/clients/[id]/page.tsx` — has tabs including Compliance
  (outstanding actions like PAR-Q, GP letter, annual review) and Updates (history of sent updates).
  This is where the new "tasks for this client" section lives.
- Global tasks: `app/hub/(protected)/tasks/TasksManager.tsx`.

## Required functionality

### 1. Updates-due surfaces
- **Dashboard tile**: "Updates Due" — clients with a next-due date approaching or passed, most urgent
  first. Same visual family as the existing "reviews due" tile, but needs its own identity since a
  dashboard could show both simultaneously.
- **Quick-glance table**: due date, days-until (or days-overdue), status (upcoming / due soon /
  overdue), client name, interval type, last sent date. This is a scan-and-act view for Esther, not a
  data-entry form.
- **Client detail**: the client's own next-due-update date and status, shown wherever makes sense
  alongside the existing Compliance/Updates tab content.

Status derivation is **not stored** — it's computed live from `date_to + interval length` every time
it's displayed (same pattern as the existing annual-review-due indicator), so there's no separate
"mark as due" step to forget. Due date moves forward automatically the moment the next update is sent.

**Interval type is a per-client field**, set on the client's profile (Esther/Craig assign it, seeded
initially from the existing spreadsheet — 6 week / 4 week / 12 week end-of-block / 6-session block /
etc). Needs a small field/control somewhere on the client profile to view and change it — not
auto-detected, not chosen fresh on every send. Keep this control modest; it's a one-off per-client
setting, not a page in itself.

### 2. Client-linked tasks (extends the existing Tasks feature)
- A task created from a client's profile page carries that client's ID and shows up on the global
  Tasks page too (filterable/visible there, not hidden).
- A task created on the global Tasks page can optionally be assigned to a client, and if it is, it then
  also appears on that client's profile.
- This is two-way sync of the *same* underlying task record — not a copy. Editing status/detail from
  either surface updates the one record.
- Client-linked tasks get a **badge** on the global Tasks page (and anywhere else a mixed list of
  linked/unlinked tasks appears) so they visually read as "belongs to this client" at a glance —
  probably the client's name, small and secondary, not a competing focal point in the row.
- The client-profile task section should be a natural home for **both** manually-created tasks *and*
  the derived "update due" item (when one exists) — i.e. design one task-list section on the client
  page that can hold a mix of real task rows and the live-derived due-update indicator, not two
  separate disconnected widgets. Make clear in the mockup how a derived due-item is visually
  distinguished from a real (completable/editable) task, since only the latter can be marked done by
  hand.

### 3. Notification
- **Email to Esther** when an update crosses the "due within 7 days" threshold — a digest-style email
  if multiple clients are due around the same time, not one email per client per day.
- **In-app banner**, shown on hub load. Resurfaces on every login for as long as there's at least one
  update due-soon or overdue — there is no manual dismiss/snooze. It naturally stops appearing once the
  underlying update is actually sent (which pushes the due date forward) — so "acted on" always means
  "the real-world thing happened," never "I closed the popup."
- Design the banner to scale from one client to several (a list, not just a single-client message) and
  to read clearly this isn't the same alert as the existing quiet-client or compliance warnings, even
  if it reuses the same alert component family.

## Constraints / things to preserve

- Match the hub's existing design system/tokens — check existing hub pages (client detail, dashboard
  tiles, Compliance tab's `OutstandingActionsInline`) for the card/table/badge idiom already in use.
- Don't design a new due-date-editing UI — due dates are derived automatically from interval type +
  date_to, not manually set. Interval type itself lives as a small field on the client profile (see
  above) — design that control, but keep it lightweight.
- The existing Compliance tab's outstanding-actions pattern and the quiet-home-training-client alert
  are the closest existing analogs — reuse their visual language rather than inventing a third distinct
  "thing is due" idiom.
- Global Tasks page must keep working for non-client-linked tasks exactly as it does today — this is
  additive, not a rebuild.

## Out of scope (don't design for these)

- Manually overriding/editing a derived due date — not a feature, the date is always computed.
- Any change to how the update email itself (the six-week/four-week/flexible template Esther sends to
  the *client*) looks — this brief is about knowing/reminding *when* to send it, not the sent content.
- SMS or push notifications — email + in-app banner only for now.
- Task reminders/notifications beyond the client-linked-updates case above — general task due-date
  alerts are not part of this scope.
