# Eternal Fitness — Change Requests

One door for changes: every user-facing change to this app is a numbered CR here before it's built.
Status flow: `raised` → `approved` → `briefed` → `built` → `verified`.

This register did not exist before CR-EF-001 — bootstrapped at first change per the operating model's
"missing contracts bootstrap at first change" rule. No prior CRs are backfilled; history for earlier
work lives in `.context/state.md` and `.context/decisions.log` as before.

---

## CR-EF-001 — Client medication log + Plan Agent context

**Status:** approved (mockup built, pending Craig's sign-off on visual parity before build)
**Raised:** 2026-08-15, Craig, in chat
**Raised by:** Craig

**Ask:** Add a proper medication log to the client profile — what a client is currently on (or
recently came off), common side effects per medication, and have the AI Plan Agent actually read this
context when it builds a training block. Currently `health.medications_relevant` exists in the schema
as a flat `string[]` but has **no edit UI anywhere** (dead field, always empty) and is **never passed
into the Plan Agent prompt** — `buildHardConstraintsSection()` only reads `contraindications` today.

**Decisions locked in with Craig (2026-08-15):**
1. Data model — structured entries, not a flat tag list: `{ name, dosage?, side_effects[], status:
   active|discontinued, notes? }` per medication, not just a name string.
2. Process — full CR + Open Design mockup before any app code (Design Parity Gate, done properly since
   this repo had no CR register yet).

**Mockup:** `D:\apps\design-systems\ef-control-hub\desktop\hub-client-detail.html` (Profile tab, new
"Medications" card, span2, sits directly under the Health card) and `hub-client-edit.html` (Health and
clearance card, new "Medications" repeater section between Pain points and Injury history, matching
the existing injury-history repeater pattern — bordered row, add/delete, `Add medication` button).
Both files updated in place 2026-08-15, JS-verified live (tabs functional, repeater add/remove/side-effect
pill add all work) via a temporary local static server — not yet screenshotted for Craig, confirmed by
page-text extraction instead.

**Scope for build (once mockup approved):**
- `types/index.ts` — change `health.medications_relevant: string[]` to a structured
  `MedicationEntry[]` (name, dosage, status, side_effects[], notes), migrate the type without a DB
  migration (it's a JSONB `profile` column — no schema change needed, just a shape change going forward;
  existing empty arrays are compatible).
- `app/hub/(protected)/clients/new/page.tsx` and `[id]/edit/page.tsx` — new repeater editor, mirroring
  the existing injury-history repeater component pattern in this codebase (find the real
  React equivalent of the mockup's `.rep`/`.rep-row` — check for an existing `InjuryHistoryEditor` or
  similar component to reuse/extend rather than hand-rolling a new repeater from scratch).
- `app/hub/(protected)/clients/[id]/page.tsx` — replace the flat tag-chip rendering (line ~562) with the
  structured card from the mockup.
- `lib/mobile-client-flags.ts` — update the "Medication" flag loop (line ~52) to read `.name` (+ status)
  from the new structured shape instead of a bare string.
- `lib/planAgentPrompt.ts` — extend `buildHardConstraintsSection()` (or add a sibling section) so
  **active** medications and their side effects are surfaced to the Plan Agent as named context, same
  non-negotiable framing as contraindications today. Discontinued medications should NOT be treated as
  live constraints — flag but don't gate on them.
- Both `app/api/claude/generate-block/route.ts` and `app/api/claude/plan-chat/route.ts` call
  `buildHardConstraintsSection()` — both need the new argument threaded through.

**Not in scope:** a shared medication/side-effect reference library (e.g. autocomplete backed by a real
drug database) — side effects stay free-text-with-suggestions, same pattern as contraindications. No
integration with an external medication database or interaction checker.
