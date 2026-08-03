// Phase 0 discovery pass — Trainerize historical client data (training blocks,
// profile notes, workout completion/history). Read-only reconnaissance: logs in,
// visits Amanda's training-phase/dash/profile pages, records DOM structure and
// any XHR/JSON network calls, and checks for a native export control.
// Writes raw findings to .context/ for review — does NOT touch the app DB.
//
// Credentials via env vars, never written to disk.
// Usage:
//   TRAINERIZE_EMAIL=... TRAINERIZE_PASSWORD=... node scripts/discover-trainerize-client-data.mjs

import { createRequire } from "module";
import { join } from "path";
import { writeFileSync, mkdirSync } from "fs";
const require = createRequire(import.meta.url);
const { chromium } = require(join(process.cwd(), "node_modules/.pnpm/playwright@1.61.0/node_modules/playwright"));

const EMAIL = process.env.TRAINERIZE_EMAIL;
const PASSWORD = process.env.TRAINERIZE_PASSWORD;
const OUT_DIR = join(process.cwd(), ".context");
const CLIENT_ID = "22276427"; // Amanda

if (!EMAIL || !PASSWORD) {
  console.error("Set TRAINERIZE_EMAIL and TRAINERIZE_PASSWORD env vars first.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

async function login(page) {
  await page.goto("https://eternalfitness8.trainerize.com/app/login", { waitUntil: "domcontentloaded" });
  await page.fill("#emailInput", EMAIL);
  await page.fill("#passInput", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.click('[data-testid="signIn-button"]'),
  ]);
  await page.waitForTimeout(2000);
}

async function visit(page, label, url, networkLog) {
  const startCount = networkLog.length;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch((e) => {
    console.error(`  nav failed: ${e.message}`);
  });
  await page.waitForTimeout(3500);

  const html = await page.content();
  const htmlPath = join(OUT_DIR, `trainerize-discovery-${label}.html`);
  writeFileSync(htmlPath, html);

  const exportControls = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a,button,[role=button]"))
      .map((el) => el.textContent?.trim())
      .filter((t) => t && /export|download|csv|print/i.test(t)),
  );

  const calls = networkLog.slice(startCount);
  console.log(`[${label}] ${url}`);
  console.log(`  html: ${htmlPath} (${html.length} bytes)`);
  console.log(`  export-like controls found: ${JSON.stringify(exportControls)}`);
  console.log(`  xhr/fetch calls during load: ${calls.length}`);
  for (const c of calls.slice(0, 25)) console.log(`    ${c.method} ${c.url}`);

  return { label, url, htmlPath, exportControls, calls };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const networkLog = [];
  page.on("request", (req) => {
    const url = req.url();
    const type = req.resourceType();
    if (type === "xhr" || type === "fetch") {
      networkLog.push({ method: req.method(), url, resourceType: type });
    }
  });

  console.log("Logging in...");
  await login(page);
  const loggedInUrl = page.url();
  console.log(`Post-login URL: ${loggedInUrl}`);

  const results = [];
  results.push(
    await visit(
      page,
      "training-phase",
      `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/trainingProgram/custom/trainingPhase/38056627`,
      networkLog,
    ),
  );
  results.push(
    await visit(page, "dash", `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/dash?ref=switchInto`, networkLog),
  );
  // "View profile" link from dash — guess at the conventional profile URL pattern too.
  results.push(
    await visit(page, "profile", `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/profile`, networkLog),
  );
  // Look for a progress/history/logs area if one exists under a conventional path.
  results.push(
    await visit(page, "progress", `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/progress`, networkLog),
  );

  const summary = {
    capturedAt: new Date().toISOString(),
    clientId: CLIENT_ID,
    loggedInUrl,
    pages: results.map((r) => ({
      label: r.label,
      url: r.url,
      htmlPath: r.htmlPath,
      exportControls: r.exportControls,
      xhrCalls: r.calls.map((c) => ({ method: c.method, url: c.url })),
    })),
  };
  writeFileSync(join(OUT_DIR, "trainerize-discovery-summary.json"), JSON.stringify(summary, null, 2));
  console.log("\nSummary written to .context/trainerize-discovery-summary.json");

  await browser.close();
})();
