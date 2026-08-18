# Follow-up: finish the structural-consistency pass on the 3 remaining surfaces

**Re:** `brief-hub-structure-consistency-opendesign.md` · **Status:** dashboard done and approved as the
reference pattern; 3 of 4 named surfaces still outstanding, per the register's own note
("Adopted on the dashboard only so far... queued for the same mechanical adoption").

`hub-dashboard.html` is confirmed as the correct pattern — Quick Actions bar top-left (`.qa-bar`/`.qa-btn`),
single `.hub-section` accordion closed by default with the top section open and a clear one-line reason why
it's first. Code build against it is starting now in parallel. Please apply the **exact same two components**
(same class names/markup shape, don't reinvent per page) to:

## 1. Client record (`desktop/clients/hub-client-detail-refined.html`)

- Replace the existing `.quick-action` list with the same `.qa-bar` top-left treatment. This page has more
  going on than the dashboard (a client identity header, compliance status) — work out where the bar sits
  relative to that header and say so explicitly, don't just drop it in without considering the existing chrome.
- Convert whatever card/section structure currently exists on this page into the same `.hub-section` accordion
  stack. Pick the top/open-by-default section deliberately — probably compliance/status at a glance, since
  that's the thing most likely to change what Esther does next — but make the call yourself and justify it in
  the register note, don't default to "first section in document order."

## 2. Block module (`desktop/training/hub-block-module.html`)

- Same `.qa-bar` treatment for whatever quick actions currently exist here.
- The existing week/session collapse behaviour (`toggleWeek`) is a *different* kind of collapsible than the
  `.hub-section` accordion (it's collapsing weeks within a block, not distinct information sections) — don't
  force it into `.hub-section` if it's structurally a different thing. Use `.hub-section` for genuine
  information-section grouping on this page (if any exists outside the week/session structure); leave the
  week collapse as its own pattern if forcing it would be artificial. Flag which you did and why.

## 3. Schedule (`desktop/scheduling/hub-schedule.html` + `hub-schedule-month.html`)

- Same `.qa-bar` treatment.
- The schedule's day/month toggle and the 5-state session pill are unrelated to this pass — don't touch them.
  Only the quick-actions placement and any card-based information sections (if the schedule page has any
  outside the calendar grid itself) get the accordion treatment.

## Mobile — not done in the first pass, needs addressing per the original brief §3

The original brief asked for the shared primitives (Quick Actions placement, accordion pattern) to be designed
with **both** desktop and mobile treatments together, not desktop-first with mobile as an afterthought. The
dashboard pass only touched the desktop file. Please do the mobile equivalent of the same two primitives —
`mobile/today/hub-m-today.html` is the closest mobile analogue to the desktop dashboard. Mobile's chrome is
necessarily different (no rail, smaller screen, existing bottom-nav pattern) — the ask isn't "make it look
identical to desktop," it's "use the same underlying interaction model" (top-of-screen quick actions,
closed-by-default sections with the top one open). If a genuine 1:1 mobile equivalent doesn't make sense for a
given piece, say so explicitly rather than forcing it.

## Handback

Same standing rules as before: update `index.html` in the same pass with status + a one-line change note per
file, archive rather than delete anything the old pattern leaves behind, flag every deliberate deviation.
