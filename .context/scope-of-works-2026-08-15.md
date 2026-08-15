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
| 2.1 | **Outlook/Microsoft Graph calendar integration** — needs the Azure tenant-type decision first: Esther's own M365 organisation, or a personal `outlook.com` account? It changes the authority URL and whether personal calendars work at all. Six-step Entra checklist is in the WO doc. *(`dmsroc08vys`)* | Craig | Lane L6 entirely (**L**) |
| 2.2 | **GDPR sign-off** — DPA signatures and confirmation of Esther's ICO registration. Everything else in the GDPR work order is done. | Craig + Esther | `wo-eternalfitness-gdpr-hub-documentation-2026-08-07` |
| 2.3 | **Templates paste-and-assign scope.** Esther agrees workouts with Claude directly and wants to paste them into the hub as templates, then assign to a client. Narrow it to a paste-box + cheap-AI-structuring entry point reusing `TemplateEditorClient` and `rescaleTemplateSection`, or fold it into the bigger unscoped conversation (2.4)? | Craig | `wo-templates-paste-and-assign-2026-08-14` (**M** narrow / **L** folded) |
| 2.4 | **Templates / blocks / sessions design consistency.** Craig's own framing: too many different page designs across templates, blocks and sessions, with no clear naming or conversion story. Currently unscoped. | Craig | Unscoped (**L**) |
| 2.5 | **Blog repositioning migration.** `20260419_session_2_blog_repositioning.sql` has never been applied and **deletes rows**. Apply it, or formally retire it? Until it's decided, three redirect rules stay removed. *(`qmsn3c2purx`)* | Craig | **S** once decided |
| 2.6 | **Hub navigation restructure** — `hub-nav-restructure.html` Option A vs B, now needing reconciliation with the mobile bottom-tab shell that shipped after the mockup was drawn. | Craig | **M** |

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
