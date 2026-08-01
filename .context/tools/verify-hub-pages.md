# Hub mockup verification — `verify-hub-pages.js`

Derived-verification tool per `[[feedback-derived-verification]]` / SOP-008's `DONE`
field rule. Checks the live Trainer Hub against its `ef-control-hub` mockups without a
hand-typed page list — routes are derived from `git ls-tree`, mockups from `readdir`,
so a new `page.tsx` or a new `hub-*.html` mockup surfaces automatically next run.

## Why this exists

A 2026-07-26 Work Order documented `/hub/documents` as "real, not mocked in Open
Design." That was true when it was written. On 2026-08-01 a `hub-documents.html`
mockup appeared and nobody re-checked the claim — this tool exists so that kind of
drift gets caught by re-running it, not by someone happening to notice.

## Running it

Needs a logged-in staff session. Per the standing disposable-verify-account rule,
create a throwaway account, run the script, delete the account immediately after —
never bake real credentials into this tool or its output.

```bash
HUB_EMAIL=<disposable-email> HUB_PASSWORD=<disposable-password> \
  node .context/tools/verify-hub-pages.js
```

## What it checks

- **Three orphan directions**, not just "did every known page get built": a route
  with no `JOIN_TABLE` entry, a `JOIN_TABLE` entry pointing at a route that no longer
  exists, and a mockup file with no `JOIN_TABLE` entry pointing at it (this is the
  check that would have caught `hub-documents.html` the day it appeared).
- For every mapped, non-dynamic route: HTTP status (redirect = likely an auth/route
  problem), a fuzzy title/H1 match against the mockup, and a raw-hex-outside-SVG scan
  (this repo's own standing check — no arbitrary hex, only design-system tokens).
- Dynamic routes (session editor, session log, client detail, PAR-Q edit, site-content
  editor) are flagged `DYNAMIC-SKIPPED`, not silently passed — they need a real id and
  aren't derivable generically. Spot-check these by hand; don't read their absence
  from this report as "verified."

## The join table is hand-authored, and that's fine

Unlike a marketing site, `hub-*.html` filenames don't derive from route paths by any
regex (`hub-client-detail.html` isn't a slug of `/hub/clients/[id]`). Per the
proportionality rule in `[[feedback-derived-verification]]`, a small (~30-entry) table
that doesn't grow on its own is an acceptable hand-authored join — what's derived and
re-checked every run is the *set* of routes and mockups on each side, not the mapping
between them. Add a new route or a new mockup and this script tells you it needs a
table entry; it doesn't let either side silently go unmapped.

## Known limitations (found on the first real run, 2026-08-01)

- **The title/H1 fuzzy match will false-positive on a mockup that's shared across two
  page modes with different real headings** — e.g. `hub-client-edit.html`'s H1 says
  "Edit client" but `/hub/clients/new` correctly shows "New client". Not a bug in the
  app; the check is comparing exact heading text where the real correctness criterion
  is structural, not literal-string. Treat a title mismatch as "go look," not
  automatically "go fix."
- **Raw-hex-outside-SVG will false-positive on any page that embeds email-template
  previews via `dangerouslySetInnerHTML`** (e.g. `/hub/reports/updates`) — email HTML
  correctly uses inline hex, not CSS custom properties, for cross-client compatibility.
  This showed up as 573 "violations" on first run, all inside embedded email markup.
  Not fixed in the script (would need to specifically detect and exclude email-preview
  blocks) — noted here so the next person doesn't report it as 573 real bugs.
- **A test/disposable account's own name will false-positive against any
  personalization** (the dashboard mockup says "Good morning, Esther"; logged in as
  the disposable account it correctly says "Good morning, Claude Verify (disposable)").
  Expected, not a defect.

## Result

`.context/tools/verify_hub_results.json` — full machine-readable output, gitignored
(add `.context/tools/verify_hub_results.json` to `.gitignore` if it isn't already —
it's a point-in-time report, not something to commit).
