# Hub design-mockup reconciliation audit — 2026-08-15

Cross-referenced every live route under `app/hub/(protected)/**` and `app/hub/m/**` (46 routes) against
every mockup `.html` file in `D:\apps\design-systems\ef-control-hub\` (53 files across `desktop/`,
`mobile/`, `documents/`, plus root). Two Explore passes did the enumeration; this doc is the reconciled
result, with a handful of files spot-read directly to resolve ambiguous cases rather than guessed at.

## Confirmed superseded / no longer required — safe to retire

| File | Why |
|---|---|
| `desktop/hub-session-editor.html` | Explicitly superseded. `hub-session.html`'s own header states it "Replaces BOTH the Session Editor's inline logger AND the Standalone Live Log" — this is the mockup L2 of the workout-consolidation brief already produced. |
| `desktop/hub-session-log.html` | Same — explicitly superseded by `hub-session.html`, confirmed in its header comment. |
| `desktop/hub-client-detail-refined.html` | An earlier 5-tab exploration. Craig's actual 2026-08-06 decision went with the 6-tab `hub-client-detail.html` instead specifically *because* the refined draft silently dropped the Resources rail card and Plan Agent tab access (state.md, 2026-08-06 entry). Abandoned alternate, not the shipped design. |
| `desktop/hub-site-content.html` + `desktop/hub-site-content-editor.html` | Model the "Site Content" feature — removed entirely from the app on 2026-08-06 (`page_keywords`/`page_content_blocks` tables kept, feature retired). No live route renders this any more. |
| `desktop/hub-sop.html` | Flagged as far back as 2026-07-30 ("no confirmed live counterpart, sidebar nav doesn't match any current hub mockup") and never resolved since. Confirmed again now: no route in the current 46-route inventory matches it — SOPs live inside `/hub/process-quality` instead, not a standalone page. |
| `updates-due-tracking.html.artifact.json`, `documents/client-consent-alt.html.artifact.json`, `documents/client-update-email.html.artifact.json` | Orphaned `.artifact.json` metadata files with no matching `.html` — the mockups they described are already gone. Dead weight regardless of the rest of this audit. |

**Recommend:** delete these 8 files (6 `.html` + 3 orphan `.artifact.json`, minus the 1 `.artifact.json`
that legitimately pairs with `hub-site-content-editor.html`/etc. — check pairing before a bulk delete)
from `ef-control-hub`, or move them to an `_archive/` subfolder if Craig would rather keep history than
delete outright. Either way, don't leave them sitting in the active set where a future session might
mistake one for current.

## Ambiguous — needs Craig's call, not a unilateral retirement

| File | Why it's not a clean call |
|---|---|
| `desktop/hub-parq-edit.html` | Models embedding the **legacy** `/parq/edit/[id]` form inside the hub shell. But per this project's standing rules, every new PAR-Q now goes entirely through the document engine, and the legacy `/parq`/`/parq/edit/[id]` pages are deliberately left unlinked as a 7-day-TTL safety net that's long since expired. This mockup's whole premise — redesigning the legacy embedded editor — may itself be moot. Recommend asking Craig directly: is this still wanted, or does it retire alongside the rest of the legacy PAR-Q surface (scope-of-works §4.3)? |

## Genuinely missing — no mockup exists for a real, live route

These feed the new brief (`brief-hub-remaining-screens-opendesign.md`), not listed in full again here —
short version:
- `/hub/clients/new` (new-client intake form)
- `/hub/clients/[id]/documents` + `/hub/clients/[id]/documents/[docId]` (per-client document list/detail — distinct from `hub-documents.html`, which is the cross-client register)
- `/hub/clients/[id]/updates`, `/updates/new`, `/updates/[updateId]/edit` (the progress-update composer/history — a substantial, much-iterated feature per state.md, with no mockup at all)
- `/hub/clients/[id]/blocks/[blockId]/review` (block review/scheduler — unclear if `hub-block-module.html` actually covers this state or not; treat as a gap until confirmed)
- A monthly calendar view for `/hub/schedule` — confirmed by direct read that the existing `hub-schedule.html` is single-day (heading "Studio schedule", date formatter emits one weekday/day/month/year string, matching the live day-view `ScheduleCalendar.tsx` exactly). Craig's calendar-sync ask (`.context/scope-of-works-2026-08-15.md` §2.1) needs a genuinely new month-grid mockup, not a revision of this one.

## Checked and confirmed fine — not gaps, don't add to the new brief

- `/hub/m/clients/[id]` — **not missing.** `mobile/hub-m-clients.html` includes a `view === 'detail'` state (confirmed by reading the file) covering both the list and the per-client detail screen in one file.
- `/hub/agreements`, `/hub/agreements/[id]` — legacy, already slated for retirement (scope-of-works §4.3). No mockup needed for a screen on its way out.
- `/hub/clients/[id]/blocks/[blockId]/print` — a print-formatted layout, not app chrome. Doesn't need a hub-shell mockup.
- `/hub/resources/preview/[key]` — deliberately reuses real portal components directly with no persisted state; correctly has no separate mockup.
- `/hub/cashflow/invoices/new`, `/invoices/[id]`, `/transactions/[id]` — reasonably covered as states/drawers within `hub-cashflow-invoices.html` and `hub-cashflow-transactions.html` respectively (both mention drawer/detail interactions in their content). Lower confidence than the others in this list — worth a quick look if anyone's touching those routes, but not worth a fresh design pass on their own.
- All three settings sub-pages (`plan-agent`, `studio-equipment`, `training-rules`) — each has a matching, current mockup.
- `hub-settings-integrations.html` — mockup exists and matches the real Settings → Integrations screen built for L6 (Outlook calendar sync). Not a design gap — the live route just hasn't landed in *this* worktree yet, since it was built on `staging` after this worktree branched. An implementation-sync note, not a design one.
- `hub-nav-restructure.html`, `hub-toolbar-icon-spec.html`, `admin-design-system.html`, `index.html` — not page mockups at all (an IA-options doc, a design-token/icon spec, and a navigation index respectively). Correctly don't map to any single route.

## Not audited this pass

`ef-client-portal` (the separate client-portal mockup folder) exists and clearly relates to this app,
but wasn't inventoried — this audit was scoped to the staff hub only, per how the request was framed.
Worth the same treatment as a follow-up if the portal side needs the same reconciliation.
