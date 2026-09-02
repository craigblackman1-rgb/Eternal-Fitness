# Lane: CR-EF-137 — the Outlook confirm dialog is mislabelled and offers closed blocks

**WO:** wo-ef-full-grind-2026-09-02 · Model: opencode-go/mimo-v2.5 · branch `lane/ef-confirm-dialog`

## Context
BUG-EF-110 shipped today. Confirming an Outlook booking now ATTACHES it to the session already planned
at that slot rather than creating anything. The dialog's wording was written for the old behaviour and
now actively misleads.

## Two fixes, in `components/hub/ClientBookingPanel.tsx` only

**1. Wrong verb.** The dialog is titled "Create session" with a primary button "Confirm & create session".
It no longer creates a session in the normal case. Re-word to reflect matching/linking, and where possible
name the session it will attach to (e.g. "This will attach to Session 1 · Day 1 — Full Body, Fri 4 Sep").
Esther has just spent weeks with phantom duplicate sessions; copy that implies creating another one is
exactly the wrong signal.

**2. Offers closed blocks and mislabels them.** The dialog says "This client has more than one active
block" and then lists Block 3 (active), Block 2 (COMPLETE) and Block 1 (COMPLETE). Only one is active.
Default to the active block, and either hide completed blocks or label their real status clearly. Never
describe a completed block as active.

Verified on staging with Emma Atkinson.

## FORBIDDEN
Any file other than `components/hub/ClientBookingPanel.tsx` and its own co-located styles.
**Do NOT touch `app/hub/(protected)/schedule/outlook/`** — another lane owns that whole directory.
Do not change `lib/outlook-bookings.ts` or any API route. No migration, dev server, browser, or install.

## VERIFY
Re-read the file end to end. Confirm no copy anywhere still says a session is being created in the
attach case, and that block status is rendered from real data rather than assumed.

## COMMIT — DO NOT SKIP
`git add -A && git commit -m "CR-EF-137: confirm dialog reflects attaching, and stops offering closed blocks as active"`
Do not push.
