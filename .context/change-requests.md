# Change Requests — Eternal Fitness Website

Per-project CR register (DO-SDLC Pipeline v1 / SOP-008). Bootstrapped 2026-08-17 —
no register existed for this project before this audit. Rows below are the first
entries, seeded from the SEO/AI-SEO/speed/spam audit run 2026-08-17.

Status flow: raised → approved → briefed → built → verified.

**Bug vs CR boundary (per operating model):** the two items below marked `[BUG]`
are functional defects (something broken, not something new/improved) and belong
in the hub's task tracker (`decoded-ops-hub`, `task_type=bug`) once this project
has a live project_id there — not tracked yet, see note at bottom. Everything
else is a genuine change/improvement and lives here as a CR.

| ID | Item | Type | Status | Raised | Notes |
|---|---|---|---|---|---|
| CR-EF-001 | Re-enable Next.js image optimization (`images.unoptimized: false` + `sharp`) and compress oversized source images in `public/images/` (several 6–18MB originals) | CR (perf) | gated | 2026-08-17 | Root cause of slow front-end image loads. Needs `pnpm add sharp` — standing package-install gate, question queued for Craig (`wo ask` id `qmsx1x7a3os`). |
| CR-EF-002 | [BUG] Contact form (`/api/leads`) has no honeypot/bot-trap — IP rate-limiting (added 2026-08-15) doesn't stop bots rotating IPs | Bug | built | 2026-08-17 | Honeypot field added to `app/contact/ContactPageClient.tsx` + server-side check in `app/api/leads/route.ts`. Not yet mirrored into the hub's live bug tracker (`decoded-ops-hub`, `task_type=bug`) — no confirmed project_id/DB access this session. |
| CR-EF-003 | `app/sitemap.ts` missing `/specialist-training` (live, indexable, nav-linked) | CR (SEO) | built | 2026-08-17 | Added. Comment updated to reflect the current re-gate (blog/cancer-rehab/falls-prevention excluded pending sign-off, not launch-scope). |
| CR-EF-004 | `/contact` title tag 80 chars, duplicates brand name — will be truncated in SERPs | CR (SEO) | built | 2026-08-17 | Fixed, `app/contact/page.tsx:21`. |
| CR-EF-005 | Meta descriptions on `/`, `/personal-training`, `/visual-impairment` run 170–197 chars, past Google's ~155–160 char practical limit | CR (SEO) | built | 2026-08-17 | Trimmed to 141–143 chars, keywords preserved. |
| CR-EF-006 | Add `Review`/`AggregateRating` schema to `/testimonials` (real named/dated quotes + "5.0 from 26 reviews" already in the HTML, no schema) | CR (SEO) | deferred | 2026-08-17 | `wo defer` id `dmsx1yz4wkp`. Source reviews are third-party (Google Reviews) — needs a read of current Google review-schema eligibility rules before implementing, not a quick fix. |
| CR-EF-007 | Update `public/llms.txt` link from `/exercise-for-health` to `/specialist-training` directly (currently an extra redirect hop) | CR (AI-SEO) | built | 2026-08-17 | Fixed. |
| CR-EF-008 | HTTP→HTTPS redirect is 302 not 301; no HSTS header | CR (infra) | deferred | 2026-08-17 | `wo defer` id `dmsx1yz8hwt`. Proxy-level (Coolify/Traefik), not app code — out of this repo's scope. |
| CR-EF-009 | Design-parity catch-up for 4 unmocked hub screens (client intake, per-client documents, updates history/composer, block review) | CR (design parity) | built | 2026-08-17 | Merged to main+staging (commits 4f9330e..27cbb28). See `.context/audit-hub-mockup-reconciliation-2026-08-15.md` and `D:\apps\design-systems\ef-control-hub\brief-hub-remaining-screens-opendesign.md`. Renumbered from a since-superseded CR-EF-006 — see process-gap note below. |
| CR-EF-010 | Monthly calendar view for `/hub/schedule` (Outlook-style month grid alongside the existing day view) | CR (functionality) | built | 2026-08-17 | Per `hub-schedule-month.html` (Open Design). Read-only baseline; day view keeps booking create/edit/cancel. Renumbered from a since-superseded CR-EF-007. |

## Outstanding process gap

This project has no confirmed live `project_id` in `decoded-ops-hub`'s `tasks` table
from this session, and no DB/API access was verified here. CR-EF-002 (contact-form
spam) is a genuine bug and should be logged there with `task_type=bug` once that's
confirmed — flagging rather than guessing at hub credentials or another app's data.

**Register-history gap (2026-08-17, found during CR-EF-009/010 landing):** an
earlier CR-EF-001 through CR-EF-005 series (workout-surface consolidation, PWA
installability, a stale webmanifest string, band-colour prescription, and a
retro-captured workout-from-template feature) existed in this same file's path
but was **never git-committed** — it only ever lived in the shared checkout's
working tree (`D:\apps\eternal-fitness-website\.context\change-requests.md`,
uncommitted). This SEO-audit session's bootstrap legitimately found no tracked
file and started a fresh CR-EF-001 sequence from scratch, colliding in ID (not
content) with the older series. Nothing is technically lost yet — the old
content should still be sitting in that shared-checkout working copy — but it
needs a dedicated reconciliation pass: read it, renumber its 5 entries into
this sequence (CR-EF-011 onward), and confirm none of it has since been
overtaken by CR-EF-005's own note about the pending consolidation redesign.
Do this before the shared checkout's uncommitted copy is ever discarded.
