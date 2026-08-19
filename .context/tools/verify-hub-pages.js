// Ground-truth verification for the Trainer Hub against its ef-control-hub mockups.
// Derives both sides at run time (git ls-tree for routes, recursive readdir for mockups)
// so a new page.tsx or a new mockup .html shows up automatically next run instead of
// silently being left off a hand-typed list -- see [[feedback-derived-verification]].
//
// The mockup<->route join is NOT a mechanical filename convention here (unlike a
// marketing site's route-to-slug mapping) -- "hub-client-detail.html" doesn't derive
// from "/hub/clients/[id]" by any regex. So the join itself is a small, hand-authored
// table (JOIN_TABLE below) -- that's fine per the proportionality rule, because a
// ~50-entry table doesn't drift on its own. What DOES drift is the *set* of routes and
// mockups on each side, and that set is what's derived every run: any route or mockup
// not present in JOIN_TABLE is reported as an explicit UNMAPPED finding, not silently
// assumed to be "intentionally unmocked" -- that assumption is exactly what went stale
// here (hub-documents.html appeared 2026-08-01, contradicting a 2026-07-26 WO's
// documented "real, not mocked" note for /hub/documents).
//
// Mockups are referenced by path RELATIVE to MOCKUP_DIR (forward slashes), because the
// library was reorganised into category subfolders on 2026-08-17
// (see request-opendesign-mockup-version-control-2026-08-17.md in the library root).
//
// Usage:
//   # full run (live fetch against the hub, needs a disposable staff account):
//   HUB_EMAIL=... HUB_PASSWORD=... node .context/tools/verify-hub-pages.js
//   # dry run (no credentials, no network -- only the route/mockup reconciliation):
//   node .context/tools/verify-hub-pages.js --dry-run     # or: DRY_RUN=1 node ...
//
// (credentials for a disposable staff account -- create one per the standing
// disposable-verify-account rule, run this, then delete it. This script never creates
// or deletes accounts itself -- that stays a separate, auditable step.)

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MOCKUP_DIR = process.env.MOCKUP_DIR || "D:\\apps\\design-systems\\ef-control-hub";
// Fixed 2026-08-18: the verify environment is development.eternal-fitness.co.uk
// (per project convention -- staging branch changes are verified there before
// merge to main), not "staging.eternal-fitness.co.uk", which isn't a real host.
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://development.eternal-fitness.co.uk";
const HUB_EMAIL = process.env.HUB_EMAIL;
const HUB_PASSWORD = process.env.HUB_PASSWORD;
const DRY_RUN = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

// ---- derive both sides at run time, not hand-maintained ----

const ROUTE_FILES = execSync("git ls-tree -r HEAD --name-only", { cwd: REPO_ROOT })
  .toString()
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => /^app\/hub\/.*page\.tsx$/.test(l))
  .filter((l) => !/^app\/hub\/(login|forgot-password|reset-password)\//.test(l)) // auth screens, no design mockup set
  .filter((l) => !/^app\/hub\/log\//.test(l)); // retired /hub/log redirect stub (2026-08-15) -- 302s to the consolidated session screen, no surface of its own to verify

// Recursive mockup enumeration. A flat readdir no longer works since the library was
// reorganised into category subfolders (desktop/clients, mobile/today, ...). Skip the
// top-level folders that are out of scope for route reconciliation (request doc §5/§7):
//   _archive/   superseded + speculative files (archived, never deleted)
//   documents/  client-facing document *templates* -- not hub mockups (note: the
//               mockup category folder `desktop/documents/` is NOT this folder and is
//               in scope)
//   .od-skills/ tooling scaffolding
//   assets/, preview/  images/screenshots, not mockups
// index.html is the register itself, not a mockup. Paths are stored forward-slash
// relative to MOCKUP_DIR so they round-trip into JOIN_TABLE and back out on any OS.
const OUT_OF_SCOPE_TOP = new Set(["_archive", "documents", ".od-skills", "assets", "preview"]);

function collectMockups(dir, base = "") {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out; // dir missing/renamed -- treat as empty rather than crash the run
  }
  for (const entry of entries) {
    if (entry.name === "index.html") continue; // the register, not a mockup
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (base === "" && OUT_OF_SCOPE_TOP.has(entry.name)) continue;
      out.push(...collectMockups(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".html")) {
      out.push(rel.replace(/\\/g, "/"));
    }
  }
  return out;
}

const mockupFiles = collectMockups(MOCKUP_DIR);

// ---- the join table (hand-authored, small, doesn't drift on its own) ----
// route file -> mockup path (relative to MOCKUP_DIR). `null` mockup = documented
// intentional no-mockup route. An ARRAY of mockups = one route rendering more than one
// canonical surface (e.g. Schedule day + month views share /hub/schedule); the first
// element is the primary surface used for live title checks, the rest are mapped so
// they don't false-positive as UNMAPPED-MOCKUP.

const JOIN_TABLE = [
  // Daily use
  { route: "app/hub/(protected)/page.tsx", mockup: "desktop/dashboard/hub-dashboard.html" },
  { route: "app/hub/(protected)/schedule/page.tsx", mockup: ["desktop/scheduling/hub-schedule.html", "desktop/scheduling/hub-schedule-month.html"] },
  { route: "app/hub/(protected)/tasks/page.tsx", mockup: "desktop/tasks/hub-tasks.html" },

  // Clients
  { route: "app/hub/(protected)/clients/page.tsx", mockup: "desktop/clients/hub-clients.html" },
  { route: "app/hub/(protected)/clients/[id]/page.tsx", mockup: ["desktop/clients/hub-client-detail-refined.html", "desktop/clients/hub-client-sessions-tab.html"] },
  { route: "app/hub/(protected)/clients/[id]/edit/page.tsx", mockup: "desktop/clients/hub-client-edit.html" },
  { route: "app/hub/(protected)/clients/new/page.tsx", mockup: "desktop/clients/hub-client-new.html" },
  { route: "app/hub/(protected)/clients/[id]/documents/page.tsx", mockup: "desktop/clients/hub-client-documents.html" },
  { route: "app/hub/(protected)/clients/[id]/documents/[docId]/page.tsx", mockup: "desktop/clients/hub-client-document-detail.html" },
  { route: "app/hub/(protected)/clients/[id]/updates/page.tsx", mockup: "desktop/clients/hub-updates.html" },
  { route: "app/hub/(protected)/clients/[id]/updates/new/page.tsx", mockup: "desktop/clients/hub-update-composer.html" },

  // Training & workouts
  { route: "app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx", mockup: "desktop/training/hub-block-module.html" },
  { route: "app/hub/(protected)/clients/[id]/blocks/[blockId]/review/page.tsx", mockup: "desktop/training/hub-block-review.html" },
  { route: "app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx", mockup: "desktop/training/hub-session.html" },
  { route: "app/hub/(protected)/training-blocks/page.tsx", mockup: "desktop/training/hub-training-blocks.html" },
  { route: "app/hub/(protected)/workout-templates/page.tsx", mockup: "desktop/training/hub-workout-templates.html" },
  { route: "app/hub/(protected)/workout-templates/new/page.tsx", mockup: "desktop/training/hub-template-paste-assign.html" },
  { route: "app/hub/(protected)/exercises/page.tsx", mockup: "desktop/training/hub-exercise-library.html" },
  { route: "app/hub/(protected)/settings/training-rules/page.tsx", mockup: "desktop/training/hub-training-rules.html" },

  // Finance
  { route: "app/hub/(protected)/cashflow/page.tsx", mockup: "desktop/finance/hub-cashflow-overview.html" },
  { route: "app/hub/(protected)/cashflow/invoices/page.tsx", mockup: "desktop/finance/hub-cashflow-invoices.html" },
  { route: "app/hub/(protected)/cashflow/transactions/page.tsx", mockup: "desktop/finance/hub-cashflow-transactions.html" },
  { route: "app/hub/(protected)/cashflow/forecast/page.tsx", mockup: "desktop/finance/hub-cashflow-forecast.html" },
  { route: "app/hub/(protected)/cashflow/tax/page.tsx", mockup: "desktop/finance/hub-cashflow-tax.html" },
  { route: "app/hub/(protected)/cashflow/reconciliation/page.tsx", mockup: "desktop/finance/hub-cashflow-reconciliation.html" },

  // Clinical, reports, quality & settings
  { route: "app/hub/(protected)/tracker/page.tsx", mockup: "desktop/medical/hub-medical-tracker.html" }, // medical/compliance tracker lives at /hub/tracker, not /hub/reports/medical-tracker
  { route: "app/hub/(protected)/reports/updates/page.tsx", mockup: "desktop/reports/hub-reports-updates.html" },
  { route: "app/hub/(protected)/process-quality/page.tsx", mockup: "desktop/quality/hub-process-quality.html" },
  { route: "app/hub/(protected)/resources/page.tsx", mockup: "desktop/resources/hub-resources.html" },
  { route: "app/hub/(protected)/documents/page.tsx", mockup: "desktop/documents/hub-documents.html" }, // appeared 2026-08-01 -- previously documented as unmocked
  { route: "app/hub/(protected)/settings/studio-equipment/page.tsx", mockup: "desktop/studio/hub-studio-equipment.html" },
  { route: "app/hub/(protected)/settings/plan-agent/page.tsx", mockup: "desktop/settings/hub-plan-agent-settings.html" },
  { route: "app/hub/(protected)/settings/integrations/page.tsx", mockup: "desktop/settings/hub-settings-integrations.html" },

  // Mobile (phone) -- the hub's trainer-facing PWA
  { route: "app/hub/m/page.tsx", mockup: "mobile/today/hub-m-today.html" },
  { route: "app/hub/m/clients/page.tsx", mockup: "mobile/clients/hub-m-clients.html" },
  { route: "app/hub/m/train/page.tsx", mockup: "mobile/training/hub-m-train.html" },
  { route: "app/hub/m/train/[sessionId]/page.tsx", mockup: "mobile/training/hub-m-train.html" },
  { route: "app/hub/m/train/[sessionId]/edit/page.tsx", mockup: "mobile/training/hub-m-train-edit.html" },

  // Documented as deliberately-unmocked (request doc §7 "for awareness -- missing
  // mockups") -- carried forward as a claim to re-verify, not an assumption: if any of
  // these later gets a mockup, the "mockup with no route in JOIN_TABLE" check below will
  // catch it same as it caught hub-documents.html, regardless of what this list says.
  { route: "app/hub/(protected)/templates/page.tsx", mockup: null },
  { route: "app/hub/(protected)/templates/[id]/page.tsx", mockup: null },
  { route: "app/hub/templates/[id]/preview/page.tsx", mockup: null }, // standalone document-template preview render (unprotected), not a designed hub screen
  { route: "app/hub/(protected)/agreements/page.tsx", mockup: null },
  { route: "app/hub/(protected)/agreements/[id]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/web-admin/page.tsx", mockup: null },
  { route: "app/hub/(protected)/workout-templates/[id]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/cashflow/invoices/new/page.tsx", mockup: null },
  { route: "app/hub/(protected)/cashflow/invoices/[id]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/cashflow/transactions/[id]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/blocks/[blockId]/print/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/updates/[updateId]/edit/page.tsx", mockup: null },
  { route: "app/hub/m/clients/[id]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/resources/preview/[key]/page.tsx", mockup: null }, // staff preview of a client-facing resource (sample-name render), not a designed hub screen
];

// Mockups in the library that are NOT hub-route mockups, so they're excluded from the
// UNMAPPED-MOCKUP check rather than reported as orphans. Both lists are hand-kept and
// deliberately small; the index.html register is their source of truth.
//
// 1. REFERENCE_DOCS -- design-system / document-system / portal-PWA reference docs the
//    register marks "reference -- no route".
const REFERENCE_DOCS = new Set([
  "desktop/design-system/admin-design-system.html",
  "desktop/design-system/hub-nav-reconciliation-v1.html",
  "desktop/documents/client-documents-system.html",
  "mobile/portal-pwa-states.html",
]);
// 2. ORPHANED_MOCKUPS -- canonical mockups whose route no longer exists. These should be
//    re-homed or archived in a future register pass; until then they're flagged here so
//    they don't masquerade as a clean "unmapped new mockup" finding.
const ORPHANED_MOCKUPS = new Set([
  // PAR-Q editor. The register still lists it at /hub/clients/[id]/parq/[parqId]/edit,
  // but that route was removed when PAR-Q moved into the document engine (kind "parq",
  // edited via the generic document detail surface). Left unmapped rather than guessed.
  "desktop/medical/hub-parq-edit.html",
]);

const DYNAMIC = /\[[a-zA-Z]+\]/;

const flattenMockups = (m) => (Array.isArray(m) ? m : m ? [m] : []);
const primaryMockup = (m) => (Array.isArray(m) ? m[0] : m);

function fileToUrlPath(f, sample) {
  // sample: object of {paramName: value} for dynamic segments, e.g. {id: '1', blockId: '...'}
  let r = f
    .replace(/^app\/hub\//, "/hub/")
    .replace(/^app\//, "/")
    .replace(/\(protected\)\//, "")
    .replace(/\/page\.tsx$/, "");
  if (sample) {
    for (const [k, v] of Object.entries(sample)) r = r.replace(`[${k}]`, v);
  }
  return r === "" ? "/hub" : r;
}

function extractTitleish(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (h1) return h1[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  return t ? t[1].trim() : null;
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function fuzzyMatch(a, b) {
  if (!a || !b) return false;
  const na = normalize(a), nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

// Proper open/close SVG region tracking -- a fixed-character proximity window
// (checking "is <svg> within N chars before this hex value") false-positives on
// any SVG whose fill attribute sits further than N chars from its own opening tag
// (e.g. a multi-element logo SVG with several <path>/<text> children). Confirmed
// live 2026-08-01: this exact bug reported every hub page's inline logo SVG fills
// as "raw hex outside SVG" -- a uniform false positive across ~13 pages that would
// have been reported as 13 real design-token violations if not caught before
// writing up findings.
function countRawHexOutsideSvg(html) {
  const svgRanges = [];
  const openRe = /<svg\b/g;
  let m;
  while ((m = openRe.exec(html))) {
    const closeIdx = html.indexOf("</svg>", m.index);
    svgRanges.push([m.index, closeIdx === -1 ? html.length : closeIdx + 6]);
  }
  const insideSvg = (idx) => svgRanges.some(([s, e]) => idx >= s && idx < e);

  const out = [];
  const hexRe = /#[0-9A-Fa-f]{6}\b/g;
  while ((m = hexRe.exec(html))) {
    if (!insideSvg(m.index)) out.push(m[0]);
  }
  return out;
}

async function login() {
  if (!HUB_EMAIL || !HUB_PASSWORD) {
    throw new Error("Set HUB_EMAIL and HUB_PASSWORD (a disposable staff account) before running.");
  }
  const res = await fetch(`${SITE_ORIGIN}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: SITE_ORIGIN },
    body: JSON.stringify({ email: HUB_EMAIL, password: HUB_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: HTTP ${res.status} ${await res.text()}`);
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("Login succeeded but no session cookie returned.");
  return setCookie.split(";")[0]; // first cookie pair, good enough for same-origin session use
}

async function checkPage(urlPath, mockupFile, cookie) {
  const url = SITE_ORIGIN + urlPath;
  let liveHtml;
  try {
    const res = await fetch(url, { headers: { Cookie: cookie }, cache: "no-store", redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      return { urlPath, mockupFile, verdict: "ERROR", detail: `redirected (${res.headers.get("location")}) -- likely an auth or route problem` };
    }
    if (!res.ok) return { urlPath, mockupFile, verdict: "ERROR", detail: `HTTP ${res.status}` };
    liveHtml = await res.text();
  } catch (e) {
    return { urlPath, mockupFile, verdict: "ERROR", detail: e.message };
  }

  const rawHex = countRawHexOutsideSvg(liveHtml);

  if (!mockupFile) {
    return { urlPath, mockupFile: null, verdict: "OK-NO-MOCKUP", detail: `loads fine, no mockup expected -- rawHexOutsideSvg:${rawHex.length}` };
  }

  let mockupHtml;
  try {
    mockupHtml = fs.readFileSync(path.join(MOCKUP_DIR, mockupFile), "utf8");
  } catch (e) {
    return {
      urlPath,
      mockupFile,
      verdict: "ERROR",
      detail: `mockup "${mockupFile}" could not be read from ${MOCKUP_DIR} (${e.code || e.message}) -- archived/renamed since JOIN_TABLE was last updated?`,
    };
  }
  const mockupTitle = extractTitleish(mockupHtml);
  const liveTitle = extractTitleish(liveHtml);
  const titleMatch = fuzzyMatch(mockupTitle, liveTitle);

  const ok = titleMatch && rawHex.length === 0;
  return {
    urlPath,
    mockupFile,
    verdict: ok ? "PASS" : "FAIL",
    detail: ok
      ? "title/H1 matches, no raw hex outside SVG"
      : `titleMatch:${titleMatch} (mockup:"${(mockupTitle || "").slice(0, 60)}" live:"${(liveTitle || "").slice(0, 60)}") rawHexOutsideSvg:${rawHex.length}`,
  };
}

async function main() {
  const results = [];
  const routeSet = new Set(ROUTE_FILES);
  const mappedRouteSet = new Set(JOIN_TABLE.map((r) => r.route));
  const mappedMockupSet = new Set(JOIN_TABLE.flatMap((r) => flattenMockups(r.mockup)));
  const ignoredMockupSet = new Set([...REFERENCE_DOCS, ...ORPHANED_MOCKUPS]);

  // orphan direction 1: a real route file with no JOIN_TABLE entry at all
  for (const f of ROUTE_FILES) {
    if (!mappedRouteSet.has(f)) {
      results.push({ urlPath: fileToUrlPath(f), mockupFile: null, verdict: "UNMAPPED-ROUTE", detail: `${f} has no JOIN_TABLE entry -- add one (mockup filename or null)` });
    }
  }
  // orphan direction 2: a JOIN_TABLE route entry whose file no longer exists
  for (const { route } of JOIN_TABLE) {
    if (!routeSet.has(route)) {
      results.push({ urlPath: route, mockupFile: null, verdict: "STALE-TABLE-ENTRY", detail: `JOIN_TABLE references ${route} but it no longer exists in the repo` });
    }
  }
  // orphan direction 3: a mockup file that exists but no JOIN_TABLE entry points to it
  // (reference docs and the known-orphaned PAR-Q editor are skipped -- see lists above)
  for (const m of mockupFiles) {
    if (!mappedMockupSet.has(m) && !ignoredMockupSet.has(m)) {
      results.push({ urlPath: null, mockupFile: m, verdict: "UNMAPPED-MOCKUP", detail: `${m} exists in ${MOCKUP_DIR} but no JOIN_TABLE entry references it -- new mockup, needs a route mapped or explicit review` });
    }
  }

  if (DRY_RUN) {
    console.log("=== DRY RUN -- no login, no live fetch; reconciliation checks only ===");
  } else {
    const cookie = await login();
    for (const { route, mockup } of JOIN_TABLE) {
      if (!routeSet.has(route)) continue; // already reported as STALE-TABLE-ENTRY
      if (DYNAMIC.test(route)) {
        results.push({ urlPath: fileToUrlPath(route), mockupFile: primaryMockup(mockup), verdict: "DYNAMIC-SKIPPED", detail: "dynamic segment(s) -- needs a real id, not derivable generically; spot-check manually" });
        continue;
      }
      results.push(await checkPage(fileToUrlPath(route), primaryMockup(mockup), cookie));
    }
  }

  const counts = {};
  for (const r of results) counts[r.verdict] = (counts[r.verdict] || 0) + 1;

  console.log("=== SUMMARY ===");
  console.log(
    `routes:${ROUTE_FILES.length} mockups:${mockupFiles.length} joinTable:${JOIN_TABLE.length}` +
      (DRY_RUN ? " (dry run -- live checks skipped)" : ""),
  );
  console.log(JSON.stringify(counts, null, 2));
  console.log("\n=== everything that isn't a clean PASS/OK ===");
  for (const r of results) {
    if (r.verdict !== "PASS" && r.verdict !== "OK-NO-MOCKUP") {
      console.log(`${r.verdict}\t${r.urlPath || "(no route)"}\t${r.mockupFile || "(no mockup)"}\t${r.detail}`);
    }
  }

  fs.writeFileSync(path.join(__dirname, "verify_hub_results.json"), JSON.stringify(results, null, 2));
  console.log("\nFull results written to .context/tools/verify_hub_results.json");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
