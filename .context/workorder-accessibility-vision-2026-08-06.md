# Work Order: Public-site accessibility for impaired vision — 2026-08-06

OWNER: claude (this session) — claimed 2026-08-06T19:10
SCOPE: eternal-fitness-website (app/layout.tsx, app/globals.css, public marketing pages — home/about/contact/blog/faqs — not the /hub or /portal auth areas)

GOAL: The public marketing site meets WCAG AA basics for low-vision and screen-reader users — skip link + main landmark exist, brand text colours meet contrast minimums, all form inputs are labelled, focus states are clearly visible.
MUST: Keep the "rose" brand colour available for decorative/background use — only change it where it's used as *text* colour on white. Don't touch the client portal or hub (already has a skip link).
DECIDE YOURSELF: Exact darkened rose hex value (pick one that still reads as on-brand and hits 4.5:1), skip-link visual styling (standard "visually-hidden until focused" pattern), wording of the blog search aria-label.
ASK FIRST: None — all units below are small, scoped, non-destructive CSS/markup changes. No DB, no deploy gate beyond the standing push/deploy rule.

## DONE
- [x] Skip-to-content link added to the public site layout, jumps to a `<main>` landmark
- [x] `<main>` element wraps page content on all public pages (home, about, contact, blog, faqs, condition pages)
- [x] "Rose" text-colour usages (step numbers, "Read →", category label, required-field asterisks, FAQ markers) darkened to pass 4.5:1 on white; decorative/background rose uses untouched
- [x] Blog search input has an accessible label (`aria-label` or visually-hidden `<label>`)
- [x] Contact form focus ring opacity increased from `ring-rose/30` to a more visible level
- [x] Blog hero image alt text and post-image alt text made more descriptive (not just "Blog" / post title)
- [x] Full findings audited against WCAG AA (`a11y-audit` skill) confirms all P0/P1 items closed

## LANES
- Lane A — Skip link + main landmark (layout-level) · depends on: none
- Lane B — Rose text contrast fix (globals.css + call sites) · depends on: none
- Lane C — Blog search label + contact form focus ring + image alt text polish · depends on: none
(all three lanes are independent, but share overlapping files — run as ONE dispatch in this single worktree, not separate worktrees, to avoid merge conflicts on BlogPageClient.tsx/BlogPostClient.tsx/ContactPageClient.tsx)

## UNITS
### Lane A — Skip link + landmark
- [AUTO] Add a skip-to-content link (visually-hidden, visible on focus) to `app/layout.tsx`, targeting a new `id="main-content"` — files: `app/layout.tsx` — VERIFY: tab from page load, first focus stop is the skip link, Enter jumps focus to main content; visible on focus in browser check
- [AUTO] Wrap page content in a `<main id="main-content">` on all public page components (HomePageClient, AboutPageClient, ContactPageClient, BlogPageClient, BlogPostClient, FAQsPageClient, condition pages) — files: `app/**/*Client.tsx` — VERIFY: each page has exactly one `<main>`, nav/footer stay outside it

### Lane B — Contrast
- [AUTO] Darken the "rose" shade used as text colour (keep original for backgrounds/borders/decoration) — introduce a `--rose-text` (or similar) token in `app/globals.css` at ≥4.5:1 on white, swap the text-colour call sites: `app/blog/BlogPageClient.tsx:117,152`, `app/blog/[slug]/BlogPostClient.tsx:98,238,254`, `app/contact/ContactPageClient.tsx:117,148,178`, `app/faqs/FAQsPageClient.tsx:194,210` — VERIFY: compute actual contrast ratio of new hex vs `#FFFFFF`, must be ≥4.5:1; visually confirm rose still reads as on-brand

### Lane C — Forms, focus, alt text
- [AUTO] Add `aria-label="Search blog posts"` (or a visually-hidden `<label>`) to the blog search input — files: `app/blog/BlogPageClient.tsx:80` — VERIFY: input has an accessible name in the a11y tree
- [AUTO] Increase contact form focus ring visibility — files: `app/contact/ContactPageClient.tsx:126-187` — VERIFY: ring contrast ≥3:1 against the field background at focus
- [AUTO] Improve blog hero/post image alt text (`alt="Blog"` → description of the actual hero image; post images describe the image content, not just reuse the title) — files: `app/blog/BlogPageClient.tsx:53,144`, `app/blog/[slug]/BlogPostClient.tsx:133` — VERIFY: alt text describes image content, not generic/duplicate of adjacent heading

## LEDGER
Progress written to: `eternal-fitness-website/.context/state.md` + `handoff.md` as each unit ticks.
Live status: `eternal-fitness-website/.context/loop-status.md`

CONTEXT: Sourced from a vision-accessibility audit run 2026-08-06 (Explore agent + a11y-audit skill) against the public site. Full findings: images/alt text already mostly good (37/40 with solid alt text) — captions are not the gap. Real gaps are structural (no skip link/main landmark on public pages — the portal already has one) and a contrast issue on the brand "rose" colour used as text (~2.9-3:1 on white, fails 4.5:1 AA minimum). Minor: unlabelled blog search input, faint contact-form focus ring, two generic image alt texts. Everything else (heading structure, nav/footer landmarks, icon-button labels, decorative-image aria-hidden, other form labels) already passes.

## VERIFICATION (2026-08-06, closed)
Dispatched as one OpenCode lane (deepseek-v4-pro) in worktree `accessibility-vision-2026-08-06`, all 3 lanes implemented in a single pass (18 files, 81 insertions). Independently verified, not on self-report:
- `git diff --stat` confirms only public-page files touched, no /hub or /portal files — MUST honoured.
- Computed contrast of `--rose-text: #AE547D` on `#FFFFFF` = 4.81:1 (Node relative-luminance calc) — passes AA 4.5:1, close to the lane's own 4.85 claim.
- `npx tsc --noEmit` clean.
- Live-rendered in a dev server (localhost:3512) and inspected via browser DOM: skip link is the first `<body>` child targeting `#main-content`; every checked page (home, contact, faqs) has exactly one `<main id="main-content">` wrapping content with Navbar/Footer outside it; contact form inputs/asterisks/focus ring use `var(--rose-text)`; decorative rose uses (buttons, dividers, hover states) left untouched as required.
- Blog/BlogPost changes verified by direct diff review only (blog is currently redirected to Home per a pre-existing separate decision, not part of this WO's scope) — code is correct and will take effect when blog is re-enabled.
Not pushed yet — awaiting merge to main.
