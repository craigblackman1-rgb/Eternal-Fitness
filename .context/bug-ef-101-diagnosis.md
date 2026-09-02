# BUG-EF-101 diagnosis — `/hub/schedule/outlook` "never fetches"

**Verdict: not reproducible on production with a real hub session. The source is correct; the "no API calls" observation was a capture artefact (or a hung-request environment), not a code defect.** Two lanes failed to find a cause because there is none in code.

## What the source says (hypotheses 1–4 eliminated)

Worktree `lane/ef-outlook-queue` == `origin/main` (0 ahead / 0 behind). Read in full: `page.tsx`, `OutlookBookingsQueue.tsx`, `duplicates/*`, `unassigned/*`, `OutlookReconciliationTabs.tsx`, `OutlookBookingsBadge.tsx`, `(protected)/layout.tsx`, `HubShell.tsx`, `MobileRedirect.tsx`, `components/hub/index.ts`, `components/icons/index.tsx`, `middleware.ts`, `next.config.js`, `public/hub/sw.js`.

1. **Render throw / bad import** — no. Every import resolves: `HubCard`, `HubAlert` (`severity` prop is real), `OutlookReconciliationTabs` (barrel line 19), `IconCalendar` (icons:389), `IconSearch` (icons:191), all `Dialog*` exports, `Input`. No conditional hooks. No `error.tsx` exists anywhere under `app/`, so a throw would show Next's "Application error" page, not the SSR shell.
2. **Effect never runs** — no. `OutlookBookingsQueue.tsx:76-79` is `useEffect(() => { load(); }, [showDismissed])` with no guard; `OutlookReconciliationTabs.tsx:15-28` is `useEffect(() => { fetch(...)×3 }, [])`. Identical pattern to `OutlookDuplicatesQueue.tsx:52-55`.
3. **Server/client boundary** — no. `page.tsx` is a server component passing only the string prop `active="bookings"`; both children carry `"use client"`.
4. **Hydration mismatch** — nothing conditional on `window`/time in the SSR path; and a mismatch in React 18 prod re-renders client-side, it doesn't stall.
5. **Stale chunk / service worker** — `public/hub/sw.js` is cache-first for `/_next/static/` but keys by full content-hashed URL and explicitly bypasses `/api/` (line 56). Cache audit on Craig's Chrome: 254 entries, 0 poisoned (every `.js` entry is JS, status 200). Not the cause.

## What production actually does (observed 2026-09-02, Craig's Chrome, real hub session)

Loaded `https://eternal-fitness.co.uk/hub/schedule/outlook` twice, tracking network + console:

- **Exactly 36 requests: 32 static + 4 API** — `/api/outlook-bookings?status=open&count=true`, `/api/outlook-duplicates?status=open&count=true`, `/api/sessions/unassigned-outlook?count=true`, `/api/outlook-bookings?status=open`. All four issued at ~405 ms, completed in 155–206 ms, HTTP 200.
- Page then shows tabs **51 / 3 / 101**, counters **51 / 43 / 8 / 0**, and all 51 rows with client suggestions and Confirm/Dismiss actions. Zero console errors.
- A probe run in the ~400 ms window between `load` and the API responses read exactly the reported state: tabs `–`, counters 0, `Loading…`, and `performance` resource entries containing **no `/api/` URLs** (pending requests aren't listed until they complete). That is the reporter's screenshot, request-for-request (36 = 36).

So the lane brief's evidence ("36 requests, all static, no API calls") is what a network listing looks like *while* the four fetches are in flight. The fetches fire every time.

## Fix brief

**No code change is required to make the page fetch.** Do not "fix" the effect, the boundary, or the SW — there is nothing to fix and a lane that changes them is guessing.

**Required: honest states (the brief's second ask), because a genuinely hung `/api/*` call today spins forever with no feedback.** Minimal, all in the two client files:

`app/hub/(protected)/schedule/outlook/OutlookBookingsQueue.tsx:60-74` — add a timeout so a hung request surfaces:

```ts
// before
const res = await fetch(`/api/outlook-bookings?status=${status}`);
// after
const res = await fetch(`/api/outlook-bookings?status=${status}`, { signal: AbortSignal.timeout(15000) });
```
The existing `catch` (line 69) already sets `error`, and `finally` (line 72) clears `loading`; an abort yields "The operation was aborted" — map it: `setError(e instanceof Error ? (e.name === "TimeoutError" ? "The server took too long to respond — try refreshing." : e.message) : "Failed to load")`. Also add a Retry button next to the banner at line 174: `<Button size="sm" variant="outline" onClick={load}>Try again</Button>`.

`components/hub/OutlookReconciliationTabs.tsx:16-27` — each of the three fetches: pass `{ signal: AbortSignal.timeout(15000) }` and keep the existing `.catch(() => set…(0))` so a timeout shows `0`, not `–` forever. Optional: change the `r.ok ? … : null` branch so non-200 also lands on `0` with a `title="Couldn't load count"` on the pill.

Same two edits mirrored in `duplicates/OutlookDuplicatesQueue.tsx:38-49` and `unassigned/UnassignedOutlookSessions.tsx` for consistency (they share the pattern).

## If Esther still sees it

Then her environment has `/api/*` requests that never complete while static assets do. Three candidates and what settles each:

1. **Request-listing tool ran at `load` event** (most likely; matches the evidence exactly). Settle: re-capture and wait ≥1 s, or read `statusCode: pending` rows.
2. **Pg pool exhaustion** (`lib/pg-client.ts:25`, `max: 10`) during the 15-min Outlook sync — API routes queue on a connection while Next serves static from disk. Settle: Coolify container log at the timestamp for slow `/api/*` + `pg_stat_activity` count on the hub DB.
3. **Sandboxed Browser pane / proxy blocking same-origin fetch** — known from `feedback_browser_auth_bypass_blocked`. Settle: reproduce in real Chrome with the real session (as above — it does not reproduce).

Close BUG-EF-101 as *not reproducible / capture artefact*, keep the honest-timeout change as a small hardening CR.
