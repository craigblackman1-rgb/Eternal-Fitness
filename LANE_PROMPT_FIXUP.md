# Fix-up pass — S0a client-record shell (CR-EF-136)

Your prior commit `f673c4c` ("CR-EF-136: Rebuild client record page shell (S0a)") on this
branch was reviewed. The overall shape is right and no mockup-literal data was found
hardcoded anywhere — good. But the review found 4 real bugs. Fix all 4, commit, and re-run
`npx tsc --noEmit` clean before finishing. Do not touch drawer *content* (still S0b's job).

## 1. `missingBandSet` is computed correctly but never passed through — always `false`

`page.tsx` computes `missingBandSet = latestBlock?.group_type === "band" && !client.band_set`
correctly, but `ClientRecordShellProps` never declares it and `ClientRecordShell.tsx` calls
`<NeedsYouQueue missingBandSet={false} .../>` as a literal. Fix: add `missingBandSet: boolean`
to the shell's props interface, pass the real computed value from `page.tsx` down through
`ClientRecordShell` to `NeedsYouQueue`. Verify by temporarily checking a client with a band
block and no `band_set` renders the "No band set chosen" queue item (then revert any temp
test change).

## 2. Raw `focus_label` bypasses the shared display helper — can leak Outlook placeholder titles

`lib/session-display.ts` exports `sessionWorkoutName` (already used correctly by
`TrainingTabContent.tsx`, `BlockAtAGlance.tsx`, `blocks/[blockId]/page.tsx`) which resolves,
in order: Outlook-placeholder detection → `"No workout assigned yet"`, then `data.focus_label`,
then `DEFAULT_ARCHETYPE_FOCUS_LABELS[archetype]`, then a final fallback string. Your diff
introduced two places that read `focus_label` raw instead:
- `TrainingSection.tsx:99` — `workoutName = workoutSession?.data?.focus_label ?? null`
- `BlockMap.tsx:91` — `s.focusLabel ?? String(s.sessionNumber)`

Both must go through `sessionWorkoutName` (import it from `@/lib/session-display`) instead of
reading `.data.focus_label` directly, so an Outlook-imported session with a raw calendar-title
placeholder renders "No workout assigned yet" (or whatever the shared helper decides) rather
than leaking the raw title into the Next-session panel or a 60×42px block-map cell. Also
remove the dead one-liner at `page.tsx:199` that computes `workoutName` and is never used
(the old `sessionDisplayName` wrapper — confirm nothing else in page.tsx still needs it before
deleting).

## 3. `ClientRecordShell.tsx` re-derives `latestBlock` with pre-BUG-EF-109 logic

`page.tsx:161-169` already derives block status correctly via `deriveBlockStatus()`
(`lib/block-status.ts` — the BUG-EF-109 fix: derive status from actual session completion
rather than trusting the possibly-stale stored `blocks.status` column) and picks `latestBlock`
from that derived map. But `ClientRecordShell.tsx:66-68` independently re-derives its own
`latestBlock` using `blocks.find(b => b.status === "active" || b.status === "approved")` —
trusting the raw stored column again, silently reintroducing BUG-EF-109 on this page. Fix:
pass the already-derived `latestBlock` (and/or `derivedStatusByBlock`) down from `page.tsx` as
a prop instead of re-deriving it in the shell. Do not duplicate the derivation logic.

## 4. Focus doesn't return to the opener when closing the four training drawers

The mockup's drawer standard is explicit: "Focus moves to the drawer heading on open and
returns to the opener on close." `DrawerManager.tsx` implements this correctly WHEN an opener
element is passed (confirmed working via `ClientDrawerStrip.tsx`'s `.ref` buttons). But every
training-drawer trigger passes `null` as the opener instead of the clicked element:
`BlockMap.tsx:72`, and `TrainingSection.tsx:185,223,246,325` (each `openDrawer("dw-...", null)`
call). Fix: pass `e.currentTarget` (the actual button/cell that was clicked) as the opener
argument in all 5 call sites, matching the pattern `ClientDrawerStrip.tsx` already uses
correctly, so focus returns to the clicked session cell/button when its drawer closes.

## Also fix while you're in there (cheap, same files)

- `DrawerManager.tsx`'s `openDrawer` has no depth cap. The mockup's JS has `MAX_DEPTH = 2`
  (force-close the top drawer before stacking a third level). Add the same cap now — S0b will
  need it as soon as drawer content opens a child drawer (block → workout), and it's a small
  addition to code you already wrote.
- `TrainingSection.tsx` destructures a `clientPaceMode` prop that's never used in the component
  body — either use it or remove the unused prop/destructure to keep `tsc`/lint quiet.

## When done

Commit as a new commit on this branch (don't amend `f673c4c`). Confirm `npx tsc --noEmit`
is clean. Report back concisely: which of the 4 fixes you made, and confirm you did NOT touch
drawer content (`ClientDrawers.tsx` stub bodies) — that's still out of scope for this pass.
