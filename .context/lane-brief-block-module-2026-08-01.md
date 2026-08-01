# [AUTO] Lane brief: training block module redesign — overview, Edit Block, session-edit entry

Mockup (source of truth for layout/interaction — already approved, do not deviate without flagging):
`D:\apps\design-systems\ef-control-hub\hub-block-module.html`. Open it and read the whole file,
including the `.note` "How this mockup answers the brief's open questions" callout in Screen A and the
one in Screen C — those callouts are the actual functional spec, not just documentation.

**CRITICAL — do not copy mockup placeholder data into real code.** The mockup uses fake data
("Joan Mercer", "Sit-to-stand", "Session 11", hardcoded dates/counts). Every one of those must be
replaced with real data already available from the existing `blocks`/`sessions`/`clients` queries in
this codebase. This has been a repeated failure mode on this project — verify every piece of copy in
your diff traces back to a real DB column or computed value, not a string lifted from the HTML.

## Scope — exactly these files

- `app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx` (block overview — main rework)
- `app/hub/(protected)/clients/[id]/blocks/[blockId]/EditBlockDrawer.tsx` (**new** client component)
- `app/api/blocks/[id]/route.ts` (add `PATCH`)
- `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx` (session-edit
  entry point only — see Screen C below)
- `app/hub/(protected)/clients/[id]/blocks/[blockId]/[Overflow menu component if you extract one, e.g. BlockActions.tsx]`

FORBIDDEN: do not touch `SessionEditor.tsx` internals, `BlockScheduler.tsx`, `review/page.tsx`,
`app/hub/log/[sessionId]/`, or anything under `supabase/migrations/` (no schema changes needed —
`blocks.block_note`, `blocks.summary`, `blocks.status` already exist per `types/index.ts` `DBBlock`).

## Screen A — Block overview (`page.tsx`)

Currently every session under every week renders as `<details open>` — always expanded, all 12
sessions' full exercise tables visible on load. Change to:

1. **Weeks and sessions collapsed by default**, except: the week containing the **next incomplete
   session** (first session, in `session_number` order, where `session.data?.session_log?.completed_at`
   is falsy) auto-expands, and *within* that week only that one session auto-expands. If every session
   is complete, leave everything collapsed (no auto-expand). This is server-computable from the
   `sessions` query already in the page — no client JS needed for the default-open logic, keep using
   native `<details>`/`<summary>` for the expand/collapse itself (no client component required for
   this part).
2. **Per-session actions visible on the collapsed row**, not just inside the expanded panel: "Log"
   (links to `/hub/log/${session.id}`, same destination as today's "Log this session") and "Edit
   session" (see Screen C — must land in edit mode directly, not the current read-only view).
   Reference the mockup's `.sess-row` / `.sess-acts` layout — day label, archetype badge, session
   name/focus, status badge, then the two action buttons, all in one row.
3. **Header action bar**: "Edit Block" becomes the primary (`btn-primary` equivalent —
   `bg-rose hover:bg-rose/90 text-white`) action, opening `EditBlockDrawer` (Screen B). "Schedule"
   (linking to the existing `/review` page, unchanged) stays as a visible secondary action. Print,
   Export, and Delete move into an overflow menu — use the existing `components/ui/dropdown-menu.tsx`
   (already in this repo, shadcn `DropdownMenu`), not a hand-rolled menu. `ExportSpreadsheetButton` and
   `DeleteBlockButton` already exist as components — reuse them as trigger content inside the dropdown
   items rather than rewriting their logic.
4. **Block Note card**: add an "Edit" button/link that also opens `EditBlockDrawer` (same drawer as
   the header's "Edit Block" — two entry points into one drawer, per the mockup's `#editFromNote` and
   `#openEditBlock` both calling `openDrawer()`).
5. Keep the existing summary band (KPI tiles), phase timeline, and `PrescriptionTable` inside expanded
   sessions exactly as they are today — this brief only changes default-open state and where actions
   live, not what's inside an expanded session.

## Screen B — Edit Block drawer (new: `EditBlockDrawer.tsx`)

Client component using `components/ui/sheet.tsx` (shadcn `Sheet`, already in this repo — matches the
mockup's right-side drawer pattern; do not build a custom overlay/drawer from scratch).

Fields, per the mockup's Screen B:
- **Block note** — textarea, bound to `blocks.block_note`.
- **Summary** — textarea, bound to `blocks.summary` (column already exists, not currently editable or
  displayed anywhere in the hub UI — this is the first surface for it).
- **Block status** — select (`draft` / `approved` / `active` / `complete`), bound to `blocks.status`.
  Per the mockup's hint text: this is a manual-override escape hatch for correcting a mistake, not the
  normal way status changes (normal flow stays the Approve action on `/review` — unchanged). Order the
  field last and keep the hint copy explaining that, so it doesn't read as an invitation to bypass
  Approve routinely.

On save: `PATCH /api/blocks/${blockId}` with `{ block_note, summary, status }`, then close the drawer,
`router.refresh()` (this is a server component page) and toast success — follow the existing
save/toast pattern used elsewhere in this app (e.g. `SessionEditor.tsx`'s `onSaved` flow or
`review/page.tsx`'s `handleApprove`) rather than inventing a new one.

## `app/api/blocks/[id]/route.ts` — add `PATCH`

Currently only `GET` and `DELETE` exist. Add:

```ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowed = ["block_note", "summary", "status"];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase.from("blocks").update(updates).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```
Whitelist exactly `block_note`, `summary`, `status` — nothing else is editable via this route
(matches the brief's explicit exclusion of `block_number`/`client_id`).

## Screen C — Session-edit entry (`sessions/[sessionNum]/page.tsx`)

Per the mockup's decision: arriving at this page via the overview's "Edit session" link should land
**directly in edit mode**, skipping the current read-only landing that needs a second "Edit session"
click.

Implementation: the overview's "Edit session" link should append `?edit=1` to the existing session URL
(`/hub/clients/${clientId}/blocks/${blockId}/sessions/${session.session_number}?edit=1`). In
`sessions/[sessionNum]/page.tsx` (already a client component), read the query param with
`useSearchParams` and, if `edit=1` is present, initialize `editingVersion` to `activeTab` on mount
instead of `null` (today's default). Do not change the "Edit session" *button*'s behavior for direct
navigation without the query param — a trainer opening the session page any other way still lands
read-only with the existing button to opt into edit mode. This is additive to one entry path, not a
change to the page's default behavior.

## Verify (do this yourself before reporting done — do not just report "should work")

```
npx tsc --noEmit
```
Must be clean (repo already has `ignoreBuildErrors: true` on `next build`, so `tsc` is the real gate).
Also re-open the mockup and confirm every one of the four Screen-A "how this mockup answers the
brief's open questions" bullets and the Screen-C callout are actually true of your diff, one by one.

Do NOT run `pnpm dev`, start a preview server, or drive a browser — that verification step happens
separately. Stop here once `tsc` is clean and report back.
