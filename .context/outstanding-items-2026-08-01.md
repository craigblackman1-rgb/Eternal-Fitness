# Eternal Fitness Website — Consolidated Outstanding Items
2026-08-01, updated 2026-08-04 · Superset of every open item across all Work Orders in `.context/workorder-*.md` and `state.md`. This is the single list to work from — check items off here and cross-reference the source WO file for detail rather than reopening WOs individually.

Registry status at time of writing (2026-08-04): `wo-eternalfitness-consolidated-2026-08-02` (registry) claimed by this session; `wo-eternal-fitness-launch-review-followups-2026-07-30`'s Lane C fully closed today — see decisions.log 2026-08-04. Everything else is `DONE` in code-shipped terms; the click-test gap in section 4 still applies.

---

## 1. Blocking launch — RESOLVED 2026-08-04 (Craig's decisions, see decisions.log)

- **Condition-roll-call copy** on Home + Personal Training — **leave as-is for now**, revisit once the Specialist Training catalogue ships.
- **Blog scope** (27 unedited legacy posts) — **deferred**, no action before launch.
- **FAQ answer bodies** — **rewrite pass done 2026-08-04.** Reviewed all 17 against voice.md; most already compliant from `74b2fa9`; 3 polished for tone. `tsc` clean.
- **About page "Real Story"** — **confirmed correct/final by Craig.**
- **Google Reviews shortlist** — **confirmed usable as-is by Craig** (also previously resolved 2026-07-30 in stats.md).
- **Specialist Training catalogue** — **deferred to post-launch**, confirmed by Craig.
- **`portal-sign-in.html` mismatch** — **not actually open.** This item was stale here: the real GATE was already resolved 2026-07-30 (Craig: keep password auth, reskin only — see `workorder-hub-portal-mockup-audit-2026-07-30.md` Lane 5) and shipped in commit `71de12c`. Craig reconfirmed 2026-08-04: "just a password and username, that is it." No further work.

## 1b. Still genuinely open — needs a decision

- **5 of 8 `exercise-for-health` condition sub-pages** don't exist (type-2-diabetes, COPD, heart-conditions, chronic-pain, adaptive-training) — scope decision needed on how many to build before launch. Not addressed 2026-08-04, still open.
- **`hub-sop.html`** has no confirmed live counterpart and its sidebar nav doesn't match any other hub mockup — flagged, no lane drafted. Still open.
- **`/hub/documents` now has a mockup** (`hub-documents.html`) — worth confirming whether the same-day `9107985` redesign was already built against it. Not checked 2026-08-04.
- **PAR-Q edit screen** (`/hub/clients/[id]/parq/[parqId]/edit`) — needs a scoped fork/leave/retire decision. Still open.

## 2. Real code work — Craig's call 2026-08-04: **carry on with all of these.** Next Work Order candidates.

- **"Haven't logged in N days" nudge send mechanism** — detection/flagging built (7-day threshold); build the send path — auto-send vs. Esther-reviewed draft, per the standing no-auto-send-without-review rule.
- **Hub UI to flip a client to `delivery_mode='home_training'`** — SQL-only today, build the UI toggle.
- **`/hub/site-review` returns HTTP 500** — real bug, found 2026-08-01 via `verify-hub-pages.js`, not yet investigated. Investigate and fix.
- **Client data consolidation** (Trainerize/Outlook/paper → hub `clients` table) — manual-entry approach already decided, not started. Not blocking, but in scope to progress per Craig's "carry on with all of those."
- **Lane J — paper→digital conversion tool** — still deliberately parked (Craig, 2026-07-22). Not included in "carry on with all of those" — do not pick up proactively unless Craig raises it again.

## 3. Real actions outside the codebase — RESOLVED/CLEARED 2026-08-04

- ~~Subscribe `email.delivered`/`bounced`/`complained` on Resend webhook~~ — **Craig confirmed 2026-08-04: Resend is fully sorted, tested, working.** Drop as an open item.
- ~~Confirm SMTP/SendGrid backend is live~~ — **covered by the above**, Resend is the confirmed live backend.
- ~~Set `ANTHROPIC_API_KEY`~~ — **Craig, 2026-08-04: ignore.** The hub's working AI agent runs through OpenRouter instead; this is not a gap.
- ~~Verify SPF/DKIM~~ — **Craig confirmed 2026-08-04: fine, working.**
- ~~No real client invited to the portal~~ — **Craig confirmed 2026-08-04: real clients are live/working in the portal.** Stale item, dropped.

**New standing capability (2026-08-04):** Craig has granted Claude Code a role that can create a throwaway login for front-end/admin (hub + portal) testing. Use it to close the section-4 click-test gap below instead of citing "no credentials in this environment." Delete/deactivate the throwaway account after each use, per the disposable-identity rule in the global CLAUDE.md.

## 4. Live click-test debt (the big recurring gap — now unblocked, see the new capability above)

Nothing below has ever been walked through by a logged-in human in a real browser — every one of these shipped on `tsc`/build-clean + code-review confidence only. This is not a code-quality gap, it's a "has anyone actually used it" gap. In rough order of how much surface area each covers:

- **Hub design-alignment Work Order, all 8 lanes** (dashboard, clients, client detail incl. 7 tabs, client/PAR-Q edit, exercise library, site content, process & quality, reports/updates, settings, tasks, schedule, session editor) — `workorder-hub-design-alignment-session-editor-2026-07-26.md`
- ~~**Session editor + live logging screen**~~ — **live-verified 2026-08-01** via a disposable staff account.
- **Session logging Lanes A–D** (per-set logging, home-training portal self-logging, progress/trend view, scheduling + calendar) — click-tested once via the synthetic test client, never by Esther/Craig on a real one
- **Hub tasks page** (kanban, filters, sort, due-date banner, bucket rename/delete)
- **Update-composer paste fixes + email delivery-history panel**
- **Document engine**: scanned-document upload path, PAR-Q/Agreement/Feedback/Consent send flows, portal document viewer, portal sign-in/invite flow
- **Marketing site**: full 6-launch-page + 3-legal-page pass at mobile width, disabled-route redirects actually redirecting, launch-copy alignment
- **Consent choices admin view**

## 5. Marketing-page specific verification (Lane B of the launch-review WO — still open, no code change unless a bug is found)

- Hero "L4 QUALIFIED" badge — confirm the fix (Lane A) actually resolves clipping at 1280px and 375px
- Homepage "01/02/03" scroll-pinned section — confirm all 3 steps render on a real slow scroll, not just jump-scroll
- Contact form — confirm empty-field validation blocks submit and no real email fires during the test
- All 7 launch pages at 375px — nav collapse, footer stacking, badge clipping

---

## How to use this list

- Section 1 is closed — Craig's decisions are logged in `decisions.log` 2026-08-04.
- Section 1b items are decisions only Craig/Esther can make — nothing to build until answered.
- Section 2 items are approved and buildable — candidates for the next Work Order (Craig: "carry on with all of those," 2026-08-04).
- Section 3 is closed — all external actions confirmed sorted 2026-08-04.
- Section 4 is one recurring task, now unblocked by the new throwaway-login capability: log in to `staging.eternal-fitness.co.uk`'s hub and portal and click through the list top to bottom.
- Section 5 is small and mechanical — good first pass alongside Lane A/B of the launch-review WO.
