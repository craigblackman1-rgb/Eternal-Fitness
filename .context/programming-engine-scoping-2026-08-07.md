# Programming-engine scoping audit — 2026-08-07

Research-only pass (Lane D of `workorder-marketing-hub-followups-2026-08-07.md`), checking Esther's 4-module brain-dump against what's actually built. Codebase-grep level, not exhaustive click-through — flag anything below marked "uncertain" for a real click-through before treating as confirmed either way.

## Esther's 4 modules vs. what exists

### 1. Master Template Registry & Cloner
**Mostly exists, one real gap.** `workout_templates` table (`db/migrations/20260802_workout_templates.sql`) already stores reusable session prescriptions with `condition_tags`, `archetypes`, `movement_type`, `muscle_groups`, `difficulty` — this is Esther's "condition-specific frameworks" ask, already built, not "Movement Slots" terminology but functionally the same shape (a template with swappable/taggable exercise data). `app/hub/(protected)/workout-templates/workout-template-browser.tsx` (365 lines) provides a browsing/filtering UI.
**Gap:** no "Assign Template" dropdown found on the client profile, and no clone-to-client-program action found in the template browser (grepped for apply/clone/use-template handlers — none found). Templates can be *browsed* but not obviously *applied to a client* in one click. Needs a real click-through to confirm before treating as a confirmed gap — the apply action may exist under different naming.

### 2. Session Roller Engine (roll forward previous session)
**Not found.** Grepped for "roll over"/"roll_over"/"RollOver" across `app/` and `components/` — no matches. `sessions` + `set_logs` tables exist and hold exactly the historical data (exercise IDs, sets, reps, tempo, weight, cues) this feature would pull from, so the data foundation is there, but no button/action was found that copies a previous session forward into a new one. Likely a genuine gap, not just a naming mismatch — worth confirming with Esther whether she's manually re-entering this today.

### 3. Inline Exercise Swap + Volume Skeletons
**Exercise swap: exists.** `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/swap-exercise-dialog.tsx` (159 lines), wired into `SessionEditor.tsx` — a swap-exercise feature is already built in the session editor. Not verified in this pass whether it retains sets/reps/tempo on swap (Esther's specific ask) — needs a read of the dialog's logic, not just its existence.
**Volume Skeletons (preset set/rep structures like "4x6 Strength"): not found.** No grep hits for skeleton/preset-volume patterns. Likely a genuine gap, though it may be a small addition given the exercise data model already carries sets/reps/tempo fields.

### 4. Relational Update Module (client check-in reading current program + logging RPE/actual weight/notes)
**Partially exists.** `set_logs` table (`db/migrations/20260725_session_set_logs.sql`) already supports per-set logging. The existing session-delivery flow (SOP-005 "Session Delivery & Real-Time Adaptation") implies some live logging already happens. Not confirmed in this pass whether the update/check-in screen already pulls the *current active program's parameters* and displays them alongside input fields the way Esther described, or whether it's closer to a blank log — needs a real click-through of the session logging screen (`app/hub/log/[sessionId]/LiveSessionLog.tsx`) to confirm.
The "sidebar toggle showing last 12 months of Trainerize notes for the selected exercise" — `TrainerizeHistoryPanel.tsx` exists in `components/hub/`, suggesting this specific ask is already built. Not click-through verified.

## Recommendation

Before writing any build lanes against Esther's brain-dump:
1. Real click-through (preview skill, not grep) of: template browser → is there an apply/assign action; swap-exercise dialog → does it retain sets/reps/tempo; session logging screen → does it show current program params inline; `TrainerizeHistoryPanel` → does it already do the 12-month lookback Esther asked for.
2. If step 1 confirms most of this already exists under different names, the real remaining work is likely much smaller than Esther's 4-module dump implies — possibly just the "Session Roller" (roll-forward) and "Volume Skeletons" (preset generator), plus the template-to-client assign/clone action.
3. The Aug 31 2026 date should be sanity-checked against the *actual* remaining scope once step 1 is done, not against the original dump's apparent size.

Not started: no code written, no lanes opened. Purely a grep-level map for Craig/Esther to react to.
