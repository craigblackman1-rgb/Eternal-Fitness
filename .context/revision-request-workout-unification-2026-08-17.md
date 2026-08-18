# Revision request: 4 mockups need one more pass (for Open Design)

Design Parity Gate review of the 2026-08-17 (evening) delivery against
`brief-workout-unification-opendesign.md`. The core state model is genuinely solid and
needs no further work: the shared 5-state status pill is byte-identical across all four
files, completed/cancelled read-only handling is correct, the audited Reopen flow reads
well, and "in progress" correctly triggers on the first set logged rather than on
opening the screen. **Do not rework any of that.** Four specific gaps below, all small,
before Craig signs G2.

## `training/hub-session.html` — 1 fix

**Session name breaks the brief's own naming rule.** The page's `<h1>` and breadcrumb
both read "Session 10" — a bare `S{n}`. The brief's Constraints section is explicit:
"a session's display name is its `focus_label`" ("Workout A", etc.), and every other
file in this set (`hub-block-module.html`, `hub-client-sessions-tab.html`) gets this
right. This is the one screen the trainer is actually looking at while logging — fix
the header and breadcrumb to use `focus_label`, matching the pattern already used
elsewhere in this file.

## `scheduling/hub-schedule.html` + `scheduling/hub-schedule-month.html` — reconcile as a pair

The brief asked for "completion state on every entry, day view **and** month view."
What came back is a day-view file with no mention of month view at all, plus a
separate `hub-schedule-month.html` that already exists in the same folder and already
has the 5-state pill — but the two disagree on one real decision and don't link to
each other:

- **Cancelled-session treatment differs.** Day view: hidden by default behind a "Show
  cancelled" toggle (a legitimate choice, and it's the one correctly flagged in the
  file's own notes). Month view: cancelled sessions are always visible as a
  struck-through chip, no toggle. Same brief requirement, two different answers.
- **No cross-link.** Day view has no way to reach month view or vice versa (the live
  app has both as a toggle on one page — `ScheduleShell.tsx` — so the mockups should
  read as one screen with two views, not two unrelated screens).

Pick one cancelled-session behaviour and apply it to both, and make the day/month
relationship visible in the mockup (a view toggle matching the live app, or at minimum
a clear "this is the same screen, other view" note). Flag the decision explicitly in
the handback — don't leave Craig to spot the disagreement by eye.

## `training/hub-block-module.html` — add 2 missing sample-data cases

The mechanism looks right (derived weeks, per-session reschedule, cancelled-with-data)
but two of the brief's named "honest data cases to design against" aren't shown
anywhere in the sample data, and both were named specifically because they're the
shapes that have broken in production:

1. **An off-pattern pile-up week** — a "Week of ..." group with 4 or 5 sessions,
   proving the layout doesn't assume a tidy 2–3/week pattern. The current sample tops
   out at 3/week.
2. **An 18-session block** (the schema's hard cap) — proving week grouping doesn't
   assume 6 tidy weeks. The current sample has 12 sessions.

Extend the sample arrays to include one of each — doesn't need new UI, just data that
exercises what's already built.

## All four files — handback notes

Each file's "how this answers the brief" callout currently reads as fully
confirmatory. Going forward, self-assess against the brief's actual checklist before
handback and flag anything not fully met (like the schedule-view split above) in that
same note — that's what the brief's closing line asked for ("flag every deviation and
every open question explicitly... don't let Craig discover a scope decision by eye").

## Handback

Same as prior passes: revise in place at
`D:\apps\design-systems\ef-control-hub\desktop\training\hub-session.html`,
`desktop\scheduling\hub-schedule.html`, `desktop\scheduling\hub-schedule-month.html`,
`desktop\training\hub-block-module.html`. Update `index.html`'s register entries for
these four in the same pass (their `v:`/`ch:` fields) — per the register's own standing
rule 4.
