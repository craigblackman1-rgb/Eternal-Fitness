# Hub design↔build parity review — 2026-08-18

**Raised by:** Craig, reviewing `D:\apps\design-systems\ef-control-hub` against the dev/prod
hub and finding a large gap, suspecting Work Orders had "got mashed up" and updates never
implemented. **Reviewed by:** Claude, this session. **Environment:**
`https://development.eternal-fitness.co.uk` (verified identical to `origin/main` — 0 commits
either way — so findings apply to production too).

---

## The short answer

The suspicion was right, but not in the way it looked. **The code mostly got written.** What
broke is record-keeping and sequencing, in four specific, now-identified places — plus one real
question (CR-EF-037, the sessions/blocks redesign) where the honest answer is: **no, it isn't
built**, not even the quick hotfixes.

1. **The whole 18 Aug design delivery sat uncommitted** in `D:\apps\design-systems` — 9 mockup
   files, 433 insertions, with no version to build against. Fixed: committed
   (`design-systems@9032447`).
2. **Code was built ahead of its own mockup.** The client-record and block-module code
   (`c44fa0c`, 13:51) landed **1h43m before** the mockups revising them were even saved to disk
   (15:34–15:37), and was never re-checked once they existed.
3. **The CR register had forked a third time.** `main` stopped at CR-EF-028 while CR-EF-029–041
   were raised and cited by later commits, but only ever committed to an unmerged branch or an
   untracked file. Fixed: recovered, register now runs CR-001–046 with no gaps.
4. **The drift detector (`verify-hub-pages.js`) is structurally blind to this** — it checks
   existence and mapping, not visual/structural match, so it reported green through all of it.

## What actually changed this session

| # | Commit | What |
|---|---|---|
| 1 | `design-systems@9032447` | Committed the 18 Aug mockup delivery (dashboard, client record, block module, schedule ×2, mobile Today, update composer) + its briefs |
| 2 | `design-systems@31de811` | Added a standing rule: commit before code build starts |
| 3 | `eternal-fitness-website@550e079` | Recovered CR-EF-029–041 + their governing docs (assessment, audit, briefs) onto `main`'s register |
| 4 | `eternal-fitness-website@f667e5f` | Added `.context/tools/extract-mockup-structure.mjs` — a derived-verification tool reading every mockup's `data-od-id` section markers |
| 5 | `eternal-fitness-website@3772168` | Fixed `verify-hub-pages.js`'s `SITE_ORIGIN` default (was pointing at a host that doesn't exist) |
| 6 | `eternal-fitness-website@be6c1f5` | **Caught and fixed my own bug** — an earlier bulk status-flip script had corrupted CR-EF-018's status and two prose sentences; found by diffing before finalizing, not by re-running the script |
| 7 | `eternal-fitness-website@644e3f7` | Logged CR-EF-042–046 for the findings below; flipped CR-EF-039/040 to "partially built, deviations found"; re-verified CR-EF-029/030/034 still unfixed |

All pushed as branch `claude/design-dev-hub-alignment-dcb6fb` — not yet merged to `main`, given
how much of the register moved; worth a look before it lands.
[PR link](https://github.com/craigblackman1-rgb/Eternal-Fitness-Website/pull/new/claude/design-dev-hub-alignment-dcb6fb)

No app code (`.tsx`/`.jsx`/`.css`) changed in this pass, per scope — this is a review, not a fix.

---

## Screen-by-screen findings

Depth varies deliberately: full comparison on every screen the 18 Aug consistency pass touched
(where the sequencing risk is real), a code-level check on CR-EF-037's model (where Craig's
question was direct), and a scoped skip on the ~40 screens neither the pass nor this review's
premise ever claimed to have changed.

### Dashboard (`/hub`) — MATCH, one confirmed bug

Quick-actions bar, greeting, 5-tile KPI band, 6-section accordion (Needs attention open,
Recent check-ins / This week's plan / Updates due / Active blocks / Recent clients closed) — all
present, all in mockup order. The "Updates due" accordion section correctly hides when the count
is zero (`page.tsx:467`, conditional — not a bug, a feature the mockup's happy-path screenshot
doesn't show).

**CR-EF-042 [BUG]:** the mockup's quick-actions bar has 4 buttons (New client, **Log check-in**,
Browse exercise library, View all clients); live has 3 — "Log check-in" was never added to the
`HubQuickActions` array.

### Client record + block module (`/hub/clients/[id]`, `.../blocks/[blockId]`) — real drift

The pair built at 13:51, before their mockups existed. Two confirmed, well-evidenced deviations:

**CR-EF-043:** the mockup carries an explicit authoring comment — *"Quick actions bar sits above
the client identity header, not inside it... Edit Client / New Session stay in the header itself
(contextual primary actions)"* — 3 buttons in the bar, 2 in the header. Live puts all 5 in the
bar, nothing in the header. Direct evidence the build wasn't re-checked once the mockup landed.

**CR-EF-044:** mockup's block-module bar is Schedule block (primary) + Edit Block + an overflow
menu (Print/Export/Delete). Live is Edit block + **Add workout** (not in the mockup at all) +
Schedule, different primary/order. Needs a design decision on where "Add workout" belongs, not a
straight match-the-mockup fix.

**CR-EF-045:** client record has a 6th tab, **Plan Agent**, that the mockup doesn't — per the
project's own parity rule this is a feature to keep and report, not drift; the mockup needs
updating, not the code. Separately, the unread-count badge sits on **Comms** in the mockup but on
**Admin** (outstanding actions) live — a real open question about which is correct.

### Mobile Today (`/hub/m`) — visual match, implementation divergence

Live matches the mockup exactly in substance: 2 sections (Sessions open, Tasks due closed), same
labels, same order — confirmed live at `development.eternal-fitness.co.uk/hub/m`.

**CR-EF-046:** the code (`TodayScreen.tsx`) reuses TrainScreen's `.sec`/`.sec-h`/`.sec-b` classes
rather than the mockup's own `.m-section`/`.m-section-h`/`.m-section-b` contract. Cosmetically
invisible — the styling happens to produce the same result — but exactly the "local fork" pattern
CR-EF-039 was raised to retire.

### Session screen (`/hub/clients/[id]/blocks/[blockId]/sessions/[sessionNum]`) — not a build failure

Zero quick-actions bar, zero accordion sections on **both** the mockup and the live code. This
was never brought into the 18 Aug consistency pass on either side — correctly still outstanding
per CR-EF-039's own scope, not a case of code diverging from an already-updated mockup. Worth
flagging because it's the screen Esther uses daily, but it isn't the sequencing bug found
elsewhere.

### Schedule day + month (`/hub/schedule`) — quick-actions match; redesign not built

Bar matches the mockup exactly (New client, Browse exercise library, View all clients — same 3
buttons as the mockup, "Log check-in" was never in the schedule mockups to begin with, so no
bug here). The legend (Booked·workout ready / Booked·no workout yet / Clash) is the old
booking-status model — no trace of CR-EF-037's 5-state session pill, consistent with that CR being
unbuilt (below).

### Everything else (~40 screens: cashflow ×6, clients list/edit/new, documents, updates, training blocks, workout templates, exercise library, training rules, medical tracker, PAR-Q edit, reports, process-quality, resources, studio equipment, plan-agent/integrations settings, mobile clients/train/train-edit)

Not individually walked screen-by-screen. Reason, stated plainly rather than silently skipped: the
app-route inventory taken at the start of this review shows **neither** quick-actions bar **nor**
accordion adopted on any of these routes — matching their own mockups, none of which were touched
by the 18 Aug pass either. The pre-existing inconsistency across this set (8 accordion patterns, 5
card styles, 6 tab styles, 28 raw tables, 4 title sizes) is already fully catalogued in
`audit-hub-structure-consistency-2026-08-17.md` (now recovered onto `main`) — re-walking it here
would duplicate that document, not add to it. If Craig's original concern extends to these older
screens specifically, say so and this review will go through them individually.

---

## CR-EF-037 — the direct answer

**Craig's words: "I thought it had been built." It has not.**

CR-EF-037 is the unified session-state model + calendar-spine redesign — first-class
`status`/`started_at`/`completed_at`, one write path, uid-keyed logs, completed sessions read-only
with an audited Reopen, Mon–Sun weeks derived from real dates, completion shown on the calendar.
Its register status has always been *"raised — G2 not yet ready"* — it was never approved to build,
and this review confirms the code matches that: none of it is live.

Not even the hotfixes that were explicitly scoped as "this week, small lanes, no design
dependency" (`assessment-workout-unification-2026-08-17.md`, Phase 0):

- **H1** (mint an idempotency key on every logging write): `TrainScreen.tsx`'s direct online
  POST/PATCH still sends no `client_op_id` — only the offline-queue fallback has one. **CR-EF-029
  is still live**: nothing stops the duplicate-set-log bug that triple-logged Emma Atkinson's
  session on 17 Aug.
- **H2** (update the local ref after completing a session): `handleComplete` still never touches
  `dataRef.current`/`sessionLogRef.current` after the PATCH succeeds. **CR-EF-030 is still live**:
  a later autosave can still revert a completed session back to "in progress."
- **H6** (render `focus_label` instead of "Session N"): confirmed absent from
  `SessionWorkoutLog.tsx`. **CR-EF-034 is still live.**

None of the eight underlying bugs (CR-EF-029–036) or the model itself (CR-EF-037) have code
against them yet. What exists is the assessment, the root causes, the fix plan, and revised
mockups still waiting on a second Design Parity Gate pass before Craig signs G2. Building any of
Phase 0's hotfixes doesn't need that sign-off — they're independent bug fixes, not the redesign —
but nobody has picked them up.

## Live data risk — surfaced first, not buried in a design report

**CR-EF-029 and CR-EF-030 affect real client data right now**, independent of anything about
mockups:

- 0 of 247 `set_logs` rows in production carry a `client_op_id` — the idempotency layer added
  2026-08-13 has never deduplicated a single write.
- A completed session can silently revert to "in progress" from a stale local ref.

Both are still exploitable today. This is a bug-fix decision for Craig, not a design one.

---

## Register state

`change-requests.md` now runs **CR-EF-001 through CR-EF-046, contiguous, no gaps.** Nothing has
ever reached `verified` — flagged inline; either the status gets used going forward or it should
be dropped from the stated flow.

## Process fixes landed this session

1. **Commit-before-build standing rule** added to the design library's `index.html` — the missing
   build-side counterpart to its five existing design-side rules.
2. **`SITE_ORIGIN` default fixed** in `verify-hub-pages.js` (was `staging.eternal-fitness.co.uk`,
   which isn't a real host; now `development.eternal-fitness.co.uk`).
3. **Structural pre-pass tool added** (`extract-mockup-structure.mjs`) — reads every mockup's
   `data-od-id` markers into a manifest, so future reviews (or an extended `verify-hub-pages.js`)
   can catch a missing/reordered section without a human eyeballing every screen.

## Not done this session — recommended, not implemented

**Split `change-requests.md` into one file per CR.** This is the third register-fork of the same
shape — two concurrent sessions editing one markdown table, one silently overwriting the other's
row on merge. A one-file-per-CR layout with a generated index (the pattern already used for
Claude's own memory directory) would make that class of collision structurally impossible: two
sessions adding CRs touch different files, and git can't lose a row it never had to merge. Not
done here because it's a bigger structural change than this review's scope, and other sessions may
be actively referencing the current single-file layout — worth its own small unit, not a
side-effect of a design-parity pass.

---

## Note on my own process

Mid-review, a bulk find-and-replace script I wrote to correct 6 CR statuses had a bug: it also
flipped CR-EF-018's status (never a target row) and corrupted two sentences of surrounding prose.
Caught by diffing the file against `origin/main` line-by-line before treating any of this as done,
not by trusting the script had worked. Fixed, verified clean, documented in the commit
(`be6c1f5`). Flagging it here because the whole point of this review is not taking "the script ran"
as evidence of correctness — that standard has to apply to my own work in the same pass, not just
the thing being reviewed.

Separately: my first commit to the design-systems mockup library (`9032447`) was pushed directly
from the shared checkout (`D:\apps\design-systems`) before the DO-SOP-010 worktree-isolation hook
caught it on a later commit. That first push is already live on `origin/main` — reverting it now
would add more risk than it removes for a docs/mockup commit, so I left it, but it's a real
process miss worth naming rather than quietly proceeding as if it followed the rule the second
commit onward actually did.
