# Eternal Fitness — Current Features & Functionality
**As at 2026-08-15** · Derived from `origin/main` @ `caff0d7`, live on eternal-fitness.co.uk

This describes what the platform **actually does today**, read out of the shipped codebase and
verified against the live site where noted. It is not a plan and not a wish list — anything not
yet built lives in `scope-of-works-2026-08-15.md`.

---

## 1. What this is

One Next.js application serving three distinct audiences from a single deployment:

| Surface | Who | Entry point |
|---|---|---|
| **Marketing site** | The public / prospective clients | `eternal-fitness.co.uk` |
| **Staff hub** | Esther (currently the only account) | `/hub` — desktop and `/hub/m` mobile |
| **Client portal** | Esther's active clients | `/portal` |

It replaces Trainerize for session delivery, progress tracking and client self-logging, and
replaces a paper/PDF process for agreements, PAR-Qs and consent.

**Scale of the codebase:** 77 API routes, ~90 pages, 97 database migrations, 8 document types,
9 email templates.

---

## 2. Infrastructure

- **Framework** — Next.js 14.2 (App Router), React 18.3, Tailwind 3.4, Radix/shadcn-ui primitives.
- **Hosting** — Coolify (self-hosted Docker) on a dedicated VPS. `output: "standalone"`.
- **Deploy** — GitHub webhook auto-deploys on push. `main` → production, `staging` →
  `development.eternal-fitness.co.uk`. Both currently on `caff0d7`.
- **Database** — self-hosted Postgres on a dedicated VPS. All data access goes through a
  hand-rolled PostgREST-compatible shim (`lib/pg-client.ts`) exported under the name
  `supabase` so the ~176 existing importers never had to be rewritten.
- **Package manager** — pnpm.
- **Images** — served unoptimised (self-hosted, no Vercel image infrastructure), with a
  one-year immutable cache header on `/images/*`.
- **Caching** — HTML must-revalidate on every request (a cached page from a prior deployment
  references purged `/_next` chunks); `/hub/*` is `private, no-store`.

---

## 3. Marketing site

### Pages live in the navigation
Home · About · Personal Training · **Specialist Training** (with a dropdown: Blind & Partially
Sighted · Cancer Rehabilitation · Strength, Balance & Falls) · Pricing · Client Stories ·
Blog · FAQs · Contact.

Plus Privacy Policy, Cookies Policy and Terms in the footer.

### What works
- **Blog** — 27 legacy WordPress posts served from the database, with category filters
  (All/Training/Nutrition/Recovery/General), reading time, author and date. Index and individual
  posts both verified rendering correctly on production 2026-08-15.
- **Legacy URL preservation** — 27 flat WordPress post URLs plus 5 old static pages 301 to their
  new locations; old category archives redirect to `/blog`.
- **Canonical host** — `www` → apex, and the old `staging.eternal-fitness.co.uk` → production
  (a deliberate cutover guard so anyone holding a pre-launch staging link can't submit documents
  against stale data).
- **Lead capture** — the Contact page form and the site-wide "Book a Free Consultation" dialog
  both post to `/api/leads`, which emails Esther directly with a reply-to set to the enquirer.
  (Both previously faked success client-side with nothing sent; fixed 2026-08-07.)
- **Design system** — shared `.ds-*` classes and CSS tokens, with reusable primitives
  (`PageHero`, `CTABand`, `Callout`, `ProcessFlow`, `FAQSection`) rendered across all launch
  pages. Hero sections use GSAP slide-reveal animation.
- **SEO** — per-page metadata, sitemap, robots, and schema.org structured data.

### Known content state
`/falls-prevention` is a deliberate, honestly-worded "Coming Soon" page — Esther is completing
further training in strength and balance work for older adults. It still carries the hero, the
consultation CTA and the phone number, so it converts rather than dead-ends.

---

## 4. Staff hub (`/hub`)

Esther's daily operational system. Auth is Better Auth, email + password, **sign-up disabled** —
accounts are provisioned manually.

### Clients
- Client list and full client detail with tabbed sections (overview, profile, compliance,
  training, plan agent, updates, documents).
- Create/edit client, including delivery mode (Studio 1:1 vs Home training), archive status,
  update interval, and per-client portal resource visibility.
- **Clinical/compliance tracking** — medical tracker, GP clearance letters, injury history,
  PAR-Q status, package payments.
- **Portal invitation** — one button creates the client's portal account and sends a welcome
  email (with a preview endpoint so Esther can see it before sending).

### Training delivery
- **Training blocks** — 6-week block structure with per-session detail, an approval step, a
  printable view and a review screen.
- **Workout templates** — reusable session templates with faceted browsing.
- **Exercise library** — ported from Trainerize, with media (video/image), equipment, muscle
  groups and movement patterns. Video resolves from the exercise record first, falling back to
  the `exercises` table by name.
- **Live session logging** (`/hub/log/[sessionId]`) — per-set logging of reps, weight and RPE
  against the prescription, with per-exercise and whole-session notes.
- **Session scheduling** — sessions carry `scheduled_at`, `cancelled_at` and a cancel reason.
- **Personal records** — automatic PB detection on save, using `GREATEST` so a lighter later set
  can't downgrade a record. Warm-up sets are excluded from PBs and trends via a persisted
  `is_warmup` flag (persisted rather than re-derived, because the prescription can change
  mid-session and a historical log's warm-up status would otherwise become revisionist).

### Mobile hub (`/hub/m`) — installable PWA
- Installable to home screen via `hub.webmanifest` + a hand-written service worker scoped to
  `/hub/` only (cache-first static assets, network-only `/api/*`) so the marketing site's own
  manifest is untouched.
- **Today screen**, **Clients tab** (read-only: contact, health flags, block progress, history),
  and **Train tab** with smart routing to today's in-progress or next session.
- **In-session training screen** with the same per-set logging as desktop.
- **Mid-session edit sheet** — add/remove exercises from library, past sessions or templates;
  superset group/ungroup; "use as today's session" wholesale replace; and full prescription
  editing (sets, reps, tempo, rest, coaching cue, equipment), reorder, move between sections,
  swap-exercise-keeping-prescription, and video/image URL editing. *(The last group shipped
  2026-08-14 and reached production 2026-08-15.)*
- **Offline set logging** — an IndexedDB queue with a client-supplied idempotency key and
  validated timestamp, sequential replay on reconnect, a 3-way saved/queued/failed outcome, and
  a 401 that parks the queue rather than dropping it.

### Documents
- **Document register** across all clients, plus a per-client document list.
- **Eight document kinds**: Personal Training Agreement (`terms`), Risk Assessment, Annual
  Review, Consent, Client Feedback Questionnaire, PAR-Q, Invoice, and Leg Pain Questionnaire.
- **Lifecycle** — draft → sent → signed → superseded, with versioning and explicit supersede
  links.
- **Signing** — every document is sent as a magic link to `/documents/[id]/sign`, gated by an
  unguessable UUID, working both with and without portal login. Captures drawn or typed
  signatures for client and (where required) trainer.
- **Templates** — versioned templates per kind; documents snapshot the template at creation so
  later template edits never rewrite a signed document.
- **Scanned document upload** for paper originals.
- **Accessibility toolbar** on the document view, including browser-native print/save-as-PDF.

### Client updates & reporting
- Update composer with AI assistance, a delivery-history panel, and a reports view.
- **Six-week update generation** from real session and progress data.
- **Flexible update** template for custom-shaped emails, plus four-week and six-week structured
  templates and a paste-parser that turns pasted prose into a structured update.
- **Cron endpoints** — `check-updates-due` (emails Esther a reminder when a client's update is
  due) and `dispatch-updates` (sends scheduled update emails). Both are secret-protected.

### Cashflow & invoicing
- Invoice creation, templates, sending, and a per-invoice view.
- **Bank statement import** (xlsx parsing) into a transactions ledger.
- **Reconciliation** — automated match suggestions with confirm/dismiss, and a dismissed-match
  memory so the same wrong suggestion doesn't return.
- **Tax** — category mapping and a tax calculation view.
- **Forecast** — forward cashflow projection.

### Operations
- **Tasks** with buckets, optionally linked to a client.
- **Process & quality system** — SOPs, rule types, process entries, improvement log.
- **Schedule** and **tracker** views.
- **Settings** — Plan Agent configuration, studio equipment, training rules.
- **Web admin** — site content and page-keyword management.

### AI — the Plan Agent
- Generates 6-week training blocks from the client's profile, health flags, studio equipment and
  Esther's training rules, then validates and repairs its own output before it is shown.
- Two chat surfaces: plan-chat (build/adjust a plan) and update-chat (draft a client update).
- **Provider** — Anthropic direct when `ANTHROPIC_API_KEY` is set, otherwise OpenRouter.
- **Cost guardrail (2026-08-13)** — the quality-critical model was hardcoded to Opus 4.8; one
  6-week block generation fires up to 18 concurrent calls each resending a ~35–40k token system
  prompt with no caching, which burned ~£30 of OpenRouter credit in five minutes. It now defaults
  to DeepSeek V3.1 (~20× cheaper, 164K context, provider-side prompt caching) and is overridable
  by env var so a candidate model can be tested without a redeploy.
- A separate guardrail was added after the Plan Agent was found arguing with Esther's explicit
  instructions rather than following them.

---

## 5. Client portal (`/portal`)

**Completely isolated from staff auth** — its own tables (`portal_accounts`, `portal_sessions`,
`portal_reset_tokens`), its own cookie, its own middleware guard, and password hashing via Node's
built-in `scryptSync` (no npm dependency). Password login and self-service reset only; accounts
are created solely by Esther's "Invite to portal" button. Every data read re-checks server-side
that the authenticated client owns the requested resource.

Clients can:
- View, complete and sign their **documents**.
- View their **training plan** and, if `delivery_mode = 'home_training'`, self-log sessions
  (server-verified on every read and write).
- View **exercise history** and progress.
- Read their **updates** from Esther.
- Access **resources** Esther has enabled per-client: a personalised **calorie guide** and a
  **Showdown Soundboard** (position-cue audio tool for table tennis training).
- Manage their **account**.

---

## 6. Email

Three backends selected automatically in order: **Resend** (the confirmed live backend) →
SendGrid Web API → SMTP relay. With none configured, sending is a graceful dry-run.

- **Delivery tracking** — `emailed` boolean columns on `client_documents` and `sent_updates` are
  the definitive signal that a real email left the building; an `email_send_events` table plus a
  UI timeline records provider events.
- **Webhooks** — Resend and SendGrid endpoints both handle the full event set (sent, delivered,
  opened, clicked, bounced, complained).
- **The "fake send" path is permanently closed** — a second "Create & send" button used to flip
  status to `sent` with no email attempt. That code path was deleted; `send_email` is now the only
  way status becomes `sent`.

---

## 7. Deliberately disabled or retired

Not bugs — decisions, with the code left in the repo:

- **Specialist Training catalogue** and the **blog rewrite** — deferred post-launch.
- `/exercise-for-health/*` → `/specialist-training`; the business narrowed to three specialisms.
  Bone-health and high-blood-pressure pages retired (recoverable from git history).
- **Public calorie calculator** retired 2026-08-07 — the gated per-client portal version replaced
  it.
- **Legacy `/parq`, `/parq/edit/[id]` and `/agreement` pages** — left in place but unlinked as a
  safety net for outstanding pre-migration links. Every new PAR-Q and Agreement goes through the
  document engine. The legacy `signed_parq` and `signed_agreements` tables still exist and are
  still read by tracker/compliance code — not yet retired.
- **Three renamed-blog-post redirects removed 2026-08-10** — the rename migration
  (`20260419_session_2_blog_repositioning.sql`) has never been applied, so each rule was
  intercepting a post that works and 301'ing it into a 404.

---

## 8. Verified state at time of writing

| Check | Result |
|---|---|
| `origin/main` vs `origin/staging` | Identical (`caff0d7`) |
| Production deploy | `caff0d7`, finished 2026-08-15 08:03 UTC, `running:healthy` |
| `npx tsc --noEmit` | Clean, zero errors |
| Production blog | Index, filters and post bodies all rendering |
| Production `/falls-prevention` | Renders as intended "coming soon" page |
