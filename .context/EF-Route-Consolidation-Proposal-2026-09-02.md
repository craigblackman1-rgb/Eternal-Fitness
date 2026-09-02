# EF Hub — Route consolidation proposal

**CR-EF-136 · 2026-09-02 · decision document for Craig · not committed**
**Author** Claude (design engineer) · **Inputs** `EF-Hub-Route-Map-2026-09-02.md` and the live route list, derived on 2026-09-02 by globbing `app/hub/(protected)/**/page.tsx` in `ef-grind-staging` (54 desktop routes — matches the route map). Sidebar as currently shipped: `app/hub/(protected)/HubSidebar.tsx` (7 groups, 26 entries, 19 visible by default).

This is the artefact the route map asked for: every desktop hub route mapped to a fate, the sidebar that falls out of it, the four "review" routes and two "templates" routes resolved by name, the Outlook queues collapsed, a position on mobile, and the short list of things only Craig can decide. Design of surviving screens follows this document; it should not lead it.

---

## 1. The shape of the answer

| | Today | Proposed |
|---|---|---|
| Desktop routes | 54 | **40** (32 kept, 7 renamed, 1 new `/settings` index) |
| Sidebar top-level entries | 19 visible (26 with Studio Admin expanded) | **8**, no groups, no collapsing |
| Screens called "review" | 4 | **1** (the client review) |
| Screens called "templates" | 2 | **0** — "Workouts" and "Document templates" |
| Homes for a block | 2 | **1** — the client record |
| Homes for documents | 3 (+ templates) | **1 per client** + one compliance register |
| Outlook / exception queues | 4 Outlook + 2 session-review = 6 screens | **1 triage screen** with six filters |

Most of the 40 surviving routes are record pages (`[id]`) reached from a list, not from the sidebar. Navigation burden is the sidebar count and the number of distinct names Esther has to hold, and that is what drops: 19 → 8 entries, and no two of them share a word.

Principle used throughout: **a thing lives where Esther would look for it, once.** Per-client things live on the client record. Cross-client things live in exactly one queue or one register. Configuration lives in Settings.

---

## 2. Every route → fate

Fates: **keep** · **rename** · **merge into X** · **retire**. "Unlisted" = the route survives but leaves the sidebar; it is reached from its parent surface. Every rename or merge ships with a `next.config.js` redirect so no bookmark or email link 404s.

### Overview and clients

| Route | Fate | Why |
|---|---|---|
| `/` | keep — becomes **Today** | The dashboard's job is "what needs me today": today's sessions plus the attention queue (drafts to approve, unconfirmed bookings, unsigned documents, quiet clients). |
| `/tasks` | keep, unlisted (reached from Today's "See all") | Follow-ups are an attention item, not a destination; the full list stays one click away. |
| `/clients` | keep | The roster. Gains status filters (draft block waiting, no clearance, quiet) so it also answers the cross-client questions `/training-blocks` used to. |
| `/clients/new` | keep | CR-EF-118 guided onboarding. |
| `/clients/[id]` | keep — the redesigned record (CR-EF-136) | Everything per-client hangs off here: blocks, sessions, documents, updates, equipment, notes. |
| `/clients/[id]/edit` | keep | Editing a clinical record is a distinct mode with its own save semantics; not folded into the record view. |
| `/clients/[id]/review` | keep — **the only "review"** | This is the review Esther means (CR-EF-119, ends in a recorded decision). The other three lose the word. |
| `/clients/[id]/add-workout` | keep | CR-EF-120's three guided routes. |
| `/clients/[id]/blocks/[blockId]` | keep — **the one home for a block** | CR-EF-099 model; CR-EF-132 "Show all exercises" + approve lives here. |
| `/clients/[id]/blocks/[blockId]/review` | merge into `/clients/[id]/blocks/[blockId]` | Block review is "read every session and approve"; CR-EF-132's all-exercises view *is* that, on the block page. Frees the word. |
| `/clients/[id]/blocks/[blockId]/print` | keep | A print rendering is a legitimately separate route. |
| `/clients/[id]/blocks/[blockId]/sessions/[sessionNum]` | keep | The session page (consolidated log/edit). |
| `/clients/[id]/documents` | keep — **the per-client document home** | CR-EF-134 in-place viewer lands here. Legacy `signed_parq`/`signed_agreements` rows already render as read-only legacy rows in `DocumentRegister`. |
| `/clients/[id]/documents/[docId]` | keep | Generated-document detail (versions, send, sign). |
| `/clients/[id]/updates`, `/updates/new`, `/updates/[updateId]/edit` | keep | Client-facing emails belong to the client. |
| `/training-blocks` | **retire** | Second home for blocks with no signal which is authoritative. Replaced by a "Draft block waiting" filter on `/clients` and a Today tile ("16 blocks waiting for approval"). |
| `/agreements`, `/agreements/[id]` | **retire** (after the legacy check below) | Standalone legacy Agreement never migrated to the engine; the `terms` document kind covers it. Condition: confirm every `signed_agreements` row is visible as a legacy row on its client's documents tab before removing. |

### Schedule and exceptions

| Route | Fate | Why |
|---|---|---|
| `/schedule` | keep | Day / month calendar. |
| `/schedule/availability` | keep, unlisted (a control on Schedule) | Weekly pattern and time off are edited from the calendar, not navigated to. |
| `/schedule/outlook` | rename to **`/schedule/triage`** and absorb the queues below | The parent renders nothing today (BUG-EF-101). One screen, one question: *which calendar entries are real sessions, and what happened to the ones that weren't?* |
| `/schedule/outlook/duplicates` | merge into `/schedule/triage` (filter: Possible duplicates) | Same question, one filter. |
| `/schedule/outlook/unassigned` | merge into `/schedule/triage` (filter: Not matched to a client) | Same. |
| `/schedule/outlook/pending-deletions` | merge into `/schedule/triage` (filter: Deleted in Outlook — approve) | Same; keeps the 2026-08-28 approval gate as a filter, not a page. |
| `/sessions/review` | merge into `/schedule/triage` (filter: **Cancelled — decide the charge**) | "Cancellation review" is a session that did not happen; it is a schedule exception, and the word "review" goes. |
| `/sessions/lapse-review` | merge into `/schedule/triage` (filter: **Lapsed — no outcome recorded**) | Near-identical concept to the row above, split across two queues today. |

The triage screen: a single list with a filter chip row — *Unconfirmed bookings · Possible duplicates · Not matched to a client · Deleted in Outlook · Cancelled — decide the charge · Lapsed — no outcome* — each chip carrying its count so a zero is an answer, and the Schedule sidebar entry carries the total as a badge (the existing `OutlookBookingsBadge` extended). Row actions are the ones each queue has today; nothing new is invented. Empty state is one quiet line: "Nothing to sort out."

### Library and documents

| Route | Fate | Why |
|---|---|---|
| `/workout-templates`, `/[id]`, `/new` | rename to **`/workouts`** ("Workouts") | Esther's word. "Template" implied a second concept she does not have. |
| `/exercises` | keep, under the **Library** entry with Workouts | The two libraries share one sidebar entry; the page has a two-way switch, not nested tabs. |
| `/templates`, `/templates/[id]` | rename to **`/document-templates`** ("Document templates") | The other "templates". Named for what it holds. |
| `/resources`, `/resources/preview/[key]` | merge into `/document-templates` as a "Portal resources" section (preview route kept) | Both are things Esther authors once and sends to clients; one Documents entry. |
| `/documents` (all-documents register) | merge into **`/compliance`** | The only cross-client question anyone asks of documents is a compliance one ("who hasn't signed a PAR-Q"), and that screen already exists as the tracker. |
| `/tracker` | rename to **`/compliance`** ("Compliance") | Medical tracker matrix + the document register = one compliance surface. "Tracker" said nothing about what it tracked. |
| `/reports/updates` | keep, unlisted (reached from Today) | Cross-client "what went out / what's scheduled" is a Today concern; the full list survives one click away. |

### Finance

| Route | Fate | Why |
|---|---|---|
| `/cashflow` | keep — the **Finance** entry | Overview; gains forecast and tax as in-page sections. |
| `/cashflow/forecast` | merge into `/cashflow` | A sole trader's forecast is one chart, not a module. |
| `/cashflow/tax` | merge into `/cashflow` | One provision figure and its basis. |
| `/cashflow/invoices`, `/[id]`, `/new` | keep (reached from Finance) | Invoices are records with a lifecycle. |
| `/cashflow/transactions`, `/[id]` | keep (reached from Finance) | Bank feed is a record list. |
| `/cashflow/reconciliation` | merge into `/cashflow/transactions` | Reconciling is an action on transactions, not a place. |

### Settings

| Route | Fate | Why |
|---|---|---|
| `/settings` | **new** — an index page | One Settings entry that lists the six things below; replaces the collapsed "Studio Admin" group. |
| `/settings/training-rules` | keep | Configuration. |
| `/settings/studio-equipment` | keep | Configuration; CR-EF-129/130 per-client equipment lives on the client, this stays the catalogue. |
| `/settings/plan-agent` | keep | Configuration. |
| `/settings/integrations` | keep | Configuration. |
| `/process-quality` | merge into `/settings` (as `/settings/process-quality`) | An ops/QA surface, not a daily one. |
| `/web-admin` | keep, unlisted (a link on `/settings`) | It is a link out to the marketing-site admin, not a hub screen. |

---

## 3. The sidebar that results

Eight flat entries, no groups, no collapse state, no "Soon" badges. Order is frequency of use.

| # | Entry | Route | Badge |
|---|---|---|---|
| 1 | **Today** | `/hub` | attention count |
| 2 | **Schedule** | `/hub/schedule` | triage count |
| 3 | **Clients** | `/hub/clients` | — |
| 4 | **Library** | `/hub/workouts` (switch to `/hub/exercises`) | — |
| 5 | **Documents** | `/hub/document-templates` (with portal resources) | — |
| 6 | **Compliance** | `/hub/compliance` | overdue count |
| 7 | **Finance** | `/hub/cashflow` | — |
| 8 | **Settings** | `/hub/settings` | — |

No two entries share a word. Every per-client job is reached through Clients; every cross-client exception through Schedule or Compliance; everything configured through Settings. The mockup-side sidebar (every `desktop/**` mockup copies it inline) is re-cut to this list in the same pass as the code, so the Design Parity Gate has one sidebar to check.

---

## 4. Names resolved

| Today | Proposed | Rule applied |
|---|---|---|
| `/sessions/review` "Cancellation review" | Schedule triage → filter "Cancelled — decide the charge" | A queue is a filter, not a page |
| `/sessions/lapse-review` "Lapse review" | Schedule triage → filter "Lapsed — no outcome" | Same |
| `/clients/[id]/blocks/[blockId]/review` "Block review" | The block page's "Show all exercises" + "Approve block" | Reviewing a block is reading it |
| `/clients/[id]/review` | **"Review"** — unchanged | The one Esther means |
| `/templates` | **"Document templates"** | Named for contents |
| `/workout-templates` | **"Workouts"** | Esther's word |
| `/tracker` | **"Compliance"** | Named for the question it answers |
| `/training-blocks` | gone; "Draft block waiting" filter on Clients + Today tile | One home for a block |

---

## 5. What mobile is for

**Recommendation: mobile is the session-running tool, and nothing else — stated explicitly, and built from the same components as desktop.**

The halfway position (10 mobile routes duplicating desktop code) is what produced BUG-EF-107 (a note written on mobile that desktop cannot read) and doubles every session-feature's maintenance. Parity across 54 routes is neither needed nor affordable: Esther does finance, documents, compliance and settings at a desk.

Mobile keeps exactly the jobs done in the room or at the door:

1. Today's sessions and the next one up (`/hub/m`)
2. Run and log a session — sets, load, tempo, notes, PB detection, supplementary work (`/hub/m/train`)
3. Client mode — this client's sessions and block position, add a workout on the day, quick note, book the next slot (`/hub/m/clients/[id]`, `/add-workout`, `/book`)
4. Day agenda and a quick "block time off" (`/hub/m/calendar`, `/availability`)

Everything else is desktop-only and the mobile shell says so plainly when a desktop link is opened on a phone ("Open this on the desktop hub"), rather than rendering a broken half-screen.

Two binding consequences:

- **Same data, same components.** A session feature ships to both surfaces or to neither; notes, PBs and set logs have one source of truth (the CR-EF-098 merged-notes contract is the model). The `/hub/m` routes become a mobile shell around shared components, not a second implementation.
- **No new mobile routes** in this consolidation. CR-EF-131 (manual PB) and CR-EF-126/125 (supplementary work) reach mobile through the shared session component, not through new pages.

---

## 6. Sequencing (so nothing 404s and nothing waits on a redesign)

1. **Renames first** — `/workouts`, `/document-templates`, `/compliance`, `/settings` index, sidebar re-cut to eight. Redirects in `next.config.js`. Cheap, ships in a day, removes the naming collisions immediately.
2. **Schedule triage** — one screen absorbing six queues; fixes BUG-EF-101 as a side effect. Needs a mockup (Design stage) before build.
3. **Today as the attention queue** — Tasks, drafts waiting, unsigned documents, quiet clients. Needs a mockup.
4. **Finance fold-in** and **retire `/training-blocks`, `/agreements`** — after the legacy-row check.
5. **Then** redesign the surfaces that survive (the CR-EF-136 client record is already in flight and is unaffected by any of the above).

Each accepted line becomes its own CR through the normal door; this document is the decision, not the work order.

---

## 7. What Craig needs to decide

1. **Accept the 8-entry sidebar** (Today · Schedule · Clients · Library · Documents · Compliance · Finance · Settings) as the target, including Tasks folding into Today.
2. **Names:** "Workouts", "Document templates", "Compliance" — and "Review" reserved for the client review only.
3. **One triage screen for all six exception queues** (four Outlook + cancellations + lapses), or Outlook-only triage with cancellations and lapses kept as a separate named screen.
4. **Retire `/training-blocks`** in favour of a Clients-list filter plus a Today tile — i.e. accept losing the global blocks page.
5. **Finance:** fold forecast, tax and reconciliation into the overview and transactions pages, or keep the seven-route module as built.
6. **Mobile scope:** session-running tool only (recommended), or commit to parity — there is no stable middle.
