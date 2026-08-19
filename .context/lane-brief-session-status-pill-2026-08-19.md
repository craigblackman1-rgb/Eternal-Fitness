# Lane B — SessionStatusPill shared primitive

CR-EF-037 (sessions/blocks redesign, G2 signed by Craig 2026-08-19) and
CR-EF-039 (hub pattern consolidation) both depend on this. Every 17-18 Aug
Open Design mockup (`hub-session.html`, `hub-block-module.html`,
`hub-schedule.html`, `hub-schedule-month.html`, `hub-client-sessions-tab.html`)
already assumes this component exists and renders the same pill everywhere.
Nothing in the live app builds it yet.

## Exact spec (copied verbatim from the mockup, do not improvise)

Source: `D:\apps\design-systems\ef-control-hub\desktop\training\hub-session.html`
lines 139-146 (CSS) and 684-700 (JS reference behaviour).

Five states, exactly these keys and labels — this maps 1:1 onto the
`sessions.status` column added by migration `20260818_session_status_model.sql`
(values: `planned`, `scheduled`, `in_progress`, `completed`, `cancelled` — note
the mockup's JS object key is `inprogress` with no underscore; the DB column
value has an underscore, `in_progress` — map between them, don't rename the DB
column):

| status key      | label         | text color | bg                          | border                        |
|---|---|---|---|---|
| `planned`       | Planned       | `#525A61`  | `rgba(82,90,97,.10)`        | `rgba(82,90,97,.20)`          |
| `scheduled`     | Scheduled     | `#C1839F`  | `rgba(193,131,159,.10)`     | `rgba(193,131,159,.20)`       |
| `in_progress`   | In progress   | `#B08A3E`  | `#F7EFDD`                   | `rgba(176,138,62,.20)`        |
| `completed`     | Completed     | `#087E8B`  | `rgba(8,126,139,.10)`       | `rgba(8,126,139,.20)`         |
| `cancelled`     | Cancelled     | `#8A4E63`  | `rgba(138,78,99,.10)`       | `rgba(138,78,99,.20)`         |

Pill shape: `inline-flex`, `align-items:center`, `gap:5px`, `border-radius:999px`,
`padding:2px 10px`, `font-size:12px`, `font-weight:600`, `border:1px solid`
(the border color above), icon `11px x 11px`.

Icons (inline SVG paths, copy exactly from the mockup — do NOT substitute an
icon from `components/icons/index.tsx`, these are bespoke to this component):

```
planned:    <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" opacity=".5"/></svg>
scheduled:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
in_progress:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
completed:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
cancelled:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
```

## Why this is its own component, not `StatusBadge`

`components/hub/StatusBadge.tsx` + `lib/hubStatus.ts` already exist and cover
5 other status domains (block/schedule/compliance/document/invoice) through a
generic 5-token palette (primary/success/warning/danger/neutral). Session
status is semantically different — it's one closed, fixed 5-value enum with
its own exact mockup-specified colors that don't line up with the generic
tokens (e.g. `scheduled` uses the rose/primary hue, not a generic "primary"
meaning). Read `lib/hubStatus.ts` before starting so the new component doesn't
duplicate patterns it can reuse (the `cn()` helper, the file's general shape),
but do NOT add a 6th entry to `statusClassMap`/`lookupStatus` — build a
sibling, standalone component.

## Build

1. **`components/hub/SessionStatusPill.tsx`** — `export function
   SessionStatusPill({ status }: { status: SessionStatus })`. Define
   `export type SessionStatus = "planned" | "scheduled" | "in_progress" |
   "completed" | "cancelled";` in this file (or `types/index.ts` if that's
   where the project's other DB-enum types live — check first). Renders the
   pill per the spec above. Use Tailwind arbitrary values (`bg-[#F7EFDD]` etc.)
   or inline `style` — match the existing codebase's convention, check a
   couple of other `components/hub/*.tsx` files for which it uses.
2. Both desktop and mobile need this — check whether `app/hub/m/mobile.css`'s
   existing token system (`--card`, `--border`, etc.) should drive it instead
   of hard-coded hex on mobile, or whether the component works unchanged in
   both contexts (Tailwind arbitrary values work anywhere). Use your judgement,
   note the decision in your final report.
3. Do NOT wire this into any existing screen yet (dashboard, session screen,
   schedule, block module) — that's separate follow-up work once
   `sessions.status` is actually read through a real API, not this lane's job.
   This lane is the component only, provable via a throwaway test page or
   Storybook-style route if one exists, otherwise a plain isolated render.

## Verify

- `npx tsc --noEmit` clean.
- Render all 5 states somewhere reachable (a temporary route or a quick
  isolated test is fine) and confirm the 5 colors/icons/labels match the
  table above exactly — this is the Design Parity Gate for this lane, the
  mockup source above IS the mockup, treat it with the same rigor as a
  section-by-section screenshot diff.
- Report back: file path, whether mobile needed its own variant or reused the
  same component, and paste the 5 rendered states' computed colors if you can
  get them (or a screenshot).

## Scope boundary

Only this one component. Do not touch HubRail, HubCard, the accordion, or the
tab component — those are separate lane units for later. Do not wire the pill
into any live screen. Do not touch migrations or API routes.
