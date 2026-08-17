# Lane Report — Portal PWA (L6)

**Work Order:** `wo-ef-workout-consolidation-pwa-2026-08-15` — L6 "Portal PWA"
**Date:** 2026-08-17
**Scope:** Make the client portal (`/portal/*`) installable as a PWA, mirroring the
staff hub PWA that already ships at `/hub/m`. No bespoke UI — the brief's explicit
rule is: if the honest answer is no visible UI beyond the browser's native install
prompt, build exactly that and do not invent screens. This lane builds no screens.

## Result

The portal now has its own manifest + service worker + registration, scoped to
`/portal/` exactly as the hub's are scoped to `/hub/`. The marketing site's
`public/site.webmanifest` is **untouched** and the portal never falls back to it.
No visible UI was added (native install prompt only, per the brief).

## Files changed

| File | Change | Purpose |
|---|---|---|
| `public/portal.webmanifest` | **new** | Portal PWA manifest — portal branding, `start_url: "/portal"`, `scope: "/portal/"` |
| `public/portal/sw.js` | **new** | Hand-written service worker, same strategy as the hub's — cache-first static assets, network-only `/api/*` |
| `components/portal/ServiceWorkerRegistration.tsx` | **new** | Client component registering `/portal/sw.js` with `{ scope: "/portal/" }` |
| `app/portal/layout.tsx` | **modified** | Declares `manifest: "/portal.webmanifest"`, `appleWebApp`, a `viewport` export (carrying `width`/`initialScale`/`viewportFit` forward + `themeColor`), and renders `<ServiceWorkerRegistration />` |

No other files touched. `public/site.webmanifest`, `public/hub.webmanifest`,
`public/hub/sw.js`, and `components/hub/ServiceWorkerRegistration.tsx` are all
unchanged.

## How it mirrors the hub

- **Manifest** — same field set as `hub.webmanifest` (`name`, `short_name`,
  `start_url`, `scope`, `display`, `background_color`, `theme_color`, `icons`),
  with portal values. `app/portal/layout.tsx` is the analogue of
  `app/hub/layout.tsx`; Next nested-metadata merging makes the portal manifest
  override the root layout's `site.webmanifest` for `/portal/*` only, exactly as
  the hub manifest overrides it for `/hub/*`.
- **Service worker** — `public/portal/sw.js` is a byte-for-byte structural copy of
  `public/hub/sw.js` with `CACHE_NAME = "portal-shell-v1"` and
  `STATIC_PREFIXES = ["/_next/static/", "/hub-icon-", "/portal.webmanifest"]`.
  Same install/activate/fetch handlers: cache-first for static, network-only for
  `/api/*` (the fetch handler returns early without `respondWith`), `skipWaiting`
  + `clients.claim` on activate.
- **Registration** — `components/portal/ServiceWorkerRegistration.tsx` is a
  structural copy of `components/hub/ServiceWorkerRegistration.tsx`: registers
  `/portal/sw.js` with `{ scope: "/portal/" }`, production-only, silent-catch on
  failure. Rendered from the portal root layout so it covers `/portal/login`,
  `/portal/reset-password`, etc., just as the hub registers from `/hub/login`.

## Isolation from the marketing site

- `scope: "/portal/"` means the portal SW only controls pages under `/portal/`;
  it never intercepts marketing-site requests.
- `scope` + the SW script path (`/portal/sw.js`) both live under `/portal/`, so
  the SW's scope cannot extend past `/portal/`.
- The portal manifest is referenced only from `app/portal/layout.tsx`; the
  marketing site keeps `public/site.webmanifest` (`start_url: "/"`) untouched.

## Icons — reuse decision

The hub manifest references `/hub-icon-192.png`, `/hub-icon-512.png`,
`/hub-icon-512-maskable.png`. Verified by SHA-256 that these are **byte-identical**
to the marketing brand icons `icon-192.png` / `icon-512.png` (and the "maskable"
file is a byte-copy of the 512 icon). They are all the same Eternal Fitness brand
mark. Per the brief ("reuse whatever the hub PWA already established unless there's
a concrete reason it doesn't fit the portal"), the portal manifest references the
same `hub-icon-*` triple — the EF brand mark is portal-appropriate, so no new
icons were invented. (This does mean the portal SW caches `"/hub-icon-"` as a
static prefix; that is intentional and harmless — the files are the EF brand icon.)

## Deliberate divergence from the hub manifest

`background_color` is `#F4F5F7` (the portal's actual canvas, `--hub-canvas`), not
the hub manifest's `#131313`. The hub's `#131313` does not match the hub's own
light `--hub-canvas` canvas and would flash a dark splash screen; the portal uses
its correct light canvas instead. `theme_color: "#C1839F"` is the brand rose,
matching both the hub and the marketing manifest.

## Verification

- `npx tsc --noEmit` — clean (only an unrelated npm "unknown project config" warning).
- `node --check public/portal/sw.js` — valid JS; `public/portal/sw.js` + `public/portal.webmanifest`
  exist.
- `public/portal.webmanifest` — valid JSON (parsed via `JSON.parse`).
- `node node_modules/next/dist/bin/next build` — `✓ Compiled successfully`,
  `✓ Generating static pages (106/106)`, types checked with no errors. The only
  error is the **known pre-existing** Windows EPERM symlink failure at the final
  standalone file-tracing step (`next build` trying to symlink the junctioned
  `node_modules`) — the documented Windows/pnpm quirk, not a code issue; Coolify's
  Linux Docker build is unaffected. All `/portal/*` routes present in the route
  manifest.

Installability itself was **not** verified here (no dev server / browser
automation per the brief) — that happens on a real device, batched with the hub
PWA's outstanding device test.

## Notes / follow-ups

- Device test still owed (install + airplane-mode offline check), same protocol as
  the hub PWA's outstanding §3.1 test — batch the two together.
- The hub manifest's own `background_color: "#131313"` (dark) vs its light
  `--hub-canvas` canvas is a pre-existing mismatch in the hub, left as-is (out of
  scope for this lane).
