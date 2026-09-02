# Lane brief — BUG-EF-110 (high): Outlook confirm can only attach to an undated session

**WO:** wo-ef-full-grind-2026-09-02 · **Model:** opencode-go/mimo-v2.5
**Worktree:** `D:\apps\worktrees\eternal-fitness-website\ef-bug110`, branch `lane/ef-bug110` off `origin/main` (`da5b24f`).
**File to change:** `lib/outlook-bookings.ts` — the `materializeBookingSession` function only.

## The defect

At line ~180, `materializeBookingSession` picks the session to attach a booking to like this:

```js
const candidate = sessions
  .filter((s) => s.scheduled_at === null && s.status !== "cancelled")
  .sort((a, b) => a.session_number - b.session_number)[0];
```

**It only considers sessions that have NO DATE YET.** Any block planned in advance has a date on
every session, so there is never a candidate. It then falls through to the `else` branch, which
INSERTS a new session with `archetype`, `week` and `phase` all null and
`focus_label: "Outlook booking — <name>"`.

That content-empty row is the "phantom" that has been polluting real client blocks — three were
deleted from Emma Atkinson today alone. Worse, the fall-through throws
`"block already has the maximum of 18 sessions"` once `session_number` would exceed 18.

**Live impact right now:** Emma Atkinson has a fully-dated 18-session block and 29 open bookings.
Every confirm attempt either creates a phantom or throws outright. She cannot reconcile any of them.
CR-EF-095 was marked verified but only ever fixed the undated case.

## The fix — add a slot match as the FIRST rule

Change the candidate selection to try, in this order:

**1. SLOT MATCH (new, and the important one).** A session in this block whose `scheduled_at` equals
the booking's `start_at` — this is the same appointment, already planned. Match on the instant.
Compare as timestamps (`new Date(x).getTime()`), not string equality, because the two values come
from different sources and may differ in formatting or offset representation.

Only accept a slot match if that session is **not already linked to a different Outlook event** —
check `session_calendar_events` for a row on that `session_id` whose `event_id` differs from this
booking's. If it is already linked to another event, skip it and fall to rule 2.

Exclude cancelled sessions and sub-sessions (`parent_session_id` not null) from matching, exactly as
the current code excludes them.

When a slot match is found: do **not** overwrite `scheduled_at` (it already equals the booking) and
do **not** change `status` if the session is already `completed` — only promote `planned` →
`scheduled`. Then upsert `session_calendar_events` and resolve the booking, exactly as the existing
candidate branch already does. Reuse that code path rather than duplicating it.

**2. UNDATED CANDIDATE (existing rule, unchanged).** Earliest `scheduled_at === null`, not cancelled.
Set its `scheduled_at` and status as it does today.

**3. APPEND (existing fall-through, unchanged behaviour but see below).**

## Also: make the append path honest

Leave the append behaviour as-is functionally, but when it appends, set the coaching note to make
clear it did not match anything, e.g. append to the existing note: `"No planned session matched this
slot, so a new empty one was added."` Keep the existing 18-session guard and its error message.

## FORBIDDEN

- Changing any other file. Not the routes, not the sync, not the UI.
- Changing the function signature or return type (`{ sessionId }`).
- Removing or weakening the existing BUG-EF-102 guard at the top (the `session_calendar_events`
  lookup by `event_id` that returns early) — that stays first, before everything above.
- Removing the 18-session cap or its error message.
- A migration. No schema change is needed.
- Running a dev server, a browser, Playwright, `npm install` or `pnpm install`.

## VERIFY

1. Re-read the whole function top to bottom. Confirm the order is: existing-event guard → slot match
   → undated candidate → append, and that a completed session is never demoted to `scheduled`.
2. `grep -n "scheduled_at === null" lib/outlook-bookings.ts` — should now appear only in rule 2.
3. Confirm no duplicated `session_calendar_events` upsert logic — rules 1 and 2 should share it.
4. State plainly what you changed and what you could not verify. **Do not claim the confirm flow
   works** — you cannot run the app. Claude will drive it against real data.

## COMMIT

```
git add lib/outlook-bookings.ts .context/lane-brief-bug-ef-110-2026-09-02.md
git commit -m "BUG-EF-110: match an Outlook booking to the planned session at the same slot before appending"
```

**Commit before you finish — do not exit without committing.** Do not push.
