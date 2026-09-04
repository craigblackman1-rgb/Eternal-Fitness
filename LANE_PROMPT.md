# Build S0a — client-record page shell (CR-EF-136)

Rebuild `app/hub/(protected)/clients/[id]/page.tsx` (Emma Atkinson's page = `/hub/clients/8`)
to match the mockup at `D:\apps\design-systems\ef-control-hub\v3\reference-client-record.html`
— read that file first, in full. It is the spec. Read its huge inline comments too; they
explain *why* each section is shaped the way it is (density constraint, drawer standard,
block map rationale) and you should follow that reasoning, not just copy pixels.

This is a REPLACEMENT of the current six-tab layout (Overview/Profile/Compliance/Documents/
Training/Comms/Plan Agent via `ClientDetailTabs`) with a single-screen, no-tabs layout:
one page, a "Needs You" queue section, a "Training" section, and reference content pushed
into side drawers (drawers are S0b, a follow-up unit — for THIS unit, drawer buttons in the
`.ref` strip can open **empty placeholder drawers with a "Coming soon" body**, wired with the
same open/close/focus mechanics as the mockup's `<script>`, so S0b can fill them in without
touching the shell again). Do NOT delete `ClientDetailTabs`, `ContextStrip`, `TrainingTabContent`,
`CommsTabContent`, `PlanAgentTab`, or any tab content components — they still back the S0b
drawers and other routes; you are changing what `page.tsx` composes, not deleting the library.

## Scope for this unit

Build, in `page.tsx` plus new components alongside it (follow the existing pattern: small
per-concern client/server components like `ContextStrip.tsx`, `TrainingTabContent.tsx`):

1. **Header** — name, client number, a single status badge, ONE subline sentence combining
   format/days/time/duration/client-since (mockup `.hdr`). Replace the `HubQuickActions` bar
   + `ContextStrip` 6-field row with this. Edit Client + Book/New Session actions stay.
2. **Drawer strip** (`.ref`) — five buttons: Profile, Health, Arrangement, Documents, Comms.
   Each shows a count badge only when something inside needs attention (mirror the mockup's
   `.ref-n` logic — e.g. Health count = number of unresolved health flags, Arrangement count =
   number of arrangement issues you can derive from data already fetched in `page.tsx`
   (rate/package mismatches, unpaid, missing band set), Documents/Comms/Profile counts only if
   you have a real signal for them; otherwise no badge — never fabricate a number). For this
   unit the five drawers can be stub `<aside class="dw">`-equivalent panels (a real React
   component using the project's existing `components/ui/sheet.tsx` or `ui/drawer.tsx`
   primitive — check both and use whichever the codebase already leans on for a right-edge
   panel) with just a heading and "Full content ships in S0b" placeholder text — but the
   open/close/focus-management/one-level-deep-stack behavior must be real and correct, because
   S0b will build directly on top of it.
3. **"Needs You" section** — a single ordered queue. This is the highest-value, most novel
   part of the design and it MUST be driven by real data already available in `page.tsx`'s
   fetches (blocks, sessions, client, clientDocuments, taskRows, etc.) — never hardcoded to
   Emma's mockup numbers. Work out, from the actual schema, which of the mockup's queue items
   you can derive for real (e.g. "N open tasks", "block is still a draft", "session has no
   workout assigned", "block session count doesn't match sessions_used", "unpaid block/invoice
   missing") and only render an item when the underlying condition is genuinely true for the
   client being viewed. If a mockup item (e.g. "29 Outlook bookings waiting to be sorted") has
   no real backing data source in this codebase, either find the real source (grep for how
   Outlook triage / booking counts are computed elsewhere, e.g. `app/hub/(protected)/schedule`
   or an outlook-related lib) or leave it out — do not invent a number. Cite this file's
   existing gotcha in eternal-fitness-website's CLAUDE.md: "OpenCode dispatched diffs must be
   hand-reviewed — never trusted on self-report" and its four cited fabrication patterns. Any
   fabricated content in this queue will be rejected on review.
4. **Training section** — the "duo" (Next session panel + Is-it-working/progress panel side by
   side), the block band + block map (`.map`/`.mcell` grid, one cell per session, done/next/gap/
   undated states — derive `gap` vs `done` vs `next` vs `undated` from each session's
   `scheduled_at` and completion state, exactly as the mockup's key describes), and the
   "So far" history rows (past blocks + the Trainerize pre-app import row, reusing
   `trainerizeHistory` already computed in `page.tsx`). Clicking a map cell / duo panel button
   can open the workout drawer as a stub for now (full content is S0b) — again, real open/close
   mechanics, placeholder body.
5. Keep the right-rail `Status`/`Active Block`/`Resources` cards OUT of this new layout —
   the mockup has no right rail; that context is now inside Arrangement/Profile drawers or the
   header. Confirm nothing that rail exposed is silently lost — if a fact on it has no home in
   the new page/drawers yet, leave a `// TODO(S0b):` comment noting where it should land.

## Ground rules

- Real data only. Every count, date, and status must trace to a query already in `page.tsx`
  or one you add — never copy the mockup's Emma-specific numbers (29 Outlook bookings, 4
  personal bests, etc.) as literals.
- This route is `app/hub/(protected)/clients/[id]/page.tsx` — protected by the hub's Better
  Auth middleware already; don't add auth logic.
- Follow the density/design tokens in the mockup's `<style>` (rose/teal/amber/ink accent
  system, `.arow`/`.sec`/`.band`/`.map` shapes) but implement them as Tailwind + this repo's
  existing CSS variables (`app/globals.css`, `--status-success-text` etc. — the mockup's own
  comments explain it re-uses those exact tokens, don't mint new ones) — not by copy-pasting
  the mockup's raw `<style>` block. Check `components/hub/` for anything reusable (`HubCard`,
  `StatusBadge`, etc.) before inventing new primitives.
- `next.config.js` has `typescript.ignoreBuildErrors: true` / `eslint.ignoreDuringBuilds: true`,
  but still write correct TypeScript — run `npx tsc --noEmit` yourself before finishing and fix
  real errors in files you touched.
- Do not touch other routes, other clients' pages, or unrelated files.
- Commit your work on this branch (`lane/ef-client-record-s0a`) when done — don't leave
  uncommitted changes. Do not push or open a PR; the orchestrating session will review, verify
  in a browser, and merge.

## When done

Leave a short summary of what you built, which "Needs You" items you could wire to real data
vs. omitted for lack of a source, and what you left as `TODO(S0b)` for the drawer-content unit.
