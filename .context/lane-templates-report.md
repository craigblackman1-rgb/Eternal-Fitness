# Lane report — workout-templates browser skin + templates paste-and-assign

Date: 2026-08-17 · Worktree: `wo-ef-consol-templates-2026-08-17`

Two pieces shipped in one lane, per the workout-consolidation brief
(`design-systems/ef-control-hub/brief-workout-consolidation-opendesign.md` + the two
sibling OpenDesign briefs). No other lane's files touched.

---

## Piece 1 — Workout-templates browser skin pass

Visual reconciliation of the already-functional browser against
`ef-control-hub/desktop/training/hub-workout-templates.html`. All six filters preserved
(archetype / movement type / muscle group / equipment / difficulty / condition); the API
contract is untouched.

### Archetype-label correction — APPLIED

The mockup (specifically the paste-assign mockup's review step) shows archetype values as
`Cancer rehab`, `GP referral`, `Cardiac` etc. — **not copied**. Archetype in this app's data
model is the Plan Agent's session-type emphasis, stored as raw `A`/`B`/`C` on
`exercises.archetypes`. The filter now uses the real, settings-driven labels:

- `A` → **"Mobility & Movement Quality"**
- `B` → **"Strength & Stability"**
- `C` → **"Power & Conditioning"**

Rendered in the archetype filter as `Type A — Mobility & Movement Quality` (etc.), sourced
from `DEFAULT_ARCHETYPE_FOCUS_LABELS` and resolved live from `plan_agent_settings` via
`resolveArchetypeFocusLabels()` so Esther's renameable labels stay honoured. Row archetype
badges keep the letter but gain a `title` tooltip with the full label.

Clinical/referral condition remains the **separate** `condition_tags` facet — never merged
with archetype.

### Table reconciled to the mockup

Columns now: Template (name + archetype badges) / Exercises / Equipment / Difficulty /
Conditions / Used / Updated. The movement-type **filter** (and muscle-group filter) are
preserved even though the mockup's table omits a movement column.

### Deviation to note

The mockup's "Difficulty" values (`Seated`/`Supported`/`Standing`) are the **same category
of factual error** as the archetype names — the real `workout_templates.difficulty` is a
number (1–5). Kept the existing numeric mapping (Beginner/Easy/Intermediate/Advanced/Expert).

---

## Piece 2 — Templates paste-and-assign flow

New `workout_templates`-creation path: paste → AI structure → review in the existing
`TemplateEditorClient` → save → assign to a client.

- **Paste** reuses `RichTextEditor` (the same `contentEditable` component behind the Updates
  composer's "Paste a draft"), so bold/headings/lists survive a native clipboard paste.
- **Structure** calls the new `POST /api/workout-templates/structure`, which parses the pasted
  text into `SessionVersion` (`warm_up`/`main_block`/`cooldown`) using `aiChat` +
  `QUALITY_MODEL` — the exact same provider/model routing as the Plan Agent and update
  composer (DeepSeek V3.1 via OpenRouter, or Claude Sonnet direct). No new AI provider or
  call pattern introduced. Nothing is written to the DB at this step.
- **Review** reuses `TemplateEditorClient` in a new create mode (`isNew` + `onCreated`) — no
  second editor. First save POSTs a new `workout_templates` row; subsequent saves PATCH it.
- **Assign** calls the existing `POST /api/claude/generate-block` with `templateId`, which
  grounds the client's next block via the Plan Agent. Confirmed `buildTemplateFrameworkSection()`
  (`lib/planAgentPrompt.ts:306`) is invoked inside `buildGenerationSystemPrompt()` →
  `generateViaAi()` → `generateBlockForClient()` — this is the wiring the assign action reuses.

### Deviations from spec

- The paste-assign mockup's "Archetype" dropdown (`Cancer rehab`/`GP referral`/`Cardiac`/
  `Fibromyalgia`…) is **not copied** — it conflates archetype with condition. Archetype is
  derived server-side by the existing `POST /api/workout-templates` from the exercise library;
  it is not a user-chosen field in the paste flow. Condition stays an editable `condition_tags`
  field in the editor.
- `rescaleTemplateSection` **does exist** (`lib/planGeneration.ts:340`) — the brief's L1 note
  that it didn't is stale. It's used only by the non-AI fallback generator; the paste flow
  doesn't call it (assign grounds through the AI/fallback path which handles rescaling itself).
- "New template" is a single CTA into the paste flow, not the mockup's split-button with a
  "Start blank" dropdown (a blank create-mode entry point is outside this brief's scope).
- The mockup's "Into block" selector was dropped — the real assign path always creates the
  next block; there is no manual block-creation path today.

---

## Files changed

**Modified**

- `app/hub/(protected)/workout-templates/workout-template-browser.tsx`
  — archetype filter → labelled `Select`; row badge tooltips; table reconciled to the mockup
    columns; header subtitle + "New template" CTA; pagination "Showing X–Y of Z".
- `app/hub/(protected)/workout-templates/page.tsx`
  — resolves `archetypeFocusLabels` from `plan_agent_settings` and passes it down.
- `app/hub/(protected)/workout-templates/[id]/TemplateEditorClient.tsx`
  — added `isNew` / `onCreated` create-mode support (POST-then-PATCH, delete hidden, date
    fields hidden until a row exists).

**Added**

- `app/api/workout-templates/structure/route.ts` — AI structuring endpoint (returns a draft
  `SessionVersion`, no DB write; auth-gated).
- `app/hub/(protected)/workout-templates/new/page.tsx` — new-template route.
- `app/hub/(protected)/workout-templates/new/TemplatePasteClient.tsx` — paste / structure /
  review / save / assign client flow.

**API contract**: `GET /api/workout-templates` and `GET|PATCH|DELETE /api/workout-templates/[id]`
are unchanged — response shape (`id, name, data, archetypes, condition_tags, usage_count,
created_at, updated_at`) and archetype filter values (`A`/`B`/`C`) intact, so the mobile
Edit Sheet (`EditSheet.tsx`) keeps working unchanged.

---

## Verification

- `npx tsc --noEmit` — **clean** (exit 0).
- `npx next build` — **compiled successfully** (exit 0; new routes `/hub/workout-templates`
  and `/hub/workout-templates/new` in the output, no EPERM failure this run). `pnpm build`
  itself aborts in this worktree because pnpm's deps-status check tries to purge the
  junctioned `node_modules` with no TTY (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`) — an
  environment quirk, not a code issue; `npx next build` runs the same compiler directly.
- No dev server or browser automation run, per instruction.
