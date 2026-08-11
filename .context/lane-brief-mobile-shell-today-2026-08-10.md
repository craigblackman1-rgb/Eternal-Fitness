# OpenCode lane brief — L4-1 mobile shell + Today screen
2026-08-10 · one lane, this worktree, sequential units

**Read this whole file before touching anything.**

## Why this exists

First unit of L4 (`wo-eternalfitness-hub-mobile-session-pwa-2026-08-10`,
`.context/workorder-eternalfitness-hub-mobile-session-pwa-2026-08-10.md`). Craig wants a real,
viewable mobile app as soon as possible — this lane is the fastest path to that: the bottom-tab
shell and a working Today screen against real data. The live session (Train) screen and the
Clients screen are separate follow-on lanes; this lane only needs to **stub** those two routes so
the tab bar doesn't 404, not build them.

The approved mockup is `D:\apps\design-systems\ef-control-hub\hub-m-today.html` — **read it in
full before writing any code.** It is explicitly documented in its own header comment as "the
REFERENCE IMPLEMENTATION of the bottom tab bar" — `hub-m-train.html` and `hub-m-clients.html`
(later lanes) reuse the same tab bar unchanged, so get its markup/classes right here once.

## Where this lives — new route tree, not inside `(protected)`

`app/hub/(protected)/layout.tsx` wraps every child in `HubShell` — the **desktop** sidebar/topbar
chrome. The mobile shell must NOT go through that. Precedent: `app/hub/log/[sessionId]/` already
sits **outside** `(protected)`, specifically so it can render full-bleed with no desktop chrome,
while still being protected by the top-level `middleware.ts` matcher (`"/hub/:path*"` — already
covers any path under `/hub`, no middleware change needed).

Create a new sibling: **`app/hub/m/`** (not inside `(protected)`), with its own `layout.tsx` doing
its own auth check — mirror `app/hub/(protected)/layout.tsx` exactly for the auth part:

```tsx
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
// ... your MobileShell component instead of HubShell

export default async function MobileHubLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/hub/login");
  return <MobileShell>{children}</MobileShell>;
}
```

`MobileShell` renders `{children}` plus the bottom tab bar (see below) fixed at the bottom of the
viewport — it does **not** render a sidebar or topbar of any kind.

## Scope — four things

### 1. Bottom tab bar — the reference implementation

Build it exactly per `hub-m-today.html`'s `.tabbar`/`.tab` markup and CSS (lines ~126-136 and
~202-215 of that file) — three tabs: Today (`/hub/m`), Train (`/hub/m/train` — see stub below),
Clients (`/hub/m/clients` — see stub below). Active-tab styling: label ink (never rose — the
mockup's own comment explains why: rose fails contrast as navigational text on white), icon rose,
a 2.5px rose bar along the top edge. Use Next's `usePathname()` (client component) to determine
which tab is active — don't hardcode it per page.

Use the **mobile token aliases**, not the desktop `--hub-*` set — same convention as
`hub-session-log.html`/the other L3a mockups already in the codebase (`--rose`, `--teal`, `--ink`,
`--card`, `--border`, `--hover`, `--muted`, `--canvas`, `--s-primary-bg`, etc.). Check how the
existing L3a mockup files' tokens map onto this app's real CSS — `app/globals.css` already defines
`--color-rose`, `--color-teal`, etc. (the design system's actual token source); either reuse those
existing custom properties directly or define the mobile aliases as thin `var()` wrappers around
them in a scoped stylesheet for `app/hub/m/` — **do not introduce new raw hex values**, this repo's
standing rule (every colour must trace to an existing token, checked via `git diff | grep -E
'#[0-9a-fA-F]{3,8}'` before you're done — should return nothing).

`env(safe-area-inset-bottom)` padding on the tab bar, 44px+ tap targets throughout, same technical
requirements as every other L3a mockup (`viewport-fit=cover` should already be set at the root
`app/layout.tsx` level — check, don't duplicate if it's already there app-wide).

### 2. Today screen — `app/hub/m/page.tsx`

Server component. Real data, mirroring the exact fetch pattern already used by the **desktop**
studio schedule (`app/hub/(protected)/schedule/page.tsx` — read it in full, this is your template):
three queries (`sessions` → `blocks` → `clients`, stitched in JS because the pg-shim only supports
single-level to-one embeds — same reason the desktop page does it this way, don't try to write a
nested `.select()` that the shim can't do), scoped to `scheduled_at IS NOT NULL AND cancelled_at IS
NULL`, `sessionDurationMinutes` from `lib/scheduling.ts` for each entry's duration.

Differences from the desktop version:
- **Day-scoped, not the whole studio history** — but page/filter by day **client-side** exactly like
  `hub-m-today.html`'s script does (`dayList()`/`shiftDay()`/`toLocalISODate()`) and exactly like
  the existing desktop `ScheduleCalendar.tsx` already does for its own day view (same reasoning
  comment: "Scheduling data is sparse... fetching all scheduled sessions and paging by day
  client-side is cheap"). Fetch once server-side, page client-side. Read `ScheduleCalendar.tsx` in
  full too — its `findConflictIds()` is the exact overlap-detection logic the mockup's
  `conflictIds()` re-implements; **reuse the real one, don't re-derive it** (either import it if
  it's exported, or lift the same logic into a small shared client-side helper — your call, but
  don't diverge from its exact semantics: same-client overlaps don't count as a clash).
- **Tapping a session card goes straight to `/hub/m/train/[sessionId]?...`** (the live session
  screen — a later lane builds the real content, but wire the real link with the real session id
  now), not a read-only detail page. This is the single most important interaction on this screen
  per the mockup's own design note.
- **Tasks due section** — real data from the `tasks` table (see `supabase/migrations/
  20260725_hub_tasks.sql` for the schema: `title, description, status, assignee, due_date`, and
  `supabase/migrations/20260801_hub_tasks_client_link.sql` for the client link). Fetch tasks with
  `due_date <= <the viewed day>` and `status != 'done'` OR done-today (mirror however the existing
  `GET /api/tasks` route or `app/hub/(protected)/tasks/TasksManager.tsx` already scopes "due" —
  read that file for the real semantics rather than guessing from the mockup's toy `due: offset`
  field, which doesn't exist in the real schema). Toggling a task's checkbox should actually PATCH
  it — check `app/api/tasks/[id]/route.ts` for the existing update contract and reuse it exactly
  (don't invent a new endpoint).
- **Medical flag pill** — the mockup shows a `.pill.med` on sessions for clients with a medical
  flag. Check what the desktop already surfaces this from (grep `ClinicalComplianceCard.tsx` /
  `MedicalTracker.tsx` / the client record's own flag field — there's a real signal used elsewhere
  in the hub for "this client has an active medical/compliance concern"; don't invent a new one).
  If finding the real source turns out to be a rabbit hole, it's fine to skip this one pill for
  this lane and report it as a follow-up — don't block the whole screen on it.
- **"In progress" pill** (`.pill.live`) — this needs `sessions.data.session_log.started_at` to be
  set with no `completed_at` yet. That schema field doesn't exist as a **written** value anywhere
  yet (a later lane's Train screen is what sets it) — for this lane, just read for it defensively
  (`session.data?.session_log?.started_at && !session.data?.session_log?.completed_at`) so the pill
  is ready to light up once the Train screen starts writing it. It will simply never show yet, and
  that's correct and expected for this lane.
- **"Logged" pill** (`.pill.logged`) — `session.data?.session_log?.completed_at` is truthy. This
  one DOES have real data already (existing sessions have been completed via the current desktop
  session flow) — wire it for real.
- **Desktop site link** — a visible link back to `/hub` (the desktop dashboard), matching the
  mockup's `.desktop-link`.
- **Empty state** — when the viewed day has zero sessions, match the mockup's `.empty` block
  exactly (icon, "Nothing booked" copy, "Back to today" button).

### 3. Stub routes so the tab bar doesn't 404

`app/hub/m/train/page.tsx` and `app/hub/m/clients/page.tsx` — minimal placeholder pages ("Coming
soon" or similar, using the mobile shell chrome) so tapping those tabs doesn't error. **Do not**
build `app/hub/m/train/[sessionId]/page.tsx` (the actual live session screen) or the clients list —
those are separate lanes with their own briefs. Keep these two stubs to a few lines each.

### 4. Small-screen redirect from desktop `/hub`

Per the WO: "Small screens hitting `/hub` redirect to `/hub/m` with a persistent 'Desktop site'
escape hatch." Implement this as a **client-side** check (a small client component mounted in
`app/hub/(protected)/layout.tsx` or the dashboard page, checking `window.innerWidth` /
`matchMedia`) that redirects to `/hub/m` on first load below some reasonable breakpoint (768px is
this repo's existing convention — check `hooks/use-mobile.tsx`'s `MOBILE_BREAKPOINT` and reuse the
same value, don't invent a different number) **unless** a cookie/localStorage flag says the user
explicitly chose "Desktop site" from the mobile shell. Keep this simple — a `localStorage` flag
(`"ef-desktop-preferred"` or similar) set when the mobile shell's "Desktop site" link is clicked,
checked before redirecting. Don't over-engineer this with a server-side user-agent sniff; a client
check is fine and matches how this app already does responsive behaviour (`use-mobile.tsx`).

## Hard rules (standing, this repo)

1. Work only in this worktree
   (`D:\apps\worktrees\eternal-fitness-website\web-admin-pages-dashboard-5ccf37`,
   branch `claude/mobile-workout-features-6ddaba`). Never the shared checkout.
2. Never run a dev server, `next build`, Playwright, or any browser. Verification is `npx tsc
   --noEmit` and reading your own diff. Live/visual checking is Claude's job after you hand back.
3. Never `npm install` / `pnpm install`. No new dependencies — this is all achievable with what's
   already in `package.json`.
4. **No DB migration.** All the tables this lane reads (`sessions`, `blocks`, `clients`, `tasks`)
   already exist. If you find yourself wanting to add a column, stop — out of scope.
5. No raw hex colours — every colour traces to an existing token in `app/globals.css` or the
   design system.
6. Reuse existing helpers — `sessionDurationMinutes` (`lib/scheduling.ts`), the conflict-detection
   logic from `ScheduleCalendar.tsx`, the existing `GET/PATCH /api/tasks` contract. Don't
   reimplement what already exists correctly elsewhere in this codebase.
7. **Do not touch** `app/hub/(protected)/schedule/*`, `app/hub/log/[sessionId]/*`, or anything
   under `app/hub/(protected)/tasks/` — read them for reference, don't modify them.
8. Do not push to `main`, do not merge, do not push anywhere. Commit to the current branch
   (`claude/mobile-workout-features-6ddaba`) only, in this worktree.
9. If something in this brief turns out to need a real product decision (e.g. the medical-flag
   source genuinely doesn't exist anywhere), stop that specific piece and report it as a blocker —
   ship the rest, don't block the whole lane on one uncertain detail.

## Verification checklist (before considering this lane done)

```bash
npx tsc --noEmit
git diff -U0 | grep '^+' | grep -E '#[0-9a-fA-F]{3,8}\b'   # should be empty — no raw hex
git diff --name-only   # sanity-check nothing outside app/hub/m/, app/hub/(protected)/layout.tsx
                        # (only if you added the redirect there), and possibly hooks/ was touched
```

## Report format

Append to `.context/loop-status.md`, and print the same block at the end of the run:

```
LANE: mobile-shell-today · BRANCH: claude/mobile-workout-features-6ddaba
UNITS DONE: <unit> (<commit sha>), ...
BLOCKERS: <unit> — <what stopped you and what you'd need>
TYPECHECK: clean | <error count>
NOTE: which of the mockup's session-card pills (clash/live/logged/medical) actually got wired to
real data vs. deferred, and why, for each one.
```
