// Phase 0 discovery, part 2 — Trainerize runs on an internal JSON API
// (api.trainerize.com/v03/*), not server-rendered HTML. This captures real
// request/response bodies for the endpoints that looked relevant to training
// blocks, notes, and workout history/PBs, found via network inspection of
// Amanda's dash/profile/progress pages.
//
// Read-only. Writes raw request+response pairs to .context/ for review.
// Credentials via env vars, never written to disk.
// Usage:
//   TRAINERIZE_EMAIL=... TRAINERIZE_PASSWORD=... node scripts/discover-trainerize-api.mjs

import { createRequire } from "module";
import { join } from "path";
import { writeFileSync, mkdirSync } from "fs";
const require = createRequire(import.meta.url);
const { chromium } = require(join(process.cwd(), "node_modules/.pnpm/playwright@1.61.0/node_modules/playwright"));

const EMAIL = process.env.TRAINERIZE_EMAIL;
const PASSWORD = process.env.TRAINERIZE_PASSWORD;
const OUT_DIR = join(process.cwd(), ".context");
const CLIENT_ID = "22276427"; // Amanda

const INTERESTING = [
  "program/getUserProgramList",
  "program/getUserProgramTrainingPlanList",
  "Timeline/getList",
  "user/getClientSummary",
  "accomplishment/getList",
  "Dashboard/Get",
  "calendar/getList",
  "user/getProfile",
];

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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const captured = [];
  page.on("response", async (res) => {
    const url = res.url();
    const hit = INTERESTING.find((path) => url.includes(`/v03/${path}`));
    if (!hit) return;
    try {
      const req = res.request();
      let reqBody = null;
      try {
        reqBody = req.postData();
      } catch {}
      let body;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => "<unreadable>");
      }
      captured.push({ endpoint: hit, url, status: res.status(), requestBody: reqBody, responseBody: body });
      console.log(`captured: ${hit} (status ${res.status()})`);
    } catch (e) {
      console.error(`  failed to capture ${hit}: ${e.message}`);
    }
  });

  console.log("Logging in...");
  await login(page);

  console.log("Visiting dash (client summary, program list, timeline)...");
  await page.goto(`https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/dash?ref=switchInto`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(4000);

  console.log("Visiting training phase (training plan detail)...");
  await page.goto(
    `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/trainingProgram/custom/trainingPhase/38056627`,
    { waitUntil: "domcontentloaded", timeout: 30000 },
  );
  await page.waitForTimeout(4000);

  console.log("Visiting profile (notes)...");
  await page.goto(`https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/profile`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(4000);

  console.log("Visiting progress (accomplishments/PBs)...");
  await page.goto(`https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/progress`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(4000);

  const outFile = join(OUT_DIR, "trainerize-api-capture.json");
  writeFileSync(outFile, JSON.stringify(captured, null, 2));
  console.log(`\nCaptured ${captured.length} calls. Written to ${outFile}`);

  const byEndpoint = {};
  for (const c of captured) byEndpoint[c.endpoint] = (byEndpoint[c.endpoint] || 0) + 1;
  console.log("By endpoint:", byEndpoint);

  await browser.close();
})();
