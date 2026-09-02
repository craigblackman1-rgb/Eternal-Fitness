# Lane: block page tells three different stories — BUG-EF-112, BUG-EF-109, CR-EF-127

**WO:** wo-ef-full-grind-2026-09-02 · Model: opencode-go/mimo-v2.5 · branch `lane/ef-block-truth`

## Three defects, all on the block detail page. Evidence from the LIVE site, Emma Atkinson Block 1.

**1. BUG-EF-112 — the counts disagree with each other on one screen.**
The header reads "1-session block" and "1 of 1 done". The row below reads "Session 1 of 2". The pot
reads "1 used / 24 purchased / 23 remaining" with a legend "Completed 1 · Completed 1 · Free to book 23"
— which sums to 25, not 24, and renders the word "Completed" twice. The same duplicated legend appears
on Block 2 ("Completed 4 · Completed 4"). Cause: a sub-session (parent_session_id set) is counted in
some places and not others, and the legend emits parent and sub-session as separate same-named entries.
FIX: one counting source used by header, row and pot so they cannot disagree. Decide explicitly whether
a supplementary counts toward "sessions done" (it does NOT consume a paid session) and apply that
consistently. The legend must never render two entries with the same label.

**2. BUG-EF-109 — blocks stay Active forever.**
Emma's Block 2 sat "Active" 9 days after its last session, showing "Next session · Mon 17 Aug" — a date
in the past. Nothing transitions a block out of active when its dates elapse, and "next session" derives
from the earliest incomplete session without checking it is in the future. FIX: derive the status
honestly and never advertise a next session that has already passed. Prefer deriving over a stored flag.

**3. CR-EF-127 (descoped by Craig) — two banned words, and ONLY these two.**
Replace "Workout pool" and "Rotation order" with plain English. The sentence "Pool size is independent of
block size" must also go. **Do NOT touch the word "block"** — it is the agreed vocabulary (CR-EF-073) and
must stay. Do NOT touch "Block time off" or any other verb sense of block.

## Files
`app/hub/(protected)/clients/[id]/blocks/[blockId]/` (BlockOverviewClient.tsx and siblings), `lib/session-pot.ts`.

## FORBIDDEN
Anything outside that directory and `lib/session-pot.ts`. Do NOT touch the Outlook schedule pages,
`components/hub/ClientBookingPanel.tsx`, `lib/outlook-bookings.ts`, or any API route — other lanes own those.
No migration. No dev server, browser, or install.

## VERIFY
State what the single counting source now is, and what you decided about supplementaries. `grep -inE "pool|rotation"` on your changed files must return nothing.

## COMMIT — DO NOT SKIP (four lanes today edited correctly then exited without committing)
`git add -A && git commit -m "BUG-EF-112/109 + CR-EF-127: one counting source, honest block status, plain wording"`
Do not push.
