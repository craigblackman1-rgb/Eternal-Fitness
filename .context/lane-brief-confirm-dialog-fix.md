# Lane: CR-EF-137 review notes — two copy/logic corrections in ClientBookingPanel.tsx

**WO:** wo-ef-full-grind-2026-09-02 · branch `lane/ef-confirm-dialog` (continue on commit 41783cd)

Review of your earlier commit found two things to correct in `components/hub/ClientBookingPanel.tsx`:

1. Around line 107 the block filter excludes `complete`/`completed` but still offers `draft` and
   `approved` blocks under the heading "Pick which active block…". Only `status === "active"` blocks
   are active. Change the filter to offer ACTIVE blocks first; if there are none active but there are
   draft/approved blocks, still offer those but label each option with its real status (e.g.
   "Block 3 · draft"), and change the heading copy so it does not call them active.
2. Around lines 197-198, when every block is closed the dialog says "{client} has no blocks yet —
   create one first". That is false for a client with three completed blocks. Make it: "{client} has
   no open block — all N blocks are complete. Create a new block first." (N = real count).

`BlockStatus` is `"draft" | "approved" | "active" | "complete"` (`types/index.ts` ~line 65).

## FORBIDDEN
Any other file. No dev server, browser, or install.

## VERIFY
Paste the final filter + the two copy strings. Toolchain for tsc is unavailable here — say so.

## COMMIT — DO NOT SKIP
`git add -A && git commit -m "CR-EF-137: only active blocks are called active; honest copy when every block is closed"`
Do not push.
