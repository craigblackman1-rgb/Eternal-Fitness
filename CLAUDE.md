# Project: Eternal Fitness

Esther Fair's personal-training business site — a studio based in Worthing, West Sussex. Public marketing site + a staff/trainer hub (client management, training blocks, session logging, document engine) + a client portal (documents, training plans, progress, calorie calculator). The app replaces Trainerize for session delivery, progress tracking, and home-training self-logging.

## Design system — read before building any UI

The marketing site's visual language lives in `app/design-system.css` (shared `.ds-*` classes) and `app/globals.css` (tokens: `--color-ink`, `--color-rose`, `--color-teal`, `--color-cream`, `--color-warm`, `--color-amber`). The canonical mockup source is `D:\apps\design-systems\brand-staging-2662e9\*.html` — always reconcile new UI against those files, not against staging by eye. A full section-by-section screenshot diff against the mockup should be the default; "the code matches what I intended to build" is not the same claim as "the code matches the mockup."

Shared primitives in `components/ds/` (PageHero, CTABand, Callout, ProcessFlow, FAQSection) are rendered by all 6 launch pages. Extend them additively — don't remove or rename existing props other pages rely on.

`components/hub/` holds the hub's own component library (HubTable, DocumentRegister, StatusBadge, HubCard, EmptyState, etc.). The hub UI matches the `hub-*.html` mockups in the same design-system folder.

## Stack & Infrastructure

**Deployment:** Coolify (self-hosted, Docker-based). Auto-deploy is ON via GitHub webhook — do not manually trigger a deploy after pushing to `main`; it's automatic.

**Framework:** Next.js 14.2, React 18.3, Tailwind CSS 3.4, shadcn-ui (Radix primitives)

**Package manager:** pnpm (pnpm-lock.yaml). `package.json`'s `"name": "vite_react_shadcn_ts"` is a stale scaffold name — ignore it.

**Database:** Self-hosted Postgres on a dedicated VPS. Migrated off Supabase. All app data goes through a hand-rolled PostgREST-compatible pg shim (`lib/pg-client.ts`), exported as `supabase` in `lib/supabase.ts` — a deliberate naming choice so the ~40 existing importers didn't need rewriting. **Supabase Auth is not used at all for this app.** There is no Supabase project backing this repo.

**Migrations:** `supabase/migrations/` — legacy directory name, these are plain Postgres migrations run directly against prod. RLS is **disabled/irrelevant** on the plain-Postgres instance. Do not create `CREATE POLICY ... TO authenticated` — the `authenticated` role doesn't exist and those statements will fail. Access control is enforced at the app layer everywhere.

**Build:** `next.config.js` sets `output: "standalone"` for Docker, `images.unoptimized: true` (self-hosted, not Vercel), `typescript.ignoreBuildErrors: true`, `eslint.ignoreDuringBuilds: true`.

**Local dev DB:** The app connects to production Postgres via a Coolify SSH tunnel (`127.0.0.1:5433`). There is no local dev database. `.env.local` carries the tunneled connection string.

## Key Directories

- `app/` — Next.js App Router pages. Public marketing routes at root; `app/hub/(protected)/` (staff/trainer hub); `app/portal/(protected)/` (client portal); `app/api/` (API routes); `app/documents/[id]/sign/` (public magic-link document signing — no auth required, gated by unguessable UUID)
- `components/` — React components: `ds/` (shared design-system primitives), `hub/` (hub-specific), `documents/` (document engine), `icons/` (custom 90+ SVG icon system, not lucide-react), `ui/` (shadcn-ui primitives)
- `lib/` — Shared utilities, DB clients, auth, email, document engine, AI plan generation
- `supabase/migrations/` — All DB schema changes (plain Postgres, not Supabase)
- `public/images/` — Static image assets (client photos, studio, hero backgrounds)
- `scripts/` — One-off migration/build/utility scripts
- `.context/` — Work Orders, handoffs, briefs, state — the project's long-running memory (read this before making assumptions)

## Data Layer

**`lib/pg-client.ts`** — Custom PostgREST-compatible shim over `pg` (node-postgres). Implements the chainable subset the app uses: `.from(table).select()/insert()/update()/upsert()/delete()` with `.eq/.neq/.in/.order/.limit/.range/.single/.maybeSingle`. Also handles to-one relation embeds (`"*, rel(cols)"` → correlated `row_to_json` subqueries) and timestamp/date string coercion (Postgres timestamps return as strings, not JS Date objects, matching Supabase/PostgREST behaviour so React doesn't crash).

**`lib/supabase.ts`** — Proxy that lazily creates a `PgClient` and exports it as `supabase`. Every file importing `supabase` from here is actually talking to the pg shim, not the Supabase SDK. Grep for `createPgClient` to find direct callers.

**`lib/supabase-admin.ts`** — Service-role pg client (same shim, different export name). Use only in server routes for narrowly-scoped unauthenticated flows (e.g. public document signing by UUID).

**`lib/supabase-client.ts`** / **`lib/supabase-server.ts`** — These still exist but are legacy from the Supabase era and may reference the Supabase JS SDK. App data reads should go through `lib/supabase.ts` (the pg shim) or direct `getPool()` calls.

## Auth — Two Isolated Systems

### Staff/trainer hub: Better Auth (`lib/auth.ts`)
- Email + password login at `/hub/login`
- Sign-up is **disabled** (`disableSignUp: true`) — new staff accounts require manual provisioning (no in-hub invite UI exists)
- Session checked via `getSessionCookie` in middleware
- Currently only Esther Fair has a hub account

### Client portal: Custom portal auth (`lib/portal-auth.ts`)
- **Completely separate** from staff auth — owns its own tables (`portal_accounts`, `portal_sessions`, `portal_reset_tokens`), its own cookie (`better_auth_portal_session`), and its own middleware guard
- Password-based login at `/portal/login`; self-service password reset only; no self-service account creation
- Accounts created only via staff "Invite to portal" button on the client detail page
- Password hashing via Node's built-in `crypto.scryptSync` (no npm dependency)
- Server-side ownership check on every portal data read: the authenticated `clientId` must match the requested resource's owner

## Email Backend

`lib/email.ts` — Three backends, auto-selected: Resend (`RESEND_API_KEY`) → SendGrid Web API (`SENDGRID_API_KEY`) → SMTP relay (`SMTP_HOST`). If none are configured, `send()` is a graceful dry-run (returns `{ success: true, dryRun: true }` — the caller sees a "success", but nothing leaves the app).

**CRITICAL — unconfirmed as of 2026-07-28:** Whether the email backend is actually functioning in production has never been definitively confirmed. Real data showed a 36ms created-to-sent gap on a live document (physically too fast for a real SendGrid round-trip), and the `emailed` flag was added specifically to surface this. Check `client_documents.emailed` / `sent_updates.emailed` — if they're `false` on a "sent" record, no email actually went out. Also: the Resend webhook endpoint (`app/api/webhooks/resend/route.ts`) handles all 5 event types (sent/delivered/opened/clicked/bounced/complained), but Resend only fires the ones explicitly subscribed in their dashboard — as of 2026-07-28, only `opened`/`clicked` were enabled.

## Build/Dev Commands

```
pnpm dev          # Next dev server (port 3001)
pnpm build        # next build (may fail at the standalone file-tracing step on Windows with EPERM on symlinks — a pre-existing Windows/pnpm quirk, not a code issue; Coolify's Linux Docker build is fine)
pnpm start        # next start (production)
pnpm lint         # next lint
npx tsc --noEmit  # type-check without emitting (build skips this due to ignoreBuildErrors)
```

**Windows worktree gotcha:** `git worktree remove` can fail with "Filename too long" if `node_modules` was junctioned. Unlink the junction first (`cmd /c rmdir` on the junction directory — this unlinks without recursing into the target), then remove the worktree.

## Real Gotchas from `.context/` History

### DO-SOP-010: Always use isolated git worktrees
Every change must be built in its own `git worktree` branched off a fresh `origin/main`, never in the shared checkout. Multiple sessions have caught and reverted direct-checkout edits. Junction `node_modules` from the shared checkout, don't `pnpm install` per worktree. Cap concurrent worktrees at 4 to avoid disk fill.

### OpenCode dispatched diffs must be hand-reviewed — never trusted on self-report
The pattern has been caught four times: (1) mockup placeholder data ("Joan") copied verbatim into live client copy, (2) fabricated demo content ("Section 7 — Medical Clearance Record" with no real data), (3) static "Connected" badges with no real connectivity check, (4) live search/pagination feedback replaced with static demo copy. Read every diff line-by-line before merging.

### No condition roll-calls in marketing copy — with an explicit exception
The project's hard rule is "No condition roll-calls in copy — generalise." The Specialist Training section on Home and Personal Training lists named conditions (heart/blood pressure, bone/joint, visual impairment, cancer rehab) per Craig's explicit override — but Esther's own brand rule may still prefer the generalised version. Flag this, don't silently change it back.

### The "Level 4" claim was wrong everywhere
Esther's Level 4 is the CanRehab Cancer and Exercise Rehabilitation qualification specifically, never "Level 4 Personal Trainer / highest in the UK." Fixed in visible copy and 3 separate schema.org blocks (2026-07-27). If you see that phrasing, it's a regression.

### Specialist Training catalogue and Blog are disabled, not deleted
`next.config.js` has temporary (`permanent: false`) redirects for `/blog/*`, `/cancer-rehabilitation`, and `/exercise-for-health/*` → `/`. Code stays in the repo; revert by removing those redirect blocks. The catalogue restructure and blog rewrite are deferred to post-launch.

### PAR-Q and Agreement are now document-engine documents, not standalone pages
Every new PAR-Q and Agreement goes through the document engine (`client_documents`, kind `parq` or `terms`) from the hub, same send/resend/sign mechanism as every other document kind. The legacy `signed_parq` and `signed_agreements` tables still exist and are still read by tracker/compliance-tab code — not retired yet. The old `/agreement` page is still deliberately left in place but unlinked (Agreement was never migrated).

**`/parq/edit/[id]` is still live and legitimately used** — the Agreement page's "Copy PAR-Q edit link" button (`AgreementDetailClient.tsx`) mints a fresh signed 7-day link (`lib/parq-link.ts`) to it for clients who still have `signed_parq` rows outside the document engine. Do not delete this page. The blank standalone `/parq` first-submission form **was retired 2026-08-20** (`next.config.js` redirects it to `/`) — nothing links to it anymore. **G4 fix (2026-08-20):** `POST /api/parq` previously accepted writes from anyone with a `signed_parq` id, signature or not — the page-render check verified the link but the save action never did. Now requires either a hub session or a valid, unexpired `exp`/`sig` matching the id (`ParqEditClient.tsx` sends these through on every save).

### The "fake send" bug is permanently closed
A second "Create & send" button on the Templates page (`SendTemplateToClient.tsx`) used to PATCH `action: "send"` that just flipped status to "sent" with no email attempt. That code path has been deleted from the API entirely. `send_email` is now the only way `status` becomes `"sent"`. The `emailed` boolean column on both `client_documents` and `sent_updates` is the definitive signal of whether a real email went out.

### Document engine covers 6 kinds
Every client-facing document (Personal Training Agreement, Risk Assessment, Annual Review, Consent, Client Feedback Questionnaire, PAR-Q) is now sent, resent, and signed through the same `client_documents` engine. Always create documents from the hub, never generate fresh standalone public-page links. The document signing page (`/documents/[id]/sign`) works both with and without portal login — the same `POST /api/documents/[id]/sign` route handles both.

### Session logging was built to replace Trainerize
`sessions` has `scheduled_at`/`cancelled_at`/`cancel_reason` and `set_logs` (per-set Esther-side logging). Portal home-training self-logging is gated to `clients.delivery_mode = 'home_training'`, server-verified on every read/write. A 7-day "gone quiet" alert detects inactive home-training clients but the auto-send vs. Esther-reviewed nudge decision is still open.

### Trainerize exercise library was ported
The exercise library at `/hub/exercises` was seeded from Trainerize export data (`supabase/migrations/20260710_exercises_trainerize_seed.sql`). Video links resolve from `Exercise.media` first, falling back to the `exercises` table by name match.

### Tailwind opacity modifiers need RGB triplets
Tailwind's `bg-rose/10` produces no CSS unless `--color-rose-rgb` is defined as space-separated RGB values (`193 131 159`) and consumed in `tailwind.config.ts` via `rgb(var(--x-rgb) / <alpha-value>)`. Using opacity modifiers with bare hex CSS variables silently does nothing.

### Hero sections use GSAP slide-reveal
The homepage hero and several page heroes use GSAP for text animations. The `.hw`/`.hl` split is load-bearing: `.hw` has `overflow: hidden` (needed for the slide-reveal clip) and `.hl` carries the `font-size` so `em`-based padding resolves correctly. Moving font-related padding between them broke descender rendering before.

### CTA-band photos crop from the centre by default
Esther's head is in the upper third of every CTA-band source photo. On wide viewports with `object-fit: cover` and a fixed `min-height`, the default centred `object-position` cuts into her face. `CTABand` has an optional `imagePosition` prop (default `"center"`) — use `"top"` for photos featuring her.

### `.context/` is the project's long-running memory
Before building anything, check `state.md` (current status + known issues), `handoff.md` (per-session close-out notes), and any recent Work Orders. `loop-status.md` is the running deployment/build log. `decisions.log` is in the workspace repo (`D:\apps\eternal-fitness`), not this one.

### No `npm install`; this repo uses pnpm
`package-lock.json` is dead weight — the app deploys via `pnpm --frozen-lockfile`. Accidental `npm install` will churn it but won't break anything; just revert the lockfile churn before committing.

### Deploy is automatic on push to main
Coolify's GitHub webhook auto-deploys every push to `main`. Do not manually trigger a deploy via Coolify API after pushing — it's redundant, and one attempt even failed on a transient collision while the webhook deploy had already succeeded. The build's exec channel occasionally dies *after* compiling successfully (exit code 255 at the Docker finalize step) — this is a known transient infra pattern, not a code error. Check if the previous container is still `running:healthy` before assuming a real failure.

### Print / PDF generation
The document engine's "Print or save as PDF" uses the browser's native print function via the accessibility toolbar. `@react-pdf/renderer` is in dependencies but was only used by the legacy Agreement PDF-email path — the document engine sends sign-this-link emails, not PDFs.

### Consultation dialog co-exists with dedicated Contact page
`components/ConsultationDialog.tsx` is the slide-in consultation booking form used across the marketing site. It's separate from `/contact`'s full-page form — both exist and both should stay in sync on copy/consent wording.
