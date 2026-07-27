# Handoff

## Session close — 2026-07-27 — hub design-alignment Work Order complete, all 8 lanes deployed

Continuation of the prior session's Lane H work — Craig said "opencode to do the work" for the
remaining 7 lanes of `.context/workorder-hub-design-alignment-session-editor-2026-07-26.md`.

**First fixed a process problem from the prior session**: Lane H had been built and committed
directly in the shared checkout (breaking DO-SOP-010). Moved that diff into a proper isolated
worktree branched fresh off `origin/main`, re-verified `tsc --noEmit` clean there, pushed (`d105e29`),
removed the worktree. Also fixed the disk-fill risk flagged going into this session (a prior
`decoded-data-app` Work Order filled a drive to 0 bytes from ~24 uncleaned worktrees each with a full
`npm install`) — every worktree here reused the shared checkout's `node_modules` via a Windows
junction instead of installing fresh, capped at 4 concurrent worktrees, junction + worktree removed
immediately after each lane merged.

**Lanes A–D dispatched to OpenCode (`opencode-go/deepseek-v4-pro`) first, one worktree each.** All 4
came back `tsc`-clean and looking plausible on a skim — but a closer hand-review (diffing every
changed file against `origin/main`, not just trusting the self-report) turned up 4 real defects that
would have shipped silently:
- **Lane C (PAR-Q edit):** the mockup's placeholder client name "Joan" was copied verbatim into 3
  lines of live copy instead of using the real `client.name` already in scope — every client's PAR-Q
  edit page would have shown "Joan" regardless of who was actually being edited.
- **Lane C (PAR-Q edit), separately:** a wholesale new "Section 7 — Medical Clearance Record" block
  had been added that doesn't exist in the live app today, copied straight from the mockup's demo
  content — including a fabricated clinical claim ("Joan has YES answers in Sections 2, 3 and 4 —
  assess whether GP clearance is required") with no real form data behind it. Would have shown
  identical, inaccurate clinical-sounding text for every client. Removed rather than wired up — out
  of scope for a presentation-only pass and a real accuracy risk on a health-screening document.
- **Lane B (client detail, Plan Agent tab):** a static "Connected" badge got added with no real
  connectivity check behind it — would keep claiming "Connected" even while the tab's own existing
  `error` state is showing a real API failure banner right below it. Removed.
- **Lane D (exercise library):** the live "{filtered.length} match · page X of Y" search/pagination
  feedback text got deleted and replaced with a static condition-roll-call string lifted from the
  mockup's demo copy ("adapted for cancer rehab, cardiac, long COVID and fibromyalgia") — a real
  functional regression (search feedback lost) that also brushes against this project's "no condition
  roll-calls in copy" hard rule. Restored the original dynamic text.

All 4 fixed directly, re-verified `tsc --noEmit` clean, committed as separate "review fix" commits,
then each lane rebased onto the previous lane's push and fast-forward pushed to `main` in sequence
(A→B→C→D), resolving trivial append-only conflicts in `.context/loop-status.md` along the way.

**Lanes E–G dispatched next with the same 4 failure patterns spelled out explicitly in the OpenCode
brief** ("never copy a mockup's demo data as a literal string — always bind to the real variable in
scope, or omit it if there's no real source; never add a status badge with no real state driving it").
Came back clean — hand-review found nothing to fix. One check worth noting: Lane F added a
`BUCKET_STATUS_MAP` mapping to CSS color tokens (`--status-danger`, `--status-primary`, etc.) —
verified all 5 actually exist in `globals.css` with matching names before trusting the diff, rather
than assuming.

**Deploy:** pushing all 8 lanes in quick succession triggered several auto-webhook Coolify deploys
firing close together (auto-deploy is ON for this app). Two failed — not on code, confirmed by reading
the raw build logs: one hit a container-name collision from two deploys overlapping, the other had
its build container's exec channel die *after* the code had already compiled successfully and
generated all 73 static pages (the same transient class of infra failure logged in the 2026-07-25
handoff for this app). The deploy of the final commit (`5c92510`, all 8 lanes) succeeded cleanly and
is confirmed `running:healthy` on `staging.eternal-fitness.co.uk` via Coolify MCP — not self-reported.

**Not done:** no live, logged-in click-test of any of the 8 lanes — this environment has no hub
credentials, same standing limitation noted throughout this file for prior sessions. That's the first
thing Craig should do next session, working through the per-lane list above.

## Session close — 2026-07-26 — session/workout editor built (Lane H of the hub design-alignment Work Order)

Craig wanted workouts/sessions to be editable in the hub, with drag-and-drop to reorder exercises.
Scoped via clarifying questions first (desk-based planning tool, not a live in-studio tool; full scope
— reorder, add/remove, inline sets/reps/tempo/rest, section moves; edits scoped to one session only,
no propagation) and written up as a functionality brief for OpenDesign
(`.context/brief-session-editor-opendesign.md`). Craig ran that through OpenDesign and dropped the
resulting mockup at `D:\apps\design-systems\brand-staging-2662e9\hub-session-editor.html`; a broader
Work Order also appeared there covering it as Lane H of an 8-lane hub design-alignment pass
(`.context/workorder-hub-design-alignment-session-editor-2026-07-26.md`, registered in
`infrastructure/.context/active-workorders.md` but not yet formally claimed).

**Built Lane H only** (the other 7 lanes — presentation-only diffs of existing hub routes against their
mockups — not started this session):
- New `SessionEditor.tsx` (`app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/`)
  and `add-exercise-dialog.tsx` (sibling of the existing `swap-exercise-dialog.tsx`, same
  `/api/exercises` search pattern).
- `page.tsx` wired with an "Edit session" toggle; the inactive Studio/Home tab locks while editing;
  Save merges only the edited version back into `session.data.versions` via the existing
  `PATCH /api/sessions/[id]` route (no new API, no migration — confirmed the real `types.ts` shape
  first, matches the Work Order's assumption that this is additive-in-place to the JSONB blob).
- Functionality: drag-and-drop reorder (whole exercises or whole supersets as one draggable unit) +
  up/down arrow fallback, move-between-sections via a "⋯" menu, add/remove exercise, inline
  sets/reps/tempo/rest editing, superset (`group_label`) resolves cleanly with a toast when broken by
  a move/remove, existing Swap-exercise and video-URL controls carried over onto local edit state so
  Discard actually discards them too.

**Verification:** `tsc --noEmit` clean, ESLint clean on all new/touched code (4 pre-existing `any`
lint errors in untouched code, not introduced here), `next build`'s actual compile step reports
"✓ Compiled successfully" — the build then fails at the `output: standalone` file-tracing stage on
Windows `EPERM` symlink errors, a pre-existing environmental limitation unrelated to this change (not
a code issue). **Not live-click-tested** — no hub login credentials available in this environment,
the same standing limitation noted throughout this file for prior sessions; the dev server points at
the real production DB via the Coolify SSH tunnel, so nobody has ever been able to browser-test this
hub locally without Craig's own session.

**Process note, flag for Craig:** this was built directly in the shared checkout
(`D:\apps\eternal-fitness-website`), not an isolated `git worktree`, breaking DO-SOP-010's standing
rule. Craig explicitly confirmed push after being told about the deviation — committed and pushed
straight from the shared checkout (`d105e29` on `origin/main`) rather than moved into a worktree first,
a deliberate one-off exception, not a new default. Flagging in full rather than silently proceeding,
since it's the kind of thing that matters if two sessions ever touch this repo at the same time.
**Deploy not independently confirmed this session** — no Coolify MCP access available; prior sessions
record auto-deploy as ON for this app, but that should be re-checked before assuming this is live.

**Caught on close-out, fixed same session:** re-reading the Work Order's own MUST list against what
was actually built surfaced a real gap — "Remove exercise" removed immediately with no confirmation,
against the WO's explicit "confirm-before-remove" requirement. Added an `AlertDialog` around it,
matching the existing `delete-block-button.tsx` pattern already used elsewhere in the hub. `tsc`/lint
re-verified clean after.

**Not done:** the other 7 presentation-alignment lanes of the Work Order are untouched; no live
click-test.

## Session close — 2026-07-25 (later) — block schedule/review link fixed; docs/Work Order cleaned up

Craig reported he couldn't find the "Review" button on an already-approved training block, after the
prior session's handoff pointed him at the per-block scheduler (`BlockScheduler.tsx`, built in Lane D
of `workorder-session-logging-2026-07-25.md`).

**Root cause, two real bugs, not one:** the block page's link to `/hub/clients/[id]/blocks/[blockId]/
review` only rendered when `block.status === "draft"` — once Esther approves a block, the link
vanishes even though the scheduler still lives at that URL and still works. Separately, the review
page's "Approve Block" button had no draft guard either, so clicking it on an already-approved block
would have hit the `/api/blocks/[id]/approve` route's existing `400 "Block is already X"` rejection —
a guaranteed-fail trap nobody had hit yet because nobody could reach the button post-approval anyway.

**Fixed (`77f5861`):** block page now always links through to `/review` — "Review & Approve" pre-
approval, "Schedule" post-approval. Review page hides the Approve button once `status !== "draft"` and
shows the block's real status via `StatusBadge` next to the (now conditional) title. Built in an
isolated worktree (`D:\apps\worktrees\eternal-fitness-website-fix-schedule-link`, branch
`fix/block-schedule-link`, off fresh `origin/main`) per DO-SOP-010, `tsc --noEmit` clean via a
temporary node_modules junction (removed after, `tsconfig.tsbuildinfo` churn reverted before commit).
Fast-forward pushed straight to `main`.

**Deploy hit a real transient infra failure on the first attempt** — Coolify's build container lost
its SSH exec channel mid-`next build` (`exit code 255` right after "Compiled with warnings", no actual
compiler/type error in the log) and the deployment was auto-removed. Diagnosed via the full raw JSON
log (the plain-text log view truncates before the real failure line — worth remembering for next time
a deploy fails with no visible cause) rather than assumed a code problem, since the diff only touched
two presentational files using an already-imported shared component. Retriggered via the Coolify MCP;
it built and deployed clean second time (~3.5 min), landing as part of `f25b98c` after an unrelated
same-day commit (a hub sign-up-endpoint security fix, not this session's work) fast-forwarded on top.
Confirmed `77f5861` is an ancestor of the deployed commit and the app is `running:healthy`.

**Not click-tested live** — needs Craig to open an approved block and confirm the "Schedule" button
now appears and works.

**Docs/Work Order cleanup, same session:** `workorder-session-logging-2026-07-25.md`'s OWNER line was
stale (read as still "ACTIVE" when Lanes A–D were in fact all done) — updated to reflect only the
genuine Craig-decision GATE items remain open, plus logged this fix under Lane D. This file's own
`state.md` "Active Work Order" line was also stale, still pointing only at the 2026-07-20 hub-
consolidation Work Order (closed that day) with no mention of the newer session-logging one — fixed to
list both with accurate current status.

---

## Session close — 2026-07-25 — hub to-do task list built and shipped (3 lanes, same day)

Craig asked for a to-do list in the hub so Esther can set tasks and assign them to a person. Scoped up
front with him: assignee is a fixed Esther Fair/Craig Blackman picker (no new staff table), buckets are
status columns (kanban), lives as a new top-level `/hub/tasks` page. Built and shipped in three
same-day increments as Craig asked for more each time — each one built in its own isolated worktree
(DO-SOP-010), independently verified (hand-read every changed file against existing conventions,
`tsc --noEmit` + full `next build` via a temporary node_modules junction to the main checkout, junction
+ build output removed after each), migrated against prod Postgres, fast-forward pushed, and confirmed
`running:healthy` on Coolify before moving to the next lane.

1. **Base list** (`51e6a38`, built by OpenCode/deepseek-v4-pro) — new `tasks` table; 3-column kanban
   (To Do/In Progress/Done) at `app/hub/(protected)/tasks/`; `app/api/tasks/route.ts` +
   `[id]/route.ts`; new sidebar entry. Left/right arrow buttons move a task between status columns (no
   drag-and-drop library in this codebase, didn't add one).
2. **Buckets** (`9542840`, OpenCode) — new `task_buckets` table + `tasks.bucket_id` (nullable FK, `ON
   DELETE SET NULL`). Free-form, staff-creatable groupings (Website/Content/Admin/etc.) added inline
   from the task form (a "+ Add new bucket…" option that POSTs and auto-selects); a filter-pill bar
   with live per-bucket counts sits above the kanban; each card shows a bucket tag next to its assignee
   tag. Deliberately did not add bucket-delete UI this pass — Craig only asked for creation/grouping.
3. **My Tasks default filter** (`a3e861e`, built directly by Claude Code — small, well-understood
   diff, skipped the OpenCode round-trip) — no DB change. Reads the signed-in Better Auth user's
   `name` against the existing `assignee` string field and defaults the board to "My Tasks" whenever
   they match, with a one-click "All Tasks" toggle. Bucket-pill counts now respect whichever scope is
   active. **Real gap found while building this**: queried the live `user` table directly — only
   Esther Fair has a hub account at all, no Craig Blackman row exists, so this only activates for her
   session until/unless he gets one too. Flagged to Craig, not silently worked around.

**Not done / needs Craig:** no live authenticated click-test of any of this — the page correctly
redirects to `/hub/login` with no session available from this side, and credentials are never entered
into any login form, hub or otherwise. Worth a real click-through next time Craig's in the hub. Also
worth deciding whether Craig wants his own hub account created if "My Tasks" should ever apply to him.

All three worktrees + branches removed after merge (one had a Windows long-path node_modules-copy
artifact from a `next build` standalone-tracing quirk — cleared via a robocopy-mirror-empty-dir trick,
noted here in case it recurs on a future build-verification pass in this repo).

---

## Session close — 2026-07-24 — consent choices surfaced in hub admin portal

Craig reported: "Unsigned consent forms. We can't see what people have consented to in the admin
portal." Investigated first rather than assuming new backend work was needed — it wasn't.

**Root cause:** `client_documents.consent_choices` (JSONB) is already written correctly on sign
(`app/api/documents/[id]/sign/route.ts`) — no schema/migration work required. The gap was entirely on
the read side: two Supabase selects omitted the column, and the document detail page never rendered
it even when present.

**Fixed, committed (`edaa0c4`), pushed straight to `main`:**
- `app/hub/(protected)/clients/[id]/documents/[docId]/DocumentDetailClient.tsx` — signed consent
  documents now show a "Consent choices" card, one line per option (✓/✗) against the template's
  `body.consentGroups`, cross-referenced with `doc.consent_choices`.
- `app/hub/(protected)/clients/[id]/page.tsx` — added `consent_choices` to the document-register
  select (was previously dropped before it reached the UI).
- `components/hub/DocumentRegister.tsx` — each document row now shows an at-a-glance "N/M consents"
  pill.

**Caveat worth remembering:** a consent checkbox the client never touched has no key in
`consent_choices` at all (not a stored `false`) — so the register pill and the detail-page ✗ both
read "not granted" for both "actively declined" and "never interacted with." That's a lower bound,
not proof of an explicit decline. If Esther ever needs to distinguish those two cases, that's new
work, not something already captured.

**Process note:** worked in an isolated git worktree (`fix/hub-consent-choices`, off fresh
`origin/main`) per DO-SOP-010, fast-forward pushed, worktree/branch cleaned up afterward. Could not
run a full `tsc`/build check — the worktree has no `node_modules` and `npm install` is a gated action
this session didn't have standing authorization for; relied on careful manual review instead (existing
types — `ConsentGroup`, `ClientDocument.consent_choices` — already covered every value used, no new
imports needed). **Worth a real `tsc`/build run and a live click-through on staging next session**
before treating this as fully verified, since it was never checked in a browser.

---

## Session close — 2026-07-22 (later) — Lane K shipped, Lane J parked, session closed out

Following on from Lane I (below): Craig approved building Lane K (portal auth rework) fully, then
gave the explicit go-ahead to ship it, and asked to leave Lane J (conversion tool) as scoped-only.

**Lane K — built, verified, shipped.** Built in an isolated worktree
(`task/lane-k-portal-auth-password`). First OpenCode dispatch crashed mid-build (server error, exit 1)
after writing the migration + `lib/portal-auth.ts` — both reviewed and correct, no work lost. A second
dispatch also hit a transient server error before writing anything (safe retry). Third dispatch
completed the rest cleanly: new `/api/portal/auth/{login,logout}` routes, `request-link`/`verify`
repurposed for password-reset request/submit, staff-gated `/api/clients/[id]/portal-invite`, new
`/portal/forgot-password`/`/portal/reset-password` pages, login page rewritten as email+password,
middleware updated to allow the two public reset-flow paths, and an "Invite to portal" button on the
client detail Profile tab. One real bug hit and fixed during the build: `useSearchParams()` needed a
`Suspense` boundary on both new/changed portal pages or the static export failed. Independently
re-verified (not self-report) before shipping: full `git diff` review of all 13 files, grepped for any
leftover reference to the removed magic-link functions (zero hits), confirmed the existing logout form
action is now backed by a real route. `tsc`/build clean.

**Confirmed while building, not previously known**: no `portal_*` tables existed on production at
all — the original 2026-07-20 magic-link migration was written but genuinely never run. The portal
login had never worked against real data; Craig's "no email" report wasn't the SMTP dry-run issue or
anti-enumeration, it was a missing-table failure. Clean slate, no legacy accounts to migrate.

**Shipped**: rebased onto latest `origin/main`, fast-forward pushed (`d7bbfe9`), migration run against
prod (verified: `portal_accounts`/`portal_sessions`/`portal_reset_tokens` all exist, `password_hash`
column confirmed), Coolify deployment `za7fpkka74fo1ovdi2i8vhge` confirmed `finished`/healthy on first
healthcheck attempt via Coolify MCP. Worktree cleaned up (force-removed — only a build-artifact diff
remained — and branch deleted after confirming it was merged).

**Not done**: no real client has been invited to the portal yet (that's still its own `[GATE]`), and
the invite → email → login → reset flow hasn't been click-tested in a real logged-in browser session —
worth doing before telling Esther it's ready to use.

**Lane J** — left exactly as scoped in the prior entry below (recommendation: Option B, field
extraction via vision-LLM, not OCR). Not built. Craig's explicit instruction: leave it parked, don't
raise it again unless he does.

Work Order, `state.md`, `loop-status.md` all updated to reflect Lane I/K both fully shipped and Lane J
deliberately parked.

---

## Session close — 2026-07-22 — Work Order extended: paper document storage, conversion-tool scoping, portal auth rework

Craig had a paper Personal Training Agreement for Sarah (scanned PDF, no extractable text) he wants
stored against her hub record, plus a longer-term ask to convert paper documents into something the
plan-generation agent can use. Separately, he tried the portal login and got no email, and clarified
he wants a fundamentally different auth model: no self-serve request/signup surface — Esther adding a
client should auto-generate and email a login, with self-service limited to a password reset.

**No code changed this session** — planning/scoping only, folded as three new lanes onto the existing
`.context/workorder-eternal-fitness-hub-consolidation-2026-07-20.md` (Craig's explicit instruction: one
Work Order, not scattered notes):

- **Lane I — Scanned/paper document storage.** Confirmed there is no file-upload/attachment capability
  anywhere in the hub today — `client_documents` only stores structured JSONB `body`, not raw files.
  Plan: add `source_type`/`source_file_url` columns, store the PDF on a Coolify persistent volume
  served only through an authenticated hub API route, add a plain "Upload existing document" action.
  Sarah's PDF is the first real case. All units `[AUTO]` to build, prod writes `[GATE]`.
- **Lane J — Paper→digital conversion tool.** Scoping only. Two genuinely different outputs Craig could
  want: OCR the scan into the document engine's HTML body (fidelity), or extract key fields straight
  into `clients` profile columns (structured, agent-usable). Craig to pick before this lane gets build
  units — they're not the same tool.
- **Lane K — Portal auth rework.** Read `lib/portal-auth.ts` in full while scoping this: found a real,
  previously undocumented gap — `ensurePortalAccount()` auto-creates *and* auto-enables a portal account
  on any matching-email magic-link request, contradicting its own doc comment claiming staff-gating.
  Craig's "no email" report is most likely the already-flagged, unconfirmed SMTP/SendGrid dry-run issue
  (his email also isn't a `clients` row, so the request silently no-ops by design either way), not a new
  bug. Plan: replace passwordless magic-link with password + reset; accounts only ever created by a new
  staff "Invite to portal" action on the client detail page, never on first login attempt; self-service
  limited to forgot-password. Full unit breakdown in the Work Order's Lane K.

Full detail, MUST/GATE updates, and unit-level VERIFY criteria: see the Work Order file directly.
Registry (`infrastructure/.context/active-workorders.md`) updated to match.

**Later same session — Lane I built, pushed, migrated, and live.** Craig gave the go-ahead to build
and ship (not just plan). Built in an isolated worktree (`task/lane-i-scanned-document-storage`, now
merged and cleaned up per DO-SOP-010): migration adding `source_type`/`source_file_name`/`source_file_mime`/
`source_file_size` to `client_documents` + a new `client_document_files` table (bytes stored directly in
Postgres, not a Coolify volume — unnecessary infra for a single-digit-documents volume); staff-auth-only
`POST /api/documents/upload` + `GET /api/documents/[id]/file`; `DocumentRegister.tsx` shows scanned rows
with a "Scanned original" badge and a download link instead of send/resend. Independently re-verified
before merging (`git diff` review, `tsc`/build clean, not just self-report) — caught and reverted an
incidental `package-lock.json` churn from local `npm install` (this repo actually deploys via
`pnpm --frozen-lockfile`, so npm's lockfile is dead weight here). **Real bug found and fixed live**: the
migration's `CREATE POLICY ... TO authenticated` failed against prod (`role "authenticated" does not
exist`) — turns out the *existing* `client_documents` table has had RLS enabled with zero working
policies since the Supabase-to-plain-Postgres migration dropped that role; access control on every
document-engine table is actually enforced at the app layer, not Postgres RLS. Fixed to match that real
pattern instead of adding a second broken statement. Pushed (`dd93c2a` then RLS-fix `6bd17d2`), both
Coolify deployments confirmed `finished`/healthy via Coolify MCP (not self-report). Migration run against
prod — verified live, all 30 pre-existing `client_documents` rows unaffected. Sarah Tyler's scanned
Personal Training Agreement uploaded via a one-off script (no live hub session to use the UI form this
session) — `client_documents` id `a74a1ef7-0c19-478c-b5e2-538a9304e102`, 183,462 bytes, verified
byte-for-byte against the source file. `client_signed_date` left unset (scan has no extractable text/date
— `pdftoppm` isn't installed to OCR it); Craig can set it from the paper original. **Not yet done**: the
UI upload path itself hasn't been click-tested in a real logged-in browser session — worth doing next
time the hub is open. Lane I fully closed in the Work Order's DONE checklist.

---

## Session close — 2026-07-21 (later) — flexible/four-week update draft generation fixed

Craig reported "email updates are now not working at all" while trying to build a real update for
Monique Weardon (client #10) using the Flexible Update template, pasting the exact email text he
wanted (6kg/lunges/floor-work content) and asking why the agent wasn't drafting to match it.

**Root cause**: `app/api/clients/[id]/six-week-update/generate/route.ts` only ever implemented
`six_week_update` — it hard-rejected `four_week_update` and `flexible_update` with a 400
(`Template kind "..." is not implemented yet`), even though the template picker, editor, and email
builders (`lib/email-templates/{four-week,flexible}-update.ts`) for both had already shipped. Picking
either template in the hub's "New Update" → chat → "Create Draft" flow broke outright. This was a
half-shipped feature (frontend done, backend never extended), not a regression.

**Immediate fix for Monique**: built her actual draft directly via `scripts/create-update-draft.mjs`
against prod (`clientNumber: 10`, `templateKind: "flexible_update"`, 6 sections matching Craig's
pasted text verbatim: Attendance & Consistency / The Big Win / Lunges / Getting Up From The Floor /
What's Next / Worth Saying). Rendered to `--preview-only` HTML and eyeballed it before writing —
`sent_updates` id `24a05df4-47ef-4cd1-8a46-090aa9b81116`, status `draft`, nothing sent. Craig reviews
and sends from `/hub/clients/10/updates`.

**Real fix**: `lib/generate-six-week-update.ts` rewritten from a six-week-only module into
`generateUpdateDraft(clientNumber, templateKind, options)` covering all three kinds:
- `six_week_update` / `four_week_update`: same AI-JSON-per-section-key pattern as before, just added
  the four-week kind's 2 extra sections (`whatEverySessionSection`, `keepAnEyeOnSection`).
- `flexible_update`: **no fixed section list** — the AI is prompted to decide section count and
  headings itself from the chat conversation (mirrors how Esther drafts these by hand today; this was
  Craig's explicit ask — "the agent doesn't create a template against what I paste... it does its own
  thing"), not forced into six_week_update's shape.
- `NewUpdateClient.tsx`'s `handleCreateDraft` previously only populated `sections`/`sectionLabels` from
  `kind.sections` (empty for flexible) — added a `kind.flexible` branch that populates `flexSections`
  (+ `greetingName`/`introText` if the AI set them) from `draft.data.sections` instead.

`tsc --noEmit` clean, `next build` compiles/typechecks/generates all 61 pages clean (the build's
trace-file-copy stage fails locally with `EPERM` on symlinks — a pre-existing Windows/pnpm quirk in
the standalone-output step, unrelated to this change and not present in Coolify's Docker build).
Committed `cc29c03`, pushed to `main` (Craig's explicit go-ahead). Coolify auto-triggered deployment
`oe8ppywxvdv1odhbq1kvn9yk` on the push — **confirmed `finished` via `mcp__coolify__deployment get`
before session close.** Still not live-UI-tested, though — next session (or Craig) should do a real
"New Update" → Flexible Update → chat → Create Draft round-trip in the hub to verify the fix actually
works end-to-end (only typecheck/build/deployment-status verified this session, no hub session
available to click through it).

## Session close — 2026-07-21

Long session, mostly reactive (Craig using what got built earlier the same day and reporting real
gaps as he hit them). Everything below is pushed to `origin/main` and confirmed deployed
(`running:healthy` via the Coolify MCP, not a self-report) unless noted. Full detail for each item is
in its own entry above — this is the map for whoever picks this up next.

**Shipped and live, in order:**
1. Real "email a document" capability added to PAR-Q specifically (it was copy-link-only) — later
   superseded (see #4).
2. Resend enabled for 6-week/4-week update emails (previously blocked outright once sent) and for
   Agreements (real backend was dead, wired to an unconfigured `RESEND_API_KEY`; `lib/email.ts` gained
   attachment support so the PDF still works).
3. Full mockup-alignment pass (Lane H) across the hub's list/editor pages — most already matched from
   earlier sessions (verified, not assumed); real fixes on All Documents, Site Content list/editor.
4. New "Client Feedback Questionnaire" document kind, then PAR-Q and Personal Training Agreement both
   migrated onto the same document engine — every document kind (Terms/Agreement, Risk Assessment,
   Annual Review, Consent, Feedback, PAR-Q) now shares one send/resend mechanism from the hub. Nothing
   generates a fresh standalone public-page link anymore (the old `/parq`, `/parq/edit/[id]`,
   `/agreement` pages are left in place, just unlinked — a safety net for pre-migration links, not
   deleted). Found and fixed a real, separate data-integrity bug along the way (Agreement page's dead
   package/payment edit path duplicating the client page's own).
5. Inline Send/Resend/Copy-link/Delete added to every document list (previously only inside each
   document); update-email section headers made editable for the templates Esther actually uses (a
   real fix for this existed already, just shipped as a non-default option); a stale `/hub/templates`
   card still linking to the retired PAR-Q form removed; document-ready email spacing fixed.
6. **The real bug**: a second, undiscovered "Create & send" button on the Templates page was faking
   sends entirely (marked "sent" with no email ever attempted). Found via real data (a 36ms
   created→sent gap, physically too fast for a real send), not by re-checking the same code path
   again. Fixed at the source and the fake-send branch deleted from the API so it can't recur from
   anywhere else. Added `client_documents.emailed` (mirroring `sent_updates.emailed`, which had
   already solved this exact problem for update emails) so status and real delivery are never
   conflated again.

**Not started / explicitly deferred:**
- Whether the SendGrid/SMTP backend is actually functioning in production is still unconfirmed — needs
  a real test send via the hub UI (or Craig checking the SendGrid dashboard), not something checkable
  without live credentials.
- `tracker`/compliance-tab code still reads the legacy `signed_parq` table directly — deliberately not
  touched, since it's medical-clearance-critical and deserves its own reviewed pass.
- The client-edit page's missing right rail/clearance banner, `ProcessQualityManager.tsx`'s badge-markup
  dedup, and the `hub-sop.html`/All-Documents mockup mismatch — all flagged as background-task
  suggestions during the session, not actioned.
- 5 of 8 exercise-for-health condition pages, production domain cutover, client data consolidation from
  Trainerize — all still open from before this session, untouched.

**Process note:** three real, distinct bugs were found this session by checking real data (DB queries,
timestamps) rather than re-trusting a prior code read — the PAR-Q signed-link signature bug, the
36ms-send-gap that led to the `emailed` flag, and the templates-page fake-send button underneath it.
Worth remembering for next time something "still doesn't work" after a fix: check what actually happened
in the data before re-explaining the same analysis.

## Session 2026-07-21 (the actual root cause) — a second, undiscovered "send" path was faking it

Craig came back with the same screenshot after the `emailed`-flag fix deployed — the document still
showed plain "Sent", no "Not delivered" pill. That was the tell: it meant the new code path had never
run at all for that document, not that the indicator logic was wrong.

### Found it
Queried the specific document again post-deploy. A brand-new one, created *after* the fix went live,
still had `emailed: null` — proving `sendDocumentEmail()` (the function I'd just fixed) was never even
being called for it. Grepped for every caller of the documents PATCH route and found
`app/hub/(protected)/templates/[id]/SendTemplateToClient.tsx` — a completely separate "Create & send"
component living on the *template* detail page (`/hub/templates/[id]`), never investigated in any
earlier pass on this issue. It:
1. Created a document (draft, correctly).
2. PATCHed it with `action: "send"` — a second, bare action in `/api/documents/[id]/route.ts` that just
   set `status: "sent"` directly, with **no email attempt, no `emailed` field, ever**.
3. Copied the sign link to the clipboard and showed "Client signing link (copied to clipboard)" —
   exactly what Craig described as "it just says cut and paste this link."

This is what Craig meant, several turns ago, by "/hub/templates" needing the same send mechanism —
correctly identified, mis-scoped by me at the time as "just the content editor, no send exists there."
There *was* a send button there. It was just broken in a way a plain grep for "send" in the server
page component didn't surface, because it lived in a client component the page renders.

### The fix
- **`SendTemplateToClient.tsx`** rewritten — no longer fakes its own send. Creates the draft, then
  redirects straight to the real document detail page (`/hub/clients/[id]/documents/[docId]`), which
  already has the correct Send/Resend/Copy-link UI, the dry-run handling, and the "Not delivered"
  indicator from the previous fix. This is now a shortcut into the real flow, not a second one.
- **`app/api/documents/[id]/route.ts`** — deleted the bare `action: "send"` branch entirely (confirmed
  via repo-wide grep it had exactly one caller, the file above, already fixed). `send_email` is now the
  only way a document's status becomes "sent" — closing off the possibility of this happening again
  from anywhere else.

### Verified
`rm -rf .next && npx tsc --noEmit` clean, `npm run build` compiles successfully (known symlink-trace
failure only). Confirmed via direct DB query that the specific document Craig screenshotted was created
*after* the previous fix deployed but still had `emailed: null` — proof it went through the broken
`SendTemplateToClient` path, not `sendDocumentEmail()`. Every document sent via that specific path before
this fix will show plain "Sent" forever (unknown `emailed` state, deliberately not backfilled/guessed);
new sends through it now go through the real flow.

## Session 2026-07-21 (no really, this one) — "It says sent when it obviously hasn't"

Craig, still frustrated after the last fix: creating a document and clicking send only ever gave him a
"copy this link" result, yet the document showed as "sent" on the All Documents list. Investigated with
real data rather than re-asserting the earlier "copy-link never touches status" finding.

### What the data showed
Queried the most recent `client_documents` rows directly. Every recent "sent" document — including one
created and marked sent just **36 milliseconds** later — showed `sent_at` essentially instantaneous
with `created_at`. That's far too fast for a real outbound HTTPS call to SendGrid (TLS handshake alone
typically takes longer). Strong circumstantial evidence the email backend is dry-running in production —
i.e. `sendDocumentEmail()` in `app/api/documents/[id]/route.ts` always sets `status: "sent"` regardless
of whether `getEmailSender().send()` actually delivered anything or silently no-op'd because no real
backend was configured. **Not definitively confirmed** — `SENDGRID_API_KEY`/`SMTP_*` env vars do exist
on the Coolify app (checked via `mcp__coolify__env_vars`), so it's possible the key exists but is
invalid/misconfigured rather than fully absent. Didn't reveal/test the raw secret value directly (avoid
handling live credentials unnecessarily) — flagging this as unconfirmed rather than overclaiming.

### The fix — regardless of the exact backend root cause
This exact problem was already solved once in this codebase, just not applied here: `sent_updates` (the
6-week/4-week update emails) has an `emailed` boolean column, separate from `status`, and
`ClientUpdatesPanel.tsx` shows an "Emailed"/"Not sent" pill using it. `client_documents` had no
equivalent — `status: "sent"` was the only signal, and it lied whenever the send didn't really deliver.

- **New migration** `20260721_client_documents_emailed_flag.sql` — additive `emailed boolean` column,
  NULL for existing rows (no reliable way to backfill whether historical sends were real). **Run against
  prod, confirmed live.**
- `sendDocumentEmail()` now sets `emailed: !result.dryRun` alongside `status`/`sent_at`.
- `lib/documents/types.ts` — `ClientDocument.emailed` added.
- `DocumentRegister.tsx`, `app/hub/(protected)/documents/page.tsx`, `DocumentDetailClient.tsx` — all
  three now show a distinct "Not delivered" / "Not actually delivered" indicator whenever
  `status === "sent" && emailed === false`, instead of just trusting the status pill. The document
  detail page also gets an explanatory banner ("no email backend is configured... use Copy link until
  that's fixed") directly in the Send card.
- Queries updated to select the new column: `clients/[id]/page.tsx`'s `clientDocuments`,
  `documents/page.tsx`'s `docs` (the detail page already used `select("*")`, picked it up for free).

### Still open — worth Craig's attention next
Whether the SendGrid/SMTP backend is actually broken in production needs a real test send (via the hub
UI, with credentials, or by Craig checking the SendGrid dashboard for recent activity) to confirm
one way or the other. The `emailed` flag will make that visible immediately on the next real send attempt
either way — that's the point of this fix.

### Verified
`rm -rf .next && npx tsc --noEmit` clean, `npm run build` compiles successfully (known pre-existing
symlink-trace failure only). Migration run and confirmed live. Not live-browser-verified this session.

## Session 2026-07-21 (the real final one) — 4 more issues Craig hit while using today's work, all fixed

Craig, frustrated, listed four problems after actually using the document/update-email features built
earlier today. Investigated each with 3 parallel Explore agents plus direct file reads before touching
anything — all four were real, confirmed root causes, no guessing.

**1. Update-email section headers still hardcoded.** A real fix for this already existed —
`flexible_update` (commit `48fdacb`) gives fully editable section headings — but it shipped as a third,
non-default template option; the 6-week/4-week templates Esther actually uses day-to-day were never
wired to it. Extended editable headers to those two as well: `six-week-update.ts`/`four-week-update.ts`
gained an optional `sectionLabels` override (falls back to the existing hardcoded default per section),
and `NewUpdateClient.tsx` now renders an editable `Input` above each section's rich-text editor
(same pattern the flexible template already used for its heading field), persisted with the draft.

**2. No way to delete a document; draft status not obvious.** Confirmed: zero `DELETE` route existed
for `client_documents` anywhere. Added one to `app/api/documents/[id]/route.ts`, mirroring
`app/api/updates/[updateId]/route.ts`'s existing pattern exactly (any status deletable, hard delete,
auth-gated). Wired a delete button into both `DocumentRowActions.tsx` (available even on locked/signed
rows — deleting isn't just for drafts) and `DocumentDetailClient.tsx` (next to the header, redirects to
the client's Documents tab on success). Added a plain-text draft note under the title:
"This is a draft — nothing has been sent to the client yet."

**3. All Documents shows "sent" after only copying a link — plus confusing row buttons.** Code-verified
copying a link never touches status (`copyLink()` in both `DocumentRowActions.tsx` and
`DocumentDetailClient.tsx` only calls `navigator.clipboard.writeText()`) — for anything created fresh
through the document engine this genuinely cannot happen. Most likely explanation for what Craig saw:
this session's PAR-Q/Agreement migration carried the *legacy* table's `status` column straight across,
and in the old standalone system `status = 'sent'` could mean "a link was copied and handed over
manually," not "a real email went out." **Craig's call on plan review: leave historical data as-is,
fix the UI only.** The real, fixable bug: the row's Copy-link button reused `IconSend` (a paper-plane
icon) right next to the labelled Send/Resend button — reads as a second send control. Swapped to
`IconCopy` in both `DocumentRowActions.tsx` and `DocumentDetailClient.tsx`.

**4. Document-ready email looked condensed around the button/link.** Found the exact cause: the CTA
button's table had `margin:20px 0 4px` (only 4px below) immediately followed by a `margin:0` paragraph
— an asymmetric, cramped gap. Rebalanced to `margin:24px 0 16px` on the button and `margin:8px 0 0` on
the "Or copy this link" paragraph, in both `document-ready.ts` and `parq-request.ts` (identical pattern
in both files).

### Verified
`rm -rf .next && npx tsc --noEmit` clean; `npm run build` compiles successfully (same known pre-existing
Windows/OneDrive symlink trace failure at the final packaging step, confirmed unrelated). Not
live-browser-verified this session — no hub credentials available.

## Session 2026-07-21 (genuinely final) — Inline Send/Resend on every document list, not just inside each document

Esther reported the Personal Training Agreement "only gives you a link, not an email." Investigated with
real data before assuming a bug.

### Root cause of what Esther saw
Not a bug. The most recent `terms` (Personal Training Agreement) document was created against the
"Craig Blackman" client record, which has `email: null` in `clients` — confirmed by querying prod. The
Send button is *correctly* disabled with no client email; only Copy Link shows, exactly as designed
(same behaviour every document kind has always had). Clients with a real email on file (Sam Gibbons,
Ellie Wallwork, Colin Farley) all show a working Send button. Flagging for Craig: add an email to the
test client record, or test with a real one, to see the working flow.

### The real, structural gap — fixed
Craig's actual ask was broader than one bug: every document should be sendable by email (not just
link), from more places than just inside each individual document page — the client's Documents tab
list AND the hub-wide All Documents list, the same "click Send now" pattern `UpdateRowActions` already
has for update emails. That capability genuinely didn't exist on either list before this — both only
had an "Open"/"View" link, requiring you to open the document first to find the Send button.

- **New `components/hub/DocumentRowActions.tsx`** — inline Send/Resend + Copy link per row, same
  pattern as `UpdateRowActions.tsx`. Hidden once a document is locked (signed/superseded, nothing left
  to send).
- **`DocumentRegister.tsx`** (client Documents tab) — added an actions column using it; needed
  `clientEmail`/`clientName` threaded back in as props (removed a few commits ago when the old
  PAR-Q-specific send button was deleted — this is the real, generic replacement). Renamed "New
  document" → "Create & send" (Craig's own words for it).
- **`app/hub/(protected)/documents/page.tsx`** (All Documents, hub-wide) — same actions column added;
  query extended to also select `clients.email` so per-row Send/Resend can work here too, not just on
  a single client's page.
- **Real bug found and fixed in passing**: `/hub/templates` still had a hardcoded card linking straight
  to the retired `/parq` blank form — a leftover from before PAR-Q was migrated onto the document
  engine. Removed it; PAR-Q's real template already appears in the normal list now (confirmed it does).
  Also fixed template-list section counts always showing "0 sections" for `feedback`/`parq` kinds (their
  content lives in `body.feedbackSections`, not `body.sections` — the count didn't know to look there).

### Verified
`rm -rf .next && npx tsc --noEmit` clean; `npm run build` compiles successfully (same known pre-existing
Windows/OneDrive symlink trace failure, unrelated). Not live-browser-verified this session.

## Session 2026-07-21 (actually final) — Fixed the signed_agreements/clients duplication, instead of just flagging it

Craig: "can we fix this issue now rather than leaving it, otherwise it will get forgotten about" — fair,
so did it immediately rather than leaving the background task queued.

### What was actually there
Investigated properly before touching anything. The dangerous part (Esther able to edit
package/payment/clinical fields on the Agreement page, silently diverging from what `PackagePaymentsCard`/
`ClinicalComplianceCard` show on the live client page) turned out to have **already been half-fixed** by
an earlier session — the "Client Management" section of `AgreementDetailClient.tsx` is already
read-only, with a banner: "Package, payments and compliance are managed on the client profile... edit
the live values on the profile." Good instinct, incomplete execution: the actual edit machinery behind
it — `editingTrainer`/`trainerForm`/`handleTrainerChange`/`handleSave` state, and the entire
`PATCH /api/agreements/[id]` route it called — was still sitting there, fully wired, just with no
button left in the UI to trigger it. Confirmed via grep: zero call sites for any of it outside its own
declarations.

### What was fixed
- Removed the dead `editingTrainer`, `trainerForm`, `handleTrainerChange`, `handleSave` state/logic and
  the "Trainer information saved" success/error banner JSX from `AgreementDetailClient.tsx` (never
  reachable, never rendered any trigger).
- Deleted `app/api/agreements/[id]/route.ts` entirely — its only handler (PATCH) wrote exactly the
  fields that duplicate `clients`, and nothing else in the app called it (confirmed via grep before
  deleting). `app/api/agreements/[id]/email/route.tsx` (a sibling file, different concern — the PDF
  email) is untouched.
- This closes the actual risk: there is no longer any code path, dead or live, that can write
  package/payment/clinical data to `signed_agreements` and have it diverge from `clients`. The read-only
  display + banner (already in place) still shows the historical snapshot for old records, correctly
  labelled as a snapshot rather than something editable here.

### Verified
`rm -rf .next && npx tsc --noEmit` clean (the first run hit two stale-cache errors referencing the
just-deleted route from `.next/types` — not real errors, cleared by removing `.next`).

## Session 2026-07-21 (truly final) — Agreement migrated too; every document type now hub-only

Immediately followed the PAR-Q migration with Agreement, per Craig's "migrate that too."

### The key discovery that changed the plan
Went in expecting to build a new `'agreement'` document kind from scratch (like PAR-Q). Instead found
the document engine's existing `'terms'` template was **already** updated on 2026-07-04
(`20260704_terms_real_content.sql`) to literally BE the real, dual-signed Personal Training Agreement —
same section structure (trainer commitments, client responsibilities, medical clearance, payment,
risk/liability, data protection, general terms) as the standalone `/agreement` page's embedded terms
text. Nobody ever formally retired the old standalone system after that — it just kept existing in
parallel, unlinked from the hub (confirmed last session: nothing in the hub links to `/agreement` at
all). So no new kind, no new template — just relabelled `DOCUMENT_KIND_LABEL.terms` from generic
"Terms & Conditions" to "Personal Training Agreement" so it's not confusing in the "New document" picker,
and backfilled the historical data.

### What changed
- **`scripts/migrate-agreements-to-engine.mjs`** (new) — snapshots every `signed_agreements` row into
  `client_documents` (kind='terms'). No questionnaire content needed (unlike PAR-Q) — it's pure legal
  text (the shared template body) plus client + trainer signatures.
- **Real bug hit and fixed mid-run**: 2 of 8 legacy rows had `client_id = null` (never linked to a real
  `clients` row) — `client_documents.client_id` is NOT NULL, so the first run failed partway through
  (3 rows already inserted). Cleaned up the exact 3 partial inserts by id (not a broad delete), then
  fixed the script to resolve unlinked rows by exact case-insensitive name match against `clients`,
  skipping (never guessing) if that doesn't resolve to exactly one row. Both cases resolved cleanly
  ("Sam gibbons"→Sam Gibbons #13, "Ellie wallwork"→Ellie Wallwork #7). Re-ran clean: 6/6 migrated, 0
  skipped. Spot-checked the output — signatures, names, dates all correct.
- **`DocumentRegister.tsx`, `clients/[id]/page.tsx`, `app/hub/(protected)/documents/page.tsx`** — all
  three stopped reading `signed_agreements` (and `documents/page.tsx` also stopped reading
  `signed_parq`) now that both are fully represented in `client_documents` — otherwise every migrated
  row would show twice (once as the legacy row, once as the new snapshot).
- **`/hub/agreements`** relabelled "(legacy record)" with a pointer to All Documents, same treatment as
  the PAR-Q history page last session. Not deleted — still the only place to see pre-migration records.

### A real, separate bug found — NOT fixed here, flagged as a background task
While reading `AgreementDetailClient.tsx` to understand what "the agreement" actually contains, found
that `signed_agreements` carries a full second copy of package/payment/clinical-tracking columns
(sessions used, payment status, medical clearance, risk level, GP letter dates, trainer observations —
added 2026-05-25) that the Agreement detail page still actively edits via `PATCH /api/agreements/[id]`.
But the *live* client detail page's `PackagePaymentsCard`/`ClinicalComplianceCard` edit the same
concepts on the `clients` table instead, via a completely separate `/api/clients/[id]` path — never
synced. Two screens can silently show different, diverging answers to "has this client paid" or "is
medical clearance in place." **Deliberately not migrated or fixed** — this is a real pre-existing data
integrity bug, not something to paper over as a side effect of a document-type migration. Spawned as a
background task for Craig to pick up separately.

### Also a deliberate behaviour change, not silently dropped
The old `/agreement` → `AgreementDetailClient`'s "Email PDF" button attached a real generated PDF.
Going forward, a new-flow agreement is sent as a sign-this-link email, like every other document kind —
no automatic PDF. A signed copy can still be saved as a PDF via the document's own
"Print or save as PDF" accessibility-toolbar button (browser print), which was already built in. The
old `/agreement`/`AgreementDetailClient` PDF-email path is untouched and still works for legacy records.

### Net result across both sessions today
Every document type in the hub — Terms/Personal Training Agreement, Risk Assessment, Annual Review,
Consent, Feedback, and now PAR-Q — is sent, resent, and signed through the exact same mechanism, from
the hub, never a fresh standalone public-page link. Nothing is left that still needs "migrating" in
that sense.

### Verified
`npx tsc --noEmit` clean. Not live-browser-verified this session (no hub credentials) — worth a real
click-through creating and sending a new Personal Training Agreement from the hub before fully trusting
it, same caveat as PAR-Q.

## Session 2026-07-21 (final) — PAR-Q migrated onto the document engine; standalone-send buttons retired

Craig's ask, in his own words: "we just need to have the same mechanism to send any document or
template going forward so they won't ever be web facing... always from the hub." He confirmed PAR-Q
and the standalone Agreement page were both quick wins built before the hub existed — PAR-Q now gets
the full treatment; Agreement is scoped but deliberately NOT touched this session (see below).

### What changed
- **Generalized the interactive-questionnaire schema.** `FeedbackQuestion` gained an optional `note`
  field (clinical context like "If yes, give details in Section 5") so the same
  `feedbackSections`/`feedbackConsents` schema built for the Feedback Questionnaire could carry PAR-Q's
  29 real clinical questions verbatim from `lib/parq-data.ts`, plus personal/GP/detail fields as `text`
  questions. `DocumentKind` gained `'parq'`.
- **New PAR-Q document template** (`supabase/migrations/20260721_seed_parq_template.sql`) — real
  interactive radio-group/text fields, not the earlier Lane C plan's raw-HTML-table body. That plan is
  superseded; `scripts/migrate-parq-to-engine.mjs` was rewritten to target this new schema instead
  (its file header still documents the field mapping).
- **PAR-Q stays a real signed clinical declaration** — unlike the Feedback kind (survey, name-only), a
  `doc.kind === "feedback"` check (not "has feedbackSections") gates the simplified sign flow, so PAR-Q
  keeps the full name+date+typed-signature+"I agree" flow, matching what `ParqEditClient.tsx` already
  required.
- **Esther's "Responses" card generalized** — was hardcoded to `kind === "feedback"`, now keys off
  `body.feedbackSections` presence so it renders PAR-Q answers too, with proper labels (not raw
  `q1`/`full_name` keys) since the template supplies them.
- **Migration run against prod, verified** (Craig's go-ahead, this session): 17/17 `signed_parq` rows
  snapshotted into `client_documents` (kind='parq'). Spot-checked 3 real clients (Colin Farley — a real
  "yes" answer and free-text conditions field, Sarah Tyler, Craig Blackman) — every field byte-matches
  the legacy row. Clearance-status side effect re-derived idempotently, matching pre-migration state.
  **No legacy `signed_parq` row was touched, updated, or deleted** — this is a pure additive snapshot;
  retiring the old table is a separate, later, explicitly-gated step once more time has passed.
- **Removed the mechanisms that generated new public-page links**: `SendDocumentLink.tsx` (the
  "Send PAR-Q"/"Send PAR-Q update" buttons on the client detail page and the dedicated PAR-Q history
  page) and `app/api/parq/send-email/route.ts` (built two sessions ago specifically to fix PAR-Q's
  broken email button — now superseded, not wasted, by the document engine's own send/resend, which
  every other kind already uses). `DocumentRegister.tsx` no longer reads `signed_parq` directly at all
  — PAR-Q data (old and new) now flows through the same generic `client_documents` rows as every other
  kind, so it no longer double-lists PAR-Q entries post-migration.
- **The dedicated PAR-Q history page** (`/hub/clients/[id]/parq`) is kept, relabelled "PAR-Q (legacy
  record)", with a note pointing to the client's Documents tab for anything new — not deleted, since
  it's still the only place to read pre-migration free-text/diff history, and deleting working code
  without a reason isn't the move.
- **`NewDocumentButton.tsx`** now offers "PAR-Q" alongside every other kind — Esther picks it, hits
  send, done, exactly like Terms/Consent/Feedback.

### Deliberately NOT done this session
- **Agreement (`/agreement`, `signed_agreements`) — not migrated.** No schema mapping exists yet (unlike
  PAR-Q, which had a head start from Lane C). It also needs to keep the PDF-attachment email, which
  only got fixed to a working backend two sessions ago. This is real, separate scope — flagged for next
  session, not silently skipped.
- **`/parq` (blank first-submission form) and `/parq/edit/[id]` are NOT deleted.** Nothing links to them
  anymore (no new client will ever be sent one), but any already-outstanding link from before this
  session (7-day TTL) will still resolve correctly rather than 404 on a client mid-form. Safe to fully
  retire once enough time has passed that no live links remain — a later, low-risk cleanup.
- **The hub's admin PAR-Q edit page** (`/hub/clients/[id]/parq/[parqId]/edit`, `signed_parq`-backed) and
  the `tracker`/compliance-tab code paths that also read `signed_parq` directly were left completely
  untouched — those are safety-critical (medical clearance tracking) and reviewing/repointing all of
  them properly is its own scoped pass, not something to sweep up as a side effect of this one.

### Verified
`npx tsc --noEmit` clean. `npm run build` compiles successfully (fails only at the known pre-existing
Windows/OneDrive symlink trace step, confirmed unrelated — same failure exists on unmodified code).
Not live-browser-verified (no hub credentials this session) — a real click-through sending/signing a
new PAR-Q from the hub is worth doing before fully trusting this.

## Session 2026-07-21 (latest) — New "Client Feedback Questionnaire" document type (local, NOT pushed, migrations NOT run)

Added a 5th document-engine kind, `feedback`, matching `D:\apps\design-systems\brand-staging-2662e9\documents\client-feedback-questionnaire.html` verbatim in content. Unlike terms/risk_assessment/annual_review/consent, this isn't a legally-signed document — it's a survey (free-text + radio-choice questions + two optional consent checkboxes about using the client's words publicly), so "submitting" it just needs the client's typed name to identify the response, not a real signature/agree checkbox.

**Schema extension** (`lib/documents/types.ts`): `DocumentBody` gained `feedbackSections` (numbered sections of text/choice questions) and `feedbackConsents` (checkbox list), parallel to the existing `consentGroups` pattern. `ClientDocument` gained `feedback_responses` (jsonb: `{answers, consents}`).

**Rendering** (`lib/documents/render.tsx`, `components/documents/DocumentView.tsx`): new `FeedbackSectionsView`/`FeedbackConsentsView`, real interactive React state (not `dangerouslySetInnerHTML`) — same trust model as the existing interactive consent checkboxes.

**Signing flow** (`app/documents/[id]/sign/DocumentSignClient.tsx`): a `doc.kind === "feedback"` branch renders a simplified slot — "Your name" field + "Submit feedback" button, no separate signature field or "I agree" checkbox (both meaningless for a survey). Submits `signature = name` under the hood so it flows through the existing `/api/documents/[id]/sign` route and `isFullySigned()` logic completely unmodified — only real route change was accepting and persisting an optional `feedback_responses` field.

**Esther's view** (`DocumentDetailClient.tsx`): added a "Responses" card, since a feedback doc has no other content for her to review once submitted (this is the whole point of the feature — a document she can't read the answers to would be useless). Not wired for inline editing of the questions themselves (matches how `consentGroups` also aren't editable via the hub UI today — a template-level change, not a per-document one).

**CSS** (`app/globals.css`): ported `.field-grid`, `.textarea`, and the mockup's radio-pill question pattern (`.q`/`.q__legend`/`.q__answer`/`.pick`) into the existing document-engine CSS block, deriving all colours from the app's existing tokens via `color-mix()` — no new hex values, matching the pattern used for the rest of the document engine.

**New document creation**: `NewDocumentButton.tsx`'s kind selector now includes "Client Feedback" — sending one to a client works exactly like every other document kind (create from the client's Documents tab → email/resend/copy-link, all already built).

### Migrations run (Craig's go-ahead, same session)
Both migrations run against prod via the standing Coolify tunnel (`127.0.0.1:5433`, `DATABASE_URL` from `.env.local`) using a temp runner script (deleted immediately after, `git status` confirms nothing left in `scripts/`):
- `feedback_responses` column confirmed present on `client_documents`.
- `document_templates` row confirmed live: `kind='feedback'`, `name='Tell us about your online training'`, `version=1`, `requires_client_signature=true`, `requires_trainer_signature=false`.

"Client Feedback" is now a real, creatable document kind end-to-end — send/resend/copy-link all work exactly like every other kind.

### Verified
`npx tsc --noEmit` clean project-wide. Not live-browser-verified (no hub credentials this session) — worth a real click-through + a real client-facing submission before fully trusting the flow.

## Session 2026-07-21 (later still) — Hub mockup-alignment pass, Lane H (local, NOT pushed)

Full 12-agent pass bringing every hub route in line with its `hub-*.html` mockup — see the Work
Order's new "Lane H" section for full detail, not duplicated here. Short version: most routes already
matched from earlier sessions (verified, not assumed); real fixes landed on All Documents (rebuilt to
the hub's own list-page pattern — its mapped mockup turned out to be an SOP detail page, not a
documents list), Site Content list (one TokenPill fix) and Site Content editor (a literal `&amp;amp;`
text bug, missing icon, Title Case→sentence case labels, missing subtitle). Process & Quality's real
CRUD/data confirmed untouched. `tsc --noEmit` clean project-wide. Three follow-up items spawned as
separate background-task suggestions rather than actioned inline (client-edit right rail/banner gap,
ProcessQualityManager badge dedup, hub-sop mockup mismatch needing a real mockup).

## Session 2026-07-21 (later) — PAR-Q real email sending + update-email resend (local, NOT pushed)

Craig reported two gaps: no way to resend a 6-week/4-week client update email once it's gone out,
and no way to actually *email* a PAR-Q to a client (or see options to email other documents) — he
said this was requested yesterday (2026-07-20).

### What was found
- **6-week update emails**: `app/api/updates/[updateId]/send/route.ts` explicitly blocked sending
  once `status === "sent"` (`409 "This update has already been sent"`) — no resend path existed,
  by design, not a bug.
- **PAR-Q**: `SendDocumentLink.tsx` (used on both the client-detail Compliance card and the
  standalone PAR-Q history page) has always been copy-link-only despite the mail icon/label —
  clicking it copies a URL to the clipboard, it never emails anything. This is the actual gap Craig
  hit — there never was a real "email the PAR-Q" option, only "Send PAR-Q update" phrasing that
  implies one.
- **Agreements**, by contrast, already have a real email option (`AgreementDetailClient.tsx` →
  `/api/agreements/[id]/email`) — but it uses `RESEND_API_KEY`/the `resend` npm package, a
  *different* backend from the one everything else in the app uses (`lib/email.ts`,
  SendGrid/SMTP-based). `state.md` already flags `RESEND_API_KEY` as unset — so the agreement email
  button is present in the UI but silently dead (`501` on click). **Not fixed this session** — flagged
  here for a decision (rewire it onto `lib/email.ts` vs. set `RESEND_API_KEY`), since fixing it means
  either losing the PDF attachment (SendGrid/SMTP path has no attachment support yet) or extending
  `lib/email.ts` to support attachments — a slightly bigger change than the two asked-for items.

### What was built
1. **Update-email resend**: `send/route.ts`'s guard now allows `"sent"` through alongside
   draft/scheduled/failed (resend re-dispatches and updates `sent_at`, no schema change).
   `UpdateRowActions.tsx` gets a new "Resend" button, shown only when `status === "sent"`, alongside
   the existing Preview/Delete (Edit/Send-now stay draft/scheduled/failed-only, unchanged).
2. **Real PAR-Q email**: new `lib/email-templates/parq-request.ts` (reuses the shared
   `buildBrandedUpdateEmail` shell, wording tailored to "complete/update a questionnaire" rather than
   "sign a document") + new `app/api/parq/send-email/route.ts` (mirrors the document-engine's
   `send_email` action in `app/api/documents/[id]/route.ts`: looks up the client by `clientNumber`,
   400s with a clear message if no email on file, mints a signed 7-day edit link via
   `mintParqLinkParams` for updates or a blank-form link for first sends, sends via `getEmailSender()`,
   stamps `signed_parq.sent_date`). `SendDocumentLink.tsx` now renders a real "Email …" button (primary,
   disabled with a tooltip when the client has no email on file) plus the existing copy-link action as
   a secondary icon button, for PAR-Q specifically (`path === "/parq"`; agreements keep the old
   copy-only behaviour since they already have their own separate email button on the agreement page).
   `DocumentRegister.tsx` and the standalone PAR-Q page now thread `clientEmail` down from the already
   -loaded `clients.email` column (both call sites already had it or a one-line `select` addition
   away).

### Verified
- `npx tsc --noEmit` — clean, zero errors project-wide.
- **Not verified live** — no hub login credentials available this session (same limitation noted
  throughout this Work Order), so this was checked by code review + type-check only, not a real
  browser send. Before trusting a real client receives an email: confirm which backend `lib/email.ts`
  resolves to on this environment (`getEmailStatus()`) — `state.md` flags this as previously
  unconfirmed for the document-engine feature too.

### Follow-up (same session): Agreements email fixed, resend now works on every document kind
Craig confirmed the goal broadly — "every document should have the ability to resend in case they
didn't receive it the first time or it added in junk mail" — so the Agreements gap flagged above
was closed rather than just documented:
- **`lib/email.ts`** gained `attachments?: EmailAttachment[]` on `SendEmailInput`, implemented for
  both the SendGrid Web API path (base64 `content`) and the Nodemailer/SMTP path (native
  `attachments`). This is the first attachment support in the shared send layer.
- **`app/api/agreements/[id]/email/route.tsx`** rewritten to build the PDF the same way as before
  (`AgreementPDF` + `@react-pdf/renderer`) but send it through `getEmailSender()` instead of a raw
  `Resend` SDK call keyed off the never-set `RESEND_API_KEY` — same working backend as everything
  else in the app now.
- **`AgreementDetailClient.tsx`** — button now reads "Resend email" after the first successful send
  in the session (was always "Email PDF"); success message distinguishes a real send from a dry run
  (no backend configured), matching the document-engine's own send feedback pattern. No DB
  column tracks "has this ever been emailed" across sessions — the button resets to "Email PDF" on
  a fresh page load; a persistent flag would need a migration, not added here since it wasn't asked
  for and the button was already always-clickable regardless of label.

**State of resend across every document kind, after this session:**
- Document engine (terms/risk_assessment/annual_review/consent): already had it (built 2026-07-20).
- PAR-Q: fixed this session (real email, was copy-link-only).
- Agreements: fixed this session (email existed but the backend was dead).
- 6-week/4-week client update emails: fixed this session (resend was blocked outright once sent).

### Not done
- **Not committed, not pushed** — local changes only, per the standing push/deploy `[GATE]`.
- No live send test — no hub credentials this session; verified via `tsc --noEmit` + code review only.

## Session 2026-07-21 — Lane F pushed, portal fixed & live, hub-wide icon/colour audit, Site Content inventory, blog byline + SEO

### Status snapshot
Big session, mostly reactive fixes and follow-through on 2026-07-20's work rather than new scope. Everything below is committed, pushed, and confirmed deployed live on `staging.eternal-fitness.co.uk` via the Coolify MCP (not self-reported) unless noted.

### 1. Blog byline fix
Ran the pending `author_name = 'Craig Blackman' → 'Esther Fair'` update directly against prod (26/27 rows). Content/titles untouched — the migration file it came from also had two DELETE + three content-reframe statements that were deliberately **not** run, since Craig separately said blog content itself stays as-is until Esther reviews it.

### 2. Client portal — found and fixed a real "not actually live" bug
Craig said "do the WCAG check, then get [the portal] live." Live-browser check on `/portal/login` hit `ERR_TOO_MANY_REDIRECTS` — confirmed with a bare `curl`, zero cookies, so not a stale-session artefact. Root cause: `app/portal/layout.tsx` wrapped `/portal/login` as well as the authenticated routes, so an unauthenticated visit redirected to login, re-triggered the same layout's session check, and redirected to itself forever. Fixed by moving the protected content into `app/portal/(protected)/`, mirroring the hub's already-working `app/hub/(protected)/` pattern — login sits outside the guard. Verified locally (200 on login, single redirect on the dashboard) before pushing. **This means the portal was never actually reachable between when it was "built" on 2026-07-20 and this fix** — worth knowing if anyone assumed otherwise from the earlier handoff.

### 3. WCAG contrast — real check, real failure found
Instead of re-trusting the earlier self-check, computed actual WCAG contrast ratios from the live CSS token hex values. Found 3 of 5 `StatusBadge` tokens (primary/warning/success) measuring 2.5–4.2:1 against their tinted pill backgrounds — under the 4.5:1 AA minimum — most visibly "Signed" and "Sent", the two labels a client sees most on their portal dashboard. Added darker `--status-primary-text`/`--status-warning-text`/`--status-success-text` variants (same hue, reduced lightness, verified ≥4.5:1) used only for badge text, leaving the base tokens (icons, borders, which only need 3:1) untouched. Focus ring itself already passed. Didn't touch the colours unilaterally without checking first — these are brand-adjacent choices — but Craig said "that's fine" so it shipped.

### 4. Hub/portal noindex hardening
Found `/hub/*` was already fully noindexed (unconditional `robots: {index:false}` in `app/hub/layout.tsx`, on top of `robots.ts`'s disallow) — nothing to do there. `/portal/*` had no equivalent. Added the same defense-in-depth pattern (`app/portal/layout.tsx` metadata-only wrapper + `robots.ts` disallow entry).

### 5. Blog SEO fixes
Meta/OG descriptions were raw excerpt text truncated at 199–200 chars (past Google's ~155–160 display limit, cut mid-sentence, one sample leaking a literal `&nbsp;` into the snippet). Added `lib/seo.ts`'s `cleanMetaDescription()` — decodes entities, re-truncates at a word boundary — used in `generateMetadata` and the Article JSON-LD, presentation-layer only, doesn't touch the DB. Converted 4 of 5 raw `<img>` tags to `next/image` (left the 5th — an author avatar — alone after a direct rejection mid-session). Added an "Explore" links block (Exercise for Health / Cancer Rehabilitation / Personal Training) to the blog post sidebar — there were previously zero internal links from blog posts to condition pages. Sitemap `lastModified` now uses `updated_at` instead of `published_at`.

### 6. Site Content — rebuilt into a full inventory (Craig's request, OpenDesign mockup supplied)
Was tracking only the 9 static marketing pages. Migration `20260721_site_content_full_inventory.sql` added a `page_type` column (static/condition/legal/blog), replaced the `pending/reviewed/needs_rewrite` status enum with `published/needs_writing/needs_updating` (clearer language, matches how Craig actually talks about page state), and seeded 38 new rows: 3 legal pages, all 8 exercise-for-health condition pages (3 built + 5 gated/unbuilt), and all 27 blog posts. 47 total.

List page (`site-content-table.tsx`) rebuilt twice — once from scratch matching the general "add filters, KPI tiles" ask, then rebuilt again when Craig supplied the actual OpenDesign mockups (`hub-site-content.html`/`hub-site-content-editor.html`) to match them precisely: select-dropdown filters with live counts (not pill buttons), a separate URL column, a "Rescan pages" button (visual only, not wired to real page-discovery logic). Editor page reworked to match too, and in the process caught a real bug the mockup surfaced: the status `<Select>` still offered the old `pending`/`reviewed`/`needs_rewrite` values, which the DB constraint had stopped accepting — saving with an old value would have hit a silent constraint violation.

Deliberately not built: per-page content editing for the 38 new rows. Only the original 8 static pages have `page_content_blocks` entries; new rows show as inventory-only ("—" instead of "Edit copy"), no broken/no-op editor links.

### 7. Hub-wide icon/status-colour audit — the big one
Craig caught the Site Content mockup mismatch (icons and colours swapped between "Needs Writing"/"Needs Updating") and asked if it was systemic. Dispatched 8 parallel Explore agents, one per hub page with a source mockup, each diffing icon shapes and `--status-*` tokens against the mockup HTML precisely (not from memory). **6 of 8 pages had real defects**, several serious rather than cosmetic:
- Dashboard: `StatusBadge` got a token name instead of a status value → silently rendered nothing on every "Recent Check-ins" row.
- Reports & Updates (`lib/updates/status.ts`, shared with the client-detail Updates tab): raw shadcn `Badge` variants instead of design tokens → "Sent" was literally invisible (white-on-white), "Draft" was teal instead of amber, "Scheduled" was a plain outline instead of rose.
- Client detail: 3 card-header icons missing/wrong colour, GP Clearance badges same invisible/wrong-colour pattern, Plan Agent bot navy instead of teal throughout, Profile tab icon wrong (group vs single-person).
- Client edit: 5 of 8 card-header icons wrong shape, including one the mockup deliberately reused from the Plan Agent sidebar icon that got replaced with a generic clipboard.
- Process & Quality: SOPs KPI tile wrong colour+icon; separately, a local "draft" badge coloured rose when the shared system says draft = neutral everywhere else.
- Exercise library: one cosmetic icon mismatch.
- Clean: `/hub/clients`, `/hub/studio-equipment`.

Root cause of most of the real bugs: pages built their own disconnected status-colour system instead of the shared `lib/hubStatus.ts` tokens — introduced during the Lane E/F restyle passes. Fixed by extracting a shared `TokenPill` component (`components/hub/StatusBadge.tsx`) for status domains that collide with the global string lookup (e.g. "sent"/"draft" already mean something else for documents), and moving every raw-`Badge` call site onto it.

Also fixed two shared-component bugs hitting every hub page: `HubCardHeader`'s icon badge was 36px vs the mockup's 30px; `HubAlert`'s danger severity used the same triangle icon as warning (so "Do Not Train" and "Action needed" were only distinguishable by colour). Bonus: fixed `HubCardHeader`'s `subtitle` prop type (was `string`, needed `React.ReactNode`) — this was the actual root cause of the `ClientUpdatesPanel.tsx:60` TS error that's been flagged "pre-existing, unrelated" three separate times across this Work Order. `tsc --noEmit` is now completely clean project-wide for the first time.

One more bug Craig caught after this shipped: a literal `/* Needs Attention */` JS comment sitting unwrapped in the dashboard's JSX tree, rendering as visible text on the page instead of being treated as a comment. One-line fix (wrap in `{}`), shipped separately.

### Verification standard used throughout
Every fix: `rm -rf .next && tsc --noEmit` clean, full `next build` clean (except the known pre-existing Windows/OneDrive `EPERM` symlink step in the standalone-output trace phase — irrelevant to Coolify's Linux build), then commit → push → Coolify deploy confirmed via the MCP tool (`deployment get`, checking `status: finished` + healthcheck pass), not trusted from a self-report. No hub login credentials available this session, so hub pages were verified via build/type-check/code-review rather than a live browser click-through — flagged each time, not silently assumed working.

### Still open
- PAR-Q edit screen inside the hub still uses the shared public-facing `ParqEditClient` component's own (unrestyled) internals — deliberately not touched, that component is also live on the public client-signing flow and a deep edit risked breaking it. Needs a scoped decision (fork a hub-native copy vs. leave as-is) before anyone touches it.
- 5 of 8 condition sub-pages still don't exist — gated off, not dead links, but a scope decision (which/how many to build) is still pending.
- Production domain cutover, client data consolidation (Lane A), Process Register/SOP content review (Lane B — seeded but Esther hasn't reviewed), PAR-Q→document-engine migration run (Lane C) — none of these were touched this session, all still open from 2026-07-20.

## Lane F — full hub design-consistency sweep, remaining routes (2026-07-20, later session)

### What was built
Added Lane F to the existing hub consolidation Work Order (`.context/workorder-eternal-fitness-hub-consolidation-2026-07-20.md`) to restyle every hub route that had no source mockup: `PackagePaymentsCard.tsx` button fix, `clients/new`, training delivery pages (block/review/print/session), PAR-Q (list+edit), agreements (list+detail), top-level documents register, settings (plan-agent+training-rules), site-content (list+editor), site-review, templates (list+editor), tracker, and the three hub auth screens (login/forgot-password/reset-password). 12 units total, all landed against the token system documented in `D:\apps\design-systems\brand-staging-2662e9\DESIGN.md`.

### How it was actually delivered
First attempt was 4 parallel `opencode run` CLI launches — all four stalled at bootstrap (36 min, near-zero CPU, zero file changes) and were killed. Craig redirected: Claude Code took over implementation directly via Haiku subagents (one per unit, token-efficient model for mechanical restyle work) instead of the OpenCode CLI. All 12 units landed this way across 3 batches.

### Verified, not just self-reported
Every unit was independently checked by Claude Code (Sonnet, this session) via `git diff` review plus `tsc --noEmit`/`npm run build`, not trusted from the subagent's own report. Caught and fixed 3 real issues before calling anything done:
- **Tracker page** — a subagent removed the `sm:` responsive breakpoint from the KPI tile grid, incorrectly claiming it matched the dashboard (the dashboard actually uses `lg:grid-cols-3`, still responsive). Reverted to `sm:grid-cols-3`.
- **Templates page** — a subagent mapped "template active/inactive" and the PAR-Q "Form" tag onto `StatusBadge status="signed"`, which would have shown a misleading green "Signed" badge for an active template (conflating document-signed status with template-active status). Fixed to `status="active"` (resolves via `blockStatusMap`) and a plain neutral "Form" badge.
- **Hub auth screens** (login/forgot-password/reset-password) — a subagent used `font-400` and `text-muted-text`, neither of which are real classes in this project's Tailwind config (no `fontWeight` extension, no `muted-text` color key) — both silent no-ops. Fixed to `font-normal` and `text-[var(--color-muted-text)]` across all 3 files (9 occurrences).

One unit (`clients/new`) also went beyond a pure token restyle — Contraindications/Pain Points moved from plain `Input` to `TagMultiSelect`, Training Location/Sessions-per-Week from `Select` to `SegmentedControl` — checked against the sibling `clients/[id]/edit/page.tsx` and confirmed it matches an already-shipped, already-proven pattern rather than introducing something new.

### Not done
- **Not pushed** — 21 files changed locally, all verified, `git push`/deploy is `[GATE]` per the standing rule. Awaiting Craig's go-ahead.
- Full-project `npm run build` still ends in the known pre-existing Windows/OneDrive `EPERM` symlink error at the file-tracing step (unrelated to any of this session's changes, confirmed present on unmodified code too).

## Remaining hub screen mockups restyled — dashboard, exercises, process & quality, reports/updates, SOP detail, studio equipment (2026-07-20, later session)

### What was built
Craig dropped 6 new mockups into `D:\apps\design-systems\brand-staging-2662e9` (`hub-dashboard.html`, `hub-exercise-library.html`, `hub-process-quality.html`, `hub-reports-updates.html`, `hub-sop.html`, `hub-studio-equipment.html`) and asked for them to be wired in, restyle-only (any functionality shown that doesn't already exist in the hub is explicitly out of scope). An Explore agent scoped mockup → live-component mapping first; six OpenCode units then restyled each screen in parallel (sequencing the SOP-detail unit after Process & Quality since both touch `ProcessQualityManager.tsx`). Full detail and per-screen VERIFY notes are in `.context/workorder-eternal-fitness-hub-consolidation-2026-07-20.md`'s "Lane E (cont.)" section — not duplicated here.

### Two silent OpenCode failures caught during verification (neither surfaced from the unit's own self-report)
1. **Studio equipment, first attempt:** planned the entire restyle in prose ("Let me write the new page.tsx...") then exited with code 0 having never called Write/Edit — files on disk were untouched (mtimes from July 9/11). Caught via `git diff`/mtime check, not the CLI's reported success. Re-dispatched with an explicit "you must call Write before ending your turn" instruction; the retry worked.
2. **Dashboard unit:** left an unclosed `/* Recent check-ins */` JSX comment (missing the closing `*/}`) that broke `tsc` project-wide. The unit's own isolated check didn't catch it; a full-project `tsc --noEmit` run after all units landed did. Fixed directly (one-line).

### Verification done
- `npx tsc --noEmit` across the whole project: clean except one **pre-existing, unrelated** error (`components/hub/ClientUpdatesPanel.tsx:60` — a `subtitle` prop typed `string` receiving a JSX element). Confirmed pre-existing via `git stash` (still present against clean HEAD `043a354`). Left alone — out of scope, flagged for Craig.
- `pnpm build`: compile step is clean ("Compiled successfully"); the build then hits an `EPERM`/`symlink` failure during Next's `output: standalone` file-tracing step — a pre-existing Windows/OneDrive filesystem permission limitation on this dev machine, unrelated to any of this session's code changes.
- **Not done:** live visual verification. Dev server was running at `localhost:3001`, but the hub login connects through to the real production DB (`DATABASE_URL` in `.env.local` points at the `localhost:5433` tunnel) and no credentials were available — rather than guess at a login, Craig was asked and chose to check the 6 screens himself instead of sharing credentials for a browser-automation pass.

### Committed and pushed (2026-07-20, Craig's go-ahead)
Two commits on `main`: `cebc3a1` (the six-screen restyle, 8 files/1034 insertions/580 deletions) and `e66c6ba` (this handoff/state/Work Order doc update). Pushed to `origin/main` (`043a354..e66c6ba`). Coolify auto-deployed (`ac82qg9h7wtawl2rgqyqa2md`, commit `e66c6ba`) — confirmed `finished` and app `running:healthy` on `https://staging.eternal-fitness.co.uk` via the Coolify MCP, not just a self-report. Craig's own visual check at `localhost:3001` was not confirmed back before the push — worth a live look at staging next session if anything looks off.

## Consent document type + document-engine token cleanup (2026-07-20)

### What was built
A brand-new `consent` document type for the document engine, matching the accessible
client-consent reader in `D:/apps/design-systems/brand-staging-2662e9/documents/client-consent.html`
(the `document-system.css` variant — **not** the `client-consent-alt.html` card-style variant; the
alt is flagged here as an alternative Craig could request instead).

### Files changed / added
- **`lib/documents/types.ts`** — added `'consent'` to `DocumentKind`; added `consent: "Consent"`
  to `DOCUMENT_KIND_LABEL`; added `consentGroups?: { id; legend; options: {key; label}[] }[]` to
  `DocumentBody`; added `consent_choices?: Record<string, boolean> | null` to `ClientDocument`.
- **`lib/documents/render.tsx`** — `DocumentBodyView` now accepts optional `consentChoices` /
  `onConsentChange` props and renders `body.consentGroups` as **real interactive React checkboxes**
  (not `dangerouslySetInnerHTML`) when both are supplied.
- **`app/documents/[id]/sign/DocumentSignClient.tsx`** — renders the consent groups (via
  `DocumentBodyView`), holds their state in `consentChoices`, and includes `consent_choices` in the
  POST body when the document has `consentGroups`. Also did the SCOPED token cleanup (see below).
- **`app/api/documents/[id]/sign/route.ts`** — accepts an optional `consent_choices` field from the
  request body and persists it on the `client_documents` row when present (client role only).
- **`supabase/migrations/20260720_consent_choices_column.sql`** (NEW, **NOT run**) — purely
  additive `ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS consent_choices jsonb;`
- **`supabase/migrations/20260720_consent_template.sql`** (NEW, **NOT run**) — seeds a
  `document_templates` row for `kind='consent'`, `requires_client_signature=true`,
  `requires_trainer_signature=false` (consent is client-only), `body.intro` + a single
  `What you need to know` section (verbatim note--plain wording) + the three `consentGroups`
  (content use / platforms / identification) with option wording copied exactly from the reference.
  Guarded with `WHERE NOT EXISTS` so it is re-runnable.

### SCOPED design-token cleanup (document engine only)
Replaced hardcoded hex / JS consts in `DocumentSignClient.tsx` and `render.tsx` with the app's OWN
existing Tailwind brand tokens — this surface now pulls from the same tokens as the rest of the app,
front-end left untouched:
- Removed `NAVY`/`ROSE`/`TEAL` JS consts. Header now `bg-charcoal` (was `NAVY #282B38`),
  `bg-rose` logo tile (was `ROSE #C1839F`), `text-rose` fitness mark.
- `text-rose` → `accent-rose` checkbox accent; `bg-teal`/`text-white` submit button (was `TEAL`).
- Page + done backgrounds `bg-warm` (was `#F5F5F5`); signed-banner `bg-warm`; dividers
  `border-border-warm` (was `#E5E5E5`). Done heading `text-charcoal`.
- `rose #C1839F`, `teal #087E8B`, `warm #F5EFEA`, `border-warm #E4DDD7` already exactly match the
  new design system's rose / teal / warm / warm-border. **No new token introduced.**
- `render.tsx` still hardcodes grey text hexes (`#525A61`, `#1E1E1E`, `#E5E5E5`, `#F5F5F5`) for the
  read-only HTML sections — left as-is; they are pre-existing and outside this unit's cleanup scope.
  Flagged for a later pass if Craig wants full token alignment there too.

### ⚠ Token discrepancy for Craig to decide (out of scope — NOT resolved here)
The new design system's `DESIGN.md` specifies `ink: #131313`, which is **darker** than this app's
existing `charcoal: #2D3436` (rgb 45 52 54). This unit deliberately used the existing `charcoal`
token (per instruction: do NOT introduce a new `ink` token, do NOT resolve the discrepancy). The
numeric difference is real: `#131313` (19 19 19) vs `#2D3436` (45 52 54). Craig should decide
separately whether the app's `charcoal` should move to the design system's `ink #131313` — that is a
sitewide token decision, not a document-engine one.

### Verified
- `npx tsc --noEmit` — **no type errors in any new/changed file.**

### GATEs NOT crossed (explicitly out of scope)
- **Neither new migration has been run.** Both `20260720_consent_choices_column.sql` and
  `20260720_consent_template.sql` are written but **NOT executed**. Running them against production
  is a separate step needing Craig's explicit go-ahead.
- No database connected to, no `pnpm/npm install`, no `git push`. Local commit only.

## Work Order — Craig's decisions + Lane B migration run (2026-07-20, ~12:40pm)

- **Trainerize:** Craig confirmed manual entry — client data will be typed into the hub by hand,
  not scraped/exported. Closes Lane A units 2/3's open decision; no import script needed. Roster
  is small enough that this is the right call, not a shortcut.
- **Lane D auth:** Craig approved the magic-link design in `.context/lane-d1-client-auth-design.md`
  as-is. Green light for Lane D unit 2 (build the portal view) to proceed — but the two remaining
  `[GATE]`s on Lane D (implementing login as a *live* surface on production, and inviting any real
  client) are unchanged and still need separate explicit go-ahead, consistent with how Lane B/C's
  DB writes were staged-then-gated.
- **Lane B migration run:** Craig gave explicit per-session authorisation to write to production
  Postgres for Lane B specifically. Ran `supabase/migrations/20260720_process_quality_system.sql`
  against prod via the standing Coolify tunnel (`127.0.0.1:5433` → `10.10.10.2:5432`, role
  `ef_app`, `DATABASE_URL` sourced from `.env.local`, never printed/persisted elsewhere). Migration
  is purely additive (`CREATE TABLE IF NOT EXISTS` × 3 + indexes, no ALTER/DROP on anything
  existing) and idempotent. **Confirmed live:** `process_entries`, `sops`, `improvement_log` all
  exist, all 0 rows (as designed — no content seeded). Runner script was a temp file inside the
  repo (for `pg` module resolution), deleted immediately after, nothing else touched. This
  authorisation was scoped to Lane B only — Lane C's PAR-Q migration script remains un-run and
  needs its own separate go-ahead per the Work Order's MUST clause.

## Work Order — Lane C, unit 1 — PAR-Q → document engine migration plan (planning only, no DB)

- **File-based read only — NOT a live-DB confirmation.** Reconstructed `signed_parq` and
  `document_templates`/`client_documents` schemas from `supabase/migrations/*.sql` only. No DB
  tunnel open this session; no connection to production Postgres was attempted or made.
- Verified current state: `document_templates` is seeded with `terms` (real copy), `risk_assessment`
  and `annual_review` (both dual-signed) — **no `parq` template exists yet**. `signed_parq` carries
  the full 29-question structure (q1–q29, split Sections 2/3/4/6) plus free-text detail fields and a
  single client declaration/signature, with versioning (`version`, `supersedes_id`) added by
  `20260710120000_parq_versioning.sql`.
- Produced `.context/lane-c-parq-migration-plan.md` covering: (1) current `signed_parq` schema
  reconstruction, (2) current engine schema, (3) a field-mapping plan for a new `parq`
  `document_templates` entry — a `body` JSON of `{ intro, sections[html], data:{ answers, details,
  personal, signature } }` that preserves the 29-question structure used by `scripts/import-parq.mjs`,
  (4) a migration-script **skeleton only** (not run), and (5) a parity/verification checklist.
- Key mapping decisions: q1–q29 → `body.data.answers`; detail fields → `body.data.details`;
  personal/GP/emergency → `body.data.personal`; signature → `body.data.signature`. Top-level
  `client_id`/`kind='parq'`/`title`/`template_id`/`template_version`/`body`/`client_signature`/
  `client_signed_date`/`status`/`version`/`supersedes_id`/`signed_at` map directly, with legacy
  `status` values folded into the engine's `draft/sent/signed/superseded` set. Migration must also
  recompute `anyYes` → preserve `clients.medical_clearance_status` + `client_tracker.clearance_*`
  (same rule the import script uses), keeping it idempotent.
- **Colin-flow caveat acknowledged**: legacy `signed_parq` RLS is authenticated-only (anon INSERT
  policy was dropped in `20260603_*`), so a logged-out client resume link fails — the migration
  moves PAR-Q onto the engine's service-role public-read pattern, resolving it.
- **Gates (not crossed)**: running the migration needs Craig's explicit per-session prod-DB go-ahead;
  retiring `signed_parq` / the `/agreement` form is gated until 1:1 parity is proven. Neither was
  done — planning artifact only.

## Work Order — Lane A, unit 1
- **Audit complete (read-only local research, no DB touched).** Full field-by-field map written to `.context/lane-a-client-field-map.md`.
- **`clients` table is the intended single source of truth** for per-client commercial + clinical + compliance state. Every column from `20260509` (base), `20260630` (profile extensions), and `20260704` (master consolidation) is actively read/written by the hub UI.
- **Columns sourced from *other* migrations** that the consolidation view (`client_documents_summary`) exposes: `client_number`, `display_code`, `email`, `phone`, `gp_letter_*`, `annual_review_due_date`, `clearance_from`, `specialist_name`, `block_summaries`.
- **Dead / unused `clients` columns flagged:**
  - `display_code` — view-only (computed on the fly in the UI); no TS/TSX reference.
  - `clearance_from` — backfilled from `client_tracker` but never read by the app; the read path still uses `signed_agreements.medical_clearance_from`.
  - `specialist_name` — same as above; never read anywhere.
  - **Consolidation loose-end:** `clearance_from`/`specialist_name` were moved onto `clients` but the UI read path was never repointed off `signed_agreements`.
- **Related dead surface:** `client_tracker` is historical-only (not written by app); its clearance join was dropped from the rebuilt `client_documents_summary` view.
- **Next unit (A2):** determine the actual Trainerize client-data export path — no existing client-data script exists (only `scripts/scrape-trainerize-exercises.mjs`, a different data type).

## Work Order — Lane B (2026-07-20) — Process & Quality System, DB-backed

- **Task**: Port `decoded-ops-hub`'s `OperationsFramework.tsx` three-tab pattern (Process
  Register / SOPs / Improvement Log) into the EF hub as a **DB-backed** module so Esther can
  edit entries herself with no code deploy (decided 2026-07-20, replacing the original
  hardcoded-TSX approach).
- **Read-only reference**: `D:\apps\decoded-ops-hub\src\components\decoded-ops\operations/OperationsFramework.tsx`
  (confirmed structure: `ProcessEntry[]` / `SOP[]` / `ImprovementEntry[]`, tabs Process
  Register · SOPs · Improvement Log — plus Overview and AI Systems tabs that are Decoded-Ops
  specific and were intentionally **not** ported). No edits made to the decoded-ops-hub repo.
- **Migration** (`supabase/migrations/20260720_process_quality_system.sql`): creates
  `process_entries`, `sops`, `improvement_log` matching the TSX shape, adapted to EF (single
  brand — dropped `service` line, replaced with a free `area` text field; dropped the AI
  `skills[]` array as not relevant to EF). `sops.steps` stored as `jsonb`. FK-by-reference via
  `ref` strings (no hard FK — keeps entries independently editable). Tables ship **empty**; no
  content seeded. **NOT run** — needs Craig's explicit per-session prod-DB go-ahead.
- **Types** (`types/index.ts`): added `ProcessEntry`, `Sop`, `ImprovementEntry`, `ProcessStatus`.
- **UI** (`app/hub/(protected)/process-quality/`): server page reads all three tables via the
  existing supabase server client; `ProcessQualityManager.tsx` is a client component rendering
  the three tabs with the hub's own design system (`HubCard`/`HubCardHeader`/`EmptyState`/
  `Button`/`rose`/`teal`/`amber` accents — not Decoded Ops' `.doa-*` classes). Each tab has an
  inline add/edit form (reusing `Input`/`Label`/`Textarea`) and row edit/delete, wired to new
  API routes. Renders empty states until Esther adds content. Added sidebar nav link under
  "Resources".
- **API routes**: `app/api/process-entries` (+ `[id]` PATCH/DELETE), `app/api/sops` (+
  `[id]`), `app/api/improvement-log` (+ `[id]`) — all GET/POST/PATCH/DELETE, auth-gated via
  `supabase.auth.getUser()`, mirroring the existing `/api/equipment` pattern.
- **Verified**: `npx tsc --noEmit` passes for all new files (two pre-existing errors in
  `exercise-browser.tsx` and `ClientUpdatesPanel.tsx` are unrelated). Did **not** run the
  migration, did not write to any DB, did not run `next build`, did not `git push`.
- **Remaining / not done**:
  - Migration must be run against prod Postgres (Coolify SSH tunnel) with Craig's explicit
    go-ahead before the module works — tables don't exist yet.
  - EF-specific **content** (Process Register entries, the three required SOPs — migrate a
    client / onboard a new client / build a plan in the hub, and any Improvement Log entries)
    is not written; Esther/Craig supply it via the new admin UI once tables exist.
  - Decoded-Ops' "Framework Overview" and "AI Systems" tabs were intentionally omitted (not
    EF-relevant). Could add an EF-flavoured Overview tab later if wanted.
  - No row-level locking beyond supabase auth (any hub user can edit) — fine for a 1–2 person
    studio; revisit if multi-staff access is needed.

## Work Order — Lane A, unit 2 — Trainerize client-data export plan (research, unverified)

- Created `.context/lane-a2-trainerize-export-plan.md`.
- The existing scraper (`scripts/scrape-trainerize-exercises.mjs`) uses **headless Playwright
  trainer-login** on the `eternalfitness8` tenant, reading DOM — no API/token. It handles
  *exercise* data, a different type from client records; there is no existing client-data
  export script.
- Ranked export options: **manual read-and-type** (likely default for small roster) > **native
  CSV export** (if the tenant plan exposes it) > **screen-scrape** (extend existing script) >
  **partner API** (unlikely, no API usage today).
- **Explicitly unverifiable in this environment** — no Trainerize credentials or browser session
  available, so no real client was tested. The Work Order's VERIFY criterion ("worked example on
  one real client") cannot be met here. To close: Craig opens a session with browser access +
  his Trainerize login, confirms the tenant's export capability, and runs one real client through
  the chosen method. Treat the plan doc as a feasibility hypothesis until then.
- Constraints honoured: no DB access, no installs, no push — local commit only.

## Work Order — Lane D, unit 1

- **Unit:** Lane D (Client portal MVP), unit 1 — Design client auth approach
- **Type:** DESIGN ONLY / GATE unit (no implementation, no DB, no code)
- **Date:** 2026-07-20
- **Author:** Claude Code (design pass)
- **Artifacts:**
  - `.context/lane-d1-client-auth-design.md` — recommended approach (passwordless magic-link, separate better-auth instance, per-client data scoping), conflict analysis vs existing trainer/staff auth, WCAG 2.2 AA check of the login flow, open questions for sign-off.
- **Key findings:**
  - Existing staff/trainer auth = better-auth email+password (`lib/auth.ts`), session cookie guarded by `middleware.ts` + `app/hub/(protected)/layout.tsx`. Single user table, no role/tenant concept.
  - Recommended client auth = **magic-link via a second, separate better-auth instance** writing its own cookie, on `/portal/*` routes, each account bound 1:1 to a `clients.id` and server-filtered to that client's own data. Staff auth path left untouched (additive, not modifying).
  - Login flow meets Work Order AA baseline (no CAPTCHA, no puzzle 2FA, keyboard-operable) by design.
  - `EF_Trainerize_Accessibility_Scope_Jul2026.md` **not found in repo** — AA checks derived from the Work Order's stated baseline; re-verify against the charter file if located.
- **GATE status:** This unit is a GATE per the Work Order ASK FIRST list ("Adding client authentication/login as a new surface"). Design is for review/sign-off; Lane D unit 2 (build) and the live-auth GATE require explicit approval before proceeding.
- **Next:** Craig reviews approach + open questions (§5 of design doc); on sign-off, proceed to Lane D unit 2 (build read-only portal view).

## Work Order — Lane C, unit 2

- **Task**: Build the PAR-Q `document_templates` entry and a backfill/migration script that
  snapshots every existing `signed_parq` row into `client_documents` (kind='parq'), per the
  mapping in `.context/lane-c-parq-migration-plan.md` §3.
- **Deliverables (both written, neither executed)**:
  - `supabase/migrations/20260720_seed_parq_template.sql` — inserts the `parq` template row
    (structured `body` JSON with `intro` + 8 `sections` + a nested `data` block carrying
    `answers`/`details`/`personal`/`signature`). Mirrors the style of
    `20260704_risk_and_review_templates.sql`. `WHERE NOT EXISTS` guard so it is idempotent.
  - `scripts/migrate-parq-to-engine.mjs` — matches `scripts/import-parq.mjs` style (pg `Pool`,
    DATE/TIMESTAMP type parsers, `DATABASE_URL`, tunnel-aware ssl). Snapshots every legacy row
    oldest-first, re-points `supersedes_id`, re-derives `anyYes` → `clients.medical_clearance_status`
    + `client_tracker.clearance_*` (idempotent), and runs a 1:1 count-verification query. The
    `main()` call is **commented out** so it cannot run by accident. `node --check` passes.
- **1:1 field mapping** is documented in full as a header comment block in
  `scripts/migrate-parq-to-engine.mjs` and summarised in the migration plan §3. Key points:
  top-level `client_id`/`kind='parq'`/`title=full_name+' — PAR-Q'`/`template_id`/`template_version`/
  `body`/`requires_*`/`status`(mapped)/`client_signature`/`client_name`/`client_signed_date`/
  `version`/`supersedes_id`/`signed_at`/`sent_at`; nested `body.data.personal|answers|details|
  signature`. Legacy status mapping collapses the wider `signed_parq` set into the engine's
  four values (`received`/`sent`/`needs_update`→`sent`, `expired`→`draft`).
- **Explicit outstanding verification — NOT closable this session (do not fabricate a "verified" claim)**:
  there was **no database connection** this session (per the Work Order constraint and `[GATE]`).
  The 1:1 mapping is file-based only — reconstructed from `supabase/migrations/` SQL, never
  confirmed against live client records. The plan's own checklist (spot-check ≥3 real clients:
  e.g. Sarah Tyler, Colin Farley, one with a YES answer; confirm `body.data.answers` byte-equal;
  confirm clearance state unchanged) **was not performed**. Before running:
  1. Craig opens the Coolify SSH tunnel (`127.0.0.1:5433`→`10.10.10.2:5432`, role `ef_app`).
  2. Re-verify live schema with `psql \d signed_parq` / `\d client_documents` (a migration could
     have applied to prod outside this repo).
  3. Run `20260720_seed_parq_template.sql`, then `scripts/migrate-parq-to-engine.mjs` only with
     Craig's explicit per-session go-ahead.
  4. Spot-check ≥3 real clients and the verification count before the separate gated step of
     retiring `signed_parq` + the `/agreement` form.
- **Colin-flow caveat** (legacy `signed_parq` anon-read pitfall) is NOT addressed in this unit —
  it is a separate Lane C unit that must move PAR-Q resume links onto the engine's service-role
  public route. Flagged so it is not silently assumed solved.
- **Constraints honoured**: no DB access, no installs (`pg` already a dep), no push, no migration
  or script executed. Local commit only.

## Process note (2026-07-20)
Lane A/C/D's units 2 above ran as three parallel OpenCode processes that all read-appended-wrote
this same file concurrently, causing a lost-update race — several sections were silently dropped
from disk (though preserved in each unit's own commit diff, which is how this file was
reconstructed). Fixed by merging all sections back in chronological order. **Going forward:
handoff.md appends from parallel lane units should be serialized (one writer at a time, or Claude
merges after the fact) rather than left to concurrent agents.**

## Work Order — Lane D, unit 2 (2026-07-20)

Built the client portal magic-link auth surface and the read-only portal view, per the approved
design in `.context/lane-d1-client-auth-design.md` (magic-link, separate better-auth instance,
bound 1:1 to `clients.id`, server-filtered to the client's own data, staff auth untouched).

### What was built
- **Migration (NOT run):** `supabase/migrations/20260720_portal_auth.sql` — new isolated tables
  `portal_accounts`, `portal_sessions`, `portal_magic_links` (own `portal_` prefix, own cookie,
  `client_id` 1:1 FK, `disabled_at` for staff revoke, hashed single-use tokens). NO RLS policies
  for client roles — all reads are service-role, filtered by authenticated `client_id`.
- **Separate auth module:** `lib/portal-auth.ts` — self-contained magic-link request/verify/
  session/destroy over the `portal_*` tables. Distinct cookie `better_auth_portal_session`.
  `requestPortalMagicLink` emails only when a SendGrid/SMTP backend is configured; otherwise
  returns a `devLink` for review and sends nothing (Work Order rule: no auto-emit to clients).
- **API routes:** `app/api/portal/auth/request-link/route.ts` (POST, anti-enumeration — always
  `{requested:true}`), `app/api/portal/auth/verify/route.ts` (GET verify + set cookie + redirect;
  POST logout).
- **Session helper:** `lib/portal-session.ts` — reads the isolated portal cookie only.
- **Middleware:** extended `middleware.ts` matcher to `/portal/:path*` (ADDITIVE — staff `/hub`
  guard rules unchanged; separate portal cookie check; redirects to `/portal/login`).
- **Login UI:** `app/portal/login/page.tsx` — magic-link request, WCAG 2.2 AA (skip link, focus
  ring, `type=email`+`autocomplete`, text+icon status, 44px targets, no CAPTCHA/puzzle 2FA).
- **Read-only portal:** `app/portal/layout.tsx` (slim client shell + sign-out) and
  `app/portal/page.tsx` — three sections reusing hub components (`HubCard`, `HubCardHeader`,
  `StatusBadge`, `EmptyState`): signed documents, outstanding/unsigned documents, update-email
  history. Data via `lib/portal-data.ts`, which filters **every** query by `client_id`.
- **WCAG doc:** `.context/lane-d2-wcag-check.md` — pass/fail per screen (all 3 screens PASS the
  baseline on build-time review; 8 ⚠ items are token-dependent confirm-in-browser checks).

### What's verified
- `npx tsc --noEmit` — **no type errors in any new/changed file** (pre-existing unrelated errors
  in the repo, not introduced by this unit).
- Reused existing hub data/token patterns; no new colour or contrast choices introduced.

### GATEs NOT crossed by this unit (explicitly out of scope)
- **No migration run**, no database connected to, no `pnpm/npm install`, no `git push`.
- **No real email sent / no real client account created** — magic-link emails only fire when an
  email backend is configured; otherwise the link is returned for staff review only.
- **Going live as a production auth surface** (Lane D `[GATE]`) — NOT done.
- **Inviting any real client** (Lane D `[GATE]`) — NOT done.
- Before either gate: run `20260720_portal_auth.sql` on prod (Craig's per-session go-ahead), then
  a browser/SR pass to clear the 8 ⚠ WCAG confirmations, then a two-account isolation test.

### Constraints honoured
No DB access, no installs, no push, no migration/script executed, no real email/account. Local
commit only.

---

## Document engine — real design system port

**Date:** 2026-07-20
**Scope:** `app/documents/[id]/sign/DocumentSignClient.tsx`, `lib/documents/render.tsx`,
`components/documents/DocumentView.tsx` (new), `components/documents/DocumentAccessibilityControls.tsx` (new),
`app/globals.css` (document-engine block appended), `.context/handoff.md` (this entry).

### What changed
The earlier pass only swapped a few JS colour consts — the document pages still rendered with the
old dark-charcoal `BrandHeader` block and unstyled `dangerouslySetInnerHTML` sections. This rebuild
ports the **actual visual structure** from the canonical reference
(`D:/apps/design-systems/brand-staging-2662e9/documents/client-consent.html` +
`document-system.css`) so the live documents match the new brand.

New shared component `DocumentView` renders, in order, for **every** document kind:
1. **Masthead** — light warm/white surface (NOT the old dark charcoal block; the reference
   masthead is light), with EF rose-heart logo mark + "Esther Fair — Level 4 Personal Trainer /
   Private studio, Worthing, West Sussex" org text.
2. **Eyebrow** (`Client document NN`, per-kind number) + **serif italic display title** (DM Serif
   Display via existing `--font-serif`) + **standfirst** paragraph.
3. **Meta info list** — Document / Completed by / Review / Reference (per-kind reference code).
4. **Accessibility toolbar** — Text size Normal/Larger/Largest + High-contrast toggle + Print,
   persisted to `localStorage` (`ef-doc-text`, `ef-doc-contrast`) and reflected onto `<html>`
   `data-text` / `data-contrast` attributes exactly like the reference's inline script, ported to
   a React effect (`DocumentAccessibilityControls`). These are functional client features for EF's
   visually-impaired population, not decoration.
5. **Intro + numbered sections** (eyebrow numeral + serif H2 + body), 18px minimum body text,
   generous spacing, hairline rules.
6. **Consent groups** — for `consent` docs, rendered as real interactive checkboxes styled with the
   new `.consent` card style (interactive state wired to React state, captured on submit).
7. **Sign-boxes** — name/date/signature fields + sign-box visual style (Signed / Date / Logged).
8. **Footer** — review + accessibility note.

CSS was added to `app/globals.css` as a self-contained document-engine block, bound to the repo's
**existing** brand tokens (rose `#C1839F`, teal `#087E8B`, warm `#F5EFEA`, border-warm `#E4DDD7`,
charcoal/ink, etc.) and the already-loaded `font-serif` (DM Serif Display) / `font-body` (DM Sans).
**No new hex values, no new fonts, no new dependencies.** `color-mix()` is used to derive accessible
tints from the registered tokens, matching the reference's approach. High-contrast and A4 print/PDF
rules included.

### Applies to all four document kinds
It is a single shared component (`DocumentView`) consumed only by `DocumentSignClient`. The
masthead/title/sections/footer render from `doc.body` + `doc.kind`; the eyebrow number, reference
code, and meta "Document" line are keyed off `doc.kind`. **Fixing the structure fixes terms,
risk_assessment, annual_review, and consent at once** — not just consent.

### Functionality preserved (no regressions)
- Signing flow (`/api/documents/[id]/sign` POST with name/signature/date + `consent_choices`).
- `consent_choices` capture + re-render interactively inside the body.
- Already-signed state (shows "signed by … on …" note, no form).
- `done` / already-signed confirmation screen (restyled to match).
- Validation + inline error summary.

### What was NOT touched
Template editor (`app/hub/(protected)/templates/[id]/`) — it only edits content, it does not render
the document visually, so no matching visual update was required. Marketing front-end and public
pages untouched. No migration, no DB connection, no install, no push.

### Verified
- `npx tsc --noEmit` — no type errors in any changed/new file. (Two pre-existing unrelated errors in
  `exercise-browser.tsx` and `ClientUpdatesPanel.tsx` are untouched by this work.)
- All brand tokens/fonts reused — zero new colour literals or font loads.

### Next (manual, Craig)
Browser + screen-reader pass on a real document to confirm the contrast toggle and text-size
controls behave; then local review + push.

## Hub client detail/edit pages — design audit + fixes (2026-07-20)

### What was wrong vs the reference mockups
References: `D:/apps/design-systems/brand-staging-2662e9/hub-client-detail.html` and `hub-client-edit.html`.

**Detail page (`app/hub/(protected)/clients/[id]/page.tsx`)**
- Tabs used a shadcn underline `TabsList`/`TabsTrigger` (bottom-border, no fill). Reference uses a
  **raised pill container** (`bg-hub-card`, `border-hub-border`, `rounded-xl`, `p-1`, `shadow-sm`)
  with the active tab as a rose-tint **fill** = `var(--hub-sidebar-active)` (`rgba(193,131,159,.14)`).
- Header meta chips were plain `<Badge>`s. Reference uses label+value `chip-kv` chips on
  `bg-hub-card` with a `border-[var(--hub-border)]`, `rounded-lg`, placed under the title.
- Outline "Edit" button border was the default shadcn ring colour. Reference outline buttons use
  `var(--color-muted-text)` (`#7E8088`) for a deliberate 3:1 border contrast.

**Edit page (`app/hub/(protected)/clients/[id]/edit/page.tsx`)**
- Cards used shadcn `Card`/`CardHeader` (no icon, no bottom divider, different radius). Reference
  uses `HubCard` + `HubCardHeader` (icon + title + subtitle, divider under header).
- Field controls that should be **segmented controls** (training_location, sessions_per_week,
  time_tier, fitness_level, pace_mode) were rendered as **dropdown `Select`s** in several places.
  Reference uses segmented controls for these discrete choices.
- Field borders used `--hub-field-border` (`#C7CCD4`), which is below 3:1 on the canvas. Reference
  deliberately uses `var(--color-muted-text)` (`#7E8088`) for input/select borders (3:1 contrast).
- Buttons used `rounded-xl`/`rounded-md`. Reference buttons are `rounded-lg` (8px).
- No sticky save bar / dirty-state. Reference shows a bottom sticky bar with "No changes yet." /
  "Unsaved changes." based on form dirty state.

### What was fixed
- Detail: tabs → raised pill container + rose-fill active; meta → label+value `chip-kv` on
  `bg-hub-card`; outline Edit button border → `var(--color-muted-text)`.
- `components/hub/HubCardHeader.tsx`: added `noDivider` prop; root now renders a
  `border-b border-[var(--hub-border)]` divider by default (matches both mockups — detail and edit
  cards both show a header divider).
- Edit: all `Card`→`HubCard`+`HubCardHeader` with icon/title/subtitle; added `SegmentedControl`
  helper and replaced the dropdown controls with segmented controls for the 5 fields; form inputs /
  textareas / `SelectTrigger`s / `TagMultiSelect` trigger / `InjuryHistoryTable` + `TrainingRulesEditor`
  inputs all use `border-[var(--color-muted-text)] focus(-visible):border-rose focus(-visible):ring-rose/30`;
  checkboxes use `border-[var(--color-muted-text)] accent-rose`; Cancel/Save buttons `rounded-lg` with
  muted outline border; sticky save bar wired to a `dirty`/`markDirty` state ("No changes yet." /
  "Unsaved changes."), reset on load and on save.

### What was already correct (no change needed)
- `HubSidebar.tsx` — confirms to the mockup sidebar.
- `clients-table.tsx` — confirms to the mockup clients list.
- `app/globals.css` token layer — values confirmed baseline-correct against the reference
  (`--hub-canvas` `#F4F5F7`, `--hub-card` `#FFFFFF`, `--hub-border` `#E6E8EC`,
  `--hub-sidebar-active` `rgba(193,131,159,.14)`, `--color-muted-text` `#7E8088`, `--hub-hover`
  `#F8F9FB`; `rounded-lg` = 8px). No token values changed.
- `HubCard` radius stays `rounded-2xl` (acceptable — the reference cards read as a larger radius).

### Verified
- `npx tsc --noEmit` — no type errors in any changed file. (Two pre-existing unrelated errors in
  `exercise-browser.tsx` and `ClientUpdatesPanel.tsx` are untouched by this work.)
- All brand tokens/facets reused — zero new colour literals or font loads.

### Not touched (per scope)
No migration, no DB connection, no install, no push. Marketing front-end, `HubSidebar.tsx`,
`clients-table.tsx`, and the document engine (`app/documents/`, `lib/documents/`,
`components/documents/`) intentionally out of scope.

### Next (manual, Craig)
Local browser pass on a real client detail + edit screen to confirm tabs, chips, segmented controls,
and the sticky save bar render as intended; then local review + push.

## Document email sending (2026-07-20)

### What was built
Client documents can now be emailed to the client with their signing link, plus a manual copy-link
fallback. Three behaviours per Craig's request:
1. PRIMARY action = email the client the sign link (first send or resend).
2. SECONDARY action = copy the sign link (always available) for manual resend via text/WhatsApp.
3. Once `status` is not `draft`, the primary button flips to "Resend email".

### Files changed / added
- **`lib/email-templates/document-ready.ts`** (NEW) — `buildDocumentReadyEmail(input)` reuses the
  existing `buildBrandedUpdateEmail` from `shell.ts` (shell.ts NOT modified). Carries a rose
  (`#C1839F`) rounded inline-styled CTA button linking to the sign URL, plus a short friendly intro
  and "what to do / why it matters" sections. Input: `clientName`, `greetingName` (first name),
   `documentTitle`, `signUrl`. The CTA is the rose `#C1839F` rounded button rendered inside the branded shell.
- **`app/api/documents/[id]/route.ts`** — PATCH now supports `action: "send_email"`. Uses
  `createAdminClient()` (same pattern as the public GET sign route) to read the document's
  `client_id`, then looks up the client's `name`/`email` from the `clients` table. Builds the email
  via `buildDocumentReadyEmail`, sends via `getEmailSender().send({ to, subject, html })`, then sets
  `status → "sent"` and `sent_at → now` (regardless of first send or resend). Returns
  `{ success: true, dryRun }` so the UI can tell Craig whether a real backend fired. If the client
   has no email on file, returns **400** with a clear message pointing Craig to add one on the client record.
- **`app/hub/(protected)/clients/[id]/documents/[docId]/page.tsx`** — now fetches the client's
  `name`/`email` (second select on `clients` via `doc.client_id`) and passes `clientEmail` to
  `DocumentDetailClient`.
- **`app/hub/(protected)/clients/[id]/documents/[docId]/DocumentDetailClient.tsx`** — the "Send to
  client" card restructured: PRIMARY button "Send email to client" / "Resend email" (disabled with an
  inline note when `clientEmail` is empty/null), SECONDARY always-available "Copy link". After send,
  the toast reports a real send vs a dry run so Craig isn't misled when a client reports nothing
  arrived.

### Design notes / constraints honoured
- No migration run — reused existing `status` / `sent_at` columns.
- No direct DB connection outside the app's normal Supabase clients.
- `shell.ts` untouched — other live emails still depend on it.
- Marketing front-end and `components/documents/` visual redesign intentionally out of scope.

### Verified
- `npx tsc --noEmit` — no new type errors in any changed file. (Two pre-existing unrelated errors in
  `exercise-browser.tsx` and `ClientUpdatesPanel.tsx` remain, untouched.)
- **No real email was sent during the build.** The live `send_email` action was NOT invoked against
  any real document; verification was type-check only.

## Session close — 2026-07-20

Full-day session on the Work Order above (`workorder-eternal-fitness-hub-consolidation-2026-07-20.md`).
Summary for whoever picks this up next — the entries above have the full detail per unit.

**Shipped and live on staging:**
- Lane B: Process & Quality System module + migration (tables live, empty — no content yet).
- Lane D: magic-link auth + read-only portal view — code built, **not deployed as a live auth
  surface**, no real account exists.
- Lane E (added mid-session, Craig-directed, not in original scope): full brand design-system port
  into the document engine (all 4 document kinds), new `consent` document type with real interactive
  checkbox capture, hub client detail/edit pages aligned to the reference mockups, a focus-ring fix,
  and document email-sending (primary = email, fallback = copy link, resend once sent).
- Two prod DB writes made with Craig's explicit per-session go-ahead, both additive-only, verified
  live: Lane B's three tables, and the `consent` template + `client_documents.consent_choices` column.

**Not started / still open:**
- Lane A: no client data has actually been consolidated into the hub yet (method decided — manual
  entry — but no records typed in).
- Lane B: Process Register entries + the 3 required SOPs — needs real input from Craig/Esther, not
  something to write blind.
- Lane C: PAR-Q migration script exists but has not been run against prod, and its 1:1 parity has not
  been spot-checked against real client records (needs a DB tunnel session).
- Lane D: independent WCAG walkthrough (the existing doc was a self-check during the build), then two
  `[GATE]`s — deploy the auth surface live, invite a first real client.
- Broader hub design sweep beyond client list/detail/edit — explicitly deferred when scoped down.

**Two real bugs caught and fixed before shipping** (worth knowing about even though they're already
fixed): a shared-component default change would have silently altered 18+ untouched hub pages
(`HubCardHeader` divider — flipped to opt-in); the new consent-document email built a `signUrl`
variable but never put it in the HTML, so the button the email text promised didn't exist.

**Process lesson**: parallel OpenCode instances writing to the same shared file
(`.context/handoff.md`) caused a lost-update race earlier in the session — recovered from each unit's
commit diff, then avoided by not letting concurrent units free-append to a shared file. OpenCode's own
"done" self-report was not fully reliable — real verification (git history, `tsc`, and for
design/UX asks, the live site via browser automation) caught issues the self-report missed every time
it was actually checked.

**Registry**: `infrastructure/.context/active-workorders.md` reflects current status. Work Order
itself has an updated DONE checklist and a new Lane E documenting today's Craig-directed work.

## Client detail page — full redesign rollout + tab restyle (2026-07-20, later session)

Craig reported UI issues on the client detail page (greyed-out email button, a stray chevron,
misaligned Snapshot card, and — key discovery — a full mockup he'd forgotten was in the design
folder). Investigation + implementation ran in two passes.

### What was found
- **Email button "grey"**: not a bug — `DocumentDetailClient.tsx` disables the send button when
  `clients.email` is empty, with on-page text explaining it. Not resolved as a code fix; flagged
  for Craig to check the specific client's record.
- **Chevron / Snapshot alignment**: real, small issues — collapsible chevron only existed on the
  Profile tab's "Training Rules" section (`HubSection`'s `CollapsibleSection`); Overview-tab cards
  had doubled `px-5` padding (once from `HubCard`, once from an inner wrapper div).
- **The actual design gap**: `D:\apps\design-systems\brand-staging-2662e9\hub-client-detail.html`
  (found at the folder root, missed by an earlier narrower search of `documents/`/`preview/`/
  `ui_kits/`) is a complete, explicitly-1:1-modelled redesign of **all six client detail tabs** —
  Overview, Profile, Compliance, Training, Plan Agent, Updates — plus page header, severity banner,
  and tab strip. This had not been implemented; Lane E's earlier design-system pass only covered
  client list/detail/**edit** at a token level, not this full tab-by-tab layout.

### Pass 1 — full layout redesign (commit `2acaf4e`)
`app/hub/(protected)/clients/[id]/page.tsx` (+358/−291) + `components/hub/HubPageHeader.tsx`
(widened `title`/`subtitle` to `React.ReactNode`, additive, no callers broken):
- Page header: avatar-initials circle, client-number chip, `StatusBadge` inline with name, 5-chip
  key-facts row (Format/Pace/Session/Frequency/Referral) — all wired to real fields.
- Tab strip: per-tab icons + outstanding-count badges (Compliance = real outstanding count, danger
  tone on `do_not_train`; Updates = new `draftUpdatesCount` derived from `clientUpdates`).
- Profile tab: rebuilt from one long collapsible card into card-per-subject (Health spans full
  width; Baseline/Goals/Logistics/Notes/Training Rules paired) — this also resolves the chevron
  complaint, since nothing on the page is collapsible anymore.
- Training tab: block list converted from link-rows to a proper table.
- Compliance tab: added an info note on how status is derived, referencing the real
  `lib/compliance.ts`/`lib/hubStatus.ts` logic (not the mockup's fictional note).
- **Deliberately kept, not flattened**: Compliance/Training/Updates/Plan Agent kept their existing
  richer components (`DocumentRegister`, `ClinicalComplianceCard`, `GpLetterCard`,
  `ClientUpdatesPanel`, `PlanAgentTab`) rather than being replaced by the mockup's simpler static
  tables — those already do more (editable fields, per-row actions, chat UI) than the mock's
  placeholder example.
- **Honestly omitted, not fabricated**: mockup's "Photography consent" document row (no real data
  field) and its separate "Record" rail card (kept the existing Status/Active Block/Quick Actions
  rail instead, to avoid duplicating the client-number chip already in the header).
- Verified: `npx tsc --noEmit` and `npm run build` both pass; two pre-existing unrelated errors
  (`exercise-browser.tsx`, `ClientUpdatesPanel.tsx`) confirmed identical before/after via
  `git stash`.

### Pass 2 — restyle the four kept-as-is tabs (commit `211f3f7`)
Craig confirmed after Pass 1 deployed that Compliance/Training/Plan Agent/Updates still looked
visually old next to the redesigned Overview/Profile. Investigation found their cards, table
styling, and badge tokens were **already** aligned with the design system (already using
`HubCard`/`HubCardHeader` with the `color` prop, `StatusBadge`, the same border/hover table
conventions as the newly-restyled Training tab) — the one real, consistent mismatch was
**pill-shaped (`rounded-full`) buttons** where the mockup calls for `rounded-lg` (8px), per its own
explicit comment ("Hub buttons are rounded-lg (8px), NOT the 48px marketing pill").
Fixed (styling-only, no logic/props changed) in: `components/hub/DocumentRegister.tsx`,
`components/hub/SendDocumentLink.tsx`, `components/hub/ClinicalComplianceCard.tsx`,
`components/hub/ClientUpdatesPanel.tsx`, `components/hub/UpdateRowActions.tsx`,
`app/hub/(protected)/clients/[id]/PlanAgentTab.tsx` (button + chat-header icon radius).
`components/hub/GpLetterCard.tsx` had nothing to restyle (no bespoke buttons/badges/card wrapper).
Verified: `npx tsc --noEmit` clean (same two pre-existing errors, confirmed unrelated) + a full
`npm run build` passed clean.

### Flagged, not done
- `components/hub/PackagePaymentsCard.tsx` has the same `rounded-full` button pattern as the fixed
  files but was out of scope for this pass — Craig has not yet said whether to include it.
- Email-button "greyed out" report still needs Craig to confirm which client he tested with (real
  missing email vs. a genuine bug in the check).

### Deployed
Both commits pushed to `origin/main` (`2acaf4e`, then `211f3f7`) with Craig's explicit go-ahead
each time. Coolify auto-deploys on push to this repo (confirmed via deployment history — both
commits show `status: finished` within ~3 minutes of push) — live on
`https://staging.eternal-fitness.co.uk`.

## Process Register + SOPs content published (2026-07-20, background session)

Closes the Lane B content gap flagged throughout this file ("Process Register entries + the 3
required SOPs — needs real input from Craig/Esther").

### What was done
Drafted and published **10 real SOPs** (not the 3 originally scoped) + 10 matching Process
Register entries into the live, empty `sops`/`process_entries` tables. Content was grounded in
what's actually built — PAR-Q, risk_assessment/annual_review document templates, GP-letter
tracking (`GpLetterCard`), package/payment tracking (`PackagePaymentsCard`), the 6-week block
model and session structure in `project_specs.md`/`Skills/eternal-fitness-master/SKILL.md` — not
generic PT boilerplate.

**SOPs published** (ref — title): SOP-001 New Client Enquiry & Consultation · SOP-002 Client
Onboarding: PAR-Q & Medical Screening · SOP-003 Risk Assessment & GP Medical Clearance · SOP-004
Training Plan Creation (6-Week Block) · SOP-005 Session Delivery & Real-Time Adaptation · SOP-006
Annual Review & Ongoing Health Monitoring · SOP-007 Package Sales, Booking & Payment · SOP-008
Client Update Communication · SOP-009 Incident, Injury & Adverse Event Response · SOP-010 Client
Data Privacy & Health Record Handling. Each has the full `sops` schema (trigger, owner, what, good
looks like, ordered steps). Matching `process_entries` (PR-001..PR-010) cross-reference each SOP
via `sop_ref`, all `status='active'`, `reviewed='Jul 2026'`.

### How it was published
Ran a temp idempotent upsert script (`ON CONFLICT (ref) DO UPDATE`) against prod Postgres via the
standing Coolify tunnel — same pattern as the existing `scripts/import-parq.mjs`. **Craig gave
explicit per-session go-ahead** for this specific write after being asked which of three publish
options he wanted (direct DB write / paste into admin UI himself / review-then-run script). Runner
script and its data file were temp files inside the repo (for `pg` module resolution), deleted
immediately after running; `git status` confirms no tracked changes in `scripts/`. `DATABASE_URL`
sourced from `.env.local`, never printed or persisted elsewhere (per SOP-009 Secrets & Credential
Handling, itself one of the Decoded Ops framework SOPs this pattern was ported from).

### Verified
Script output confirmed `sops` and `process_entries` each have exactly 10 rows after the run
(counted via a `select count(*)` in the same transaction). Not yet verified in the browser —
Craig/Esther should open the hub's Process & Quality tab to confirm the content renders and reads
well before treating this as fully signed off.

### Not done
- `improvement_log` still empty — no incidents/improvements exist yet to log; will fill
  organically as SOP-009 (Incident Response) generates entries.
- No code changes, no migration, no deploy, no push — this was a data-only publish into tables
  that already existed live.
