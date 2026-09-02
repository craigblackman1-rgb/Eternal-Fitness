# Eternal Fitness Hub — route map and why it can't be navigated

**2026-09-02 · derived from the codebase, not estimated.** Every route below is a real `page.tsx`.

---

## The number

| Surface | Routes |
|---|---|
| Desktop hub | **54** |
| Mobile hub (`/hub/m`) | 10 |
| Client portal | 17 |
| **Total** | **81** |

Fifty-four screens in the trainer hub, for one trainer with seventeen active clients. The sidebar
exposes about nineteen entry points. That is the navigability problem stated as a number — no amount
of restyling fixes a structure this size.

---

## Four things called "review", meaning four different things

| Route | What it actually is |
|---|---|
| `/sessions/review` | **Cancellation review** |
| `/sessions/lapse-review` | **Lapse review** |
| `/clients/[id]/review` | The guided client review flow (CR-EF-119) |
| `/clients/[id]/blocks/[blockId]/review` | Block review |

The first two are near-identical concepts — a session that did not happen — split across two queues.
Esther cannot be expected to know which "review" she wants, because the word does not distinguish them.

## Two things called "templates", meaning different things

| Route | Reads from |
|---|---|
| `/templates` | `document_templates` — PAR-Qs, agreements, consents |
| `/workout-templates` | `workout_templates` — exercise prescriptions |

Both appear in the sidebar. One is under "Documents", the other under "Client Library". Same word,
unrelated things.

## Blocks live in two places

`/training-blocks` (global list) and `/clients/[id]/blocks/[blockId]` (the real one). A trainer looking
for "that block" has two plausible homes and no signal which is authoritative.

## Documents live in three places

`/documents`, `/clients/[id]/documents`, and `/agreements` — plus `/templates` for their templates.

## The Outlook queue is four separate screens

`/schedule/outlook`, `/schedule/outlook/duplicates`, `/schedule/outlook/unassigned`,
`/schedule/outlook/pending-deletions`. All four answer one question: *which calendar entries are real
sessions?* Three of the four were empty or broken when checked today, and the parent renders nothing at
all (BUG-EF-101), which is why 51 unconfirmed bookings have been invisible.

## Finance is seven routes

`/cashflow` plus `forecast`, `invoices`, `invoices/[id]`, `invoices/new`, `reconciliation`, `tax`,
`transactions`, `transactions/[id]` — for a sole trader.

## Mobile is a second, partial implementation

`/hub/m/clients/[id]` and `/hub/m/clients/[id]/add-workout` duplicate their desktop counterparts as
separate code. Ten mobile routes against fifty-four desktop ones means most jobs simply cannot be done
on a phone — and the ones that can are maintained twice. That is the origin of BUG-EF-107: a note
written on mobile lands somewhere the desktop workout view does not read.

---

## What this means for the redesign

The client-record redesign (CR-EF-136) is necessary but **not sufficient**. It fixes one screen out of
fifty-four. The navigation problem is structural:

1. **Consolidate the four "review" routes** into one queue with filters, or rename them so the words
   distinguish them.
2. **Rename one of the two "templates"** — they cannot both be called that.
3. **Pick one home for blocks** and one for documents.
4. **Collapse the four Outlook queues into one triage screen.** They answer the same question.
5. **Decide what mobile is for.** Either it reaches parity for the jobs done in-session, or it is
   explicitly a session-running tool and everything else is desktop-only. The current halfway position
   is what produces divergent behaviour and duplicated maintenance.
6. **Then** redesign the surfaces that survive.

Doing (6) before (1)–(5) means designing screens that should not exist.

---

## Recommended next artefact

Not another single-page mockup. A **route consolidation proposal**: the 54 desktop routes mapped to a
target set, with each removal justified, and the navigation that follows from it. That is a decision
document, and the design work should follow it rather than lead it.
