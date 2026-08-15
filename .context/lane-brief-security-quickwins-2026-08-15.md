# Lane brief — EF security quick wins (2026-08-15)

**WO:** `wo-ef-security-repo-quickwins-2026-08-15` · **App:** eternal-fitness-website
**Worktree:** `D:\apps\worktrees\eternal-fitness-website\security-quickwins-2026-08-15`
**Branch:** `lane/security-quickwins-2026-08-15` (off `origin/main`)

Five small, independent hardening fixes. Make ONLY these changes. Do not touch any
other file. Do not invent content, placeholder data, demo copy, or extra features —
this repo has a standing rule that every diff is hand-reviewed line-by-line and
fabricated additions get the whole lane rejected.

## 1. `next.config.js` — API responses must not be publicly cacheable

In the `headers()` array, the `/api/:path*` entry currently sends
`Cache-Control: public, max-age=0, must-revalidate`. API responses carry client PII
and PAR-Q medical answers. Change that one entry's value to `private, no-store`.
Leave every other headers entry exactly as it is.

## 2. `next.config.js` — stop ignoring type errors at build time

Change `typescript: { ignoreBuildErrors: true }` to `false`. `npx tsc --noEmit` is
currently clean so this is safe today.

For ESLint: first run `npx next lint`. If it exits clean (no **errors** — warnings
are fine), also set `eslint: { ignoreDuringBuilds: false }`. If it reports errors,
LEAVE `ignoreDuringBuilds: true` unchanged and list the errors in your final report
instead — do not mass-fix lint errors in this lane.

## 3. `app/api/agreements/route.ts` — retire the unauthenticated public write path

This POST inserts directly into `signed_agreements` with no auth and no rate limit.
It only exists to serve the deliberately-unlinked legacy `/agreement` page whose
safety-net TTL expired weeks ago. Replace the entire POST handler body with a
`410 Gone` response:

```ts
export async function POST() {
  return NextResponse.json(
    { error: "This form has been retired. Please contact Eternal Fitness to complete your agreement." },
    { status: 410 }
  );
}
```

Remove the now-unused imports (`createClient`, `resolveClientId`) and the request
parsing. Keep the file and route in place. Do NOT touch the `signed_agreements`
table, any read path, or the `/agreement` page component itself.

## 4. `app/api/leads/route.ts` — rate limiting

Public unauthenticated endpoint that sends an email per call — an open relay into
Esther's inbox. Add a simple in-memory sliding-window limiter (this app deploys as
a single standalone container, so in-memory is acceptable):

- Key: client IP from `x-forwarded-for` (first entry) falling back to `"unknown"`.
- Limit: 5 requests per 10 minutes per IP. Over limit → `429` with a polite JSON
  error (`"Too many requests. Please call or email us directly."`).
- Prune stale entries on each request so the Map cannot grow unbounded.
- Also cap `message` at 5000 chars and `name`/`topic` at 200 chars (truncate, don't
  reject).

No new dependencies. Keep the existing validation and email flow otherwise unchanged.

## 5. Cron secret comparison — constant time

Both `app/api/cron/check-updates-due/route.ts` and
`app/api/cron/dispatch-updates/route.ts` compare the bearer secret with `!==`.
Replace with a constant-time compare, hashing both sides first so lengths always
match:

```ts
import { createHash, timingSafeEqual } from "crypto";

function secretsMatch(provided: string, secret: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}
```

Use it in place of the `provided !== secret` check in both files. Keep the
surrounding logic (missing-secret 500, 401 response) unchanged.

## Verify (required before you finish)

- `npx tsc --noEmit` — must be clean.
- `npx next lint` — report the outcome (used for item 2's ESLint decision).
- Do NOT run `pnpm dev`, any dev server, or any browser automation.
- Do NOT run `pnpm install` or `npm install`.

## Report format

Final message: list each of the 5 items with done/skipped and one line of detail,
plus the tsc and lint outcomes. Nothing else.
