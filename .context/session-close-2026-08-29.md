# Session close — 2026-08-29 (Eternal Fitness, CR-EF-086 Lane 6 + D-cluster)

**Worktree:** `D:\apps\worktrees\eternal-fitness-website\next-updates-b84429`, branch `claude/next-updates-b84429`
**Landed on:** `staging` (**final: `d40b993`**) — **nothing promoted to `main`/production**, per Craig's hold.
**Main is 0 ahead of staging** (a clean fast-forward whenever Craig approves).

> **Read the ADDENDUM at the end before acting on this document.** Craig rejected the Lane 6 wiring after this first close-out was written: the disclosures were not sitting under their images. It was refixed, a regression it caused was found and fixed, and the whole thing was re-verified on the deployed staging build. The addendum also **answers the "staging deploy unconfirmed" caveat below** — staging deploys fine; that caveat is resolved, not outstanding.

---

## What Craig asked for and what happened

Craig opened with "push forwards with next set of updates", then flagged: *"I just approved images in open design, why have you not registered this?"* — a fair hit. The answer is below.

### Why the approval was not registered

The previous session (2026-08-28, 20:38) reviewed the Open Design artifact `site-image-plates.html`, confirmed four of its findings against the real photographs, committed a review note — and then **queued a scope question** (`qmtdb2buuem`, "~18 heroes first or all ~35?") instead of treating Craig's approval as the go-ahead. So an approved deliverable sat unregistered overnight while the session waited on a question the approval had already answered.

Compounding it: the artifact lives in the **Open Design daemon store** (`%APPDATA%\Open Design\namespaces\release-stable-win\data\projects\90556eb1-…\`), not the `design-systems` git repo, so it was not findable on disk by the obvious search.

---

## Shipped to staging

| # | Item | Evidence |
|---|---|---|
| 1 | **CR-EF-086 Lane 6 plates registered** — 31 plates extracted to `.context/site-image-plates-approved-2026-08-29.json` (build source of truth) + `plate-manifest-approved-2026-08-29.md` | 10 replace / 17 revise / 4 keep, 27 with described-image copy |
| 2 | **Grounded before trusting** — all 31 filenames confirmed present in `public/images/`, all 31 mapped to 38 real call sites | The previous plate set failed exactly this check (11 photos never uploaded, `dmtd2xq1coh`) |
| 3 | **30 of 31 plates wired** — rule-4 alt text + `ef-desc` disclosures | Browser-verified, see below |
| 4 | **Rotated homepage photo fixed** — `specialist-training-esther-client.jpg` 90° CCW, 2400×1600 → 1600×2400, progressive q85 (373KB → 424KB) | Direction verified by viewing output; framing re-checked by computing visible region at the 200×351 box |
| 5 | **D6 landed** — `parseClientNameFromSubject` now accepts an `Online ` prefix | 8/8 new tests, **98/98 full suite** post-merge |

### Browser verification (not a green build)

Local dev server, **all 8 live marketing routes at 1280×900**, plus `/` and `/contact` at **375×812 mobile**:

- 26 disclosures — **0 not-rendering, 0 clipped, 0 overflowing the viewport, 0 literal entities**
- mobile `body.scrollWidth` = 375 → no horizontal scroll introduced
- open-interaction tested (555px copy panel)
- `npx tsc --noEmit` clean
- EF-20's original alt still present; `/visual-impairment` untouched (0 files changed)

---

## Things worth knowing (found, not looked for)

1. **The plate-wiring lane produced a total functional failure that every automated signal missed.** It self-reported success, the copy was verbatim-correct, `tsc` was clean — but all 27 disclosures were nested inside image wrappers that are `position: absolute` (`.efhome .hero-media`, `.ds-cta-bg`) or `overflow: hidden` (`.efhome .wimg`, `.ef-tech`, `.ds-*-split-photo`), because `next/image fill` requires a positioned parent. **Not one would have rendered.** Only line-by-line review plus loading the page caught it.

2. **The shared checkout's `node_modules` was broken repo-wide.** 41 of 95 top-level packages were junctions pointing into **deleted worktrees** — `next` itself resolved to a `remove-testimonial-schema` worktree that no longer exists. Fallout from earlier `git worktree remove` cleanups orphaning pnpm store entries. **No worktree in this repo could run a dev server or a build.** Repaired with `CI=true pnpm install` (14s, no lockfile churn). This also explains the "Cannot find module 'react'" errors the lane saw and correctly dismissed.

3. **D6 was already built but stranded** on an unpushed local branch (`task/outlook-subject-parse-2026-08-28`) — one commit, invisible to everyone, never merged. Now on staging. **That worktree still exists on disk**; its commit is merged, so it is safe to remove, but it was not mine to delete.

4. **`launch-opencode-lane.ps1` can silently no-op.** It inlines the `-Prompt` file into a generated single-quoted PowerShell string, so a markdown brief with backticks breaks the parser — the lane never starts, yet the wrapper still reports **exit 0**. Deferred `dmtdyqfbeee`. Workaround: pass a short plain `-Prompt` telling OpenCode to read the brief from the worktree itself.

5. **Own correction, recorded.** An intermediate sweep reported "2 of 26 disclosures broken (2px wide)". **That was wrong** — the Browser pane had gone hidden, collapsing `window.innerWidth` to 0, so viewport-derived elements measured ~2px while intrinsically-sized ones measured normally. Re-measured at a forced 1280px viewport: both fine. Nothing was broken.

---

## Outstanding — needs Craig

### Decisions on the board

| ID | Question |
|---|---|
| — | **Promote CR-EF-086 (Lanes 1–6) to production?** Craig chose "Hold — I want to look at staging again". Nothing pushed to `main`. |
| `qmtdzijw1ts` | On full-bleed heroes/CTA bands the disclosure renders as a white bar under an edge-to-edge photo. `/visual-impairment` (the approved bar) only ever uses these under *contained* in-content images, and the mockup argues heroes should carry descriptions but specifies no placement. Functional as shipped; the visual treatment was **not invented** — it's a Design Parity call. |
| `qmtdy8sye9b` | The **"BE STRONGER THAN YOUR EXCUSES" wall slogan is legible in 17 of 31 photographs**, including most heroes. Direct collision with `brand.json` → `imagery.avoid` and the `voice.vocabulary.avoid` register. Photography problem, not an alt-text one. |
| `qmtbg2aj8mx`, `qmtbg2af6xk` | CR-EF-095 booking-attribution decisions (pre-existing, still unanswered) |
| `qmt8mne5c58` | CR-EF-006 testimonials JSON-LD register reconcile (pre-existing) |

### Deferred with a concrete next step

| ID | Item |
|---|---|
| `dmtdy8l3aah` | **EF-20 re-plate.** Open Design correctly marked it "Ask me"; its provisional alt is wrong now the file is upright. Ground truth recorded, and the corrected file has been copied into the OD project's `imagery/site-current-2026-08-28/` so it can be re-authored from the right-way-up image. |
| `dmtdzm44n0s` | **D1** — `backfill-exercise-uid.mjs` + session-transitions verify. Not started: writes to live data on two DBs, needs the Coolify tunnel. |
| `dmtdytbo1he` | **D7** — repo side is exhausted and clean; source of the `dataapp_app` auth attempts is off-box. |
| `dmtdyqfbeee` | launch-script false-success bug. |
| `dmtd2xq1coh` | The 11 new-studio-shoot photos still never uploaded. |

### Unverified claim — do not round up

**The staging deploy was not confirmed.** The push landed on the `staging` branch, and auto-deploy is enabled on `eternal-fitness-staging`, but: Coolify's deployment list showed no EF entry, and `https://development.eternal-fitness.co.uk` returns **HTTP 302 (Cloudflare Access)** to an unauthenticated request, so it could not be checked from here. **Verification above is from the local dev server, not the deployed staging build.** When Craig opens staging in his own browser he will see immediately whether `23cf333` deployed.

---

## Also logged

- **Lane E is largely stale** (`wo-ef-consolidated-2026-08-27` ledger): `PlanScheduleTable` already has the Programme column, Progress column, Do Not Train pill and Review/Continue action; Est. duration is already derived (`estimated_minutes` with a tier fallback). E1 and E3 need no work. E2 and E4 remain unaudited.
- **D5 answered at code level**: a session materialised from an Outlook booking gets the originating `event_id` written into `session_calendar_events` at creation, so push-sync takes the `updateEvent` branch; `createEvent` is unreachable when a mapping exists, and even without one `findDuplicateCandidate` pauses rather than creating. Two independent safeguards. **Code-verified, not live-verified** — confirming zero real duplicates in prod still needs the tunnel.

---

# ADDENDUM — Craig rejected the wiring, it was refixed and re-verified

**Closed at `d40b993` on `staging`.** Everything below happened after the first close-out above.

## What Craig said

> *"the describe this image should always sit under the image, they are not, you can see in the chrome browser tab open"*

**He was right and the earlier sign-off was wrong.** The verification that passed had checked the disclosures *rendered* and were not clipped. It never checked they sat **under their own image** — the thing that actually mattered.

## What was actually wrong

Re-measured at 1440x900: **only 4 of 14 were correct.** Two distinct faults:

| Layout | Fault |
|---|---|
| Two-column split hero / CTA band | The disclosure was an extra grid child, so it became a new grid item in the **first** column — the text column — while the photo sat in the other. On `/about` outright **inverted**: disclosure at x 699-1345, photo at x 80-619. |
| Full-bleed overlay hero / CTA band | Rendered **over** the image (gaps of -185 and -613), because it was inside the content wrapper rather than below the band. |

The four that already worked did so because the disclosure was a flow sibling of the image container **inside the same layout slot** — the `/visual-impairment` shape.

## The fix, and the regression it caused

**Fix:** contained images — image container + disclosure wrapped in one `<figure class="ef-figure">` occupying the image's grid slot, so the disclosure inherits the photo's column and width. Full-bleed backgrounds — disclosure moved outside the `<section>`.

**Regression it introduced:** the figure wrapper collapsed the two `next/image` `fill` containers (`.ds-hero-split-photo`, `.ds-cta-split-photo`) to **height 0**. Those photographs rendered as solid black boxes on `/contact`, `/about` and every split-layout page. `fill` images are absolutely positioned and contribute no intrinsic height; the containers had been taking height from the grid row, and the figure removed it. Fixed CSS-only: `.ef-figure > :first-child { flex: 1 1 auto; min-height: 0; }`.

## The real lesson — the audit asserted the wrong thing twice

1. **First pass** asserted "renders and is not clipped" → passed disclosures sitting in the wrong column entirely.
2. **Second pass** asserted placement but not image height → passed photographs collapsed to zero height and rendering black.

Same shape both times: measuring that something *appeared* rather than that it was *correct*. The zero-height regression was caught only by taking a screenshot and seeing a black box where the kettlebells should be — not by any check that was written. **The audit now asserts placement AND non-zero image height together, and is run against the deployed build, not just localhost.**

## Final verification

- Local dev server, desktop 1440x900, all 8 live routes: **26/26 pass, 0 collapsed figures**
- Mobile 375x812 on `/`, `/contact`, `/about`: **14/14 pass, 0 collapsed, no horizontal scroll**
- `npx tsc --noEmit` clean
- **Deployed staging confirmed in Craig's real Chrome session** (Cloudflare Access blocks the sandboxed pane), after waiting for Coolify deploy `wj4vw7hn9ynijnn2ff7hqqtk` to clear: `/contact`, `/about` and `/` all place the disclosure under the photograph.

## Second correction, made and retracted in the same pass

On first look at deployed `/about` the in-content photos appeared as solid black boxes and were called a resurfacing of the Lane 3 multiply-blend bug. **That was wrong** — they were `next/image` lazy-load placeholders and render correctly once loaded. No blend regression exists. Recorded because calling a load placeholder a rendering bug would have sent a lane chasing nothing.

## Also now confirmed

The **staging deploy question left open in the first close-out is answered**: staging deploys fine and is current. The earlier "unconfirmed" note was only because Cloudflare Access 302s an unauthenticated request — in Craig's own browser it loads normally.

## Still outstanding — unchanged from the first close-out

Nothing new was added to the outstanding list. The three decisions (promotion to production, hero/CTA disclosure styling `qmtdzijw1ts`, wall-slogan photography `qmtdy8sye9b`), the EF-20 re-plate, and D1 all still stand. **The wall-slogan question is now more visible, not less** — the `/about` story photograph has "BE STRONGER THAN YOUR EXCUSES" across the whole back wall.
