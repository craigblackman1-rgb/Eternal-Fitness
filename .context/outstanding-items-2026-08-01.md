# Eternal Fitness Website — Consolidated Outstanding Items
2026-08-01 · Superset of every open item across all Work Orders in `.context/workorder-*.md` and `state.md`. This is the single list to work from — check items off here and cross-reference the source WO file for detail rather than reopening WOs individually.

Registry status at time of writing: only one Work Order is still `ACTIVE` (`wo-eternal-fitness-launch-review-followups-2026-07-30`). Everything else is `DONE`, but "done" in this repo has consistently meant *code shipped and deployed*, not *click-tested by a human* — that gap runs through nearly every item below.

---

## 1. Blocking launch — needs Craig/Esther decision (`[GATE]`)

From the active Work Order (`workorder-launch-review-followups-2026-07-30.md`, Lane C):

- **Condition-roll-call copy** on Home + Personal Training ("Heart health and blood pressure / Bone and joint health / Visual impairment / Cancer rehabilitation") — hard rule says generalise on general pages. Reword now, or accept as-is until the Specialist Training catalogue ships?
- **Blog scope** (27 unedited legacy WordPress posts, currently disabled/redirected) — noindex-and-launch-as-is, curate a subset, or post-launch rewrite project?
- **FAQ answer bodies** — only ~2 of 17 rewritten. Needs a full pass against `voice.md` with Esther.
- **About page "Real Story"** — sourced from Esther's published Storm Fitness Academy interview, not yet confirmed verbatim by her directly.
- **Google Reviews shortlist** (curated in `references/stories.md`) — Esther hasn't confirmed which reviews she's comfortable seeing used publicly.

From `state.md` / other WOs:
- **Specialist Training catalogue** doesn't exist yet — Personal Training/Home pages link to a placeholder anchor (`/personal-training#specialist`). Must not reach production pointing at nothing real.
- **5 of 8 `exercise-for-health` condition sub-pages** don't exist (type-2-diabetes, COPD, heart-conditions, chronic-pain, adaptive-training) — scope decision needed on how many to build before launch.
- **`portal-sign-in.html` mismatch** — mockup is passwordless email+one-time-code, live is traditional email+password. Matching means changing the auth mechanism itself, not a visual fix. Parked pending Craig's call (`workorder-hub-portal-mockup-audit-2026-07-30.md`).
- **`hub-sop.html`** has no confirmed live counterpart and its sidebar nav doesn't match any other hub mockup — flagged, no lane drafted. Re-confirmed via `.context/tools/verify-hub-pages.js` 2026-08-01, still unresolved.
- **`/hub/documents` now has a mockup** (`hub-documents.html`, appeared 2026-08-01) — the 2026-07-26 WO's "real, not mocked" note for this route is now stale. There's already a same-day commit (`9107985`, pushed 09:13) redesigning this exact page — worth checking whether it was already built against the new mockup or is coincidental, before assuming it's covered.
- **`/hub/site-review` returns HTTP 500** — found live via `.context/tools/verify-hub-pages.js` 2026-08-01, not yet investigated. Real bug, not a mockup-parity issue.
- **PAR-Q edit screen** (`/hub/clients/[id]/parq/[parqId]/edit`) still runs on the old shared public-facing component, deliberately not restyled (also lives on the public signing flow). Needs a scoped decision: fork it, leave it, or retire it.

## 2. Real code work not yet started

- **"Haven't logged in N days" nudge send mechanism** — detection/flagging is built (7-day threshold), but whether it auto-sends to the client or generates an Esther-reviewed draft is still open, per the standing no-auto-send-without-review rule. (`workorder-session-logging-2026-07-25.md`)
- **No hub UI to flip a client to `delivery_mode='home_training'`** — SQL-only today. Built as a gap, not fixed.
- **Client data consolidation** (Trainerize/Outlook/paper → hub `clients` table) — decided to do this by manual entry, never started. Not currently blocking anything.
- **Lane J — paper→digital conversion tool** — deliberately parked by Craig 2026-07-22 (recommendation on record: vision-LLM extraction, not OCR). Not to be picked up proactively.

## 3. Real actions needed outside the codebase

- **Subscribe `email.delivered` / `email.bounced` / `email.complained`** on the Resend webhook (Resend dashboard → Domains → sending domain → Webhooks). Only `opened`/`clicked` are currently enabled; the handler code already supports all 5 event types (shipped 2026-07-28) but nothing populates until this is subscribed.
- **Confirm SMTP/SendGrid backend is actually live**, not dry-running — a 36ms created→sent gap on a real send is circumstantial evidence it's dry-running in prod, never definitively confirmed. `emailed`/"Not delivered" UI indicators now surface this if/when it happens, but a real test send would settle it.
- **Set `ANTHROPIC_API_KEY`** — currently empty, Claude generation (blocks + updates) silently falls back to template.
- **Verify SPF/DKIM** for the sending domain.
- **No real client has ever been invited to the portal** — portal auth, home-training self-logging, and the document engine's client-facing send flow have all shipped but never been exercised against a real client account (only a synthetic test client, `client_number 19`, exists — safe to delete once done with it).

## 4. Live click-test debt (the big recurring gap)

Nothing below has ever been walked through by a logged-in human in a real browser — every one of these shipped on `tsc`/build-clean + code-review confidence only, because no hub credentials exist in this build environment. This is not a code-quality gap, it's a "has anyone actually used it" gap. In rough order of how much surface area each covers:

- **Hub design-alignment Work Order, all 8 lanes** (dashboard, clients, client detail incl. 7 tabs, client/PAR-Q edit, exercise library, site content, process & quality, reports/updates, settings, tasks, schedule, session editor) — `workorder-hub-design-alignment-session-editor-2026-07-26.md`
- ~~**Session editor + live logging screen**~~ — **live-verified 2026-08-01** via a disposable staff account (created and deleted per the standing rule): `/hub/log/[sessionId]` renders real data correctly (superset grouping, reps-vs-time badges, prescribed targets), a real Done click wrote a genuine `set_logs` row end-to-end, edit mode's log-type toggle renders and is clickable. Cross-section drag itself (Unit 2) was code-reviewed thoroughly but not physically drag-tested in a browser — browser drag-and-drop simulation is unreliable via current tooling on this page.
- **Session logging Lanes A–D** (per-set logging, home-training portal self-logging, progress/trend view, scheduling + calendar) — click-tested once via the synthetic test client, never by Esther/Craig on a real one
- **Hub tasks page** (kanban, filters, sort, due-date banner, bucket rename/delete)
- **Update-composer paste fixes + email delivery-history panel**
- **Document engine**: scanned-document upload path, PAR-Q/Agreement/Feedback/Consent send flows, portal document viewer, portal sign-in/invite flow
- **Marketing site**: full 6-launch-page + 3-legal-page pass at mobile width, disabled-route redirects actually redirecting, launch-copy alignment
- **Consent choices admin view**

## 5. Marketing-page specific verification (Lane B of the active WO — no code change unless a bug is found)

- Hero "L4 QUALIFIED" badge — confirm the fix (Lane A) actually resolves clipping at 1280px and 375px
- Homepage "01/02/03" scroll-pinned section — confirm all 3 steps render on a real slow scroll, not just jump-scroll
- Contact form — confirm empty-field validation blocks submit and no real email fires during the test
- All 7 launch pages at 375px — nav collapse, footer stacking, badge clipping

---

## How to use this list

- Section 1 items are decisions only Craig/Esther can make — nothing to build until answered.
- Section 2 items are real, scoped, buildable — candidates for the next Work Order.
- Section 3 items are Craig actions in third-party dashboards (Resend, env vars) — not something an agent can do.
- Section 4 is one recurring task, not many: get Craig (or a shared session) logged into `staging.eternal-fitness.co.uk`'s hub and portal once, and click through the list top to bottom. Most of it will likely just confirm what's already shipped.
- Section 5 is small and mechanical — good first pass once Craig's next available for a live check.
