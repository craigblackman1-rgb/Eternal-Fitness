# Functionality brief: trainer PWA — client mode, calendar spine, quick capture (for Open Design)

**CR:** CR-EF-079 · **Date:** 2026-08-21 · **Raised by:** Craig (Esther field request)
**Source of truth for the "why":** a live walkthrough of Trainerize's mobile app on 2026-08-21
(Esther's own tenant, Emma Atkinson's record), driven screen-by-screen. Findings recorded in §1.
**Extends:** `wo-ef-workout-consolidation-pwa-2026-08-15`, the calendar-spine model in
`.context/assessment-workout-unification-2026-08-17.md` §3.2.

This is a **functionality + constraints spec**, not a visual spec — no layout, colour or component
opinions. It carries only what a designer needs.

---

## SCOPE — read this first

**This brief covers the STAFF/TRAINER PWA only** (`/hub/m/*`). Esther's phone, Esther's job.

**The client portal is explicitly deferred** (Craig, 2026-08-21 — registered as deferred item
`dmt2qo93nzo`). Trainerize achieves its simplicity by having the trainer *enter the client's own
app* in edit mode. **We are deliberately NOT copying that.** Our trainer PWA gets its own
staff-shaped client mode, built from staff components. Do not design anything that assumes the
portal and the trainer PWA share screens. Whether they ever converge is a later decision.

Nothing in this brief changes the client portal, the desktop hub's layout, or the Train Screen's
live-logging behaviour (offline queue, rest timers, PB flagging, band-unit lock all stay exactly
as they are).

---

## 1. What Trainerize actually does (observed, not assumed)

Recorded so the design borrows deliberately rather than by rumour.

**Trainer level** — 5 tabs (Overview / Clients / Appts / Messages / More). Overview is an activity
feed: *"Becky Price just did their 50th workout! Becky completed Workout A and rated it as RPE 1/10
(effortless). Becky set 3 new personal bests. 47 minutes ago"*, each with a thumbs-up react. Appts
is the **same day-agenda calendar component** as the client calendar, just trainer-scoped.

**Tapping a client** opens a lightweight **sheet, not a page**: tabs Summary / Details / Notes /
Onboarding / Attachments, quick actions Insights / Message / Call / Resend, an admin ⋮ menu
(Assign To, Change Client Type, Change Calendar Visibility, Delete, Copy Setup Link), and one
prominent **"Open"** button.

**"Open" swaps the whole app into the client's context.** Banner: *"You're in your client's view
with coaching edit controls available to you."* Bottom nav becomes Home / Calendar / Workouts /
Goals / Meals / Profile. A side drawer shows **"Esther Fair — Trainer"** with **"Emma Atkinson —
Client ✕"** beneath it; the ✕ drops back out to trainer scope.

**Client Calendar** is an infinitely scrolling **agenda list of days**, one row per day, forward and
backward from today. Empty days still render as rows. "Today" jumps back to now.

**Adding a workout to a day — 4 taps.** Calendar → ✚ → Workout → source, where source is
**Build WOD** / **Import master workout** (a foldered library: Shared, Personal) / **any of the
client's own programs, listed inline**. Picking one lands on a workout preview — *est. 34 minutes,
11 Exercises*, equipment chips (Body Weight, Dumbbell, Mat, Mini Band), the full exercise list with
thumbnails and prescription ("3 sets x 12 right"), a **"Start now"** link — and a sticky primary
CTA **"Add to Today"**.

**The ✚ is scope-aware.** In a client calendar: Workout / Cardio / Meal / Water / **Appointment** /
Photos / Body Stats / Forms. At trainer level (Appts): only **1 on 1 Appointment** / **Group-Class**.

**Notes are titled by the workout they belong to.** Emma's list reads:
*"Gym - Workout A - Hinge → Pull downs - set 1 - blue. Set 2 - yellow · Added on 17 Jul 2026 by
Esther Fair"*. Compose is brutally simple: **Cancel / pin / Save** and one free-text box. No title
field, no category, no date picker. Notes can be pinned, searched and filtered.

**Their "Program" is our block, but dated.** *"2026 - Block 3 · Main · Week 1 - 6 · 6 week 6 Apr 2026
– 17 May 2026"*, the block note underneath ("If running short on time, miss out hypertrophy superset
B"), then workout cards with thumbnail, a **descriptive** name ("GYM - Workout 2 - Squat & Hinge"),
**est. 57 minutes**, **30 exercises**. A client can hold several concurrent programs.

**What Esther does NOT use:** the program → *training phase* → workout hierarchy. Every one of her
programs returned *"No training phase in this program"*. She works at the **workout** level. Do not
design a phase concept.

---

## 2. Where our trainer PWA stands today

Verified against code on 2026-08-21 (the `/hub/m` tree is byte-identical on `main` and `staging` —
none of this has been started).

- Nav is 3 tabs — **Today / Train / Clients** (`components/hub/MobileShell.tsx`). Close to right
  already. **There is no calendar anywhere in the PWA.**
- The client detail page (`app/hub/m/clients/[id]/page.tsx`) is a read-only glance and says so, in
  a panel at the bottom: *"Deliberately not here — Documents, PAR-Q editing, cashflow, email updates
  and any admin action live on the desktop hub."* **That stated position is what this CR reverses**,
  narrowly: session-shaped actions come to the phone, true admin stays on desktop.
- Notes quick-add already exists on mobile and **already shares the desktop's store** — both hit
  `/api/client-notes`. But the table is `client_id + note + created_at` and nothing else
  (`supabase/migrations/20260817_client_notes.sql`): **no session link, no author, no pin.**
- Blocks have **no date anchor** — `blocks.scheduled_start` is NULL on all 18 in production, against
  Trainerize showing a real 6-week range.
- Outlook: **push already works.** `hub → Outlook` fires automatically whenever `scheduled_at` or
  `cancelled_at` changes on `PATCH /api/sessions/[id]`, with a 15-min cron repairing misses. Mobile
  has never once triggered it, because every mobile PATCH sends only `data`. The
  Bookings→hub **reconciliation queue** (unmatched Microsoft Bookings events awaiting confirm/link/
  dismiss) is desktop-only and currently lives on `staging`, not `main`.

---

## 3. What needs designing

### 3.1 Client mode — the keystone

Opening a client from the Clients tab currently lands on a static profile page. It should instead put
the PWA into a **client-scoped mode** that persists until dropped.

- A persistent, always-visible **scope indicator**: whose record you are in, and an unmistakable way
  out. Trainerize uses a drawer; we need something that survives on a phone without a drawer tap —
  design the affordance. It must be impossible to log against the wrong client because you forgot
  which one you were in.
- Inside client mode the tab bar becomes client-scoped. Proposed tabs: **Overview / Calendar /
  Workouts / Notes**. Argue for a different set if the flows say otherwise, but keep it to four.
- **Overview** is the existing glance content, reorganised — the medical/compliance flags must stay
  the most prominent thing on the screen (unchanged rule: a "do not train" flag outranks everything).
- Leaving client mode returns to the trainer tab you came from, not to a dead end.
- **Do not** design a "sheet then Open" two-step like Trainerize's. One tap from the client list
  should enter client mode directly — their two-step is legacy, not a feature.

### 3.2 The day-agenda calendar — one component, two scopes

Design **one** agenda component, specified so it renders in both scopes:

- **Trainer scope** (a new top-level tab): every client's sessions, day by day.
- **Client scope** (a tab inside client mode): one client's sessions, day by day.

Requirements common to both:

- A scrolling list of **day rows**, forward and back from today, with a "Today" affordance to return.
- Empty days render as rows — the empty day is the tap target for "add something here". This is the
  whole reason the agenda beats a month grid on a phone.
- Each session on a day shows: the session name (its `focus_label` — **never a bare "S3"**), the
  client name (trainer scope only), the time, and the **status pill from the shared 5-state
  component** already designed in `brief-workout-unification-opendesign.md`. Do not invent a new pill.
- A completed day must be visually distinguishable from an untouched one at a glance while scrolling.
- Design the **week boundary** treatment — weeks are real Monday–Sunday, derived from dates
  (per the calendar-spine model). A week header inside the agenda is likely; make the call.

### 3.3 The scope-aware add action

A primary add affordance whose contents depend on scope.

**In client scope, on a day:**
- **Add workout**, offering three sources: *from the template library* (the existing
  `workout_templates` browser — reuse it, do not design a new picker), *from this client's block*,
  or *build from scratch*. Design how a source is chosen without a wall of options.
- **Book session** (date + time). This writes `scheduled_at`, which means it **syncs to Outlook
  automatically with no new plumbing** — design it as a first-class action, not an afterthought.
- Selecting a workout lands on a **preview-then-confirm** step before anything is written. The
  preview must carry: session name, **estimated duration**, **exercise count**, equipment needed,
  and the exercise list with prescription. Sticky confirm CTA naming the actual day
  ("Add to Tue 26 Aug"), never a bare "Add". A secondary "Start now" that goes straight into the
  Train Screen is worth designing — Esther adding a workout mid-session is a real case.

**In trainer scope:** the add action offers **Book session** only. Nothing else.

> Est. duration and exercise count do not exist on our session cards yet and are a known parity gap
> (tracked in `workorder-hub-workout-parity-2026-08-19.md`). Design assuming they will exist.

### 3.4 Notes — quick capture, session-aware

- Compose stays as close to Trainerize's as possible: **one free-text box, save, done.** No title
  field, no category picker. It is currently 2 taps and must not become 5.
- A note captured **from inside a session** carries that session, and renders titled with the
  session name and dated — matching how Esther's Trainerize notes read. A note captured from the
  client's Notes tab is unattached and renders plainly.
- Notes show **who added them**. Esther is the only hub user today, but the desktop already displays
  these and the attribution reads as trust.
- Design **pinned** notes (a pinned note surfaces on the client Overview) and a **search/filter**.
  Esther's real list runs to dozens of entries and is already unscannable in Trainerize.
- Deletion stays available. Editing does not — these are append-only captures by design.

### 3.5 Outlook bookings badge

Esther books through Microsoft Bookings on her phone. Unmatched bookings currently surface only on
the desktop schedule.

- Design an **unmatched-bookings indicator** on the trainer surface (Today and/or the new calendar
  tab), hidden at zero, and the mobile treatment of the confirm / link / dismiss triage. Each queued
  item carries the raw Outlook subject, the parsed client name, the date/time, and a confidence-ish
  state (matched to a client, or not).
- Confirming needs a client and a block picked. On a phone that is the hard part — design it.

---

## 4. Constraints

- **Portal is out of scope.** Nothing here may assume portal screen reuse (see SCOPE).
- **No phase concept.** Programs → workouts. Esther does not use phases.
- **The Train Screen is the logging baseline and must not regress** — offline queue, rest timers, PB
  flagging, band-unit lock. This brief adds ways to *reach* it, never changes what it does.
- **One status pill**, shared with the desktop surfaces. No mobile-specific variant.
- **Session names are `focus_label`**, never `Block {n} · S{n}`. This rule is already locked (G1).
- **True admin stays on desktop** — documents, PAR-Q editing, cashflow, email updates, invoicing.
  The "deliberately not here" panel should be revised, not deleted.
- Real data only in the mockups. Esther's actual clients, blocks and workout names — and include the
  honest hard cases: a day with two sessions, a cancelled session that has logged data, a client with
  no block at all, a note 200 characters long.

## 5. Out of scope for this pass

- Client portal, in any form.
- Trainerize's Meals / Water / Body Stats / Photos / Goals / Forms — we have no equivalents and are
  not adding them.
- Group / class booking — Esther trains 1-on-1.
- The activity feed on Overview. Attractive, but it needs a notifications model we do not have.
  Deliberately parked, not forgotten.
