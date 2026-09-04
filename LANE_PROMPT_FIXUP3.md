# Fix-up pass 3 — tsc error introduced by prior cleanup

`npx tsc --noEmit` is currently failing:

```
app/hub/(protected)/clients/[id]/ClientRecordShell.tsx(140,11): error TS2322: Type '{ ... }'
is not assignable to type 'IntrinsicAttributes & TrainingSectionProps'.
  Property 'clientPaceMode' does not exist on type 'IntrinsicAttributes & TrainingSectionProps'.
```

An earlier pass removed the unused `clientPaceMode` prop from `TrainingSection`'s props
interface (it was dead — destructured but never read in the component body) but didn't update
`ClientRecordShell.tsx`, which still passes `clientPaceMode={...}` at its `<TrainingSection>`
call site (line ~140). Remove that now-invalid prop from the call site in
`ClientRecordShell.tsx` (do not re-add it to `TrainingSection` — it was correctly identified as
unused).

Run `npx tsc --noEmit` and confirm it is fully clean (zero errors) before committing. Commit as
a new commit on this branch. Report `git log --oneline -1` and confirm `tsc` is clean and
`git status --short` shows no uncommitted changes.
