# Lane: DEEP READ-ONLY REVIEW of the block detail page

**WO:** wo-ef-full-grind-2026-09-02 · Model: opencode-go/mimo-v2.5 · branch `lane/ef-block-review`

## THIS IS A REVIEW LANE. YOU MUST NOT EDIT ANY CODE.
Another lane (`lane/ef-block-truth`) is editing these exact files right now. Your only output is a
findings document. If you change a `.ts`/`.tsx`/`.sql` file you will destroy that lane's work.

## Why
Craig has now hit four separate defects on ONE block page and asked for it to be reviewed from the
ground up rather than patched again. Every fix so far has surfaced another problem, which suggests the
model underneath is wrong, not the rendering.

## The live case — Emma Atkinson, Block 1
`https://eternal-fitness.co.uk/hub/clients/8/blocks/a2ece082-2b2b-4786-821b-fc28b9784210`

Verified database state (do not re-derive, trust this):
- Block: `block_number` 1, status `complete`, **`scheduled_start` IS NULL**, note "Upper body focus — post foot surgery (29 Jul 2026), 2x/week"
- Session **1**: archetype B, week 1, completed, scheduled 2026-08-03 09:00, completed 2026-08-03, **21 set_logs**, focus "Workout A — Upper Body Push/Pull + Glutes (Week 1)"
- Session **3**: archetype B, week 1, completed, **scheduled_at IS NULL**, completed 2026-08-10, **22 set_logs**, focus "Workout A — Upper Body Push/Pull + Glutes (Week 1)"
- There is no session 2 (a phantom was removed today), so the numbering reads 1, 3.

## What Craig reports seeing, all on that page
1. "Now shows 2 sessions used" — the count changed after a data fix today.
2. "We are back to week of and plan week" — week grouping/plan-week UI reappeared.
3. "I have an option to link workout A again" — it offers to link a workout that is already there.
4. "Link to slot is broken" — that action fails.

## The question to answer
A **completed session with no `scheduled_at`** appears to be an unhandled state. Work out exactly how
the page treats it, and whether the deeper problem is that the model conflates three different things:
- when a session was **prescribed** (its place in the block: session_number, week, archetype)
- when it was **booked** (`scheduled_at`, owned by Outlook)
- when it was **performed** (`completed_at`, `set_logs`)

Read at minimum: the whole of `app/hub/(protected)/clients/[id]/blocks/[blockId]/`, `lib/session-pot.ts`,
`lib/session-status.ts`, `lib/session-chronological-order.ts`, `components/hub/SessionPotCounter.tsx`,
and the migrations that shaped `sessions` (`20260725_session_scheduling.sql`,
`20260818_session_status_model.sql`, `20260831_sub_sessions_parent_link.sql`,
`20260831_session_charged_free_flag.sql`).

## Produce `.context/block-page-review.md` covering
1. **Every state a session can be in** — the real matrix of (scheduled_at set/null) × (status) ×
   (completed_at set/null) × (parent_session_id set/null) × (charged_free) — and for each, what the page
   does. Mark which combinations are unhandled, and which are impossible-but-not-prevented.
2. **Where "week" comes from** and what happens to a session that cannot be placed in a week.
3. **Every place a count is computed** (sessions used, remaining, done, block size) with file and line,
   and whether they agree. Craig has seen four different numbers on one screen.
4. **What "link to slot" does**, why it is offered for an already-completed session, and why it fails.
5. **A recommendation**: is this fixable by patching, or does the session model need splitting into
   prescription / booking / performance? Give a clear opinion with reasoning, not options.

Be concrete — file paths and line numbers. Quote the code that decides each behaviour.

## FORBIDDEN
Editing ANY file except `.context/block-page-review.md`. No migrations. No database connection.
No dev server, browser, or install.

## COMMIT — DO NOT SKIP
`git add .context/block-page-review.md .context/brief.md && git commit -m "review: block detail page state model and count sources"`
Do not push.
