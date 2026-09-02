# Lane: block page — three patches from the deep review (Emma Atkinson block 1 defects)

**WO:** wo-ef-full-grind-2026-09-02 · branch `lane/ef-block-truth` (continue on top of commit a7a1173)

A read-only review of this page is at `.context/block-page-review.md` in this worktree. READ IT FIRST,
especially sections 1 ("The unhandled state: completed + scheduled_at NULL"), 3 (count sources), 4
("link to slot") and 6 (Recommendation). Implement exactly its three patches, on top of the changes
already committed on this branch:

1. **Pass `completed_at` to every `deriveSessionStatus` call site** so a completed session with
   `scheduled_at IS NULL` derives as completed, not planned:
   `app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx` (~lines 46-51, add the field to the
   `SessionRow` interface ~line 22) and `SessionList.tsx` (~lines 46-52, add to `SessionItem` ~line 12).
   Both already `select("*")`, so the column is present.
2. **Exclude completed and cancelled sessions from the "Link to slot" candidates** in
   `components/hub/BlockPoolView.tsx` (~line 107): a session that has been performed must never be
   offered for re-linking, and a completed session with existing content must not be offered "Link
   workout A" again. Follow the review's filter.
3. **Make the pot counter derivation consistent**: `lib/session-pot.ts` (~line 69) must treat a
   session with `completed_at` set as completed/used, the same way BlockPoolView's slot derivation does.
   Do NOT change what supplementaries (parent_session_id set) count for — they remain excluded.

Sessions with `scheduled_at IS NULL` but `completed_at` set must ALSO render in the page's week
grouping rather than falling out of it: place them by `completed_at` date when `scheduled_at` is
null (see review section 2). If that is more than a small change, do patches 1-3 first, commit, then
attempt it as a second commit.

## FORBIDDEN
Any file outside `app/hub/(protected)/clients/[id]/blocks/[blockId]/`, `components/hub/BlockPoolView.tsx`,
`components/hub/SessionPotCounter.tsx`, `lib/session-pot.ts`, `lib/schedule-dates.ts`. No migration,
no DB, no dev server, no browser, no install. Do not touch the wording changes already made.

## VERIFY
For each patch: file:line of the change and one sentence on the state it now handles. Run
`node D:\apps\worktrees\eternal-fitness-website\ef-grind-staging\node_modules\typescript\bin\tsc --noEmit -p tsconfig.json`
from this worktree if it resolves modules; if it errors on module resolution rather than on your
code, say so plainly.

## COMMIT — DO NOT SKIP
`git add -A && git commit -m "block page: completed-but-unbooked sessions derive as completed, never re-linkable; pot counter consistent"`
Do not push.
