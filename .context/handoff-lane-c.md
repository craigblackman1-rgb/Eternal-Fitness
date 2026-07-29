# Lane C handoff — Portal pages built 2026-07-29

## What was built

5 new portal pages + 1 dashboard update, all in `app/portal/(protected)/`:

| Route | File | Description |
|---|---|---|
| `/portal/account` | `account/page.tsx` | Read-only account settings: display preferences (text size, contrast, motion), document delivery preferences, personal details (name/email/phone/address/emergency contact/GP), contact preferences, data access buttons |
| `/portal/documents` | `documents/page.tsx` + `DocumentsFilterClient.tsx` | Dedicated documents page with signed + outstanding lists, filter chips (All/Needs you/Shared with you/Signed), text search, per-document action links |
| `/portal/documents/[id]` | `documents/[id]/page.tsx` | Read-only document viewer for signed docs. Shows document body sections, consent groups, feedback sections, signed status block. Has print/download action bar |
| `/portal/documents/[id]/edit` | `documents/[id]/edit/page.tsx` + `DocumentEditorClient.tsx` | Editable questionnaire form (for documents with `feedbackSections`). Multi-section navigation sidebar, progress bar, autosave to sign endpoint, validation |
| `/portal/documents/[id]/sign` | `documents/[id]/sign/page.tsx` + `DocumentSignClientWrapper.tsx` | Portal-wrapped 3-step signing flow (Check → Sign → Confirm). Same API endpoint as the standalone magic-link route |
| Dashboard update | `(protected)/page.tsx` | Replaced full signed/outstanding lists with 2 summary cards ("Signed" / "Needs you") linking through to `/portal/documents`. Kept progress + updates sections |

## Sign logic reuse

**Both signing paths hit the same `POST /api/documents/[id]/sign` endpoint** (the portal-wrapped `DocumentSignClientWrapper.tsx` and the existing standalone `DocumentSignClient.tsx`). The endpoint handles the status transition (`isFullySigned()` → `status = "signed"`) identically for both callers. The standalone magic-link route at `app/documents/[id]/sign/page.tsx` is untouched.

## Edit logic

The portal edit page (`document/[id]/edit`) handles documents with `feedbackSections` in their body. It does NOT reuse `ParqEditClient` directly — that component operates on the `signed_parq` table via `/api/parq`, while this page works with `client_documents` via `/api/documents/[id]/sign`. The autosave posts `feedback_responses` to the same sign endpoint so partial answers are persisted without signing.

## Build verification

- `tsc --noEmit`: clean
- `next build`: compiled successfully, all 5 new routes present in output

## Files changed

```
new:   app/portal/(protected)/account/page.tsx
new:   app/portal/(protected)/documents/DocumentsFilterClient.tsx
new:   app/portal/(protected)/documents/page.tsx
new:   app/portal/(protected)/documents/[id]/page.tsx
new:   app/portal/(protected)/documents/[id]/edit/page.tsx
new:   app/portal/(protected)/documents/[id]/edit/DocumentEditorClient.tsx
new:   app/portal/(protected)/documents/[id]/sign/page.tsx
new:   app/portal/(protected)/documents/[id]/sign/DocumentSignClientWrapper.tsx
mod:   app/portal/(protected)/page.tsx
```
