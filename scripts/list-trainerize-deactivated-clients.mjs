// Lists Trainerize clients marked "Deactivated" -- these don't appear in the
// default User/getClientList {"view":"allActive"} call at all, so a former
// client with real historical training data can be invisible to a naive
// roster pull. There's no simple API param for this (guessed variations like
// status=inactive/archived/all all silently no-op) -- the only way found is
// to drive the actual UI: open the Clients page, click the "Deactivated"
// filter in the left panel, and capture the resulting getClientList response.
//
// Usage: node scripts/list-trainerize-deactivated-clients.mjs
import { createRequire } from "module";
import { join } from "path";
const require = createRequire(import.meta.url);
const { chromium } = require(join(process.cwd(), "node_modules/.pnpm/playwright@1.61.0/node_modules/playwright"));

const EMAIL = process.env.TRAINERIZE_EMAIL;
const PASSWORD = process.env.TRAINERIZE_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set TRAINERIZE_EMAIL and TRAINERIZE_PASSWORD env vars first.");
  process.exit(1);
}

async function login(page) {
  await page.goto("https://eternalfitness8.trainerize.com/app/login", { waitUntil: "domcontentloaded" });
  await page.fill("#emailInput", EMAIL);
  await page.fill("#passInput", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.click('[data-testid="signIn-button"]'),
  ]);
  await page.waitForTimeout(2500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let deactivatedList = null;
  page.on("response", async (res) => {
    if (!res.url().includes("getClientList")) return;
    try {
      const body = await res.json();
      const req = res.request().postDataJSON();
      if (req && JSON.stringify(req).toLowerCase().includes("deactiv")) deactivatedList = body;
    } catch {}
  });

  console.log("Logging in...");
  await login(page);

  console.log("Opening Clients page...");
  await page.setViewportSize({ width: 1280, height: 800 });
  // Sidebar "Clients" nav item has no stable href/selector -- click by the
  // known sidebar position (matches the app's fixed left-nav layout).
  await page.mouse.click(74, 366);
  await page.waitForTimeout(2500);

  console.log("Clicking the 'Deactivated' filter...");
  const clicked = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("*"));
    const el = els.find((e) => e.children.length === 0 && e.textContent?.trim() === "Deactivated");
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  if (!clicked) {
    console.error("Could not find the 'Deactivated' filter control -- Trainerize's UI may have changed.");
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(3000);

  if (!deactivatedList) {
    console.error("Filter clicked but no getClientList response captured -- check manually.");
    await browser.close();
    process.exit(1);
  }

  console.log(`\nFound ${deactivatedList.total} deactivated client(s):`);
  for (const u of deactivatedList.users) {
    console.log(`  ${u.id}\t${u.firstName} ${u.lastName}\t${u.email}\t${u.status}`);
  }
  console.log(
    "\nNote: Trainerize's own trainer/staff test accounts (e.g. the trainer's own name) can show up here too -- " +
      "cross-check names against real clients before importing.",
  );

  await browser.close();
})();
