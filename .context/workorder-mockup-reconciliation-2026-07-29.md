# Work Order: Full mockup reconciliation (v2) — 2026-07-29

OWNER: Claude Code — claimed 2026-07-29T14:20:00+01:00
SCOPE: eternal-fitness-website (`app/**`, `components/ds/PageHero.tsx`, `components/Navbar.tsx`, `app/design-system.css` — the 6 launch pages + shared hero/nav). Read-only reference: `D:\apps\design-systems\brand-staging-2662e9\*.html` + `ef-site.css` (all updated 2026-07-29 — new full-bleed hero treatment + transparent-until-scroll nav, superseding the 2026-07-28 mockup version). No DB, no migrations.

GOAL: Craig's explicit instruction (2026-07-29): "update each page to match the open designs I gave you and remove the sections not required from the staging site, only follow the open-design as this has all the correct content." This supersedes every `[GATE]` item left open in `workorder-design-reconciliation-2026-07-28.md` — the answer to all of them is now "match the mockup, remove what isn't in it," not a judgment call. Also fixes the hero gradient Craig flagged as "looked awful" — the mockup replaced the flat single-layer scrim with a richer bottom/top/left 3-gradient treatment and moved every page's hero to one unified full-bleed pattern (dropping the old two-column "split" hero entirely).

MUST:
- Match the mockup exactly for structure, copy, layout, and imagery — no live-only extras kept, no exceptions this round (Craig's explicit instruction, not a per-item judgment call).
- Remove, don't just restyle, any section/element with no mockup equivalent: Contact's Google Maps embed (revert to mockup's studio photo), Contact's extra "Not Sure Where to Start?"/"Follow Me" blocks, About's `AccreditationStrip`/`StatBadge`/`JourneyPath` decorations, Personal Training's extra Credentials `StatStrip`, Home's current Who/Testimonials sections (rebuild to mockup's versions).
- Shared hero (`PageHero.tsx` "overlay" variant + `.ds-hero`/`.ds-hero-bg` CSS in `design-system.css`, and `HomePageClient`'s own hero) must be reworked to match the new mockup CSS: full-bleed image, 3-layer scrim (bottom/top/left, not a flat single gradient), credential card repositioned bottom-right, hero copy padding/z-index per mockup. Drop the "split" PageHero variant's usage across all 6 pages in favour of "overlay" everywhere (mockup no longer has a split hero anywhere) — keep the variant in the component only if still referenced elsewhere after this pass, else remove it.
- Nav: Navbar.tsx's existing scroll-triggered transparent→solid behaviour already matches the mockup's is-stuck pattern — do not rebuild this, just confirm it still reads correctly against the new hero (white nav text/logo over the photograph, solid on scroll).
- Every unit works in its own git worktree per DO-SOP-010, branched fresh off `origin/main` (fetch first). Junction `node_modules` from the shared checkout — do not `pnpm install` per worktree.
- `tsc --noEmit` and a full `next build` clean before any merge. Hand-review every diff before trusting it (OpenCode or otherwise) — do not merge on self-report alone.
- Browser-verify each page after merge (real page load, not just build success) before ticking its DONE item.

DECIDE YOURSELF: exact Tailwind/CSS values to hit the mockup's visual intent when not pixel-specified; which existing `components/ds/*` primitive to reuse; image asset selection when the mockup's exact filename doesn't exist in `public/images` (pick the closest existing asset).

ASK FIRST: nothing structural — Craig's instruction is a blanket go-ahead to match mockup and remove extras across all 6 pages. Still flag (don't silently decide) anything that looks like it would delete real functionality with no mockup equivalent AT ALL that a client would miss immediately (e.g. if removing the Maps embed leaves Contact with literally no way to see the studio location) — but default to following the mockup per Craig's instruction unless something looks like an outright regression, not just a design call.

## DONE
- [x] Lane A — Shared hero rework (`PageHero.tsx` overlay variant, `design-system.css` `.ds-hero`/`.ds-hero-bg`, credential card, `HomePageClient`'s own hero + `home.css`) — full-bleed 3-layer-scrim mockup treatment, retired the "split" variant. Merged `b6515b7`, deployed, browser-verified across all 6 pages (desktop + mobile widths). Real bug caught and fixed during verification: Next's `fill` image mode sets `right:0` and Tailwind's `img{max-width:100%}` preflight both silently overrode the mockup's `--pan` image-width framing until an explicit `right:auto`/`maxWidth:none` override was added.
- [x] Lane B — Home — Who + Specialist Training merged into one dark band (was two separate sections), Testimonials rebuilt as two equal-weight cards on white (was single-spotlight teal). Merged `fdca133`.
- [x] Lane C — About — hero to overlay variant, removed AccreditationStrip/StatBadge/JourneyPath (no mockup equivalent), Philosophy rebuilt as a dark ink band with a new `.ds-callout-dark` variant, "converted-garage studio" wording restored. Merged `fdca133`.
- [x] Lane D — Contact — hero to overlay variant, Google Maps iframe replaced with the mockup's studio photo + copy section (`#studio`), removed the duplicate "Not Sure Where to Start?"/"Follow Me" sidebar blocks (both already covered by the closing CTA band). Merged `fdca133`.
- [x] Lane E — FAQs — hero to overlay variant (Lane A). Default-open accordion + "Still not sure?" band were already shipped in the 2026-07-28 pass — confirmed still present, no further work needed.
- [x] Lane F — Personal Training — hero to overlay variant, removed the extra Credentials StatStrip section, "What We Work On" rebuilt as a 4-card icon grid, Specialist Training rebuilt as a dark band. Merged `fdca133`.
- [x] Lane G — Pricing — hero to overlay variant, "What You're Investing In" rebuilt as the mockup's short statement + CTA, "Not Sure Which to Choose?" restored as its own standalone dark band. Merged `fdca133`.
- [x] Follow-up fix 1 — Home's Approach section step images corrected to the mockup's real client photos (were still on old placeholder filenames — missed in the original pass, never audited). Merged `8860624`.
- [x] Follow-up fix 2 — Specialist Training condition list restored on Home + Personal Training, per Craig's explicit go-ahead after flagging it as a possible "no condition roll-calls" hard-rule conflict. Merged `8860624`.
- [x] Follow-up fix 3 — Home's Approach section's extra "No weigh-ins" card removed entirely (mockup has only one credential band, not a 2-card grid) — real miss from the first pass, caught by Craig via screenshot. Merged `40ec639`.
- [x] Follow-up fix 4 — Testimonials text color bug fixed: the two-card rebuild reused CSS classes written for the old dark-teal background (white text), invisible once moved onto white. Replaced with proper light-background classes, confirmed via computed-style color checks. Merged `40ec639`.
- [x] Full site click-through by Craig — **DONE.** Craig reviewed the live site directly (via screenshots with element selectors) across two follow-up rounds and confirmed the fixes; no further issues raised as of session close.

**Two items deliberately NOT ported from the mockup, later reversed on Craig's explicit instruction:**
- The mockup's Specialist Training copy (Home, Personal Training) lists named conditions (heart/blood pressure, bone/joint, visual impairment, cancer rehab) — a direct roll-call the project's own hard rules ban on general pages ("No condition roll-calls in copy — generalise", `CLAUDE.md`). Initially left out and flagged; Craig confirmed via screenshot that the section should match the mockup exactly, so it was restored. Still worth Esther's confirmation since it's her brand rule, but not blocking.
- The mockup's "See Specialist Training" links point at `/exercise-for-health`, which currently redirects to Home (disabled per the 2026-07-27 launch-scope decision, Specialist Training catalogue not yet built). Kept those links pointing at `/contact` or `/personal-training` instead, so they actually go somewhere live — this one was not reversed.

All four commits deployed via Coolify auto-deploy, confirmed `running:healthy` via MCP (not deploy-status self-report) — see `decisions.log` for full detail on each.

## LANES
- Lane A — Shared hero component · depends on: none — land and merge first, all page lanes depend on it
- Lanes B–G — one per launch page · depends on: Lane A merged · independent of each other, run in parallel

## LEDGER
Progress written to `eternal-fitness-website/.context/state.md` + `handoff.md` as each lane ticks. Live status: `eternal-fitness-website/.context/loop-status.md`.

CONTEXT: Direct continuation of `workorder-design-reconciliation-2026-07-28.md` — that WO shipped all 7 lanes but left ~10 `[GATE]` items open pending Craig's call. Craig has now resolved all of them the same way ("follow the mockup, remove the rest") and separately flagged the hero gradient as ugly. The mockup files themselves changed again same-day (2026-07-29) with a new full-bleed hero treatment replacing the old flat scrim, superseding the previous "split vs overlay" GATE questions entirely — the mockup now only has one hero pattern, full-bleed, on every page.

**CLOSED 2026-07-29.** Every lane shipped and deployed; Craig's own click-through surfaced two real gaps missed in the first pass (both fixed same session, see follow-up fixes 3–4 above) — worth noting for future passes that a full section-by-section screenshot diff against the mockup should be the default on the first attempt, not something a client has to catch and re-flag.
