# Eternal Fitness Website — Consolidated Outstanding Items
2026-08-01, updated 2026-08-04 · Superset of every open item across all Work Orders in `.context/workorder-*.md` and `state.md`. This is the single list to work from — check items off here and cross-reference the source WO file for detail rather than reopening WOs individually.

Registry status at time of writing (2026-08-04): `wo-eternalfitness-consolidated-2026-08-02` (registry) claimed by this session. Session fully closed as of 2026-08-04 — every item below is resolved. Nothing currently open.

---

## 1. Blocking launch — RESOLVED 2026-08-04 (Craig's decisions, see decisions.log)

- **Condition-roll-call copy** on Home + Personal Training — **leave as-is for now**, revisit once the Specialist Training catalogue ships.
- **Blog scope** (27 unedited legacy posts) — **deferred**, no action before launch.
- **FAQ answer bodies** — **rewrite pass done 2026-08-04.** Reviewed all 17 against voice.md; most already compliant from `74b2fa9`; 3 polished for tone. `tsc` clean.
- **About page "Real Story"** — **confirmed correct/final by Craig.**
- **Google Reviews shortlist** — **confirmed usable as-is by Craig** (also previously resolved 2026-07-30 in stats.md).
- **Specialist Training catalogue** — **deferred to post-launch**, confirmed by Craig.
- **`portal-sign-in.html` mismatch** — **not actually open.** This item was stale here: the real GATE was already resolved 2026-07-30 (Craig: keep password auth, reskin only — see `workorder-hub-portal-mockup-audit-2026-07-30.md` Lane 5) and shipped in commit `71de12c`. Craig reconfirmed 2026-08-04: "just a password and username, that is it." No further work.

## 1b. CLOSED 2026-08-04

- ~~5 of 8 `exercise-for-health` condition sub-pages~~ — **Craig: "none to launch with."** Closed, no build before launch.
- ~~`hub-sop.html`~~ — **Craig is reviewing this himself.**
- ~~`/hub/documents` mockup (`hub-documents.html`)~~ — **Craig is reviewing this together with `hub-sop.html`, as one task.**
- ~~PAR-Q edit screen~~ (`/hub/clients/[id]/parq/[parqId]/edit`) — **retired.** Craig: "if it is not needed retire it." Confirmed unreachable from any hub nav/link (grepped `app/`, `components/` — nothing pointed to it); the legacy `signed_parq` data it edited was already fully migrated into `client_documents` on 2026-07-21. Route files deleted, `tsc` clean, pushed. `/api/parq` (still used live by the Agreement pages) and the public `/parq`/`/parq/edit/[id]` safety-net routes were left untouched — separate purpose, not part of this decision.

## 2. Real code work — Craig's call 2026-08-04: "carry on with all of these." Checked live 2026-08-04, most were already stale:

- ~~Hub UI to flip a client to `delivery_mode='home_training'`~~ — **already exists.** `SegmentedControl` on `/hub/clients/[id]/edit` (Studio 1:1 / Home training), wired and saving. Stale item, dropped.
- ~~`/hub/site-review` returns HTTP 500~~ — **not reproducing.** Live-checked 2026-08-04 with a disposable staff account: page renders correctly (40 tasks, stats, sitemap tab). Whatever caused the 2026-08-01 500 isn't live now — possibly fixed by an intervening deploy, possibly transient. Dropped; re-open if it recurs.
- ~~"Haven't logged in N days" nudge~~ — **CLOSED 2026-08-04.** Craig: "no button, leave as a banner." The existing Esther-facing "Home-training client gone quiet" warning on `/hub/clients/[id]` is the final design — no client-facing send mechanism to be built. Esther checks in with the client herself outside the system.
- **Client data consolidation** (Trainerize/Outlook/paper → hub `clients` table) — manual-entry approach already decided; this is Craig's own data-entry task, not a code task. Nothing for Claude Code to build here.
- **Lane J — paper→digital conversion tool** — still deliberately parked (Craig, 2026-07-22). Not raised again.

**Also found and fixed while checking the above (not on this list before today):** the "Level 4 Personal Trainer" claim and a Level-3-vs-4 trainer comparison — both confirmed banned 2026-07-27 — were still live in 7 places the original rewrite missed: the site-wide default `<title>`/description (`app/layout.tsx`, was showing on every hub page's browser tab), a stale `localBusinessSchema.founder.jobTitle` in `app/page.tsx`, the two AI system prompts that draft client update emails and training plans (`app/api/claude/{update-chat,plan-chat}/route.ts`), and three spots on the disabled exercise-for-health pages. All fixed, `tsc` clean, pushed `72de64f`, deployed.

## 3. Real actions outside the codebase — RESOLVED/CLEARED 2026-08-04

- ~~Subscribe `email.delivered`/`bounced`/`complained` on Resend webhook~~ — **Craig confirmed 2026-08-04: Resend is fully sorted, tested, working.** Drop as an open item.
- ~~Confirm SMTP/SendGrid backend is live~~ — **covered by the above**, Resend is the confirmed live backend.
- ~~Set `ANTHROPIC_API_KEY`~~ — **Craig, 2026-08-04: ignore.** The hub's working AI agent runs through OpenRouter instead; this is not a gap.
- ~~Verify SPF/DKIM~~ — **Craig confirmed 2026-08-04: fine, working.**
- ~~No real client invited to the portal~~ — **Craig confirmed 2026-08-04: real clients are live/working in the portal.** Stale item, dropped.

**New standing capability (2026-08-04):** Craig has granted Claude Code a role that can create a throwaway login for front-end/admin (hub + portal) testing. Use it to close the section-4 click-test gap below instead of citing "no credentials in this environment." Delete/deactivate the throwaway account after each use, per the disposable-identity rule in the global CLAUDE.md.

## 4. Live click-test debt — CLOSED 2026-08-04

Craig: "that's done, we are using it daily." The hub is in real daily production use by Esther —
that's stronger evidence than a synthetic click-test pass would have been. No standalone click-test
task needed. (Section retained below for the historical list of what this covered; not an open task.)

- Hub design-alignment Work Order, all 8 lanes (dashboard, clients, client detail incl. 7 tabs, client/PAR-Q edit, exercise library, site content, process & quality, reports/updates, settings, tasks, schedule, session editor)
- Session editor + live logging screen — live-verified 2026-08-01 via a disposable staff account
- Session logging Lanes A–D, hub tasks page, update-composer + delivery-history panel, document engine, marketing site, consent choices admin view — covered by daily real use

## 5. Marketing-page specific verification (Lane B of the launch-review WO — still open, no code change unless a bug is found)

- Hero "L4 QUALIFIED" badge — **checked 2026-08-04, not reproducing.** Computed geometry at 1280px (devicePixelRatio 1.5): text 37px fits inside the 54px circle, no overflow. Badge is hidden entirely below 1180px, so the 375px case is moot. Real screenshot still worth a look if Craig sees it clip on his own screen.
- Homepage "01/02/03" scroll-pinned section — confirm all 3 steps render on a real slow scroll, not just jump-scroll
- Contact form — confirm empty-field validation blocks submit and no real email fires during the test
- All 7 launch pages at 375px — nav collapse, footer stacking, badge clipping

---

## How to use this list

- Section 1 is closed — Craig's decisions are logged in `decisions.log` 2026-08-04.
- Section 1b items are decisions only Craig/Esther can make — nothing to build until answered.
- Section 2 — checked live 2026-08-04: 2 of 4 items were already built (stale in this list), 1 doesn't reproduce, 1 (client data) isn't a code task. Only the nudge-email question is a real open decision — Craig to answer before any code gets written for it.
- Section 3 is closed — all external actions confirmed sorted 2026-08-04.
- Section 4 is closed — daily real production use counts as verification, per Craig 2026-08-04.
- Section 5 is small and mechanical — good first pass alongside Lane A/B of the launch-review WO.
