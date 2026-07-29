# Lane C brief — Portal: Account, Documents, Document viewer/edit, Document sign (portal-wrapped)

You are working in an isolated git worktree on branch `task/portal-pages-2026-07-29`, part of
Work Order `eternal-fitness-website/.context/workorder-template-deployment-audit-2026-07-29.md` (read
that file's "Lane C" section for full context and the resolved GATE decisions — this brief is the
condensed version, both GATEs are already resolved by Craig, do not re-ask).

## Mockup references (read directly — same disk)
- `D:\apps\design-systems\brand-staging-2662e9\portal-account.html`
- `D:\apps\design-systems\brand-staging-2662e9\portal-documents.html`
- `D:\apps\design-systems\brand-staging-2662e9\portal-document-view.html`
- `D:\apps\design-systems\brand-staging-2662e9\portal-document-edit.html`
- `D:\apps\design-systems\brand-staging-2662e9\portal-document-sign.html`

## Existing code to study before building
- `app/portal/(protected)/page.tsx` — portal dashboard, shows how `getPortalSessionFromCookies()` +
  `createPortalDataClient(session.clientId)` work, and the existing document-fetch methods
  (`getSignedDocuments()`, `getOutstandingDocuments()`).
- `app/documents/[id]/sign/page.tsx` — the EXISTING standalone magic-link sign flow. Keep this working
  exactly as-is, unchanged — do not remove or gate it. Find its submit/sign action logic; you'll reuse it.
- `app/parq/edit/[id]/page.tsx` — existing public document-edit pattern (PAR-Q), reference for the new
  portal-wrapped document edit page.
- `components/hub/*` — reusable card/layout primitives already used across the portal.

## Build (all four are approved, no GATEs remaining)
1. `app/portal/(protected)/account/page.tsx` per `portal-account.html` — client's own profile fields.
2. `app/portal/(protected)/documents/page.tsx` per `portal-documents.html` — Documents gets its OWN
   dedicated page (Craig's explicit call, 2026-07-29 — do not fold it back into the dashboard). Move the
   full signed/outstanding lists here from the dashboard. On `app/portal/(protected)/page.tsx`, replace
   the full lists with a short summary card that links through to `/portal/documents` — don't duplicate
   the full lists on both pages.
3. `app/portal/(protected)/documents/[id]/page.tsx` per `portal-document-view.html` — read-only viewer
   for an already-signed document. Reuse the same document-fetch pattern as `app/documents/[id]/sign/page.tsx`.
4. `app/portal/(protected)/documents/[id]/edit/page.tsx` per `portal-document-edit.html` — client-editable
   documents (e.g. PAR-Q), wrapped in portal chrome. Check if `app/parq/edit/[id]/page.tsx`'s logic can be
   reused/shared rather than duplicated.
5. `app/portal/(protected)/documents/[id]/sign/page.tsx` per `portal-document-sign.html` — a SECOND way
   to sign, for a client already logged into the portal. Craig's explicit call, 2026-07-29: BOTH signing
   paths must work — the existing no-login magic-link route stays untouched, this is an addition, not a
   replacement. Both routes must call the same underlying sign action so a document's signed state is
   consistent no matter which path was used — find and reuse that shared logic, don't duplicate it.

## Hard rules
- No `git push`. Commit locally on this branch only.
- No `pnpm install` / no new dependencies.
- No DB migrations, no schema changes — read-only against existing tables/columns.
- Do NOT touch anything that would make the portal auth surface "live" for a real client (no inviting
  test clients, no changing magic-link generation/email-send behaviour) — this lane only adds pages that
  render for an already-authenticated portal session.
- `tsc --noEmit` and `next build` must both pass clean before you're done — run them yourself and fix
  any errors.
- Match each mockup's actual copy/structure — don't invent content not present in the reference files.

## When done
Leave a short summary of what you built, which existing sign logic you reused, and the exact commit
hash(es) in `.context/handoff-lane-c.md` in this worktree.
