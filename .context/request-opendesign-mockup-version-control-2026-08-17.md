# Request to Open Design: mockup register version-control pass

**Date:** 2026-08-17 · **Library:** `D:\apps\design-systems\ef-control-hub`
**Goal:** after this pass, the library contains exactly one canonical mockup per live hub screen,
reflecting real functionality only; superseded and speculative files are archived (never deleted);
`index.html` becomes the living register that records what's canonical and when it last changed.

Every verdict below was produced by reconciling each mockup against the live codebase
(`eternal-fitness-website`, `app/hub/**`) — not by eye. Where a mockup was suspected of "invented
functionality" but the feature turned out to be real (all 6 cashflow screens, resources,
integrations, medical tracker), it is confirmed CANONICAL below and needs no touch.

## 1. Archive (superseded — replacement already exists)

Create `_archive\` inside `ef-control-hub` and move these there unchanged:

| File | Superseded by | Evidence |
|---|---|---|
| `desktop\clients\hub-client-detail.html` | `clients\hub-client-detail-refined.html` | Refined's 5-tab structure matches live `ClientDetailTabs.tsx` exactly; the old file's tab set (Tasks/Compliance as top-level tabs) no longer exists in the app |
| `desktop\training\hub-session-editor.html` | `training\hub-session.html` | index.html itself declares the 2026-08-15 consolidation; the "until routes are folded" condition is now satisfied (`/hub/log` is a redirect) |
| `desktop\training\hub-session-log.html` | `training\hub-session.html` | Same; its route no longer renders a page |
| `desktop\design-system\hub-nav-restructure.html` | `design-system\hub-nav-reconciliation-v1.html` | The reconciliation file labels it "superseded" in its own nav; Option A shipped 2026-08-06 |
| `desktop\design-system\hub-toolbar-icon-spec.html` | consumed | Self-declared "review artifact, not a permanent doc"; the components it specified (`Toolbar.tsx`) now exist in the app |

## 2. Archive (speculative — no code behind them)

| File | Finding |
|---|---|
| `desktop\site-content\hub-site-content-editor.html` | Pure concept: the `page_content_blocks` table is seeded in a migration but has **zero references** in any app code. Archive with a note; revive only if the feature is ever commissioned. |
| `desktop\site-content\hub-site-content.html` | Partially overlaps the real `/hub/web-admin` page (which renders the same keyword/content-status inventory under a different name). Either rework it as the `/hub/web-admin` mockup (that route currently has none) or archive it. Do not leave it implying a `/hub/site-content` route exists. |
| `desktop\quality\hub-sop.html` | The SOPs *list* is real (a tab of `/hub/process-quality`); this mockup's single-SOP document view (versioning, duplicate, draft) is unbuilt. Archive as concept, or mark explicitly CONCEPT in the register — its sidebar is also the oldest IA in the set. |

## 3. Relocate (content fine, wrong place — move into category folders)

| File | Move to |
|---|---|
| `desktop\hub-client-new.html` | `desktop\clients\` |
| `desktop\hub-block-review.html` | `desktop\training\` |
| `desktop\hub-client-documents.html` | `desktop\clients\` |
| `desktop\hub-client-document-detail.html` | `desktop\clients\` |
| `desktop\hub-updates.html` | `desktop\clients\` |
| `desktop\hub-update-composer.html` | `desktop\clients\` |
| `desktop\hub-schedule-month.html` | `desktop\scheduling\` |

## 4. Refresh (kept, but drifted — needs a revision)

| File | What's stale |
|---|---|
| `desktop\hub-schedule-month.html` | Still shows the old "Booked · workout ready / no workout yet / clash" legend. Bring it onto the same 5-state session pill (Planned · Scheduled · In progress · Completed · Cancelled) that the 2026-08-17 revisions of `hub-schedule.html` / `hub-block-module.html` / `hub-session.html` / `hub-client-sessions-tab.html` now share. Month view is live in the app (`MonthCalendar.tsx`) — it must not speak a different status language than the day view. |
| `desktop\hub-block-review.html` | Same pill refresh once the block/session state model lands. |
| `mobile\training\hub-m-train.html` | Same pill refresh (mobile shows session state too). A larger Trainerize-informed mobile revision is coming under a separate brief — if that arrives first, fold the pill into it rather than doing two passes. |
| `desktop\training\hub-training-blocks.html` | Its sidebar is an older IA than every other mockup ("Client Library", old Finance grouping). Align the chrome with the current sidebar or note it as chrome-stale in the register. |

## 5. Register regeneration — `index.html` (this is the version control)

Regenerate the catalogue so it lists **every** file in the library with:

- **Status:** CANONICAL / REFERENCE (design-system docs) / CONCEPT / ARCHIVED
- **Route mapping:** the live route it depicts (or "concept — no route")
- **Last revised:** date + one-line change note per revision (append a line each pass — this
  becomes the change history the library currently lacks)

It is currently missing ~20 files (all finance, resources, documents-detail, updates pair,
schedule-month, client-new, refined client detail, sessions tab, integrations, nav/toolbar docs,
portal-pwa-states) and still points the client record at the superseded 6-tab file.

Out of scope for this register: `documents\*.html` (client-facing document templates — a separate
category with its own lifecycle) and `.od-skills\` (tooling scaffolding).

## 6. Standing rules going forward (put these at the top of index.html)

1. **One file per live screen, revised in place.** Variants and explorations go to `_archive\`
   the moment a direction is chosen.
2. **Reconcile before drawing.** A revision of an existing screen starts from what the live page
   actually does (the request will say which route/component). Do not add, remove, or invent
   functionality silently — every deliberate deviation gets flagged in the handback.
3. **Archive, never delete.**
4. **Update the register in the same pass** as any file change — a mockup change that doesn't
   touch `index.html` is incomplete.
5. **New-screen mockups require a named route or an explicit CONCEPT label.**

## 7. For awareness — missing mockups (do NOT draw these unprompted)

These live routes have no mockup. They'll be commissioned individually if and when they get a
design pass; for now the register should list them as "deliberately unmocked":
`/hub/agreements` (+detail) · `/hub/templates` (+detail) · `/hub/web-admin` (unless §2 rework) ·
`/hub/cashflow/invoices/new` + invoice/transaction detail pages · block print view ·
update edit · `/hub/workout-templates/[id]` · mobile `/hub/m/clients/[id]` · auth screens.
