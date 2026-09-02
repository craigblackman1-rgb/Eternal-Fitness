# Lane: BUG-EF-107 review note — re-saving an unchanged note must not insert a duplicate row

**WO:** wo-ef-full-grind-2026-09-02 · branch `lane/ef-mobile-notes` (continue on the latest commit)

Now that `noteDraft` is pre-filled from the latest `client_notes` row, `handleSaveNote` in
`app/hub/m/train/[sessionId]/TrainScreen.tsx` (~line 879) always POSTs a NEW row. Result: tapping
Save without editing writes an identical second row; editing writes a new row instead of updating.
Esther's profile Notes view would show duplicates.

## Fix
1. `page.tsx` must also pass the latest note's `id` (select `id, note` in the existing query) as a
   new prop `initialSessionNoteId?: string | null` — declare it in the props type AND destructure it.
2. In `handleSaveNote`:
   - if the trimmed draft equals the initially loaded note text → do nothing except close the sheet
     and toast "No changes".
   - else if `initialSessionNoteId` is set → `PATCH /api/client-notes/{id}` with `{ note }` if that
     route exists (check `app/api/client-notes/[id]/route.ts` and its accepted body); if it does not
     exist or does not accept a note update, fall back to the existing POST and say so in your report.
   - else → existing POST.
   After a successful PATCH/POST keep the draft as the saved text and record the saved id/text in
   state so a second Save is again a no-op.

## FORBIDDEN
Any file outside `app/hub/m/train/[sessionId]/` — do NOT edit the API routes. No dev server,
browser, or install.

## VERIFY
Quote the PATCH route's handler signature/body you relied on (file:line). Toolchain for tsc is
unavailable — say so.

## COMMIT — DO NOT SKIP
`git add -A && git commit -m "BUG-EF-107: update the existing session note instead of inserting duplicates on re-save"`
Do not push.
