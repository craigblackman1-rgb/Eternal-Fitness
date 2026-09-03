# CR-INF-008 — Agent and lane runs that exit 0 without completing their unit

**Raised:** 2026-09-03 by Craig, off the back of a single session in which it happened five times.
**Project:** infrastructure · **Status:** raised

---

## The problem

An OpenCode lane, or an Open Design run, reports success and has not done the work. `exit 0` means
the process ended. It does not mean the unit is done. Every one of the cases below passed whatever
check the runner applies, and every one was caught only because a human read the worktree.

## Evidence from 2026-09-03 — five failures in one working session

| # | Lane / run | Reported | Actually happened |
|---|---|---|---|
| 1 | `ef-upload-mime` (1st) | exit 1 | Died mid-investigation on an internal tool error: `Error: Expected 'id' to be a string.` No output. |
| 2 | `ef-contrast-sweep` (1st) | **exit 0, "finished successfully"** | Spent its ENTIRE budget reading files. Zero edits, zero commits, clean worktree. The task was a 108-occurrence mechanical find-and-replace. |
| 3 | `ef-cron-inbound-only` | **exit 0, "finished successfully"** | Wrote the correct change and never committed it. Work sat uncommitted in the worktree; a later `git log` would have shown nothing and the unit would have looked un-started. |
| 4 | `ef-cr137-queue-wording` | exit 0, tsc clean | Shipped a real regression: moved `confirming` state into an extracted component while leaving the `finally { setConfirming(false) }` behind in both parents. On a failed confirm the button sticks on "Confirming…", disabled, permanently. `tsc` was perfectly happy. |
| 5 | `ef-r1-leftovers` | exit 0, tsc clean | Over-reached its brief and produced five self-contradictory copy pairings, including an `aria-label` that disagreed with its own visible placeholder. |

Plus, separately, **Open Design**: eleven runs were started against ONE project, so OD reused that
project's single conversation for all eleven. One run alone recorded **2.79M effective input tokens
at a 94% cache-read ratio**. Four surfaces completed; the rest died. Craig diagnosed it from the OD
UI: *"you pushed every request to one chat session"* / *"you need one per request"*.

## What is already known

- **Exit code is not a completion signal** for either runner. The `/gate` skill already carries a
  "Lane output check" gate saying exactly this, added 2026-08-29 after two similar cases. It is
  being followed — that is why all five were caught — but it is a manual check by the dispatching
  session, every time, forever.
- **Budget ordering matters.** Case 2 was fixed by re-dispatching with the instruction inverted:
  *make the edit and commit FIRST, investigate the edge cases afterwards.* The retry committed 88
  changes across 35 files. Same model, same task, different ordering.
- **A commit is not the finish line either.** Cases 4 and 5 committed clean, type-checked code that
  was wrong.
- **OD needs one conversation per request.** `create_project` mints a fresh conversation; reusing a
  project reuses its conversation.

## What this CR should determine

1. **Why does a lane exit 0 having produced nothing?** Is it budget exhaustion presented as success,
   a silent tool failure, or the agent deciding it was finished? The `.context/lanes/*.log` files
   and the OD `events.jsonl` are the evidence.
2. **Can the runner detect it itself?** `launch-opencode-lane.ps1` already knows the worktree. A
   post-run check — did the branch gain a commit, is the tree dirty, did the named files change —
   would turn a silent no-op into a visible failure without any human reading a diff.
3. **Should "commit first" become the standard lane prompt shape?** One data point is not a rule,
   but it is a cheap change to the template if it holds up.
4. **What is the right OD dispatch pattern?** One project per surface is the fix used today. Confirm
   whether that is the intended usage or whether a conversation can be minted per run inside one
   project.
5. **Cost.** Case 2 burned a full lane budget for zero output. The eleven-into-one OD dispatch burned
   most of eleven. Quantify from `opencode stats` and the OD diagnostics so the fix can be justified.

## Not in scope

Changing the model. `opencode-go/mimo-v2.5` is the standing choice and is not on trial here — the
same failure shape appeared on both the OpenCode lanes and the Claude-agent OD runs, so it is not
a model-quality question.

## Suggested first move

Read `D:\apps\eternal-fitness-website\.context\lanes\ef-contrast-sweep-20260903-075413.log` (case 2,
the clean no-op) against `ef-contrast-sweep-2-20260903-081652.log` (the retry that worked). Same
task, same model, same worktree, opposite outcomes. Whatever differs between those two logs is the
answer to question 3, and probably to question 1.
