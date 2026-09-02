# Work Order: Hub-wide border-radius sweep — 2026-08-19

OWNER: claude (this session)
SCOPE: eternal-fitness-website — every `app/hub/**` and `components/hub/**`
       file using `rounded-lg`/`rounded-xl`/`rounded-2xl`. NOT
       `app/(marketing)`, NOT `app/portal`, NOT `tailwind.config.ts` itself.

## Why this WO exists

Craig asked (voice, 2026-08-19) for a full border-radius audit "right
across every face of the app," after CR-EF-064 (block-page card radius
fix) surfaced the pattern and he then spotted the same issue on the
session-logging screen's round-N-of-M exercise boxes, describing them as
looking "cut off."

Root cause (CR-EF-065): `tailwind.config.ts`'s `borderRadius` override maps
`xl` → `var(--radius-xl)` (32px) and `2xl` → `24px`. Those CSS variables
(`app/globals.css`) were deliberately tuned across several commits for the
**marketing site's** softer brand aesthetic — but Tailwind's config is
global, so every **hub** component using `rounded-xl`/`rounded-2xl` also
inherited those oversized values, most visibly on small padded boxes
(e.g. a 10px-padded round box getting a 32px corner).

Confirmed via grep: **93 files, ~500 occurrences** across `app/hub/**` +
`components/hub/**`. The `--radius-xl`/`--radius-lg`/`--radius-md` tokens
are not referenced anywhere else in the codebase — safe to leave in
`globals.css`, they just shouldn't be wired into the shared Tailwind scale
the hub also consumes.

**Not safe to fix via the global Tailwind config** — that would also
reshape marketing pages already built and verified against the current
larger radii (this repo's CLAUDE.md documents rigorous marketing
design-parity work). The fix has to be a scoped sweep through hub files,
replacing the ambiguous shared classes with explicit pixel values.

## Radius rule (apply consistently)

- **Section-level / standalone cards** (the kind of thing that would be a
  `HubCard` or a top-level bordered container): `rounded-[16px]` — matches
  `HubCard.tsx`'s own hardcoded value and the mockups' `.card`/`.sched`/
  `.meta-grid` (16px).
- **Smaller nested boxes** (round groups, sub-cards inside a card, alert
  banners, empty-state placeholders, dialogs sized like a card): `rounded-[12px]`.
- **Buttons, inputs, small controls** (`rounded-lg`, currently `var(--radius)`
  = 12px): leave alone unless visually part of a larger mismatched card —
  12px is close enough to the mockups' ~8px button radius that it's not
  what Craig is flagging; don't touch `rounded-lg` speculatively.
- **Pills/badges/avatars**: `rounded-full` — already correct everywhere,
  not in scope.
- When in doubt, check the padding: a small `p-2/p-2.5/p-3` box next to
  border content should never carry more radius than ~roughly half its
  smaller padding dimension, or corners visually clip.

MUST:
- Every replaced class must be an explicit `rounded-[Npx]`, not a Tailwind
  scale name that could silently re-collide with the global override later.
- Verify each file with `npx tsc --noEmit` after editing.
- Do not touch dialogs/modals unless they visually sit inside the same
  page flow as a mismatched card (case by case, note the decision).
FORBIDDEN:
- `tailwind.config.ts`, `app/globals.css` — global scope, out of bounds.
- `app/(marketing)**`, `app/portal/**`.
- `db/migrations/**`.
DECIDE YOURSELF:
- Whether a given box is "section-level" (16px) vs "nested" (12px) — use
  the padding heuristic above and match sibling elements on the same
  screen for consistency.
ASK FIRST (gates):
- None expected — this is a visual-parity fix with no schema/logic change.
  If a lane finds a `rounded-xl`/`rounded-2xl` usage that's clearly load-
  bearing for something other than visual radius (unlikely), stop and flag.

## DONE
- [x] Session-logging screen (`SessionWorkoutLog.tsx` + its `page.tsx`) —
      part 1, built and pushed to staging (`5a768d2`).
- [ ] `clients/[id]/blocks/[blockId]/**` remaining files (block overview,
      schedule panel, edit drawer, block actions, review/scheduler, print).
- [ ] `clients/[id]/**` remaining files (client detail tabs, notes, tasks,
      updates, documents, edit, new, comms).
- [ ] `components/hub/**` shared components (MedicalTracker, cards, panels,
      tables — high-leverage since they're reused across many screens).
- [ ] Remaining hub areas: dashboard, schedule, exercises, workout-templates,
      training-blocks, templates, tasks, settings, process-quality, reports,
      resources, cashflow (invoices/reconciliation/tax/transactions),
      agreements.
- [ ] Full `tsc --noEmit` clean across every lane's combined diff.

## LANES
- Lane 1 — `clients/[id]/blocks/[blockId]/**` remainder · depends on: none
- Lane 2 — `clients/[id]/**` remainder (excl. blocks subtree) · depends on: none
- Lane 3 — `components/hub/**` shared components · depends on: none
- Lane 4 — cashflow/** (invoices, reconciliation, tax, transactions) · depends on: none
- Lane 5 — dashboard/schedule/tasks/templates/workout-templates/training-blocks/exercises/settings/process-quality/reports/resources/agreements · depends on: none

Each lane is independent (different files) — safe to run concurrently.

CONTEXT: CR-EF-064, CR-EF-065. `.context/change-requests.md`. Craig's voice
report 2026-08-19 evening, following the CR-EF-062/063/064 design-parity
pass on the same session.
