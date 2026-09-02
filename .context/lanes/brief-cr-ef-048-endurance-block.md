# CR-EF-048 — Endurance Block document kind — implementation brief

Build a new `client_documents` kind, `endurance_block`, for Eternal Fitness's
hub. It's a manually-editable, calendar-based training block document for
endurance/multi-discipline clients (triathlon, running races) — distinct from
the existing strength Training Block/Session system, which does not apply
here. No AI generation, no session logging. Full context: CR-EF-048 in
`.context/change-requests.md`, and the approved mockup at
`D:\apps\design-systems\ef-endurance-block-editor-cr-ef-048-fad0\endurance-block-editor.html`
(open it in a browser first — it's the visual source of truth for the
calendar table, direction section, pills, and layout; reconcile your build
against it, don't design from scratch). It uses the real EF token set
(`--color-ink/cream/warm/rose/teal/amber`) already defined in
`app/design-system.css` / `app/globals.css` in this repo — reuse those, don't
duplicate the mockup's own `:root` block.

## Do NOT touch
- `blocks` / `sessions` tables or any Training Block/Session Editor code —
  unrelated system, do not conflate.
- Any other document kind's rendering/behaviour — additive only.
- Do not run any SQL migration against the database yourself. Write the
  migration file only; a human runs it.

## 1. Types — `lib/documents/types.ts`

- Add `"endurance_block"` to the `DocumentKind` union.
- Add to `DOCUMENT_KIND_LABEL`: `endurance_block: "Endurance Training Block"`.
- Add new interfaces and wire them into `DocumentBody`:

```ts
export interface EnduranceDisciplineTarget {
  id: string;
  discipline: string; // e.g. "Swim", "Bike", "Run", "Strength/mobility"
  detail: string;      // e.g. "~1-1.5 hrs/week, open water"
}

export interface EnduranceCalendarRow {
  id: string;
  type: "day" | "week_summary";
  date?: string;       // ISO date, "day" rows only
  dayLabel?: string;    // e.g. "Wed" — "day" rows only
  weekLabel?: string;   // e.g. "Week 1 (19-23 Aug, partial)" — "week_summary" rows only
  run?: string;
  bike?: string;
  swim?: string;
  notes?: string;
  highlight?: "brick" | "race" | null; // visual emphasis, "day" rows only
}

export interface EnduranceBlockData {
  targetEvent?: string;         // e.g. "Cross Triatlon Vorden, 1/8th distance"
  startDate: string;            // ISO date
  endDate: string;              // ISO date
  directionIntro: string;       // free paragraph, plain text or simple HTML
  disciplineTargets: EnduranceDisciplineTarget[];
  coachingNotes?: string;       // e.g. "Two brick sessions" callout, plain text or simple HTML
  rows: EnduranceCalendarRow[];
}
```

  Add `enduranceBlock?: EnduranceBlockData` to `DocumentBody`. Everything
  optional/nullable-safe — other kinds must be unaffected.

## 2. Migration — new file `db/migrations/<today's date YYYYMMDD>_endurance_block_document.sql`

Follow the exact pattern of the existing seed at the bottom of
`db/migrations/20260704_document_engine.sql` (the `INSERT INTO
document_templates ... WHERE NOT EXISTS (...)` guard for `kind = 'terms'`).
Insert one `document_templates` row: `kind = 'endurance_block'`, sensible
`name` (e.g. "Endurance Training Block"), `version = 1`,
`requires_client_signature = false`, `requires_trainer_signature = false`,
`is_active = true`, and a starter `body` JSONB with `sections: []` and an
`enduranceBlock` object with empty `disciplineTargets: []`, `rows: []`,
`directionIntro: ""`, `startDate`/`endDate` as empty strings or today's date —
whatever renders cleanly as a blank starting point in the editor you build
below. Guard with `WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE
kind = 'endurance_block')` so it's idempotent. **Do not execute this file** —
just write it; a human runs it against the database.

This is the only schema change needed. Because `document_templates` now has a
row for this kind, the existing generic create flow
(`app/api/documents/route.ts`) will work unmodified — do not add a new create
API route.

## 3. Enable creation — `app/hub/(protected)/clients/[id]/documents/NewDocumentButton.tsx`

Add `"endurance_block"` to the `AVAILABLE_KINDS` list (line ~12) so it appears
in the "New document" dropdown, using `DOCUMENT_KIND_LABEL` for its label
(already generic).

## 4. Editor — extend `app/hub/(protected)/clients/[id]/documents/[docId]/DocumentDetailClient.tsx`

This file currently renders `body.sections[]` generically via
`RichTextEditor` per section (~lines 170-190). When `document.kind ===
"endurance_block"`, render a dedicated editor instead of (or above) the
generic sections loop:

- **Direction panel**: editable intro paragraph (`directionIntro`), an
  editable list of discipline targets (`disciplineTargets` — each row:
  discipline name + free-text detail, add/remove rows), and an editable
  `coachingNotes` callout block. Match the mockup's "Direction" section
  layout and the callout treatment for things like the "Two brick sessions"
  note.
- **Calendar table editor**: an editable grid — columns Date / Day / Run /
  Bike / Swim / Notes — backed by `rows: EnduranceCalendarRow[]`. Support:
  add a day row, add a week-summary row (visually distinct — bold/shaded per
  the mockup), delete a row, reorder isn't required (rows are date-ordered by
  the user typing them in order), and a toggle/select on a day row for
  `highlight: "brick" | "race" | null` that applies the mockup's tinted-row
  treatment. Editing should feel like a spreadsheet (inline contenteditable
  cells or lightweight inputs), not a modal per cell — this is explicitly
  Esther's requirement (see CR-EF-048: "everything needs to be editable... by
  me... not by an AI agent... time is money").
- Header fields: block title (reuse the existing `title` input already on
  this page), plus new inline-editable `targetEvent`, `startDate`, `endDate`.
- Wire all edits through the existing PATCH flow this page already uses
  (`app/api/documents/[id]/route.ts`, `{title?, body?}`) — same debounced/save
  pattern already used for `sections`, just saving the `enduranceBlock` key
  inside `body` instead. Respect the existing `locked` behaviour (status
  `signed`/`superseded` → read-only) even though this kind won't normally be
  signed.
- Add a **"Renew — start next block"** button. On click: POST to
  `/api/documents/[id]/renew` (new route, create it: reads the source
  document, creates a new `client_documents` row with the same `client_id`,
  `kind: "endurance_block"`, a title with the block number incremented if the
  title matches a `Block N` pattern (else append " (renewed)"), and body
  cloned from the source but with `rows: []` and `startDate`/`endDate`
  cleared/advanced by the block's day-span so the new block starts the day
  after the old one ends — copy `directionIntro`/`disciplineTargets` forward
  since those tend to persist block-to-block. Status `draft`, version `1`,
  `supersedes_id` **not** set (this is a new block, not a new version of the
  same one — don't conflate with the existing signature-supersede logic).
  Redirect to the new document's page on success.

## 5. Read view — `lib/documents/render.tsx` (`DocumentBodyView`)

Add rendering for `body.enduranceBlock` when present: the Direction section
(intro paragraph, discipline target list, coaching notes callout) followed by
the calendar table in read-only form, same visual treatment as the editor
(week-summary rows shaded, brick/race rows tinted) but no inputs — this is
what both `DocumentView` (client-facing) and the public sign page
(`app/documents/[id]/sign/`, which reuses `DocumentView`) will show. Also add
an entry to `KIND_EYEBROW` / `KIND_REFERENCE` in
`components/documents/DocumentView.tsx` for `endurance_block` (both objects
already have a `note:` entry to pattern-match against).

## Acceptance

- `npx tsc --noEmit` clean.
- No changes to any other document kind's create/read/edit behaviour —
  diff should be additive except the 2-3 lines adding the new kind to
  existing switch/lookup objects.
- Migration file written but not executed.
- Report back: exact files touched, and any point where you deviated from
  this brief or the mockup and why.
