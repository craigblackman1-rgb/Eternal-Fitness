# Lane D brief — FAQs update (build only, hold for review, do NOT publish)

You are working in an isolated git worktree on branch `task/faqs-update-2026-07-29`, part of
Work Order `eternal-fitness-website/.context/workorder-template-deployment-audit-2026-07-29.md` (read
that file's "Lane D" section for full context — this brief is the condensed version).

## Goal
The FAQs page (`app/faqs/FAQsPageClient.tsx`) was already reconciled against the mockup once
(Lane E of `workorder-design-reconciliation-2026-07-28.md`, closed). Craig wants a fresh check in case
the mockup has moved since, and any real differences applied — but the result must NOT be published
live; it's held for Esther/Craig to review.

## Mockup reference (read directly — same disk)
`D:\apps\design-systems\brand-staging-2662e9\faqs.html`

## What to do
1. Diff `app/faqs/FAQsPageClient.tsx` (and `components/FAQSection.tsx` if it renders shared structure)
   against the current `faqs.html` section by section — layout, hero, accordion behaviour, the
   "Still not sure?" contact-prompt band, CTA band.
2. Apply any real structural/design differences found. Do NOT rewrite the FAQ question/answer body copy
   itself beyond what the mockup's own text specifies — a separate, larger content rewrite of all 21
   FAQ answers is a different, out-of-scope project tracked in `.context/state.md`.
3. If you find nothing has changed since the 2026-07-28 pass, say so plainly in the handoff note —
   don't invent changes to justify the lane.

## Hard rules
- No `git push` — this branch must NOT be pushed or merged to `main`. Commit locally only.
- No `pnpm install` / no new dependencies.
- No DB changes.
- `tsc --noEmit` and `next build` must both pass clean before you're done.

## When done
Write a clear summary in `.context/handoff-lane-d.md` in this worktree: what (if anything) changed,
why, and the exact commit hash(es) — this is what Craig/Esther will read to decide whether to approve
publishing it.
