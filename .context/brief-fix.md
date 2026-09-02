# Lane: BUG-EF-111 — one missed copy path: bulk-assign-template

**WO:** wo-ef-full-grind-2026-09-02 · branch `lane/ef-bug111-uids` (continue on top of 2c5f16e)

Review found one copy path you missed: `app/api/sessions/bulk-assign-template/route.ts` (~lines 81-100)
copies `template.data.{warm_up,main_block,cooldown}` verbatim into EVERY selected placeholder session via
`.update({ data: updatedData })`. Assigning one template to N sessions gives N sessions identical uids —
the exact defect. It is an update, not an insert, which is why the insert-grep missed it; semantically it
is content copied into a different session.

## Fix
Apply the same per-session, per-version, per-section `ensureUids(..., { forceNew: true })` you used in
`app/api/blocks/[id]/sessions/route.ts` — inside the loop, so each target session gets its own uids.

## FORBIDDEN
Any other file. No DB, no dev server, browser, install.

## VERIFY
Quote the changed loop. Run `pnpm exec tsc --noEmit` as before and report honestly.

## COMMIT — DO NOT SKIP
`git add -A && git commit -m "BUG-EF-111: bulk template assignment regenerates uids per target session"`
Do not push.
