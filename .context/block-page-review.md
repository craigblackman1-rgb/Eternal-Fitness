# Block detail page — state model and count review

**Date:** 2026-09-02 · **Model:** opencode-go/mimo-v2.5 · **WO:** wo-ef-full-grind-2026-09-02
**Live case:** Emma Atkinson block 1, client 8, block `a2ece082-2b2b-4786-821b-fc28b9784210`

## 1. Session state matrix — what exists, what is handled

### The real dimensions

A session row carries these independent axes:

| Axis | Values | Migration |
|------|--------|-----------|
| `status` | `planned` · `scheduled` · `in_progress` · `completed` · `cancelled` | 20260818 |
| `scheduled_at` | timestamp or NULL | 20260725 |
| `completed_at` | timestamp or NULL | 20260818 |
| `parent_session_id` | UUID or NULL | 20260831 |
| `charged_free` | `charged` · `free` · NULL | 20260831 |

### Status derivation precedence

`deriveSessionStatus` (`lib/session-status.ts:28–35`) applies this chain:

```
cancelled_at set OR status === "cancelled"  → cancelled
completed_at set OR session_log.completed_at set OR status === "completed"  → completed
status === "in_progress"  → in_progress
scheduled_at set OR status === "scheduled"  → scheduled
else  → planned
```

The DB constraint (`20260818:49`) allows only `planned | scheduled | in_progress | completed | cancelled`. The derivation adds the column-check fallback so columns that predate the status column still work.

### The unhandled state: completed + scheduled_at NULL

This is the state Emma Atkinson's session 3 is in. The derivation **handles it** — `completed_at` is set, so `deriveSessionStatus` returns `"completed"`. But the **block page's server-side status function does NOT call `deriveSessionStatus` with `completed_at`**.

`page.tsx:45–52`:
```ts
function sessionStatus(s: SessionRow): SessionStatus {
  return deriveSessionStatus({
    status: s.status,
    cancelled_at: s.cancelled_at,
    scheduled_at: s.scheduled_at,
    session_log: s.data?.session_log,
    // ← completed_at is NOT passed
  });
}
```

Compare `SessionList.tsx:46–53` (client-side, same page):
```ts
function sessionStatus(s: SessionItem): SessionStatus {
  return deriveSessionStatus({
    status: s.status,
    cancelled_at: s.cancelled_at,
    scheduled_at: s.scheduled_at,
    session_log: s.data?.session_log,
    // ← completed_at is also NOT passed here
  });
}
```

And `BlockPoolView.tsx:75–81` (client-side, different component):
```ts
const status = deriveSessionStatus({
  status: s.status,
  cancelled_at: s.cancelled_at,
  scheduled_at: s.scheduled_at,
  completed_at: s.completed_at,  // ← THIS ONE PASSES completed_at
  session_log: s.data?.session_log,
});
```

**Three surfaces derive status from the same function with different inputs.** If the `status` column is the canonical truth and is correct, this divergence doesn't matter — all three return the same thing. But if `status` lags (which is the stated reason for the defensive derivation), the three surfaces disagree.

For Emma's session 3 (completed_at set, scheduled_at NULL, status column unknown):
- If `status === "completed"` → all three return "completed" ✓
- If `status === "planned"` → `page.tsx` and `SessionList.tsx` return "planned" (wrong); `BlockPoolView.tsx` returns "completed" (correct)
- If `status` is NULL (pre-migration row) → same divergence

**The count discrepancy Craig saw** ("2 of X done" vs "X of X done") is this exact bug. The summary card at `page.tsx:230` computes `completedSessions` using the page-level `sessionStatus`, which omits `completed_at`. The BlockPoolView computes its own status with `completed_at` included and gets it right.

### Complete state matrix

| # | status | scheduled_at | completed_at | parent_session_id | charged_free | Page behaviour |
|---|--------|-------------|-------------|-------------------|-------------|----------------|
| 1 | planned | NULL | NULL | NULL | NULL | SessionRow: "Edit" or "Assign workout" + "Schedule". Week group: "Plan week N". Pot: not counted. |
| 2 | planned | set | NULL | NULL | NULL | SessionRow: "Edit"/"Assign" + "Reschedule". Week group: "Week of …". Pot: not counted. |
| 3 | scheduled | set | NULL | NULL | NULL | SessionRow: "View" + "Reschedule". Week group: "Week of …". Pot: not counted. |
| 4 | in_progress | set | NULL | NULL | NULL | SessionRow: "Resume" + "Reschedule". Week group: "Week of …". Pot: not counted. |
| 5 | completed | set | set | NULL | NULL | SessionRow: "View". Week group: "Week of …". Pot: counted (used++). ✓ |
| 6 | completed | NULL | set | NULL | NULL | **⚠ Divergent.** Page says "planned" (if status column is stale). BlockPoolView says "completed". Pot: counted if status column is correct. |
| 7 | cancelled | set | NULL | NULL | NULL | SessionRow: "View" + cancelled info. Week group: "Week of …". Pot: depends on charged_free. |
| 8 | cancelled | NULL | NULL | NULL | NULL | SessionRow: "View" + cancelled info. Week group: "Plan week N". Pot: depends on charged_free. |
| 9 | any | any | any | set | any | Sub-session. Excluded from pot, chronological numbering, week groups. Renders as SubSessionRow nested under parent. |
| 10 | completed | set | set | set | NULL | Sub-session (supplementary). Excluded from pot. Status pill shows "Completed" in nested row. |
| 11 | cancelled | set | NULL | NULL | NULL | Cancelled. If charged → pot count. If free → not counted. If NULL → unreviewed (warning badge). |
| 12 | any | any | any | any | set | Charged_free flag only meaningful when status = "cancelled". Ignored for other states. |

**Row 6 is the active bug.** It is the only state where the page's own summary card disagrees with the BlockPoolView component on the same page.

**Impossible-but-not-prevented states:**
- `status = "completed"` + `completed_at = NULL` + `session_log.completed_at = NULL` → status was set directly without the timestamp. The derivation returns "completed" but there is no date to show. The session would appear in the pot count with no completion date.
- `status = "scheduled"` + `scheduled_at = NULL` + `completed_at = NULL` → status was set directly to "scheduled" without a booking date. Derivation falls through to "planned" because `scheduled_at` is NULL and `status === "scheduled"` isn't checked (the derivation checks `scheduled_at || status === "scheduled"`, but wait — it IS checked at `lib/session-status.ts:34`). Actually this returns "scheduled" because `source.status === "scheduled"` is true. The session shows as "Scheduled" in the pill but has no date. The BlockPoolView would put it in "unbooked" (no scheduled_at).
- `status = "cancelled"` + `cancelled_at = NULL` → status set directly. Derivation returns "cancelled" regardless of cancelled_at. Pot logic still works (it checks status, not cancelled_at).

## 2. Where "week" comes from

`groupSessionsByWeek` (`lib/schedule-dates.ts:119–156`) does the grouping:

```ts
for (const s of sessions) {
  if (s.scheduled_at) {
    const monday = isoToMonday(s.scheduled_at);  // derived from date
    // → goes into "Week of …" group (kind: "scheduled")
  } else {
    // → goes into "Plan week N" group (kind: "plan"), using stored s.week ordinal
  }
}
```

**Two types of groups exist:**
1. **Scheduled weeks** — keyed by the Monday of the ISO week containing `scheduled_at`. Label: "Week of 24 Aug". Sessions within are sorted by `scheduled_at`.
2. **Plan weeks** — keyed by `p${week}` (the stored `week` integer). Label: "Plan week 1". Sessions are unsorted (input order = `session_number` order from the DB query).

Output order: scheduled weeks first (chronological), then plan weeks (ordinal ascending). This means unscheduled sessions always appear at the bottom.

**A session that cannot be placed in a week:** This happens when `scheduled_at` is NULL and `week` is NULL. The code does `planWeeks.get(s.week)` — `Map.get(null)` returns `undefined`, so it creates a new group with key `"pnull"`. One group labelled "Plan week null" appears at the bottom. The DB column `week` has `NOT NULL DEFAULT 1` (from the original schema), so NULL `week` values should not exist in practice, but nothing in the grouping code guards against it.

**A session with `scheduled_at` set but a NULL `week`:** This works fine — it goes into a scheduled week derived from the date, and the stored `week` is irrelevant.

## 3. Every count source — where Craig's four numbers come from

### Count 1: Header subtitle — "2-session block"
**File:** `page.tsx:206`
```ts
{totalSessions}-session block
```
Where `totalSessions = potSessions.length` (`page.tsx:93`), and `potSessions = sessions.filter(s => !s.parent_session_id)`.

For Emma's block (2 sessions, no sub-sessions): **2**.

### Count 2: Summary card — "X of Y done"
**File:** `page.tsx:230`
```ts
{completedSessions} of {totalSessions} done
```
Where `completedSessions = potSessions.filter(s => sessionStatus(s) === "completed").length` (`page.tsx:94`), using the **page-level** `sessionStatus` which omits `completed_at`.

For Emma's session 3 (completed, scheduled_at NULL):
- If `status === "completed"` in DB: **2 of 2 done** ✓
- If `status === "planned"` in DB: **1 of 2 done** ✗ (session 3 is missed)

### Count 3: Session pot counter (SessionPotCounter)
**File:** `BlockPoolView.tsx:67`
```ts
const pot = deriveSessionPot(sessions, sessionsPurchased);
```
This passes all sessions (including sub-sessions, but `deriveSessionPot` filters them at `session-pot.ts:60`). The pot function checks `status` (with its own fallback derivation at `session-pot.ts:68`) and does NOT use `completed_at` directly.

`session-pot.ts:67–81`:
```ts
for (const s of potSessions) {
  const status = s.status ?? deriveStatusFromColumns(s);
  if (status === "completed") {
    completed++;
  } else if (status === "cancelled") {
    // charged_free handling
  }
}
```

The fallback `deriveStatusFromColumns` (`session-pot.ts:108–113`):
```ts
function deriveStatusFromColumns(s) {
  if (s.cancelled_at) return "cancelled";
  return s.status ?? "planned";
}
```

This does NOT check `completed_at` either. So the pot counter agrees with the page summary — both miss the completed-but-unbooked session if `status` is stale.

But **BlockPoolView's** slot data derivation at line 75 DOES pass `completed_at`. So within the same BlockPoolView component, the pot counter says "1 completed" while the slot's own status pill says "Completed". This is the visible contradiction.

### Count 4: Workout pool count
**File:** `BlockPoolView.tsx:500`
```ts
{rotationPool.length} planned · {rotationPool.filter((s) => s.status === "completed").length} delivered
```
`rotationPool` is `slotData.filter(s => s.status !== "completed" && s.status !== "cancelled" && !s.parent_session_id)` (line 110–112). The status here comes from `deriveSessionStatus` with `completed_at` included. So this count is correct for the completed-but-unbooked session.

For Emma: rotationPool has 2 sessions (both non-completed per the derivation with `completed_at`), but wait — session 3 IS completed. If the derivation correctly returns "completed" (because `completed_at` is set), then `rotationPool` would exclude it, leaving 1 session in the pool.

### Summary of disagreement

| Count source | Passes `completed_at`? | Emma session 3 result |
|---|---|---|
| Header ("2-session block") | N/A (row count) | 2 |
| Summary card ("X of Y done") | **No** | may say "1 of 2 done" |
| Session pot counter | **No** | may say "1 completed" |
| Workout pool ("X delivered") | **Yes** | "1 delivered" |
| BlockPoolView slot pill | **Yes** | Shows "Completed" pill |

Craig sees four different numbers because: the pot counter says "1 used", the workout pool says "1 delivered", the summary card may say "1 of 2 done", and the slot itself shows "Completed". The underlying cause is two derivation sites disagreeing on whether to include `completed_at`.

## 4. What "link to slot" does

### The UI
**File:** `BlockPoolView.tsx:438–471`

In the "unbooked sessions" section (sessions without `scheduled_at`), a `<select>` dropdown appears:
```tsx
<select ... onChange={async (e) => {
  const parentId = e.target.value;
  const parent = sessions.find((s) => s.id === parentId);
  const res = await fetch(`/api/sessions/${slot.session.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      parent_session_id: parentId,
      scheduled_at: parent.scheduled_at,
    }),
  });
}}>
  <option value="">Link to slot…</option>
  {bookedSlots.map((bs) => (
    <option key={bs.session.id} value={bs.session.id}>
      {bs.dayLabel}
    </option>
  ))}
</select>
```

### What it actually does
It PATCHes the unbooked session with `parent_session_id = <chosen slot>` and `scheduled_at = <parent's scheduled_at>`. This converts the session from a main session into a sub-session (supplementary work).

### Why it is offered for completed sessions
The "unbooked sessions" list is filtered at `BlockPoolView.tsx:107`:
```ts
const unbookedSessions = slotData.filter(
  (s) => !s.session.scheduled_at && !s.session.parent_session_id
);
```

It excludes sessions that already have a `parent_session_id`, but does NOT exclude completed sessions. A session with `completed_at` set but `scheduled_at = NULL` appears in the unbooked list regardless of its completion status. The "Link to slot" dropdown is rendered for every row in this list.

### Why it is offered for sessions with existing content
There is no content guard. `isSessionEmpty` is not checked here. A session with a full workout prescription AND completion logs can be linked as supplementary.

### Why it fails (or appears to)
Two possible failure modes:

1. **The `completed` status lock.** At `route.ts:60–80`, if the session has `status === "completed"`, the PATCH blocks `data` changes. But `parent_session_id` is in `ALLOWED_FIELDS` (line 13) and is NOT `data`, so it should pass through. The lock is not the direct cause.

2. **The sub-session `scheduled_at` guard.** At `route.ts:185–201`, AFTER the initial PATCH succeeds, the code checks if the session now has a `parent_session_id` and overrides `scheduled_at` to match the parent. This runs on EVERY PATCH that includes `scheduled_at`. Since the client sends both `parent_session_id` and `scheduled_at`, the guard fires, queries the parent, and overrides `scheduled_at` to the parent's value. This should succeed — unless the parent has `scheduled_at = NULL` (which is possible for Emma's block, where session 1 has a date but session 3 does not).

   If the user links to a booked slot (which by definition has `scheduled_at` set), the override sets `scheduled_at` to the parent's date. This succeeds. The session becomes a sub-session with the parent's date.

3. **The real problem is semantic.** After linking, the session is now a sub-session. The pot counter excludes it. The "completed" count drops by 1. The workout pool no longer lists it (it's filtered as a sub-session). The user sees a completed session vanish from the main view and appear nested under its parent. If the parent was already completed, the sub-session renders with a "Completed" pill in the nested section — invisible unless the parent row is expanded.

   The "link to slot is broken" report is most likely that the user linked a session, then couldn't find it again — it moved from the main list to a nested sub-session view. It didn't break; it was reclassified.

### A separate "link to slot" issue for completed sessions
The session at `BlockPoolView.tsx:438` is the **unbooked** section's link. There is also the **booked** section's "Supplementary" button at `BlockPoolView.tsx:362–370`, which creates a NEW sub-session under a booked slot. These are different operations:
- "Link to slot" (unbooked): converts an existing session into a sub-session
- "Supplementary" (booked): creates a new session as a sub-session

Both are available for completed sessions, which is wrong — a completed session should not be reclassified or have new work added under it.

## 5. The three-concept conflation

The session model conflates three things into one row:

### Prescription (what to do)
- `session_number`, `archetype` (A/B/C), `week`, `phase`
- `data` (JSONB: versions, focus_label, coaching_notes)
- This is the "planned workout" — what exercises, what rotation position

### Booking (when it happens)
- `scheduled_at` (Outlook owns this)
- `cancelled_at`, `cancel_reason`
- This is the calendar reality — when the client shows up

### Performance (what actually happened)
- `completed_at`, `started_at`
- `data.session_log` (RPE, fatigue, notes, sets)
- `set_logs` (per-set records in a separate table)
- This is the training record — what was done

The `status` column (`20260818`) was added to be the "single source of truth", but it encodes all three concepts in one value:
- "planned" = prescription exists, no booking, no performance
- "scheduled" = prescription + booking, no performance
- "in_progress" = prescription + booking + partial performance
- "completed" = prescription + booking + performance
- "cancelled" = booking was cancelled (prescription may still exist)

**The model cannot express:**
- A session that was performed without being booked (completed + scheduled_at NULL — Emma's case)
- A session that was booked and then the prescription changed
- A session where the booking was cancelled but the performance record should be preserved independently

The current bugs flow from this conflation:
1. The pot counter conflates "used a slot" (financial) with "completed" (performance) — `session-pot.ts:69`
2. The chronological order conflates "when prescribed" (session_number) with "when booked" (scheduled_at) — `session-chronological-order.ts:34–38`
3. The week grouping conflates "prescription week" (stored `week`) with "booking week" (derived from `scheduled_at`) — `schedule-dates.ts:125–136`
4. The "link to slot" conflates "assign supplementary work" (prescription) with "set a parent_session_id" (schema reclassification) — `BlockPoolView.tsx:448–454`

## 6. Recommendation: patch or split?

### Patch path (fix the immediate bugs)

**Fix 1:** Add `completed_at` to all three `deriveSessionStatus` call sites.

- `page.tsx:46–51`: add `completed_at: s.completed_at` (need to add the field to the `SessionRow` interface at line 22)
- `SessionList.tsx:46–52`: add `completed_at: s.completed_at` (need to add to `SessionItem` interface at line 12)

Both `page.tsx` and `SessionList.tsx` already fetch `select("*")` from the DB, so `completed_at` is in the data — it's just not passed to the derivation.

**Fix 2:** Exclude completed sessions from the "Link to slot" dropdown.

At `BlockPoolView.tsx:107`, add a status check:
```ts
const unbookedSessions = slotData.filter(
  (s) => !s.session.scheduled_at && !s.session.parent_session_id && s.status !== "completed" && s.status !== "cancelled"
);
```

**Fix 3:** Make the pot counter derivation consistent with BlockPoolView.

Either add `completed_at` to `deriveSessionPot` (preferred — it's the financial record) or remove it from `BlockPoolView`'s slot derivation (regressive — hides correct information).

These three patches fix all four of Craig's reported defects without restructuring.

### Split path (structural fix)

Split the session into three entities:
1. **Session prescription** — what exercises, what rotation, what archetype
2. **Session booking** — when it happens, calendar sync, cancellation
3. **Session performance** — what was done, RPE, fatigue, sets

This would make each concept independently queryable and editable. A "completed but unbooked" session would be a prescription with a performance record but no booking — a perfectly normal state that the current model can't express.

**The split is the correct long-term answer, but it is not needed to fix the current bugs.** The four defects Craig hit are all tractable with the three patches above. The split is warranted when the next round of features demands independent manipulation of the three concepts (e.g., "show me all sessions that were performed but never booked", "reschedule the booking without losing the performance record", "change the prescription without affecting the booking").

### My recommendation

Patch now, split later. The three patches above are < 20 lines each, low risk, and fix every reported defect. The split is a multi-day restructuring that should be planned as its own work order with a migration strategy for existing data. Do not mix a structural refactor into a bug-fix pass.

---

## Files reviewed

| File | Lines | Role |
|------|-------|------|
| `app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx` | 1–324 | Server component: data fetch, counts, week grouping, renders overview + week groups |
| `app/hub/(protected)/clients/[id]/blocks/[blockId]/BlockOverviewClient.tsx` | 1–102 | Client shell: action buttons, schedule panel, edit drawer, block note |
| `app/hub/(protected)/clients/[id]/blocks/[blockId]/SessionList.tsx` | 1–145 | Client: renders session rows within a week group, assigns workouts |
| `app/hub/(protected)/clients/[id]/blocks/[blockId]/SessionRow.tsx` | 1–235 | Client: single session row with status-dependent actions |
| `app/hub/(protected)/clients/[id]/blocks/[blockId]/BlockSchedulePanel.tsx` | 1–197 | Client: schedule-block UI (apply pattern to all sessions) |
| `components/hub/BlockPoolView.tsx` | 1–700 | Client: pot counter, rotation ribbon, booked slots vs workout pool, supplementary dialog |
| `components/hub/SessionPotCounter.tsx` | 1–146 | Client: pot counter display (remaining/used/purchased bar) |
| `lib/session-pot.ts` | 1–122 | Pot derivation: completed + charged = used |
| `lib/session-status.ts` | 1–36 | Status derivation from multiple columns |
| `lib/session-chronological-order.ts` | 1–57 | "Session N of M" from scheduled_at order |
| `lib/schedule-dates.ts` | 100–156 | `groupSessionsByWeek`: scheduled vs plan week grouping |
| `components/hub/SessionStatusPill.tsx` | 1–182 | 5-state pill + off-day/out-of-sequence flags |
| `app/api/sessions/[id]/route.ts` | 1–277 | PATCH/GET/DELETE: session mutation, status sync, sub-session guards |
| `db/migrations/20260725_session_scheduling.sql` | 1–39 | Adds scheduled_at, cancelled_at, cancel_reason |
| `db/migrations/20260818_session_status_model.sql` | 1–101 | Adds status, started_at, completed_at with backfill |
| `db/migrations/20260831_sub_sessions_parent_link.sql` | 1–17 | Adds parent_session_id for supplementary work |
| `db/migrations/20260831_session_charged_free_flag.sql` | 1–30 | Adds charged_free for cancellation billing |
| `types/index.ts` | 601–639 | DBSession interface |
