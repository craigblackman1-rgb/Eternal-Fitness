# Work Order: Template deployment audit — close the gap between Open Design templates and the live app — 2026-07-29

OWNER: Claude Code — claimed 2026-07-29
SCOPE: `eternal-fitness-website` (`app/**`, `components/**`) — the Trainer Hub (`app/hub/(protected)/**`), the client portal (`app/portal/**`), and the one remaining marketing gap (public calorie calculator). Read-only reference: `D:\apps\design-systems\brand-staging-2662e9\template-index.html` and its 32 "current" template files. **No DB migrations. No deploy without Craig's go-ahead per page.**

Does NOT overlap `workorder-design-reconciliation-2026-07-28.md` (that WO covers the 6 marketing launch pages + shared `PageHero`/`CTABand`, already closed bar its GATE items — checked `active-workorders.md` 2026-07-29, no other ACTIVE eternal-fitness WO). This WO covers the two areas that WO never touched: Trainer Hub and Client Portal, plus the one marketing template it didn't need (Calorie Calculator, built as a Claude Artifact only, never a repo page).

GOAL: Every "Current" template in `template-index.html` (32 total: 7 marketing, 17 Hub, 8 portal) is either confirmed live and design-matched, or has an explicit lane here to build/fix it. Nothing is silently missing.

MUST:
- Compare against the mockup file named on each card in `template-index.html`, not memory or assumption.
- **Specialist Training pages: explicitly DEFERRED until post-launch per Craig 2026-07-29.** No lane in this WO builds them. Don't let any Hub/Portal lane below block on this — none of them depend on it.
- **Blog: explicitly DEFERRED until post-launch per Craig 2026-07-29.** Not in scope of any lane here (blog templates aren't in `template-index.html` anyway — this is just making the deferral explicit and cross-referencing `.context/state.md`'s existing open item on it).
- **FAQs: build the update, but do NOT deploy — hold for Esther/Craig review per Craig 2026-07-29.** Land in a worktree, push to a branch (not `main`), flag here for review rather than auto-merging like other `[AUTO]` units.
- Every unit works in its own git worktree per DO-SOP-010, branched fresh off `origin/main` (fetch first). Junction `node_modules` from the shared checkout.
- `tsc --noEmit` and a full `next build` clean before any merge. Hand-review OpenCode's diff before trusting it (see `feedback_opencode_delegation` memory).
- The client portal is a real signed-in auth surface (magic-link) — per the still-open GATE from `workorder-eternal-fitness-hub-consolidation-2026-07-20.md`, it has never been deployed live with a real client. Building the missing portal pages here does NOT flip that GATE — still needs Craig's explicit go before any real client gets a login.
- Browser-verify each built/changed page after merge (real page load) before ticking DONE — Hub pages need a real login (standing limitation noted throughout prior WOs: this environment has no hub credentials) so those verifications are `tsc`/`next build` + hand-diff only unless Craig supplies a session.

DECIDE YOURSELF: which existing `components/hub/*` or `components/ds/*` primitive to reuse for a new portal page; minor copy/casing to match the mockup; whether a "current" Hub template that's already functionally covered by a merged page (e.g. SOPs living inside Process & Quality) needs its own route or just a design-parity check on the existing one.

ASK FIRST: any `git push`/deploy to `main` (Coolify auto-deploy is ON for this app); publishing the FAQ update (build only, hold for review); anything that would start the client-portal-live GATE from the 2026-07-20 WO (inviting a real client, enabling magic-link sign-in in production).

**GATE items resolved by Craig 2026-07-29:** Documents gets its own dedicated portal page (not folded into the dashboard). Document signing supports both paths — the existing no-login magic-link flow stays as-is, and a new portal-chrome signing page is added for already-logged-in clients — both hitting the same underlying sign logic. See Lane C units below, now both `[AUTO]`.

## AUDIT — template-index.html vs. live routes (done 2026-07-29)

### 1 · Marketing (7 current)
| Template | Live route | Status |
|---|---|---|
| Home | `app/page.tsx` | Built — covered by `workorder-design-reconciliation-2026-07-28.md` (closed, GATE items pending Craig's click-through) |
| Personal Training | `app/personal-training/page.tsx` | Built — same as above |
| Pricing | `app/pricing/page.tsx` | Built — same as above |
| About | `app/about/page.tsx` | Built — same as above |
| FAQs | `app/faqs/page.tsx` | Built — Lane E of the above WO already reconciled design; **this WO's FAQ lane is a further content/design update, held for review, not a rebuild** |
| Contact | `app/contact/page.tsx` | Built — same as above |
| Calorie Calculator (public) | **none** | **MISSING** — only exists as a Claude Artifact (`https://claude.ai/code/artifact/225fcf34-7aa2-425b-9395-c9a618db3df0`), never ported into the repo. Lane A below. |

### 2 · Trainer Hub (17 current)
| Template | Live route | Status |
|---|---|---|
| Dashboard | `app/hub/(protected)/page.tsx` | Built |
| Clients | `app/hub/(protected)/clients/page.tsx` | Built |
| Client detail | `app/hub/(protected)/clients/[id]/page.tsx` | Built — redesigned per 2026-07-20 hub-consolidation WO |
| Client edit | `app/hub/(protected)/clients/[id]/edit/page.tsx` | Built |
| Schedule | `app/hub/(protected)/schedule/page.tsx` | Built |
| Session editor | `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx` | Built — Lane H of the 2026-07-26 WO |
| Exercise library | `app/hub/(protected)/exercises/page.tsx` | Built |
| Training rules | `app/hub/(protected)/settings/training-rules/page.tsx` | Built |
| Studio equipment | `app/hub/(protected)/settings/studio-equipment/page.tsx` | Built |
| Plan Agent settings | `app/hub/(protected)/settings/plan-agent/page.tsx` | Built |
| PARQ edit | `app/hub/(protected)/clients/[id]/parq/[parqId]/edit/page.tsx` | Built |
| Process & quality | `app/hub/(protected)/process-quality/page.tsx` | Built |
| SOPs | *(no dedicated route — SOPs render inside Process & Quality via `ProcessQualityManager.tsx`, DB-backed `sops` table)* | **Design-parity check only** — confirm the merged view still reads correctly against `hub-sop.html`'s standalone layout intent; not a missing page, a structural difference. Lane B below. |
| Site content — list | `app/hub/(protected)/site-content/page.tsx` | Built |
| Site content — editor | `app/hub/(protected)/site-content/[slug]/page.tsx` | Built |
| Reports & updates | `app/hub/(protected)/reports/updates/page.tsx` | Built |
| Tasks | `app/hub/(protected)/tasks/page.tsx` | Built |

All 17 Hub templates have a live route (16 direct + 1 merged). The 2026-07-26 design-alignment WO already ran a presentation-layer diff across every Hub route — this WO does **not** repeat that; Lane B here is scoped only to the SOPs structural question, which that WO didn't cover.

### 3 · Client portal (8 current)
| Template | Live route | Status |
|---|---|---|
| Sign in | `app/portal/login/page.tsx` | Built |
| Portal home | `app/portal/(protected)/page.tsx` | Built — currently also carries the Documents list + Updates content inline |
| Account | **none** | **MISSING** |
| Documents — list | *(inline on Portal home, no dedicated route)* | **Gap** — mockup treats it as its own screen; live folds it into the dashboard. Judgment call, not an obvious bug — see Lane C. |
| Document viewer | **none** (closest: `app/portal/(protected)/updates/[id]/page.tsx`, which is for Updates, not Documents) | **MISSING** |
| Document edit | **none** in portal shell (`app/parq/edit/[id]/page.tsx` exists but is a public magic-link route outside the portal shell entirely) | **MISSING** (as a portal-shell page) |
| Document sign | `app/documents/[id]/sign/page.tsx` — exists but **outside** `app/portal/(protected)/`, i.e. not wrapped in portal chrome | **Gap** — works as a standalone magic-link flow; mockup shows it inside the signed-in portal shell. Judgment call — see Lane C. |
| Calorie guide (portal) | **none** | **MISSING** — mockup is the same calculator wrapped in portal chrome + personalised; doesn't exist anywhere as a real page (the public one doesn't exist either, see Lane A). |

Portal is the real gap area — of 8 templates, 4 are flat-out missing and 2 more are structural judgment calls (fold-into-dashboard vs. dedicated page). This matches the standing open item from the 2026-07-20 WO ("client portal magic-link auth + read-only view — code built, not deployed as a live auth surface").

## LANES
- Lane A — Public + portal Calorie Calculator (2 pages, shared calc logic) · depends on: none
- Lane B — Hub SOPs design-parity check · depends on: none
- Lane C — Portal: Account, Documents list (dedicated page), Document viewer, Document edit, wrap Document sign in portal chrome · depends on: none, but all touch `app/portal/(protected)/**` — build as one lane to avoid layout-shell conflicts
- Lane D — FAQs update, held for review · depends on: none — **do not merge to `main` without Craig's sign-off**
- Specialist Training: **no lane — deferred**
- Blog: **no lane — deferred**

## UNITS

### Lane A — Calorie Calculator (public + portal)
- [AUTO] Port the existing Claude Artifact calculator (weight/height/age/sex + activity-level picker, kg↔stone/lb toggle already bug-fixed per Craig's 2026-07-29 sign-off) into a real Next.js page at a public route matching `calorie-calculator.html` — files: new `app/calorie-calculator/page.tsx` + client component — VERIFY: `tsc`/`next build` clean, calculator produces the same output as the Artifact version for a known input
- [AUTO] Wrap the same calculator in portal chrome per `portal-calorie-calculator.html` (personalised — pull the signed-in client's stored weight/height if already on file, otherwise same manual inputs) — files: new `app/portal/(protected)/calorie-guide/page.tsx` — VERIFY: `tsc`/`next build` clean, renders inside portal shell, falls back gracefully with no stored data
- [AUTO] Link both from the appropriate nav — public one from the marketing footer/nav where FAQs/Contact live; portal one from `app/portal/(protected)/page.tsx`'s quick links

### Lane B — Hub SOPs design-parity check
- [AUTO] Compare the live `ProcessQualityManager.tsx`'s SOPs tab/section against `hub-sop.html` — confirm the merged-into-Process-&-Quality structure isn't losing any content or interaction the standalone mockup implies (e.g. a dedicated SOPs list/search view) — files: `app/hub/(protected)/process-quality/ProcessQualityManager.tsx` — VERIFY: side-by-side read, note any real gap as a follow-up unit rather than guessing a fix

### Lane C — Portal: Account, Documents, Document viewer/edit, Document sign wrap
- [AUTO] Build `app/portal/(protected)/account/page.tsx` per `portal-account.html` — client's own profile fields, read-only or editable per the mockup (check which) — reuse `HubCard`/existing portal data-fetch pattern from `app/portal/(protected)/page.tsx`
- [AUTO] **RESOLVED by Craig 2026-07-29: Documents gets its own page**, matching the mockup exactly. Build `app/portal/(protected)/documents/page.tsx` per `portal-documents.html` (signed + outstanding lists); trim the inline documents block out of `app/portal/(protected)/page.tsx`'s dashboard once the dedicated page exists (dashboard keeps a short "recent/outstanding" summary card that links through, not the full lists duplicated in two places — use judgement on exact split, mockup's portal-home vs portal-documents split is the reference)
- [AUTO] Build `app/portal/(protected)/documents/[id]/page.tsx` (read-only document viewer) per `portal-document-view.html` — reuses the same document-fetch pattern as `app/documents/[id]/sign/page.tsx` but wrapped in portal chrome and without the sign action for already-signed docs
- [AUTO] Build `app/portal/(protected)/documents/[id]/edit/page.tsx` (client-editable documents, e.g. PAR-Q) per `portal-document-edit.html` — check whether this can reuse `app/parq/edit/[id]/page.tsx`'s logic wrapped in portal chrome, or needs its own form
- [AUTO] **RESOLVED by Craig 2026-07-29: support BOTH signing paths.** Keep the existing standalone magic-link flow at `app/documents/[id]/sign/page.tsx` exactly as-is (no-login-required, for a client who just clicks the emailed link) — do not remove or gate it. Additionally build `app/portal/(protected)/documents/[id]/sign/page.tsx` per `portal-document-sign.html`, wrapped in portal chrome, for a client who's already logged into the portal and opens an outstanding document from their own Documents list. Both routes should hit the same underlying sign action/API so a document's signed state is consistent regardless of which path was used — check `app/documents/[id]/sign/page.tsx`'s submit handler for the shared logic to reuse rather than duplicating it.

### Lane D — FAQs update (build only, hold for review)
- [AUTO] Re-diff `app/faqs/FAQsPageClient.tsx` against the current `faqs.html` in case the mockup has moved since Lane E of the 2026-07-28 design-reconciliation WO closed it
- [AUTO] Apply any design/structural updates found — do NOT touch answer copy beyond what the mockup itself specifies (the FAQ answer-body content rewrite is a separate, larger open item in `.context/state.md`, out of scope here)
- Build in a worktree, push to a branch (e.g. `task/faqs-update-2026-07-29`), **do not merge to `main`** — flag here with the branch name and a summary of what changed for Craig/Esther to review before it goes live

## LEDGER
Progress written to `eternal-fitness-website/.context/state.md` + `handoff.md` as each lane ticks.
Live status: `eternal-fitness-website/.context/loop-status.md`

CONTEXT: Grew out of Craig splitting `D:\apps\design-systems\brand-staging-2662e9\template-index.html` (32 "current" templates across marketing/Hub/portal) into individually reviewable pieces and asking which are still undeployed. The 2026-07-28 design-reconciliation WO already covers the 6 marketing launch pages; the 2026-07-26 hub-design-alignment WO already covers presentation-layer parity across all 17 Hub routes. This WO fills the remaining gap: the portal (4 missing pages, 2 IA judgment calls), the public+portal calorie calculator (built as an Artifact, never a repo page), a narrow SOPs structural check, and a held-for-review FAQ update. Three explicit scope decisions from Craig, 2026-07-29: Specialist Training deferred post-launch, Blog deferred post-launch, FAQs built but not published until reviewed.
