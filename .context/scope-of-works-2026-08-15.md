# Eternal Fitness — Scope of Works (Outstanding)
**As at 2026-08-15** · Baseline: `origin/main` @ `caff0d7`, dev and prod reconciled

Everything genuinely outstanding, gathered from the work-order registry, the `.context` work
orders, and a fresh read of the codebase — not copied forward from older lists. Items that older
documents recorded as open but which are **no longer true** are listed in §7 so they stop
resurfacing.

Effort key: **S** = under half a day · **M** = one to two days · **L** = three days or more.
Registry IDs (`dmsn…`, `qmsn…`) are `wo deferred-list` / `wo questions` handles.

---

## 1. Risk — do these first

These are the items where the cost of *not* doing them is materially worse than the work itself.

| # | Item | Owner | Effort |
|---|---|---|---|
| 1.1 | **No point-in-time database recovery.** `archive_mode=on` but the archive command is a no-op, so there is no WAL archive. A restore today means going back to the last full backup and losing everything since. This is the single highest-consequence item in the whole registry. *(`dmsne8f7y99`)* | Craig | S–M |
| 1.2 | **Development environment shares live email credentials and holds real client data.** `eternal-fitness-staging` runs against a real clone including real client email addresses, with live Resend/SendGrid/SMTP credentials. Testing any document or notification flow on development can email an actual client. Either point it at a sandbox sender or scrub the addresses. *(`dmsm7yawu20`)* | Craig + build | M |
| 1.3 | **`/api/*` responses are marked `public` in `Cache-Control`.** `next.config.js` sets `public, max-age=0, must-revalidate` on every API route. These responses carry PII and PAR-Q medical answers; `/hub/*` correctly gets `private, no-store` but the API does not. Should be `private, no-store`. | Build | S |
| 1.4 | **`/api/agreements` POST is unauthenticated.** A public write path that inserts directly into `signed_agreements` with no auth and no rate limit — anyone can post junk clinical records. It exists only to serve the deliberately-unlinked legacy `/agreement` safety-net page, so the cleanest fix is retiring both together (see 4.3). | Build | S |
| 1.5 | **`/api/leads` has no rate limiting or spam protection.** Public, unauthenticated, and it sends an email on every call. Live on a public marketing site, it's an open relay into Esther's inbox. | Build | S |
| 1.6 | **Cron secret compared with `!==`.** `check-updates-due` and `dispatch-updates` compare the shared secret non-constant-time. Low severity, one-line fix with `timingSafeEqual`. | Build | S |

> §1.3, 1.4 and 1.6 were all identified correctly by the `devin/1783264238-security-hardening`
> branch back on 2026-07-05 and never merged. That branch's *specific patches* should not be
> merged as-is — it adds `supabase.auth.getUser()` guards to routes that mostly have them now —
> but three of its findings are still live on `main`.

---

## 2. Decisions needed before work can start

Nothing can be built on these until they're answered. All are queued or queueable via `wo ask`.

| # | Question | Who | Blocks |
|---|---|---|---|
| 2.1 | **In-app monthly calendar + session/workout decoupling** — see full write-up directly below. Supersedes the old framing of this row (Azure tenant-type question) — that part is resolved; what's open now is materially different and larger. | Craig | New, unscoped (**L**) |
| 2.2 | **GDPR sign-off** — DPA signatures and confirmation of Esther's ICO registration. Everything else in the GDPR work order is done. | Craig + Esther | `wo-eternalfitness-gdpr-hub-documentation-2026-08-07` |
| 2.3 | **Templates paste-and-assign scope.** Esther agrees workouts with Claude directly and wants to paste them into the hub as templates, then assign to a client. Narrow it to a paste-box + cheap-AI-structuring entry point reusing `TemplateEditorClient` and `rescaleTemplateSection`, or fold it into the bigger unscoped conversation (2.4)? | Craig | `wo-templates-paste-and-assign-2026-08-14` (**M** narrow / **L** folded) |
| 2.4 | **Templates / blocks / sessions design consistency.** Craig's own framing: too many different page designs across templates, blocks and sessions, with no clear naming or conversion story. Currently unscoped. | Craig | Unscoped (**L**) |
| 2.5 | **Blog repositioning migration.** `20260419_session_2_blog_repositioning.sql` has never been applied and **deletes rows**. Apply it, or formally retire it? Until it's decided, three redirect rules stay removed. *(`qmsn3c2purx`)* | Craig | **S** once decided |
| 2.6 | **Hub navigation restructure** — `hub-nav-restructure.html` Option A vs B, now needing reconciliation with the mobile bottom-tab shell that shipped after the mockup was drawn. | Craig | **M** |

### 2.1 detail — in-app monthly calendar + session/workout decoupling (raised by Craig, 2026-08-15)

**What's already built (2026-08-15, on `staging`, held from `main`/prod by Craig's explicit choice —
not this item):** L6 Microsoft Graph calendar sync is code-complete and verified end-to-end with
Esther's real Microsoft account — a **one-way push** of `sessions.scheduled_at` from the app into her
main Outlook calendar. It only ever touches events it created itself (tracked by
`session_calendar_events.event_id`); Bookings-sourced appointments already sitting in that same
calendar are never read, modified, or touched. Three steps remain purely mechanical whenever Craig
says go: apply the migration to prod, merge `staging`→`main`, Esther reconnects live + prod cron on.
**None of that is what this row is now about.**

**The new ask:** an in-app calendar that actually looks like a calendar — a physical monthly grid,
"as you get in Outlook", showing booked sessions — on **both desktop and the PWA**. The only calendar
UI that exists today is `/hub/schedule` (`ScheduleCalendar.tsx`), and it is a **single-day view with
±1-day navigation** — no week or month grid exists anywhere in the app. This is new UI, not a
reconciliation of something already designed.

**What populates it — two sources, both must keep working:**
1. Manual entry by staff (already possible — a session's `scheduled_at` can be set directly).
2. A client booking their own session via the Microsoft Bookings form. **Bookings writes straight into
   Esther's Outlook calendar today and has never touched the app's own `sessions` table at all** — L6
   only sends data the other direction (app → Outlook). For the in-app monthly calendar to show a
   Bookings-made appointment, something has to change: either the app starts reading Bookings-origin
   events back out of Outlook (a genuinely new, second sync direction — Graph read access, not just
   write), or Bookings appointments get reflected into `sessions` some other way. **This wasn't
   scoped or built as part of L6 and needs a real design decision, not an assumption.**

**The session/workout decoupling — this is the part that changes the data model's meaning, not
just adds UI:**

Today, every `sessions` row already technically supports an empty workout — `data JSONB NOT NULL
DEFAULT '{}'` — so "a session with nothing in it yet" is not a new database state. What's missing:
1. `sessions.block_id` is `NOT NULL` — **every session must belong to a block today.** Blocks are
   generated up front (by the Plan Agent or manually) with a full 6-or-12-week run of sessions,
   session content included. There is currently no path to create a "bare" booking — a client + a
   time slot — that doesn't already belong to a generated block. If a Bookings-sourced or ad hoc
   manual booking should be able to exist before any block/workout planning has happened for that
   client, that's a real schema/workflow question: does it get attached to an auto-created lightweight
   block, or does the `NOT NULL` constraint on `block_id` need to be relaxed? **Needs Craig's steer —
   this is a modelling decision, not an implementation detail.**
2. **No surface currently handles an empty-`data` session gracefully.** Checked directly: neither
   Train Screen (mobile PWA, `TrainScreen.tsx`) nor the desktop Session Editor has any empty-state
   handling for a session with no warm-up/main/cooldown content — grepped, zero matches. Craig's own
   framing is exactly this case: "the workout is not defined until the day... it's essential the PWA
   has the ability to edit a workout on the fly." Today that would render three empty sections with no
   guidance to build one there and then.
3. This is the same territory as the in-flight workout-logging consolidation
   (`.context/brief-workout-consolidation-opendesign.md` / `wo-ef-workout-consolidation-pwa-2026-08-15`)
   — the consolidated desktop logger and the PWA's Mid-session Edit Sheet are exactly where "define a
   workout for a session that doesn't have one yet" needs to live, not a new fourth surface. **This
   requirement should be folded into that brief before it goes to Open Design**, rather than treated as
   a separate design pass — Craig's own framing ("this CO needs to tie in with sessions, workouts,
   blocks") says the same thing.

**Craig's answer, 2026-08-15 — the booking↔session assignment model:**

`block_id NOT NULL` stays as-is — no schema relaxation, no session ever exists outside a block. The
workflow instead: Esther creates the block first, specifying how many sessions it contains (e.g. 10).
That immediately creates all N session rows (`session_number` 1..N) as they already do today, unscheduled
(`scheduled_at NULL`) and — per the decoupling above — not necessarily with workout content defined
yet either. When a client then books online via the Microsoft Bookings form, the booking gets matched
to that client's block and **assigned to the next unscheduled session in sequence**: the earliest
booking fills `session_number` 1, the next fills `session_number` 2, and so on. The session's
`scheduled_at` is set from the booking's date/time; nothing else about the session changes at that
point (workout content is still whatever it was — empty or pre-planned).

This resolves the block_id question outright (no schema change) and confirms the direction:
**Bookings-sourced appointments do need to flow into the app** — matched to a client, matched to their
current block, and slotted into the next open `session_number` — for the sequencing rule above to mean
anything. That's still new inbound work (nothing today reads Bookings/Graph data into the app; L6 is
push-only), just now with a concrete algorithm to build rather than an open question.

**Edge cases — answered by Craig, 2026-08-15:**

- **Ordering: chronological by session date, always — re-sort on every new booking.** If Tuesday is
  booked first and Thursday (earlier in the week) is booked second, Thursday becomes session 1 and
  Tuesday shifts to session 2 — the sequence re-sorts to match actual calendar order, it does not lock
  in by order-of-booking. Esther can also manually reorder any time regardless (existing block-review
  capability). **Implementation nuance worth flagging now rather than discovering mid-build:** `week`/
  `phase`/`archetype` are stored per `session_number` and represent a deliberate progression
  (foundation → build → develop → peak → deload) — a re-sort needs to reassign **`scheduled_at` across
  the block's session rows** so session_number 1 (and its progression content) always lands on the
  earliest date, rather than renumbering `session_number` itself and scrambling which workout content
  is "week 1" vs "week 3". Small point, but it's the difference between a clean re-sort and a broken one.
- **Overbooking (more bookings than sessions in the block): flag it for Esther, don't auto-extend or
  auto-reject.** A booking beyond the block's defined session count surfaces to her for a manual call.
- **Cancellations: governed by Esther's existing 24-hour notice policy.** Cancel with ≥24 hours' notice
  → normal, the session presumably reopens for the next booking to fill (this is the sensible default
  from "otherwise they lose it," but worth a one-line confirmation before build since it wasn't stated
  outright). Cancel with <24 hours' notice → the client forfeits the session outright — it is **not**
  rebookable and does not return to the pool for another booking to fill; it stays used/lost against
  their block. This needs a way to record "forfeited, not just cancelled" distinct from a clean
  cancellation — the existing `cancelled_at`/`cancel_reason` columns can likely carry this (e.g. a
  reason value distinguishing late-forfeit from normal-reopen), not necessarily a new column.
- **Matching a Bookings appointment to a client: by email address.** Microsoft Bookings captures the
  customer's email at booking time — match against `clients.email`. Still worth a fallback answer for
  no-match (new email, typo, a client who's never had a portal/hub email on file) before build, but the
  primary key is settled.
- Is the monthly view itself read-only (a booking overview) or does it need booking creation/edit
  directly on the grid, the way Outlook's does? Still open, unrelated to the assignment-model questions
  above.

---

## 3. Verification debt

Work believed complete but never proven under real conditions.

| # | Item | Owner | Effort |
|---|---|---|---|
| 3.1 | **PWA install and offline behaviour on a real phone.** Install-to-home-screen and airplane-mode mid-session logging with reconnect replay have never been tested on actual hardware. Everything else in the mobile lane was verified against real data in a desktop browser. This is the last real gap in the mobile work order and nothing but a physical device can close it. | Craig/Esther | S |
| 3.2 | **`CTABand` image cropping on wide/short bands.** `imagePosition` is applied, but the crop behaviour across ~11 marketing pages was never measured at multiple viewport widths. Esther's head sits in the upper third of every source photo, so a bad crop cuts her face. *(`dmsnlyydfkc`)* | Build | S |
| 3.3 | **Two Eternal Fitness infrastructure items could not be verified** in the 2026-08-10 pass for lack of a working `psql`/`docker exec` path onto the DB VPS. Needs a repeatable access route before they can be closed. *(`dmsnm1nwyxv`)* | Craig | S |
| 3.4 | **Marketing pages at 375px** — nav collapse, footer stacking and badge clipping across all launch pages; plus the homepage 01/02/03 scroll-pinned section on a real slow scroll rather than a jump-scroll. | Build | S |

---

## 4. Repository and environment reconciliation

Housekeeping that is now overdue and getting more expensive with time.

| # | Item | Detail | Effort |
|---|---|---|---|
| 4.1 | **Shared checkout is 51 commits behind and was edited directly.** `D:\apps\eternal-fitness-website` sat behind `origin/main` with three uncommitted `.context` files — a DO-SOP-010 breach that nearly lost two session write-ups. Those docs are rescued and committed as part of this session; the checkout itself still needs syncing to `origin/main`. | S |
| 4.2 | **Ten unmerged remote branches.** Six look superseded by equivalent work already on `main` (hero navbar clip, specialist-training nav, visual-impairment rebuild, contact page redesign, session editor styling, client stories/legal pages) — each needs a quick confirm-then-delete. Four `devin/*` branches from 2026-07-05 need a real decision: error handling (21 files), shared API helpers (20 files), unit tests (14 files), security hardening (see §1). They are six weeks stale and will conflict. | M |
| 4.3 | **Retire the legacy PAR-Q / Agreement surface.** `/parq`, `/parq/edit/[id]`, `/agreement`, `/api/agreements`, `/api/parq` and the `signed_parq` / `signed_agreements` tables are all still live. The 7-day TTL safety net they were kept for expired long ago, but tracker and compliance code still reads the legacy tables — so this needs a migration path, not just a delete. | M |
| 4.4 | **Four stale git worktrees** under `D:\apps\worktrees\eternal-fitness-website\` plus one emdash worktree. Two hold branches whose work is already merged. Needs a confirm-then-`git worktree remove` pass — never a raw delete. | S |
| 4.5 | **Dependency and config hygiene.** `package.json` still carries the scaffold name `vite_react_shadcn_ts`; `package-lock.json` is dead weight in a pnpm repo; `@supabase/ssr` and `@supabase/supabase-js` are still installed although the app talks to Postgres directly. | S |
| 4.6 | **`typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` are both `true`.** `npx tsc --noEmit` is currently clean, so nothing is being masked *today* — but the build will happily ship a type error the moment one is introduced. Worth turning back on now while the cost is zero. | S |

---

## 5. Deferred features and content

Real work, deliberately parked. Nothing here is blocking.

| # | Item | Owner | Effort |
|---|---|---|---|
| 5.1 | **Specialist Training catalogue** — the restructure was deferred to post-launch. | Craig/Esther | L |
| 5.2 | **Blog rewrite** — 27 legacy WordPress posts, unedited, currently live as-is. | Esther | L |
| 5.3 | **`/falls-prevention` page content** — blocked on Esther completing her strength-and-balance training. The honest "coming soon" page is the interim, and it converts. | Esther | S once content exists |
| 5.4 | **Workout-templates browser mockup** — the only genuinely undesigned hub screen. (The 2026-08-13 audit found 10 of the 11 screens previously claimed undesigned were in fact designed *and* shipped on 2026-08-04; this is the real remainder, and the training-blocks mockup deliberately shows it as a disabled nav item.) | Craig | M |
| 5.5 | **Part 4 toolbar / icon-badge consistency fixes** across the hub. Status not re-checked since the WO was written — verify fresh rather than trusting the doc. | Build | S–M |
| 5.6 | **Portal Resources module review** — the calorie calculator and Showdown Soundboard have never been reviewed end-to-end from a logged-in client's point of view. *(`dmsbpoaa37f`)* | Craig | S |
| 5.7 | **Blind-fitness / cancer-rehab specialist copy** (British Blind Sport, Royal ... sources) — revisit once the relevant pages exist. *(`dmsiv5xw7ok`)* | Esther | M |
| 5.8 | **Lane J — paper→digital conversion tool.** Parked by Craig 2026-07-22, not raised since. | Craig | L |

---

## 6. Suggested sequence

1. **This week** — §1.3, §1.5, §1.6 and §4.6 are all small, independent and shippable in one
   pass. §1.1 (WAL/PITR) needs Craig on the VPS and should not wait behind anything.
2. **Batch the decisions** — 2.1 through 2.6 in one sitting rather than one interruption at a
   time. Answering 2.3 and 2.4 together unlocks the largest single piece of remaining build work.
3. **Then §4** — the branch and worktree reconciliation gets harder every week the `devin/*`
   branches age.
4. **§3.1 whenever a phone is to hand** — it's five minutes of Esther's time and it's the last
   thing standing between the mobile work order and `done`.
5. **§5 in whatever order suits the business** — none of it blocks anything else.

---

## 7. Closed — recorded as open elsewhere, verified untrue on 2026-08-15

Listed so they stop being re-raised:

- **"Production blog is entirely non-functional since go-live"** *(`dmsnly4w39t`)* — **disproven.**
  The index, the category filters and individual post bodies all render correctly on production.
  Resolved in the registry.
- **"staging branch does not have the INVALID_ORIGIN hotfix"** *(`dmsncjmh0m8`)* — `staging` and
  `main` are the same commit; nothing to merge.
- **"No canonical redirect between www and apex"** *(`dmsncjkumpj`)* — shipped; the `www` → apex
  rule is live in `next.config.js`.
- **"Merge development forward to production"** — done 2026-08-15, verified in Coolify.
- The whole of `outstanding-items-2026-08-01.md` — closed 2026-08-04 by Craig's decisions; kept
  for history only.
