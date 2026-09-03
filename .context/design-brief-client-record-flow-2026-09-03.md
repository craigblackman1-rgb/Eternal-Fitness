# Design brief — the client record as a flow

**Source:** Craig, in session 2026-09-03, after walking all six tabs of the live client record
(`/hub/clients/8`, Emma Atkinson) on production.
**Supersedes the open direction on:** CR-EF-136 (client-record IA redesign), CR-EF-142 (hub page
density). Both were raised without a governing constraint. This brief supplies it.

---

## 1. The governing constraint

**Esther has ADHD and finds screens with a lot of information overwhelming.**

This is not a preference to be balanced against other goals. It is the specification. The measure
of any design in this hub is not "does it show the information" — it is **how much Esther has to
hold in her head to get one thing done.**

Everything below follows from that one sentence.

Craig's words: *"even as it is it is information overload as there is a lot of text. and pages are
long. It is hard to find key bits of info, as it is buried."*
*"Simplicity is really the key here."*
*"not buried in 10 clicks to do something."*

## 2. What Esther actually does with a client page

Craig described the real job, and it is a **flow, not a record**:

> load a client → look at what tasks need doing → check training → see if they are due an email
> update, new plan, any docs outstanding → general admin such as new medication, new condition →
> general admin on the account → raise an invoice for a new block

She does not read a client. She **clears** a client. The page must answer one question on load —
*what do I need to do for this person?* — and then let her do each thing without leaving.

## 3. The two named priority areas

**Tasks** — what needs doing for this one client. Not the global task list filtered; the client's
own outstanding work, in the order she would work it.

**Training — one screen.** Craig: *"one screen to allow us to see blocks and sessions, assign
workouts to sessions, move, reassign, view the whole block and workout. Maybe using pop ups, or
the side loading screens."* One click to see what exercises are in the day's workout. One click to
see what workouts are in the block, and those workouts show their exercises.

## 4. Design rules this brief sets

1. **No tabs.** The record currently has 6 tabs, two of which contain a second level of sub-tabs,
   plus 9 collapsed accordions on Profile. Every one of those is state Esther has to remember.
   One screen, one scroll.
2. **The page is a queue first, a record second.** What needs doing is the top of the page, in her
   working order. Reference detail is not on the page at all.
3. **Depth goes sideways, never down.** Detail opens in a drawer over the page — never a
   navigation, never losing your place. This is already the codebase's own pattern
   (`components/ui/sheet.tsx`, `components/ui/drawer.tsx`, and four real drawers:
   `DocumentViewerDrawer`, `ExerciseHistoryDrawer`, `EditBlockDrawer`, `NewInvoiceDrawer`) — it
   gets standardised and extended, not invented.
4. **One click to act, one click to see.** Assign, move, reassign happen inline on the row. Seeing
   a workout's exercises is one click into a drawer.
5. **Nothing on screen that says nothing.** No em-dash as a value, no card that reads "None set
   up", no empty-state hero larger than the content it is standing in for. A missing value is a
   short sentence and one action, or it is absent.
6. **Less text.** Every explanatory paragraph on the current record is a candidate for deletion.

## 5. The frame: CRM

Craig asked whether a more CRM-focused approach is workable. **Yes — and it is the right frame.**
A CRM record page is exactly: identity header · next actions · activity timeline · reference
behind panels. That is the flow in §2 with a name. It also matches the one tab on the current
record that already works — Documents — which is a plain table with honest statuses and inline
actions, and no explanatory prose.

## 6. Licence

Craig: *"If we need to design new tokens and elements into the design system to do this, that's
fine. We can be creative in approach, push boundaries."*

Expected additions, to be specified during design rather than assumed now:
- a **drawer standard** — sizes, stacking, dismissal, what may open one (the four existing drawers
  share no rules)
- an **action row** primitive — used by both the needs-doing queue and the block grid
- **density tokens** — the substance of CR-EF-142
- a **quiet-empty** rule replacing every em-dash and empty-state hero

## 7. Out of scope

Client-facing surfaces. This brief is the trainer hub only. Mobile stays the session-running tool
per the 2026-09-02 route decisions.
