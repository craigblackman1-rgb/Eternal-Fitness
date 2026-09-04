# Fix-up pass 2 — close out S0a (CR-EF-136)

Your previous pass fixed 3 of 4 review findings but left one gap and never committed. Fix
these two remaining items, then commit — this is the last step before S0a is done.

## 1. `BlockMap.tsx:72` still passes `null` as the opener

Every other drawer trigger in this codebase (in `TrainingSection.tsx` and
`ClientDrawerStrip.tsx`) was fixed to pass the clicked element so focus returns correctly on
close. `BlockMap.tsx:72` is the one remaining site:
```
onClick={() => openDrawer("dw-workout", null)}
```
This is the click handler on every session cell in the block map — the single most-used
drawer trigger on the whole page. Fix it the same way as the others:
```
onClick={(e) => openDrawer("dw-workout", e.currentTarget)}
```

## 2. `DrawerManager.tsx` still has no `MAX_DEPTH` stacking cap

Not added in the last pass. Add it now, matching the mockup's own JS (`MAX_DEPTH = 2`,
force-close the top drawer before stacking a third level deep) — S0b will need this as soon
as drawer content opens a child drawer.

## When done

Commit both fixes on this branch (`lane/ef-client-record-s0a`) as a new commit — do not amend
existing commits. Run `npx tsc --noEmit` and confirm clean before committing. Confirm in your
final report that `git log --oneline -1` shows your new commit and `git status --short` is
clean (no uncommitted changes left behind).
