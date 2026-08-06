// Ground-truth verification for the Trainer Hub against its ef-control-hub mockups.
// Derives both sides at run time (git ls-tree for routes, readdir for mockups) so a
// new page.tsx or a new hub-*.html mockup shows up automatically next run instead of
// silently being left off a hand-typed list -- see [[feedback-derived-verification]].
//
// The mockup<->route join is NOT a mechanical filename convention here (unlike a
// marketing site's route-to-slug mapping) -- "hub-client-detail.html" doesn't derive
// from "/hub/clients/[id]" by any regex. So the join itself is a small, hand-authored
// table (JOIN_TABLE below) -- that's fine per the proportionality rule, because a
// ~20-entry table doesn't drift on its own. What DOES drift is the *set* of routes and
// mockups on each side, and that set is what's derived every run: any route or mockup
// not present in JOIN_TABLE is reported as an explicit UNMAPPED finding, not silently
// assumed to be "intentionally unmocked" -- that assumption is exactly what went stale
// here (hub-documents.html appeared 2026-08-01, contradicting a 2026-07-26 WO's
// documented "real, not mocked" note for /hub/documents).
//
// Usage: HUB_EMAIL=... HUB_PASSWORD=... node .context/tools/verify-hub-pages.js
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
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://staging.eternal-fitness.co.uk";
const HUB_EMAIL = process.env.HUB_EMAIL;
const HUB_PASSWORD = process.env.HUB_PASSWORD;

// ---- derive both sides at run time, not hand-maintained ----

const ROUTE_FILES = execSync("git ls-tree -r HEAD --name-only", { cwd: REPO_ROOT })
  .toString()
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => /^app\/hub\/.*page\.tsx$/.test(l))
  .filter((l) => !/^app\/hub\/(login|forgot-password|reset-password)\//.test(l)); // auth screens, no design mockup set

const mockupFiles = fs
  .readdirSync(MOCKUP_DIR)
  .filter((f) => f.startsWith("hub-") && f.endsWith(".html"));

// ---- the join table (hand-authored, small, doesn't drift on its own) ----
// route glob -> mockup filename. `null` mockup = documented-intentional no-mockup route.

const JOIN_TABLE = [
  { route: "app/hub/(protected)/page.tsx", mockup: "hub-dashboard.html" },
  { route: "app/hub/(protected)/clients/page.tsx", mockup: "hub-clients.html" },
  { route: "app/hub/(protected)/clients/[id]/page.tsx", mockup: "hub-client-detail.html" },
  { route: "app/hub/(protected)/clients/[id]/edit/page.tsx", mockup: "hub-client-edit.html" },
  { route: "app/hub/(protected)/clients/new/page.tsx", mockup: "hub-client-edit.html" },
  { route: "app/hub/(protected)/clients/[id]/parq/[parqId]/edit/page.tsx", mockup: "hub-parq-edit.html" },
  { route: "app/hub/(protected)/exercises/page.tsx", mockup: "hub-exercise-library.html" },
  { route: "app/hub/(protected)/site-content/page.tsx", mockup: "hub-site-content.html" },
  { route: "app/hub/(protected)/site-content/[slug]/page.tsx", mockup: "hub-site-content-editor.html" },
  { route: "app/hub/(protected)/process-quality/page.tsx", mockup: "hub-process-quality.html" },
  { route: "app/hub/(protected)/reports/updates/page.tsx", mockup: "hub-reports-updates.html" },
  { route: "app/hub/(protected)/settings/studio-equipment/page.tsx", mockup: "hub-studio-equipment.html" },
  { route: "app/hub/(protected)/settings/training-rules/page.tsx", mockup: "hub-training-rules.html" },
  { route: "app/hub/(protected)/settings/plan-agent/page.tsx", mockup: "hub-plan-agent-settings.html" },
  { route: "app/hub/(protected)/tasks/page.tsx", mockup: "hub-tasks.html" },
  { route: "app/hub/(protected)/schedule/page.tsx", mockup: "hub-schedule.html" },
  { route: "app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx", mockup: "hub-session-editor.html" },
  { route: "app/hub/log/[sessionId]/page.tsx", mockup: "hub-session-log.html" },
  { route: "app/hub/(protected)/documents/page.tsx", mockup: "hub-documents.html" }, // hub-documents.html appeared 2026-08-01 -- previously documented as unmocked
  // Documented as real-but-deliberately-unmocked (2026-07-26 WO) -- carried forward as
  // a claim to re-verify, not an assumption: if any of these later gets a mockup, the
  // "mockup with no route in JOIN_TABLE" check below will catch it same as it caught
  // hub-documents.html, regardless of what this list says.
  { route: "app/hub/(protected)/templates/page.tsx", mockup: null },
  { route: "app/hub/(protected)/templates/[id]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/tracker/page.tsx", mockup: null },
  { route: "app/hub/(protected)/agreements/page.tsx", mockup: null },
  { route: "app/hub/(protected)/agreements/[id]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/blocks/[blockId]/print/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/blocks/[blockId]/review/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/parq/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/documents/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/documents/[docId]/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/updates/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/updates/new/page.tsx", mockup: null },
  { route: "app/hub/(protected)/clients/[id]/updates/[updateId]/edit/page.tsx", mockup: null },
];

const DYNAMIC = /\[[a-zA-Z]+\]/;

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

  const mockupHtml = fs.readFileSync(path.join(MOCKUP_DIR, mockupFile), "utf8");
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
  const mappedMockupSet = new Set(JOIN_TABLE.filter((r) => r.mockup).map((r) => r.mockup));

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
  for (const m of mockupFiles) {
    if (!mappedMockupSet.has(m)) {
      results.push({ urlPath: null, mockupFile: m, verdict: "UNMAPPED-MOCKUP", detail: `${m} exists in ${MOCKUP_DIR} but no JOIN_TABLE entry references it -- new mockup, needs a route mapped or explicit review` });
    }
  }

  const cookie = await login();

  for (const { route, mockup } of JOIN_TABLE) {
    if (!routeSet.has(route)) continue; // already reported as STALE-TABLE-ENTRY
    if (DYNAMIC.test(route)) {
      results.push({ urlPath: fileToUrlPath(route), mockupFile: mockup, verdict: "DYNAMIC-SKIPPED", detail: "dynamic segment(s) -- needs a real id, not derivable generically; spot-check manually" });
      continue;
    }
    results.push(await checkPage(fileToUrlPath(route), mockup, cookie));
  }

  const counts = {};
  for (const r of results) counts[r.verdict] = (counts[r.verdict] || 0) + 1;

  console.log("=== SUMMARY ===");
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
