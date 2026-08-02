// One-off: list all Trainerize clients (id, name, email) to match against our DB.
// Read-only. Credentials via env vars.
import { createRequire } from "module";
import { join } from "path";
const require = createRequire(import.meta.url);
const { chromium } = require(join(process.cwd(), "node_modules/.pnpm/playwright@1.61.0/node_modules/playwright"));

const EMAIL = process.env.TRAINERIZE_EMAIL;
const PASSWORD = process.env.TRAINERIZE_PASSWORD;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let clientList = null;
  page.on("response", async (res) => {
    if (res.url().includes("/v03/User/getClientList") || res.url().includes("/v03/user/getClientList")) {
      try {
        const body = await res.json();
        if (!clientList) clientList = body;
      } catch {}
    }
  });

  await page.goto("https://eternalfitness8.trainerize.com/app/login", { waitUntil: "domcontentloaded" });
  await page.fill("#emailInput", EMAIL);
  await page.fill("#passInput", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.click('[data-testid="signIn-button"]'),
  ]);
  await page.waitForTimeout(3000);

  // Ensure it's fired at least once more if missed
  if (!clientList) {
    await page.goto("https://eternalfitness8.trainerize.com/app/clients", { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
  }

  console.log(JSON.stringify(clientList, null, 2));
  await browser.close();
})();
