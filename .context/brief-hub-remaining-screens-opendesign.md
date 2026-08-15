# Functionality brief: remaining un-designed hub screens (for Open Design)

Functionality + constraints only, no visual opinions — same house rules as this project's other Open
Design briefs. Comes out of a full reconciliation pass (`.context/audit-hub-mockup-reconciliation-2026-08-15.md`)
cross-referencing every live hub route against every existing mockup. This is everything that came back
with **no mockup at all** for a route that's actually live and used, plus one genuinely new screen
(the monthly calendar). It does not repeat anything already covered by
`brief-workout-consolidation-opendesign.md` or `brief-session-editor-opendesign.md`.

## 1. New-client intake form (`/hub/clients/new`)

Live at `app/hub/(protected)/clients/new/page.tsx` — a substantial multi-section form (demographics,
injury history, training-rules editor, segmented controls for training location/sessions-per-week/
time-tier/fitness level). No mockup has ever existed for it; it was built and has stayed unreconciled
since. Reconcile the mockup against the live form's actual fields rather than guessing at what belongs
— read the file, don't assume a generic "new client" form shape. Match the visual language already
established in `hub-client-detail.html`/`hub-client-edit.html` (same card/field/chip idiom).

## 2. Per-client documents (`/hub/clients/[id]/documents` + `/hub/clients/[id]/documents/[docId]`)

Distinct from `hub-documents.html`, which models the **cross-client** "All Documents" register at
`/hub/documents`. This pair is the single-client view: a list of one client's documents (PAR-Q,
agreements, letters) as status-badged cards plus a "New Document" action, and a document detail page
showing one document + its email-delivery timeline. Both currently un-mocked.

## 3. Progress-update composer + history (`/hub/clients/[id]/updates`, `/updates/new`, `/updates/[updateId]/edit`)

The largest gap by actual feature weight. This is the "send Esther's 6-week/4-week/flexible progress
update to a client" system — richly iterated in this app's history (paste-a-draft mode, rich-text
paste parsing, WYSIWYG opening line, template switching, delivery-history tracking with
send/resend/opened/clicked/bounced events) but has **never had a design-system mockup at any point**.
Needs three states covered:
- **History list** (`/updates`) — past sent/scheduled/draft/failed updates for one client, status pills,
  delivery timeline per entry (open/click tracking).
- **New/edit composer** (`/updates/new`, `/updates/[updateId]/edit`) — template picker (6-Week/4-Week/
  Flexible/custom-sections), the paste-a-draft entry point, rich-text editing that preserves bold/
  headings/lists.
- Read the actual components before drawing anything (`app/hub/(protected)/clients/[id]/updates/*`,
  and whatever client component they render into) — this feature has changed shape several times and a
  mockup built from an old mental model of it will be wrong.

## 4. Block review/scheduler (`/hub/clients/[id]/blocks/[blockId]/review`)

Flagged as **unclear, not confirmed** — `hub-block-module.html` may already cover this state as part of
the block module's flow, or may not. Before drawing anything new here: open `hub-block-module.html` and
check whether it includes a distinct "review a freshly-generated block, approve it, assign a schedule
pattern" state (this is where `BlockScheduler.tsx` lives in the real app). If it's already covered,
this item drops out of scope entirely — don't duplicate it.

## 5. Monthly calendar view for `/hub/schedule`

**Confirmed genuinely new** — the existing `hub-schedule.html` mockup is single-day (matches the live
`ScheduleCalendar.tsx` exactly: a "Studio schedule" heading, ±1-day navigation, one weekday/date header).
Full requirement already written up in `.context/scope-of-works-2026-08-15.md` §2.1 — summarised here so
this brief is self-contained:

- A real month grid, "as you get in Outlook" — every booked session across all clients visible on its
  date, both **desktop and PWA**.
- Sourced from two places: manual staff entry (already possible) and, pending the separate inbound-sync
  decision in the scope doc, Microsoft Bookings-form bookings.
- Must handle a session that's booked (has `scheduled_at`) but has **no workout content defined yet** —
  this is a first-class, expected state now (see the workout-consolidation brief's "session vs workout"
  section), not an edge case to paper over.
- Still open, flagged in the scope doc, not this brief's job to resolve: whether the grid itself needs
  booking creation/edit, or is read-only. Open Design should design the read-only case as the baseline
  and note in the handback what an editable version would need to add, rather than guessing which one
  Craig wants.

## Constraints / things to preserve (all five items above)

- Match the hub's existing design system/tokens exactly — every existing mockup in
  `D:\apps\design-systems\ef-control-hub\desktop\` uses the same `:root` token block (rose/teal/ink/
  navy palette, `--hub-*` surface tokens, DM Sans). Copy it verbatim rather than reinventing it, the way
  every other mockup in this set already does.
- Read the real, current component before designing against it — this app's feature set has moved fast
  enough that an assumption based on the route name alone will be wrong more often than not (the updates
  composer above is the clearest example).
- None of these five need reconciling against a **stale** mockup — there isn't one. This is first-pass
  design, not a parity fix.

## Out of scope

- Anything already covered by `brief-workout-consolidation-opendesign.md` (consolidated logger,
  workout-templates browser skin pass, templates paste-and-assign, portal PWA states) or
  `brief-session-editor-opendesign.md` (exercise-prescription editing internals).
- The ambiguous `hub-parq-edit.html` case from the reconciliation audit — that needs Craig's yes/no on
  whether the legacy PAR-Q editor is even still wanted before any design work happens on it, not a
  default assumption either way.
- Cashflow invoice/transaction detail states (`/invoices/new`, `/invoices/[id]`, `/transactions/[id]`) —
  reconciliation audit found these reasonably covered as states within their parent mockups already;
  not worth a fresh pass unless spot-checking finds otherwise.
