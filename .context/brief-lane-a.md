# Lane A brief — Calorie Calculator (public + portal)

You are working in an isolated git worktree on branch `task/calorie-calculator-2026-07-29`, part of
Work Order `eternal-fitness-website/.context/workorder-template-deployment-audit-2026-07-29.md` (read
that file's "Lane A" section for full context — this brief is the condensed version).

## Goal
Port the calorie/TDEE calculator into two real Next.js pages. It currently only exists as a Claude
Artifact — never a repo page. Two mockup reference files are on disk, read them directly for the exact
markup/copy/calculation logic to replicate:
- `D:\apps\design-systems\brand-staging-2662e9\calorie-calculator.html` (public version)
- `D:\apps\design-systems\brand-staging-2662e9\portal-calorie-calculator.html` (portal-wrapped version)

## Build
1. `app/calorie-calculator/page.tsx` (+ a client component for the interactive form) — public route,
   matches `calorie-calculator.html`: weight/height/age/sex inputs + a detailed real-world activity-level
   picker, kg↔stone/lb toggle. Use the exact same BMR/TDEE formula and copy tone as the mockup file.
2. `app/portal/(protected)/calorie-guide/page.tsx` — same calculator wrapped in portal chrome (reuse
   `HubCard`/existing portal layout components from `app/portal/(protected)/page.tsx` for the shell),
   personalised: if the signed-in client already has weight/height on file (check how
   `app/portal/(protected)/page.tsx` fetches client data via `createPortalDataClient`), pre-fill those
   fields; otherwise fall back to manual entry exactly like the public version.
3. Link both: the public one from wherever FAQs/Contact are linked in the marketing nav/footer; the
   portal one from a quick-link on `app/portal/(protected)/page.tsx`.

## Hard rules
- No `git push`. Commit locally on this branch only.
- No `pnpm install` / no new dependencies — `node_modules` is already junctioned from the main checkout.
- No DB migrations, no schema changes.
- `tsc --noEmit` and `next build` must both pass clean before you're done. Run them yourself and fix
  any errors — don't hand back a broken build.
- Match the mockup's actual copy and structure — don't invent new copy or layout not present in the
  two reference HTML files.

## When done
Leave a short summary of what you built and the exact commit hash(es) in
`.context/handoff-lane-a.md` in this worktree.
