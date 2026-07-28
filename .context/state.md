# Eternal Fitness Website — State

## Current
<<<<<<< Updated upstream
- **Update-composer paste fixes + email send/resend delivery history — DONE + DEPLOYED + LIVE-VERIFIED
  2026-07-28 (evening).** 6 commits, all confirmed `running:healthy` via Coolify MCP. (1) `5f64b03` —
  "Paste a draft" option added to the New Update composer, bypassing the AI chat entirely (it was
  silently rewriting pasted text through a 4000-char conversation-summary). (2) `ff46fe2` — opening line
  is now WYSIWYG; Flexible Update (custom sections, has add/remove) restored as the default template —
  it used to be the only template, so add/remove was always visible until 6-Week/4-Week got added ahead
  of it in the list. (3) `295e7ca` — paste-parser heading detection no longer requires a blank line
  before a heading (real Word/Docs/Gmail pastes don't have one). (4) `f05aab0` — paste box switched from
  a plain `<textarea>` (always flattens clipboard content to plain text, per the HTML spec) to a
  contentEditable rich-text box, so bold/headings/lists survive; new `parsePastedHtmlUpdate()` reads the
  actual pasted DOM. (5) `bb482bf` — client portal's documents list had no click-through at all (plain
  `<li>` rows, no `<Link>`) — fixed. (6) `ac47f67` — real feature: append-only `email_send_events` table
  (migration applied live) tracks every send/resend/delivered/opened/clicked/bounced/complained event per
  update and document — previously a resend overwrote the only `sent_at` on record, so "did this actually
  go out" was unanswerable after a resend. New "Delivery history" panel in the hub (per-client updates
  list + document detail page); portal's update-email list now links through to a real view page.
  Backfilled 27 historical sends from existing `sent_at` (honestly caveated as last-known-send only, not
  a true reconstructed history). **Needs Craig:** subscribe `email.delivered`/`bounced`/`complained` on
  the Resend webhook endpoint (Resend dashboard → Domains → Webhooks) — only `opened`/`clicked` are
  enabled today, so the new event types won't populate until that's added. Also created a portal login
  for Ian Healey (client #9), credentials handed to Craig directly (invite email not sent). **Not done:**
  no live click-test in a real hub session. Full detail in handoff.md.
=======
- **Hub tasks — due-date filtering, sorting, "Due This Week" banner — DONE + DEPLOYED 2026-07-28.**
  `/hub/tasks` now has Overdue/Due Today/Due This Week/No Due Date filter pills, a Due date/Created/Title
  sort control (direction toggle, no-due-date tasks always last), and a due-soon summary banner (rose if
  anything's overdue, amber otherwise). Client-side only against the existing `due_date` column, no
  migration. Built in an isolated worktree, `tsc --noEmit` + full `next build` both clean, pushed
  `e5347ef..087ae2e` to `main`, Coolify auto-deploy confirmed `running:healthy`. Not click-tested live
  (no hub credentials in this environment). Full detail in `.context/handoff.md`.
>>>>>>> Stashed changes
- **Launch-page copy alignment + 4 follow-up UI fixes — DONE + DEPLOYED + LIVE-VERIFIED 2026-07-27
  (evening).** Craig reported the morning's launch-copy commit (`3f50bd8`) had shipped copy diverging
  from the source doc (`EF_Launch_Pages_Redraft_Jul2026.docx`, workspace repo). Confirmed real: Home and
  About had each picked up the doc's new hero/story copy but retained clinical-first sections and
  elements the doc explicitly replaced. Fixed across five commits, each built in its own isolated
  worktree per DO-SOP-010, each deploy confirmed healthy via Coolify MCP **and** re-verified live in a
  real browser (never on deploy-status alone):
  - `74b2fa9` — all 6 launch pages aligned line-by-line to the doc. Home: qualification badge moved out
    of the hero, a GP-referred-clients badge removed from the Why section (not in the doc at all —
    exactly the clinical-first framing the rewrite existed to strip), Who-cards reordered so the
    general-audience card leads, added the doc's Specialist Training cross-link band, corrected a
    testimonial quote misattributed to Saffron S. About: Experience/Philosophy/studio-callout rewritten
    (still carried the old condition-roll-call copy) + added the missing Colin F testimonial. Personal
    Training: added the doc's Specialist Training section. Pricing/FAQs: minor wording. Contact: clean.
  - `5f4ca6e` — removed a duplicate self-introduction. Hero and Why section both opened with "I'm Esther
    — a personal trainer based in a private studio in Worthing"; a regression from `74b2fa9` (hero took
    the line from the doc, the pre-existing Why paragraph already had it). Dropped the Why paragraph —
    the doc has no paragraph there, just heading + 3 bullets.
  - `eee2be1` — CTA-band photos cropped Esther's head off on wide screens. The band is full-width with a
    fixed min-height, so `object-fit: cover` crops far more vertically as the viewport widens; with the
    default centred `object-position` and her head in the upper third of every source photo, wide
    viewports cut into her face. Added an optional `imagePosition` prop to the shared `CTABand`
    component (default unchanged) and top-biased the 5 CTA photos featuring her. Pricing's CTA image has
    no person in it — deliberately untouched.
  - `ed51b6f` — hero heading descenders (the "g" in Training/Worthing) were clipped. `.hw`'s
    `padding-bottom: .04em` sat on an element with no font-size of its own, so the `em` resolved against
    the inherited 16px body font (0.64px) rather than the 78–92px heading rendered inside it, while
    `.hw`'s `overflow: hidden` (needed for the GSAP slide-reveal) clipped the overflow. Moved the
    padding onto `.hl`, which carries the large `clamp()`'d font-size.
  - `97dba83` — homepage **section order** was wrong, not just wording: Who I Work With and Specialist
    Training sat before The Approach instead of after. Reordered to the doc's sequence (Hero → Why →
    How I Actually Train You → Who I Work With → Specialist Training → testimonials → CTA), no copy
    changes; every paragraph re-checked word-for-word against the doc at the same time.
  **Open:** the Specialist Training catalogue pages these now link to don't exist yet (placeholder
  anchor `/personal-training#specialist`) — must not reach production in that state. FAQ answer bodies
  (21 questions) still un-rewritten, deliberately.
- **Homepage nav-scrim contrast fix — DONE + DEPLOYED 2026-07-27.** Craig flagged the homepage nav
  looking washed out over the hero's white left text panel (fine over the dark hero photo on the right).
  Root cause: `#hero::before`'s scrim (`app/home.css`) faded from 50% opacity at the top to fully
  transparent by 170px down, but the nav itself is only 72px tall — by the bottom of the nav the scrim
  had already faded to ~29% opacity, so the white logo/nav text sat on a near-transparent scrim over a
  plain white background on the left. Fixed by holding the gradient at 60% opacity through the full 72px
  nav height, then fading to transparent by 170px. Built in an isolated worktree
  (`ef-worktree-nav-scrim-2026-07-27`, branch `fix/nav-scrim-contrast`) per DO-SOP-010 — the shared
  checkout had been edited directly by mistake first, caught before pushing, reverted, redone properly.
  Pushed `9c03763`, GitHub webhook auto-triggered a Coolify deploy (confirmed `running:healthy` via MCP),
  verified live on `staging.eternal-fitness.co.uk` with a real Playwright screenshot (not just a
  self-report) — nav now reads clearly across the full width. **Auto-deploy confirmed ON for this app**
  (the webhook deploy already finished by the time a manual API-triggered deploy was tried — the manual
  one was redundant/wasted, one attempt even failed; don't manually trigger a deploy on this app after a
  push, it's automatic.
- **Marketing site copy rewrite + launch-scope page disabling — DONE + DEPLOYED 2026-07-27.** Two pieces,
  both from the `eternal-fitness` workspace repo's reference-layer sign-off the same day (see that repo's
  `.context/decisions.log`, 2026-07-27 entries, for the full "personal trainer first" positioning
  rationale):
  1. **Copy rewrite** (`3f50bd8`): Home, About, Personal Training, Pricing, FAQs, Contact rewritten to
     lead with personal training, not health conditions. Fixed the "Level 4 Personal Trainer / highest in
     the UK" claim everywhere it appeared, including 3 separate schema.org blocks (jobTitle/hasCredential
     on Home and About, plus Personal Training's Service schema) — Esther's Level 4 is the CanRehab
     Cancer and Exercise Rehabilitation qualification specifically. Removed the £45 single-session tier
     — confirmed not a real offer — from the Pricing cards, 2 schema.org Offer blocks, and a hardcoded
     FAQ answer that also quoted it. About's fabricated origin story replaced with a real one sourced from
     Esther's published Storm Fitness Academy interview. Testimonials swapped for real, sourced Google
     Reviews quotes.
  2. **Launch-scope page disabling** (`ded1a88`→`63c7875`): Craig asked to disable everything outside the
     6 launch pages + 3 legal pages for now. Added temporary (`permanent: false`) redirects in
     `next.config.js` for `/blog`, `/blog/:path*`, `/cancer-rehabilitation`, `/exercise-for-health`, and
     `/exercise-for-health/:path*` → `/` — code stays in the repo, easy one-block revert once the
     Specialist Training catalogue restructure and blog-rewrite scope decision are resolved. Stripped the
     matching links from Navbar (flat 6-item nav now, dropdown removed) and Footer (Services column
     removed, merged into a 3-column layout), and removed the in-page cross-link sections on Home and
     Personal Training that pointed at the now-disabled pages. Trimmed `sitemap.ts` to the 9 live URLs
     and dropped its Supabase `blog_posts` fetch entirely (no longer needed).
  Both pushed straight to `main` from isolated worktrees (`ef-worktree-launch-copy-2026-07-27`,
  `ef-worktree-disable-pages-2026-07-27`) per DO-SOP-010, `tsc --noEmit` and full `next build` clean each
  time, Coolify auto-deploy confirmed via MCP. **Not done:** no live click-through verification in a
  browser — confirm `staging.eternal-fitness.co.uk` renders correctly and disabled routes actually
  redirect, next session.
- **Hub design-alignment Work Order — all 8 lanes (A–H) built, reviewed, merged, DEPLOYED — 2026-07-26/27,
  not click-tested.** `.context/workorder-hub-design-alignment-session-editor-2026-07-26.md`. Lane H
  (session/workout editor, the one genuinely new feature) re-landed correctly in an isolated worktree
  (fixing a DO-SOP-010 deviation from the prior session), pushed `d105e29`. Lanes A–G (presentation-only
  diffs of every other hub route against its Open Design mockup) were dispatched to OpenCode
  (`opencode-go/deepseek-v4-pro`) in isolated worktrees with junctioned `node_modules` (2026-07-25's
  disk-fill incident deliberately not repeated — worktrees capped at 4 concurrent, junctions/worktrees
  removed immediately after each merge). **OpenCode's first batch (lanes A–D) needed real fixes on
  review, not rubber-stamping:** a mockup placeholder client name ("Joan") got copied verbatim into 3
  lines of live PAR-Q copy instead of the real `client.name` in scope; a wholesale invented "Section 7
  — Medical Clearance Record" block carried fabricated clinical-sounding demo text with no real form
  data behind it; a static always-on "Connected" badge got added to the Plan Agent tab with no real
  connectivity check behind it (would contradict the tab's own error banner on a real API failure);
  and live search/pagination feedback text on the exercise library got deleted and replaced with a
  static condition-roll-call string lifted from mockup demo copy. All 4 fixed and re-verified (`tsc`
  clean) before merge. The second batch (lanes E–G) had the same failure patterns spelled out
  explicitly in the OpenCode brief and came back clean — nothing to fix. Final commit `5c92510`
  deployed to Coolify (`sbzxkdejcmb5ahw3ai42on8q`), confirmed `finished`/`running:healthy` at
  `staging.eternal-fitness.co.uk`. Two earlier auto-triggered webhook deploys failed on transient infra
  collisions (a container-name clash between concurrent deploys, and one build whose exec channel died
  after it had already compiled successfully) while pushes landed in quick succession — not code
  errors, confirmed by reading the raw build logs. **Not done: no live, logged-in click-test of any
  lane** (no hub credentials available in this environment) — first thing Craig should do next session.
  See handoff.md for the full per-lane breakdown.
- **Block schedule/review link fix — DONE + DEPLOYED 2026-07-25 (later), not click-tested.** Craig
  couldn't find the "Review" button on an already-approved training block. Root cause: the link to
  `/hub/clients/[id]/blocks/[blockId]/review` (Lane D's scheduler lives there) only rendered for
  `status === "draft"`, and the review page's Approve button had no such guard either — clicking it on
  an approved block would have hit the API's existing `400 "Block is already X"` rejection. Fixed both
  (`77f5861`, deployed via `f25b98c`): block page always links through ("Schedule" once approved),
  review page hides Approve and shows real status once non-draft. First deploy attempt hit a one-off
  Coolify/SSH infra failure (unrelated to the code, retried clean). See
  `.context/workorder-session-logging-2026-07-25.md` (Lane D follow-up) and `handoff.md`.
- **Hub to-do task list — DONE + DEPLOYED 2026-07-25, not click-tested.** New `/hub/tasks` page: a
  3-column kanban (To Do/In Progress/Done), tasks assignable to Esther Fair/Craig Blackman/Unassigned,
  free-form staff-creatable buckets (Website/Content/Admin/etc.) for grouping, and a "My Tasks" default
  filter that reads the signed-in user's name against the `assignee` field. Only Esther has a hub
  account today (verified against the live `user` table) so "My Tasks" only activates for her. Three
  commits (`51e6a38`, `9542840`, `a3e861e`), each independently verified (`tsc`/`next build` clean) and
  confirmed `running:healthy` on Coolify before the next was built. **Not done:** no live logged-in
  click-test — needs Craig's own session. See handoff.md for full detail.
- **Session logging Work Order (Lanes A–D) — DONE + DEPLOYED 2026-07-25, click-tested via a dedicated
  test client, not by Esther/Craig on a real one yet.** `.context/workorder-session-logging-2026-07-25.md`.
  Replaces Trainerize's session-delivery/logging/progress role: Lane A — Esther per-set live logging on
  the session detail page (`set_logs` table, quick-log UI); Lane B — home-training client self-logging
  in the portal, gated to `clients.delivery_mode='home_training'`, server-verified ownership on every
  read/write; Lane C — progress/trend view (hub "Progress" tab + portal dashboard) plus a 7-day
  "gone quiet" Esther-facing alert; `delivery_mode` toggle added to the client edit page. **Lane D**
  (added same day, Craig-directed): `sessions` gained `scheduled_at`/`cancelled_at`/`cancel_reason` —
  there was zero scheduling data anywhere in this app before this (booking lived entirely in Outlook) —
  a bulk repeating-pattern scheduler on the block review page, plus a new studio-wide `/hub/schedule`
  day-view calendar across all clients with overlap warnings (warn only, never blocks). All migrations
  run against prod and verified; all commits independently verified (`tsc`/build, code read line-by-line,
  not trusted from agent self-reports) before push. A test client (client_number 19,
  "Test - Home Training", portal login `craig.blackman1@gmail.com`) exists for click-through testing —
  safe to delete once done with it. **Not done:** the client-facing "gone quiet" nudge send mechanism
  (detection is live; auto-send vs. Esther-reviewed is still an open decision); no real client assigned
  to `home_training` yet.
- **Hub sign-up endpoint closed — DONE + DEPLOYED + LIVE-VERIFIED 2026-07-25.** Found while creating a
  new hub login for Craig: `/api/auth/sign-up/email` was completely open on the public internet with no
  invite/approval gate — anyone who found the URL could self-register a full staff hub account. Fixed
  with `emailAndPassword.disableSignUp: true` in `lib/auth.ts` (`f25b98c`). Live-verified via curl: the
  endpoint now returns `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`; sign-in with the newly-created
  `craig@decodedops.co.uk` account still returns `200` with a valid session. **Side effect:** any future
  new staff member now needs manual provisioning (a one-off script, or a temporary flip of this flag) —
  no in-hub "invite staff" UI exists.
- **Hub task-list buckets gained rename/delete UI — DONE + DEPLOYED 2026-07-25, not click-tested.**
  The bucket feature (built by a separate concurrent session) was create-only; `PATCH /api/task-buckets/[id]`
  added for rename, and hover-revealed pencil/trash icons wired to rename/delete on the bucket filter
  chips (`51afdd8`). Deleting a bucket clears `bucket_id` on its tasks rather than deleting them.
- **Consent choices surfaced in hub admin portal — DONE + PUSHED 2026-07-24, not click-tested.**
  Craig couldn't see what clients had actually consented to from the hub. Investigated first: the data
  (`client_documents.consent_choices`) was already captured correctly on sign — no schema change
  needed. Fixed the read side only: document detail page now renders a per-option ✓/✗ breakdown against
  the template's `consentGroups`; the client detail page's document register select now includes
  `consent_choices`; each register row shows an "N/M consents" pill. Pushed straight to `main`
  (`edaa0c4`) from an isolated worktree per DO-SOP-010. **Not done:** no `tsc`/build run (worktree had
  no `node_modules`, `npm install` is gated and wasn't authorized this session) and no live click-through
  on staging — both worth doing next session before calling this fully verified. Known limitation, not a
  bug: a consent box the client never touched has no key in `consent_choices` at all, so it reads
  identically to an active decline (✗) — flagged to Craig, not silently fixed.
- **Lane I — scanned/paper document storage — DONE + DEPLOYED 2026-07-22.** `client_documents` gained
  `source_type`/`source_file_name`/`source_file_mime`/`source_file_size`; new `client_document_files`
  table holds raw bytes directly in Postgres (no Coolify volume needed at this scale); staff-auth-only
  `POST /api/documents/upload` + `GET /api/documents/[id]/file`; `DocumentRegister.tsx` shows scanned
  rows with a "Scanned original" badge + download link instead of send/resend. Real bug found and fixed
  live: a migration policy referencing Supabase's `authenticated` role failed against prod — that role
  never carried over from the Supabase migration, and it turns out `client_documents` has had RLS
  enabled with zero working policies the whole time; access control is actually enforced at the app
  layer everywhere in the document engine, not Postgres RLS. Sarah Tyler's scanned Personal Training
  Agreement is the first real record (`client_documents` id `a74a1ef7-0c19-478c-b5e2-538a9304e102`,
  183,462 bytes, verified byte-for-byte). UI upload path itself not yet click-tested in a real browser
  session. See `handoff.md` for full detail.
- **Lane K — portal auth rework — DONE + DEPLOYED 2026-07-22.** Passwordless magic-link login replaced
  with email+password; portal accounts are now created only via a staff "Invite to portal" button on
  the client detail page (closes a real gap where `ensurePortalAccount()` used to auto-create *and*
  auto-enable an account for any matching email with no staff step, despite its own doc comment claiming
  staff-gating). Confirmed while building: **no `portal_*` tables existed on production at all** — the
  original magic-link migration was written but never run, so the portal login had never worked against
  real data. New tables (`portal_accounts`/`portal_sessions`/`portal_reset_tokens`) live, migration
  verified, Coolify deployment confirmed healthy. Password hashing via Node's built-in `crypto.scryptSync`
  (no new dependency), deliberately isolated from staff auth's `better-auth`. **Not done yet**: no client
  has actually been invited, and the invite/login/reset UI flow hasn't been click-tested in a real
  browser session.
- **Lane J (paper→digital conversion tool) — scoped, deliberately parked** (Craig's call, 2026-07-22) —
  recommendation on record (extract fields into `ClientProfile` via a vision-LLM call, not OCR — no OCR
  tooling exists and the scan has no extractable text), not built. Not to be picked back up proactively.

- **Flexible/four-week update AI drafting fixed, pushed, deployed** (2026-07-21, latest) — `generate`
  route only ever supported `six_week_update`; picking Flexible or 4-Week Update in the hub's
  "New Update" chat flow hit a hard 400 ("not implemented yet"). `generateUpdateDraft()`
  (`lib/generate-six-week-update.ts`) now covers all three kinds; flexible lets the AI choose its own
  section count/headings from the conversation instead of a fixed shape (Craig's explicit ask, so Esther
  stops drafting these by hand in Claude Desktop). `NewUpdateClient.tsx` now populates `flexSections` from
  the AI draft too (previously silently did nothing for the flexible kind). `tsc`/build clean. Committed
  `cc29c03`, pushed to main — Coolify deployment `oe8ppywxvdv1odhbq1kvn9yk` confirmed `finished` before
  session close. **Not live-UI-tested** (no hub session this session) — worth a real click-through next
  time. Monique Weardon's (#10) actual draft was built directly via
  `scripts/create-update-draft.mjs` against prod as an immediate workaround — sitting as a draft at
  `/hub/clients/10/updates`, nothing sent. See handoff.md and decisions.log.
- **Real root cause of "still shows as sent" found and fixed** (2026-07-21) — a second, previously-undiscovered "Create & send" component on the *template* detail page (`app/hub/(protected)/templates/[id]/SendTemplateToClient.tsx`) was bypassing the whole document-engine send flow: it PATCHed a bare `action: "send"` that just flipped status to "sent" with no email attempt and no `emailed` field ever set. That's what Craig meant weeks-turns ago by "/hub/templates needs the same send mechanism" — there genuinely was a broken send button there, missed by an earlier grep that only checked the server page component, not the client component it renders. Fixed: `SendTemplateToClient.tsx` now just creates the draft and redirects to the real document page; the bare `action: "send"` branch is deleted from `app/api/documents/[id]/route.ts` entirely (confirmed zero other callers first) — `send_email` is now the only way status becomes "sent", closing off this exact failure mode for good. `tsc`/build clean. See handoff.md.
- **`client_documents.emailed` flag added, live** (2026-07-21) — status "sent" no longer the only signal of whether an email actually delivered. Real data showed a document marked "sent" 36ms after creation — physically too fast for a real SendGrid API round-trip, strong evidence the backend is dry-running in prod (not definitively confirmed — didn't reveal/test the raw SENDGRID_API_KEY/SMTP_* values, which do exist as env vars on Coolify). `sendDocumentEmail()` now records `emailed: !dryRun`; `DocumentRegister.tsx`/All Documents/`DocumentDetailClient.tsx` all show a "Not delivered" indicator when status says sent but emailed is false. Mirrors the same pattern `sent_updates.emailed`/`ClientUpdatesPanel.tsx` already used for update emails — this problem had already been solved once, just not applied to documents. **Needs a real test send (hub UI or SendGrid dashboard) to confirm whether the backend is actually broken** — flagged for Craig, not something confirmable without live credentials. See handoff.md.
- **4 more document/update-email issues fixed** (2026-07-21) — editable section headers extended to the 6-week/4-week update templates (previously only the non-default "Flexible Update" had this); documents can now be deleted (`DELETE /api/documents/[id]`, wired into both list and detail views) with a clearer draft-status note; the confusing Copy-link icon (was reusing the send/paper-plane icon) swapped to a real copy icon; document-ready email button/link spacing rebalanced (was `20px 0 4px` → `margin:0`, now `24px 0 16px` → `margin:8px 0 0`). Migrated PAR-Q/Agreement documents can still show "sent" from legacy status carry-over — Craig confirmed leave that historical data as-is. `tsc`/build clean. See handoff.md.
- Next.js 14 / Tailwind / shadcn-ui / self-hosted Postgres on Coolify (migrated off Supabase — see decisions.log 2026-07-xx)
- Hub with client management, training blocks, agreements, PAR-Q
- **Custom icon system**: 90+ SVG icons replacing lucide-react (grew from 36+ this session — `IconRefreshCw`, `IconUser`, `IconShieldCheck`, `IconRuler` added where a mockup specified a shape genuinely missing) ✅
- 6-week client update email feature: **BUILT** (all phases complete, build+tsc clean)
- **Work Orders:** `.context/workorder-eternal-fitness-hub-consolidation-2026-07-20.md` (client data
  consolidation + document-led client portal) — closed 2026-07-20, all AUTO units done; client data
  consolidation itself (manual entry) still not started, not blocking. `.context/workorder-session-
  logging-2026-07-25.md` (Trainerize-replacement session logging + scheduling) — Lanes A–D all DONE +
  DEPLOYED 2026-07-25, only Craig-decision GATE items open (nudge auto-send vs. Esther-reviewed;
  assigning a real client to `home_training`; a live click-test of the whole thing). See either file's
  DONE checklist for live status; see `.context/handoff.md` for the full per-unit log.
- Client document engine now visually matches the new brand design system (`D:\apps\design-systems\brand-staging-2662e9`) — masthead, accessibility toolbar (text size + high contrast), sign-boxes — applied to all 4 document kinds. New `consent` document type live (checkbox-based content permissions). Documents can now be emailed to clients directly from the hub, not just copy-link.
- Client detail page (`/hub/clients/[id]`) fully rolled out against `hub-client-detail.html`. Live on staging (commits `2acaf4e`, `211f3f7`).
- Six more hub screens restyled to match mockups (dashboard, exercise library, process & quality, reports/updates, SOP detail view, studio equipment) — live on staging.
- **Lane F pushed and deployed 2026-07-21** (was sitting locally since 2026-07-20): every remaining hub route with no source mockup restyled — `clients/new`, training delivery pages, PAR-Q, agreements, top-level documents register, settings, site-content, site-review, templates, tracker, hub auth screens, `PackagePaymentsCard` button fix.
- **Client portal is now actually live** (2026-07-21) — was built 2026-07-20 but had a real infinite-redirect-loop bug (`/portal/login` nested inside its own auth-gating layout) that made it completely unreachable; fixed and deployed. No real client invited yet — that's still a `[GATE]`.
- **Hub-wide icon/status-colour audit (2026-07-21)** — 8 hub pages checked against their OpenDesign mockups after Craig caught a real drift on Site Content; 6 of 8 had genuine defects, several serious (invisible white-on-white badges, silently-blank dashboard status pills, a literal `/* comment */` rendering as visible page text). Full detail in the Work Order's new Lane G. Also fixed the actual root cause of the `ClientUpdatesPanel.tsx:60` TS error that had been flagged "pre-existing, unrelated" three separate times — `tsc --noEmit` is now completely clean project-wide.
- **Site Content page rebuilt into a full inventory** (2026-07-21) — was tracking only 9 static pages; now covers all 47 real+planned pages (static, all 8 condition pages, all 3 legal pages, all 27 blog posts) with status filters (Published/Needs Writing/Needs Updating) and type filters, matching a new OpenDesign mockup. Migration `20260721_site_content_full_inventory.sql` applied to prod.
- **Blog byline fixed** (2026-07-21) — 26 of 27 posts corrected from "Craig Blackman" to "Esther Fair". Content/titles untouched, awaiting Esther's full content review separately.
- **SEO fixes shipped** (2026-07-21) — blog meta descriptions were raw truncated excerpt text (199-200 chars, past Google's ~155-160 limit, occasionally leaking a literal `&nbsp;`); cleaned via a new `cleanMetaDescription()` helper. 4 of 5 raw `<img>` tags converted to `next/image`. Added blog→condition-page internal links (previously zero). Sitemap `lastModified` now uses `updated_at`. `/portal` added to `robots.ts`'s disallow list, matching `/hub`'s existing (already-correct) noindex treatment.
- **Resend now works on every document kind, built, NOT pushed** (2026-07-21, later) — PAR-Q's "Send" action was copy-link-only despite looking like an email button; it now has a real "Email …" action (`app/api/parq/send-email/route.ts`, mirrors the document engine's send flow). 6-week/4-week update emails can now be resent once sent (`UpdateRowActions.tsx`, `app/api/updates/[updateId]/send/route.ts`), which was previously blocked outright. Agreements' email button (`AgreementDetailClient.tsx`) was silently dead — it used an unconfigured `RESEND_API_KEY`/`resend` package instead of the app's real backend; rewired onto `lib/email.ts`, which gained attachment support (`SendEmailInput.attachments`, both SendGrid and SMTP paths) so the PDF attachment still works. A follow-up fix found and closed a real PAR-Q link bug: two places (`AgreementDetailClient.tsx`'s "copy client link", the hub PAR-Q edit page's admin-mode "copy client link") built a bare `/parq/edit/[id]` link with no signature, always rejected as invalid — both now mint the same signed exp/sig pair the working "Send PAR-Q update" flow already used. `tsc --noEmit` clean; not live-verified (no hub credentials this session) or deployed. See handoff.md.
- **New "Client Feedback Questionnaire" document type, live** (2026-07-21, latest) — 5th document-engine kind (`feedback`), matching `brand-staging-2662e9/documents/client-feedback-questionnaire.html`. Free-text + radio-choice survey questions + 2 optional consent checkboxes, no legal signature (name only). `feedback_responses` jsonb column + the seeded `document_templates` row are both live on prod (Craig's go-ahead, 2026-07-21). Esther's document-detail view gained a "Responses" card to actually read submitted answers. `tsc --noEmit` clean. Not yet live-browser-verified. See handoff.md.
- **PAR-Q migrated onto the document engine, live** (2026-07-21) — 6th kind (`parq`), all 29 real clinical questions + personal/GP fields, reusing the same interactive schema as Feedback (stays on the full signature+"I agree" flow, unlike Feedback's name-only survey). 17/17 legacy `signed_parq` rows backfilled into `client_documents` and spot-verified byte-for-byte against 3 real clients — no legacy data touched/deleted. `SendDocumentLink.tsx` and `/api/parq/send-email` (the standalone "Send PAR-Q" mechanism) removed — PAR-Q now sends/resends exactly like every other document kind. `/parq` and `/parq/edit/[id]` deliberately left in place (unlinked, not deleted) as a safety net for any outstanding pre-migration links.
- **Agreement migrated too, live, all document types now hub-only** (2026-07-21, same session) — turned out `document_templates` kind `'terms'` was already the real Personal Training Agreement (updated 2026-07-04) but never formally taken over from the standalone `/agreement` page — relabelled it "Personal Training Agreement" and backfilled all 6 `signed_agreements` rows into `client_documents` (2 had no `client_id`, resolved by exact name match, 0 skipped). `/hub/agreements` relabelled "(legacy record)". Every document kind — Terms/Agreement, Risk Assessment, Annual Review, Consent, Feedback, PAR-Q — now shares one send/resend mechanism from the hub; nothing generates a fresh standalone public-page link anymore. `tsc` clean. See handoff.md.
- **`signed_agreements`/`clients` duplication fixed same-day, not left as a follow-up** — the dangerous UI path (editing package/payment/clinical fields on the Agreement page, silently diverging from the live client page) turned out to be dead code already disconnected from any button; removed it entirely (`AgreementDetailClient.tsx`'s trainer-fields edit state + `app/api/agreements/[id]/route.ts`'s PATCH handler) rather than leave it as a latent risk. `clients` is now unambiguously the only writable source for those fields. See handoff.md.
- **Inline Send/Resend added to both document lists** (2026-07-21) — new `components/hub/DocumentRowActions.tsx` (Send/Resend + Copy link per row, same pattern as `UpdateRowActions.tsx`) wired into `DocumentRegister.tsx` (client Documents tab) and the hub-wide All Documents list — previously both only had an "Open" link, no inline send. "New document" renamed "Create & send". Investigated Esther's "Agreement only gives a link" report with real data — not a bug, the client she tested with (`Craig Blackman` test record) has no email on file; confirmed the Send button works for clients with a real email. Also fixed a real leftover bug: `/hub/templates` still linked to the retired `/parq` blank form via a hardcoded card (from before PAR-Q was migrated) — removed, and fixed template section-counts always showing 0 for feedback/parq kinds. `tsc`/build clean. See handoff.md.
- **Hub mockup-alignment pass, Lane H, built, NOT pushed** (2026-07-21, later still) — 12-agent visual/IA pass against all `hub-*.html` mockups. Most routes already matched from earlier sessions (verified, not assumed). Real fixes: All Documents rebuilt to the hub's own list-page pattern (its mapped mockup turned out to be an SOP detail page, not a list — flagged separately), Site Content list (TokenPill fix), Site Content editor (fixed a literal `&amp;amp;` text bug + missing icon + Title Case labels + missing subtitle). Process & Quality's real CRUD/data confirmed untouched throughout — mockup's onboarding-checklist content deliberately not added, per Craig's decision. `tsc --noEmit` clean project-wide. Three items spawned as separate background-task suggestions rather than actioned: client-edit page missing a right rail/clearance banner (needs new computed logic), `ProcessQualityManager.tsx` badge-markup dedup, and the hub-sop/All-Documents mockup mismatch. See Work Order Lane H and handoff.md.

## Built
- DB schema (now on plain Postgres, originally built on Supabase): clients, blocks, sessions, signed_agreements, signed_parq, medical_clearance_tracker, client_tracker
- **6-week update emails**: block_summaries JSONB + sent_updates table (migration)
- **4-week update template**: `four_week_update` kind (lib/email-templates/four-week-update.ts) —
  7 sections incl. "What Every Session Is Actually Doing" / "A Couple of Things to Keep an Eye On",
  for injury/recovery-block reviews. AI auto-generate now works (fixed 2026-07-21 — see handoff.md);
  drafts can still be authored via scripts/create-update-draft.mjs or hand-edited in the hub too.
- **Reusable SMTP send layer**: lib/email.ts — nodemailer, dry-runs gracefully when unconfigured
- **Branded email template**: inline-CSS, 6 sections, Rose/Teal brand colours
- **Generation API**: pulls profile + blocks + summaries → Claude or template-based fallback
- **Send API**: SMTP send + history storage
- **UI**: /hub/clients/[id]/updates (history) + /updates/new (generate → review → send)
- **Updates tab** on client detail page
- Hub: client CRUD, block generation (Claude + fallback), session review, agreement management
- **Custom Icon System**: components/icons/index.tsx — all public and hub pages updated
- **Document engine** (2026-07-20): `document_templates`/`client_documents` covers `terms`/`risk_assessment`/`annual_review`/`consent`; shared `DocumentView` component gives every kind the same real branded structure (masthead/eyebrow/toolbar/sign-boxes/footer); `lib/documents/render.tsx` renders interactive consent checkboxes when a template has `consentGroups`. Email-send action (`app/api/documents/[id]/route.ts`, action `send_email`) reuses `lib/email.ts`; falls back to dry-run if no SendGrid/SMTP env vars are set — **not confirmed which backend is live on this environment, verify before relying on real sends.**
- **Process & Quality System** (2026-07-20): `process_entries`/`sops`/`improvement_log` tables + `/hub/process-quality` CRUD UI, DB-backed so Esther can edit without a code deploy. **Now seeded** with 10 real SOPs + 10 matching Process Register entries (published 2026-07-20, background session — see handoff.md for the full list and how it was published). `improvement_log` still empty — no incidents logged yet.
- **Client portal** (2026-07-20, deployed live 2026-07-21): magic-link auth (`lib/portal-auth.ts`, separate from staff auth) + read-only `/portal/*` view. No real client account exists yet.
- **Site Content inventory** (2026-07-21): `page_keywords` table now covers all 47 pages (static/condition/legal/blog) with `page_type` column and a published/needs_writing/needs_updating status model; `/hub/site-content` list + `/hub/site-content/[slug]` editor rebuilt to match the OpenDesign mockup.

## Known Issues
- Greyed-out "Send email" buttons are correct-by-design when a client has no email on file (`DocumentDetailClient.tsx`/`DocumentRowActions.tsx`) — confirmed via direct DB query 2026-07-21, not a bug.
- ANTHROPIC_API_KEY empty — Claude generation (blocks + updates) falls back to template
- **SMTP/SendGrid backend status is still unconfirmed as of 2026-07-21** — real data (a 36ms created→sent gap on a live send) is strong circumstantial evidence it's dry-running in prod, but not proven (didn't reveal/test the raw credentials). `client_documents.emailed`/`sent_updates.emailed` now make this visible in the UI ("Not delivered" indicator) whenever it happens — check `getEmailStatus()` (`lib/email.ts`) or do a real test send to confirm one way or the other.
- Client data (Trainerize/Outlook/paper) is not yet consolidated into the hub `clients` table — decided to do this by manual entry, not started
- PAR-Q edit screen inside the hub (`/hub/clients/[id]/parq/[parqId]/edit`) still uses the shared public-facing `ParqEditClient` component's own styling internally — deliberately not restyled, since that component is also live on the public client-signing flow and a deep edit risks breaking it. Now reads/writes only the legacy `signed_parq` table (pre-migration history) — new PAR-Qs go through the document engine instead. Needs a scoped decision (fork vs. leave vs. retire) before touching further.
- 5 of 8 `exercise-for-health` condition sub-pages still don't exist (`type-2-diabetes`, `copd`, `heart-conditions`, `chronic-pain`, `adaptive-training`) — gated off (`available: false`) on the index page, not dead links. Scope decision needed on how many to build before launch.
- 27 blog posts are still unedited legacy WordPress content pending Esther's voice/hard-rule review — content/titles deliberately untouched this session (only the byline field was fixed).

## Required Actions
- **Subscribe `email.delivered`/`email.bounced`/`email.complained` on the Resend webhook endpoint**
  (Resend dashboard → Domains → your sending domain → Webhooks) — only `opened`/`clicked` are enabled
  today; the webhook code handles all 5 event types now (2026-07-28) but Resend won't fire ones you
  haven't subscribed to.
- Set SMTP env vars (or confirm SendGrid is already the live backend)
- Set ANTHROPIC_API_KEY
- Verify SPF/DKIM
