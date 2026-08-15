# Functionality brief: consolidated workout-logging surfaces (for Open Design)

This is a **functionality + constraints spec**, not a visual spec — no layout, colour, or component
opinions here. Hand this to Open Design to produce mockups; implementation happens against the real
hub codebase and data once the mockups are signed off. Distilled from the full Work Order at
`.context/workorder-ef-workout-consolidation-pwa-2026-08-15.md` (`wo-ef-workout-consolidation-pwa-2026-08-15`)
— that doc has the full lane/gate/verify structure; this is the piece that actually needs a designer.

**L1 (full inventory) is done — this brief now reflects it.** Every route, component, data path, and
cross-link across the three logging surfaces + templates + portal has been verified against the actual
code (not assumed from the WO's original framing), so this should be the only design pass needed. Two
corrections came out of that pass worth reading even if you only skim the rest: the workout-templates
browser already exists and works (§2 below — skin only, not new design), and `rescaleTemplateSection`
(mentioned in the original WO) doesn't exist in the codebase yet.

## G1 and G3 — answered by Craig, 2026-08-15

**G1 — naming, locked in:**

- **Block** — a number of sessions within a timeframe (a 6-week or 12-week block), at 2 or 3 sessions
  a week. A block is the container; it doesn't itself carry exercise content.
- **Session** — one scheduled occurrence within a block. Exactly one workout runs in a session.
- **Template** — a workout, reusable, that runs in a session. A template is workout *content*
  (exercises/sets/reps/structure); a session is *when and for whom* that content gets delivered.

Canonical conversion story that falls out of this: a template gets **assigned into** a session (copied
in as that session's workout); a session's actual content can be **saved back as** a template for reuse
elsewhere. A block is generated (by the Plan Agent, or built manually) as a sequence of sessions, each
either holding its own bespoke workout or a template assignment. Design and copy should use these three
words consistently and never as synonyms for each other (e.g. never call a session a "workout" in a
context where template also means "workout" — pick one).

**G3 — logger consolidation, confirmed:** yes, consolidate. One desktop logging screen replaces both
the Session Editor's inline logger and the Standalone Live Log — no separate desktop-only logger
alongside it. Mobile (Train Screen) is untouched, per the constraints below.

## What this is

Three independently-built staff-facing logging surfaces currently do overlapping jobs, each with its
own components and no shared design source:

| Surface | Route | What it's for today |
|---|---|---|
| Session Editor's inline logger | `/hub/clients/[id]/blocks/[blockId]/sessions/[sessionNum]` | Full prescription-editing workspace at a desk, plus an inline per-set logger (`ExerciseSetLogger`, defined inline in `page.tsx`) |
| Standalone Live Log | `/hub/log/[sessionId]` | A second, lighter logging-only screen, studio-only, added 2026-08-01. No job the other two don't already cover. |
| Train Screen | `/hub/m/train/[sessionId]` | Staff mobile PWA — the flagship live logger (offline queue, rest timers, PB flagging). Most actively developed, keep as the mobile baseline. |

Alongside this, two related but distinct gaps get folded into the same design pass:

1. **Templates paste-and-assign.** Esther currently has no way to paste a workout she's agreed with
   Claude (outside the app) into the hub as a reusable template — she'd have to hand-build it in the
   template editor. Needs a paste box (rich text, same `contentEditable` pattern already used by the
   Updates composer) → AI structuring into the existing template data shape → the existing
   `TemplateEditorClient` for review → save as a `workout_templates` row → assign to a client via the
   existing template-grounding path (`buildTemplateFrameworkSection()` in `lib/planAgentPrompt.ts:306`,
   confirmed real).
2. **Workout-templates browser — correction after L1 inventory: this already exists and works.**
   `/hub/workout-templates` (`app/hub/(protected)/workout-templates/page.tsx` +
   `workout-template-browser.tsx`) is a real, fully-built page: search, filters by archetype/movement/
   muscle group/equipment/difficulty/condition, pagination, table view, click-through to the editor. It
   has never been visually reconciled against a `design-systems` mockup (none exists), but there is no
   missing functionality here — **this is a skin-only design pass, not new UX**, and Open Design should
   be told explicitly not to invent new browse/filter behaviour that already exists and works.
   (Separately: `/hub/templates` is a **different, unrelated system** — `document_templates`, used for
   PARQ/risk-assessment/consent/feedback paperwork, not workouts. Don't conflate the two "templates" —
   see the disambiguation table below.)
3. **Client portal install/offline states**, if any UI is actually needed — the portal currently has no
   PWA manifest at all (falls back to the marketing site's, no service worker), while `/hub/m` already
   has a real one (`public/hub.webmanifest` + `public/hub/sw.js`). Likely no new UI beyond an install
   prompt/offline banner, mirroring what already exists on the hub PWA — confirm whether that's even
   visible enough to need its own mockup, or just a straight implementation port.

### Two "templates" systems — do not conflate

| | Document templates | Workout templates |
|---|---|---|
| Route | `/hub/templates` | `/hub/workout-templates` |
| Table | `document_templates` | `workout_templates` |
| Content | PAR-Q, risk assessment, terms, consent, feedback forms | Reusable `SessionVersion` — warm-up/main/cooldown exercise lists |
| Relevant here? | No — out of scope entirely | Yes — this is the "Template" from the G1 naming above |

### Existing mockups already in the design system — reconcile, don't recreate

`D:\apps\design-systems\ef-control-hub\desktop\` already has `hub-session-editor.html` (matches the
Session Editor route) and `hub-session-log.html` (matches Standalone Live Log, and is still wired up in
`.context/tools/verify-hub-pages.js:66` as that route's canonical mockup). The consolidated desktop
screen should be built by **merging the strongest ideas from both existing mockups**, not started from a
blank file — and `verify-hub-pages.js` needs its route→mockup mapping updated once `/hub/log` is folded,
in the same change, or it'll start reporting false drift. No mockup exists for Train Screen or the
Mid-session Edit Sheet (`hub-train*.html`) — expected and correct, since mobile is explicitly out of
scope here, not a gap to fill.

### Capability matrix — what each surface can do today (L1 inventory, verified against the actual code)

| Capability | Session Editor logger | Live Log | Train Screen (mobile, unchanged) |
|---|---|---|---|
| Offline queue | ✗ | ✗ | ✓ |
| Idempotent writes (`client_op_id`) | ✗ | ✗ | ✓ |
| Rest timer | ✗ | ✗ | ✓ |
| PB badge | ✗ | ✓ | ✓ |
| Warm-up set flagging (excluded from PBs) | ✗ | ✗ | ✓ |
| kg/lb unit switching | ✗ | ✗ | ✓ |
| Voice-dictated notes | ✗ | ✓ | ✗ |
| Roll over previous session | ✓ (latest only) | ✗ | ✓ via Edit Sheet (any past session) |
| Apply / save as template | ✓ | ✗ | ✓ via Edit Sheet |
| Edit prescription (add/remove/swap/reorder, supersets) | ✓ | ✗ (read-only) | ✓ via Edit Sheet |

**This is a real design decision, not just a merge exercise:** neither desktop surface today has PB
badges done safely (Live Log shows them but with no warm-up exclusion — could show a false PB), warm-up
flagging, or idempotent/offline-safe writes. Simply combining the two desktop UIs as they exist would
still leave desktop logging strictly worse than the mobile PWA at the safety-relevant stuff (warm-up-
aware PBs, no risk of a double-submit on a flaky connection). **Recommend the consolidated screen adopts
warm-up flagging + correctly-gated PB badges + `client_op_id` on writes** — flag this explicitly to
Craig if Open Design or implementation decides otherwise, since it's a step down from what mobile
already guarantees.

## Required functionality — what needs a mockup

### 1. One consolidated desktop logging screen
Replaces Session Editor's inline logger + Standalone Live Log with a single design. Must keep doing
everything either predecessor did:
- View + edit the exercise prescription (sets/reps/tempo/rest, superset grouping) — already covered by
  the separate editable-session-editor brief (`brief-session-editor-opendesign.md`) if that hasn't
  shipped yet; don't redesign that part, just make sure this screen is the one place it lives.
- Log actual performed sets against the prescription, at a desk (mouse/keyboard, not touch-first —
  that's what Train Screen is for).
- Whatever `/hub/log`'s "quick, no prescription-editing, just log it" use case was solving — confirm in
  the mockup how a studio session gets logged quickly without needing the full editor, so nothing is
  lost when `/hub/log` is retired.
- Every existing entry point that currently links to `/hub/log/[sessionId]` must land somewhere sensible
  on the new consolidated screen — a redirect, not a dead end. Confirmed by L1 as the **complete** list
  (full-repo grep, nothing else references this route):
  1. `app/hub/(protected)/schedule/ScheduleCalendar.tsx:304` — client name link on each schedule entry.
  2. `app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx:226` — block overview's green "Log"
     button per session (sits next to the "Edit session" link at line 232, which opens the Session
     Editor route with `?edit=1`).
  3. `.context/tools/verify-hub-pages.js:66` — not app code, but will need its route→mockup mapping
     updated in the same change (see above) or it'll report false drift.
- Should adopt Live Log's PB badge and voice-dictated notes (the two things it does that Session
  Editor's logger doesn't) rather than silently dropping them — see the capability matrix above.

### 2. Workout-templates browser (skin only — see correction above)
The browse/search/filter functionality at `/hub/workout-templates` already exists and works. This is a
**visual reconciliation pass against the existing app page**, not new design — Open Design should look
at the live page (or the component, `workout-template-browser.tsx`) before drawing anything, the same
way every other already-built hub page gets its mockup reconciled rather than invented. A path into
"assign to client" (feeding the paste-and-assign flow below and the existing template-grounding AI path)
is the one piece worth confirming is actually present and not just implied.

### 3. Templates paste-and-assign flow
- A paste box that accepts rich-text (bold/headings/lists survive, same as the Updates composer fix).
- After AI structuring, the result opens in the existing `TemplateEditorClient` for Esther to review/
  edit before saving — never silently save an AI-parsed structure unreviewed.
- From there: save as template, or assign directly to a client's next block.
- Design for a realistic "messy paste" — Esther's actual pasted text won't always be clean.

### 4. Portal PWA install/offline states (if any UI is needed)
Mirror the hub's existing pattern (cache-first static assets, network-only `/api/*`, scoped to
`/portal/` only — marketing site's own manifest stays untouched). If the honest answer is "no visible
UI beyond the browser's native install prompt," say so rather than inventing screens.

## New requirement, folded in 2026-08-15 — logging must handle a session with no workout defined yet

Craig raised this while scoping the in-app monthly-calendar work (see
`.context/scope-of-works-2026-08-15.md` §2.1 for the full context): a **session (the booking — client +
time slot) and the workout assigned to it are two separate things that can exist independently.** A
client can be booked for a slot — via manual staff entry or, pending a separate decision, via the
Microsoft Bookings form — with no workout content decided yet. Esther may deliberately leave it
undefined until the client actually arrives, since her USP is adapting the session to how the client
presents that day rather than always running a pre-planned workout.

Verified directly against the code: `sessions.data` already supports being empty (`'{}'::jsonb` is the
column default) — this isn't a new database state. What's actually missing is **UI**: neither Train
Screen nor the desktop Session Editor has any handling today for a session whose `data` has no warm-up/
main/cooldown content at all (checked directly, zero matches for empty-state handling in either). Both
currently assume a workout already exists to display/log against.

**This becomes a requirement for the consolidated desktop screen and (especially) the PWA**, not a
separate feature: whichever screen a staff member opens for a session with no workout yet must offer a
clear "build the workout now" path — pick from a template, roll over a previous session, or build from
scratch — right there, not a broken/empty logging view. Given Craig's framing ("it's essential that the
PWA has the ability... to edit a workout on the fly"), this is highest-priority on the mobile side,
since defining-on-the-day is explicitly a studio-floor, PWA-first workflow, not a desk-planning one.

**Not yet decided, flagged in the scope doc, relevant to how far this brief's screens need to reach:**
whether a session can exist without belonging to a block at all (today `sessions.block_id` is `NOT
NULL` — every session is generated as part of a block up front). If bookings need to exist ahead of any
block/workout planning, that's a schema change outside this brief's scope — Open Design should design
for "session exists, workout empty" as the state to handle, without needing to know whether that
session's block was auto-created or pre-existing; that distinction doesn't change what the logging
screen looks like.

## Constraints / things to preserve

- **Train Screen (mobile) is the design baseline for mobile logging and does not get redesigned here.**
  It just shipped offline queueing, PB detection, warm-up exclusion, and band-unit locking — none of
  that regresses. This brief is about desktop + templates + portal, not mobile logging.
- Match the hub's existing design system/tokens — check `D:\apps\design-systems\ef-control-hub\desktop\`
  for the current card/table/badge idiom (e.g. `hub-client-detail.html`) rather than introducing a new
  visual language for just these screens.
- Templates paste-and-assign must reuse `TemplateEditorClient` for the review step — no parallel
  template editor invented alongside it. **Correction after L1: `rescaleTemplateSection` does not exist
  in the codebase today** (grepped repo-wide — only referenced in planning docs, not implemented). This
  doesn't block the design pass, but flag it as a real implementation gap for whoever builds L4 rather
  than an already-solved piece — design shouldn't assume rescaling behaviour is a given without checking
  what, if anything, currently adjusts template volume/load when applied to a different client.
- The Mid-session Edit Sheet (mobile, unchanged, `EditSheet.tsx:841`) already assumes and depends on
  `/hub/workout-templates`'s filters ("the same archetype filters as the desktop template browser") and
  on `GET /api/workout-templates`'s response shape (`id, name, data, archetypes, condition_tags,
  usage_count, created_at, updated_at`). Any redesign of the workout-templates browser must keep that
  API contract compatible, or the mobile Edit Sheet breaks even though it's nominally "not touched" by
  this brief.

## Out of scope (don't design for these)

- Redesigning the exercise-prescription editing itself (drag/reorder/superset grouping) — covered by
  `brief-session-editor-opendesign.md` if still outstanding; this brief only concerns where that editor
  lives relative to logging, not its internals.
- Any change to how blocks/sessions are generated by the Plan Agent.
- A portal PWA icon/branding refresh — reuse whatever the hub PWA already established unless there's a
  concrete reason it doesn't fit the portal.

## Handback format

Same as this project's other Open Design work: self-contained `.html` mockup(s) in
`D:\apps\design-systems\ef-control-hub\desktop\` (or a `mobile/` sibling only if portal-PWA states
need a phone-width artboard), using this repo's existing CSS variables/tokens. Flag every deviation and
every open question (especially G1/G3 above) explicitly in the handback — don't let Craig discover a
scope decision by eye later.
