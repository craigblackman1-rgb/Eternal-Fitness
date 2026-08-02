// Trainerize historical data import — browser-navigation-based API replay
// Logs into Trainerize, navigates to pages that trigger the internal JSON API,
// and captures responses. This is the approach that worked in Phase 0 recon
// (the browser sends auth cookies correctly when navigating, even to cross-
// subdomain APIs).
//
// Resumable: writes incrementally to .context/trainerize-import-<clientId>.json
// Run with --client <id> to target a single client (default: Amanda, 22276427)
//
// Usage:
//   node scripts/import-trainerize-block-data.mjs [--client 22276427]

import { createRequire } from "module";
import { join } from "path";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";

const require = createRequire(import.meta.url);
const { chromium } = require(join(process.cwd(), "node_modules/.pnpm/playwright@1.61.0/node_modules/playwright"));

const EMAIL = process.env.TRAINERIZE_EMAIL;
const PASSWORD = process.env.TRAINERIZE_PASSWORD;
const OUT_DIR = join(process.cwd(), ".context");

const CLIENT_ID_ARG = process.argv.indexOf("--client");
const CLIENT_ID = CLIENT_ID_ARG !== -1 ? process.argv[CLIENT_ID_ARG + 1] : "22276427";
const OUT_FILE = join(OUT_DIR, `trainerize-import-${CLIENT_ID}.json`);

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

  // Set up API response interceptor
  const apiResponses = [];
  let authToken = null;
  page.on("request", (req) => {
    if (!authToken && req.url().includes("/v03/")) {
      const h = req.headers()["authorization"];
      if (h) authToken = h;
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("/v03/")) return;
    const endpoint = url.split("/v03/")[1]?.split("?")[0] || url;
    const req = res.request();
    try {
      const body = await res.json();
      let reqBody = null;
      try { reqBody = req.postDataJSON(); } catch {}
      apiResponses.push({ endpoint, status: res.status(), requestBody: reqBody, responseBody: body });
      process.stdout.write(`[${endpoint}] `);
    } catch {}
  });

  // Fetches a Trainerize API endpoint directly (bearer token captured from the
  // browser's own real requests above) rather than via page navigation --
  // needed here because calendar/getList and dailyWorkout/get take structured
  // params (date ranges, id batches) that no single page navigation produces.
  async function apiCall(endpoint, body) {
    const res = await context.request.post(`https://api.trainerize.com/v03/${endpoint}`, {
      data: body,
      headers: { "content-type": "application/json", authorization: authToken },
    });
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  console.log("Logging in...");
  await login(page);
  console.log("Logged in.\n");

  // Load or init data
  let data = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf-8")) : {
    capturedAt: new Date().toISOString(),
    clientId: CLIENT_ID,
    clientName: null,
    trainingPlans: [],
    workoutsByPlan: [],
    timeline: [],
    accomplishments: [],
    profile: null,
    notes: [],
    workoutResults: [],
    _completedSteps: [],
  };
  // Older resumable files won't have this field yet.
  if (!data.workoutResults) data.workoutResults = [];

  const done = (step) => data._completedSteps.includes(step);
  const markDone = (step) => {
    if (!done(step)) data._completedSteps.push(step);
  };

  // Step 1: Visit dash — captures user/getProfile, user/getClientSummary,
  // program/getUserProgramTrainingPlanList, Timeline/getList, accomplishment/getList
  if (!done("dash")) {
    console.log("── Visiting Amanda's dash ──");
    await page.goto(`https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/dash?ref=switchInto`, {
      waitUntil: "domcontentloaded", timeout: 30000,
    });
    await page.waitForTimeout(6000);

    // Extract data from captured responses
    for (const r of apiResponses) {
      if (r.endpoint === "user/getProfile" && r.responseBody?.usrProfile?.[0]) {
        const amanda = r.responseBody.usrProfile.find(u => String(u.id) === CLIENT_ID);
        if (amanda) {
          data.profile = amanda;
          data.clientName = `${amanda.firstName} ${amanda.lastName}`;
          console.log(`  Profile: ${data.clientName}`);
        }
      }
      if (r.endpoint === "program/getUserProgramTrainingPlanList" && r.responseBody?.plans) {
        if (data.trainingPlans.length === 0) {
          data.trainingPlans = r.responseBody.plans;
          console.log(`  Training plans: ${data.trainingPlans.length}`);
        }
      }
      if (r.endpoint === "Timeline/getList") {
        const items = Array.isArray(r.responseBody) ? r.responseBody : (r.responseBody?.items || []);
        if (items.length > 0 && data.timeline.length === 0) {
          data.timeline = items;
          console.log(`  Timeline: ${data.timeline.length} entries`);
        }
      }
      if (r.endpoint === "accomplishment/getList") {
        const items = Array.isArray(r.responseBody) ? r.responseBody : (r.responseBody?.accomplishments || []);
        if (items.length > 0 && data.accomplishments.length === 0) {
          data.accomplishments = items;
          console.log(`  Accomplishments: ${data.accomplishments.length}`);
        }
      }
    }
    markDone("dash");
    writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  }

  // Step 2: Visit each training phase page to capture workout definitions
  if (!done("workouts")) {
    console.log("\n── Visiting training phases to capture workout definitions ──");
    const timeOffPlans = data.trainingPlans.filter(p => p.planType === "timeOff");
    const regularPlans = data.trainingPlans.filter(p => p.planType !== "timeOff");
    console.log(`  Regular plans: ${regularPlans.length}, Time-off: ${timeOffPlans.length}`);

    for (let i = 0; i < regularPlans.length; i++) {
      const plan = regularPlans[i];
      if (data.workoutsByPlan.find(wp => wp.planId === plan.id)) continue; // already captured

      console.log(`  [${i + 1}/${regularPlans.length}] ${plan.name} (id: ${plan.id})`);
      try {
        await page.goto(
          `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/trainingProgram/custom/trainingPhase/${plan.id}`,
          { waitUntil: "domcontentloaded", timeout: 30000 },
        );
        await page.waitForTimeout(4000);

        // Extract workout definitions from the captured API responses
        for (const r of apiResponses) {
          if (r.endpoint === "trainingPlan/getWorkoutDefList" && r.responseBody?.workouts) {
            const existing = data.workoutsByPlan.find(wp => wp.planId === plan.id);
            if (!existing || existing.workouts.length < r.responseBody.workouts.length) {
              if (existing) {
                // Remove old entry and replace
                data.workoutsByPlan = data.workoutsByPlan.filter(wp => wp.planId !== plan.id);
              }
              data.workoutsByPlan.push({
                planId: plan.id,
                planName: plan.name,
                startDate: plan.startDate,
                endDate: plan.endDate,
                instruction: plan.instruction || null,
                planType: plan.planType,
                workouts: r.responseBody.workouts,
              });
            }
          }
        }
        console.log(`    ${data.workoutsByPlan.find(wp => wp.planId === plan.id)?.workouts.length || 0} workouts captured`);
      } catch (e) {
        console.warn(`    ERROR: ${e.message}`);
      }
    }
    markDone("workouts");
    writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  }

  // Step 3: Visit progress page to get accomplishments (additional capture)
  if (!done("progress")) {
    console.log("\n── Visiting progress page for additional PB data ──");
    try {
      await page.goto(
        `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/progress`,
        { waitUntil: "domcontentloaded", timeout: 30000 },
      );
      await page.waitForTimeout(4000);
    } catch (e) {
      console.warn(`  Progress page nav timed out (non-fatal): ${e.message}`);
    }

    for (const r of apiResponses) {
      if (r.endpoint === "accomplishment/getList") {
        const items = Array.isArray(r.responseBody) ? r.responseBody : (r.responseBody?.accomplishments || []);
        if (items.length > 0) data.accomplishments = items;
      }
    }
    markDone("progress");
    writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  }

  // Step 4: Navigate to "View Profile" to get messages/notes
  if (!done("messages")) {
    console.log("\n── Clicking View Profile to capture messages ──");
    try {
      await page.goto(`https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/dash?ref=switchInto`, {
        waitUntil: "domcontentloaded", timeout: 30000,
      });
      await page.waitForTimeout(4000);

      // Click the View Profile link in the sidebar
      const viewProfile = page.locator(".clientMenuProfile__link").first();
      if (await viewProfile.count() > 0) {
        await viewProfile.click();
        await page.waitForTimeout(4000);
        console.log(`  Navigated to: ${page.url()}`);

        for (const r of apiResponses) {
          if (r.endpoint === "message/getMessages" && r.responseBody?.messages) {
            data.notes = r.responseBody.messages.map(m => ({
              source: "message",
              messageID: m.messageID,
              type: m.type,
              sender: m.sender,
              body: m.body || null,
              date: m.created || m.date || null,
            }));
            console.log(`  Captured ${data.notes.length} messages`);
          }
        }
      } else {
        console.log("  View Profile link not found, skipping messages.");
      }
    } catch (e) {
      console.warn(`  View Profile step failed (non-fatal): ${e.message}`);
    }

    markDone("messages");
    writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  }

  // Step 5: Enrich notes with attention flags and program/workout instructions
  if (!done("notes_enrichment")) {
    console.log("\n── Enriching notes from profile/program data ──");

    if (data.profile?.attention?.attentionMessage) {
      data.notes.push({
        source: "attention",
        content: data.profile.attention.attentionMessage,
        attentionLevel: data.profile.attention.attentionLevel || null,
        sourceDate: data.profile.created || null,
      });
    }

    for (const plan of data.trainingPlans) {
      if (plan.instruction && plan.instruction.trim()) {
        data.notes.push({
          source: "program_instruction",
          planId: plan.id,
          planName: plan.name,
          content: plan.instruction,
          sourceDate: plan.startDate || null,
        });
      }
    }

    for (const wp of data.workoutsByPlan) {
      for (const wo of wp.workouts) {
        if (wo.instruction && wo.instruction.trim()) {
          data.notes.push({
            source: "workout_instruction",
            planId: wp.planId,
            planName: wp.planName,
            workoutId: wo.id,
            workoutName: wo.name,
            content: wo.instruction,
            sourceDate: wo.dateCreated || null,
          });
        }
      }
    }
    markDone("notes_enrichment");
    writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  }

  // Step 6: Actual per-set logged results (what was really performed, not the
  // prescribed program or best-ever PBs). calendar/getList only accepts <1yr
  // ranges, so chunk from the earliest known training-plan start date to
  // today; collect every "tracked" (completed) dailyWorkout id; batch-fetch
  // full set-by-set detail via dailyWorkout/get.
  if (!done("workout_results")) {
    console.log("\n── Fetching actual workout results (per-set logged data) ──");
    if (!authToken) {
      console.warn("  No auth token captured yet -- revisiting dash to capture one.");
      await page.goto(`https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/dash?ref=switchInto`, {
        waitUntil: "domcontentloaded", timeout: 30000,
      }).catch(() => {});
      await page.waitForTimeout(2500);
    }

    if (!authToken) {
      console.warn("  Still no auth token -- skipping workout results for this client.");
    } else {
      const earliestPlanDate = data.trainingPlans
        .map((p) => p.startDate)
        .filter(Boolean)
        .sort()[0];
      const startBoundary = earliestPlanDate
        ? new Date(new Date(earliestPlanDate).getTime() - 30 * 86400000)
        : new Date("2023-01-01");
      const today = new Date();

      // Build <1-year chunks (350 days to leave margin under Trainerize's limit).
      const chunks = [];
      let chunkStart = new Date(startBoundary);
      while (chunkStart < today) {
        const chunkEnd = new Date(Math.min(chunkStart.getTime() + 350 * 86400000, today.getTime()));
        chunks.push([chunkStart.toISOString().slice(0, 10), chunkEnd.toISOString().slice(0, 10)]);
        chunkStart = new Date(chunkEnd.getTime() + 86400000);
      }

      const trackedIds = new Map(); // id -> { title, date, rpe }
      for (const [startDate, endDate] of chunks) {
        const body = await apiCall("calendar/getList", {
          userid: parseInt(CLIENT_ID, 10),
          startDate,
          endDate,
          unitDistance: "km",
          unitWeight: "kg",
          filter: {},
        });
        const days = body?.calendar || [];
        for (const day of days) {
          for (const item of day.items || []) {
            if (item.status === "tracked" && item.type?.startsWith("workout")) {
              trackedIds.set(item.id, { title: item.title, date: day.date, rpe: item.detail?.rpe ?? null });
            }
          }
        }
      }
      console.log(`  Found ${trackedIds.size} completed workout instances across ${chunks.length} date-range chunks.`);

      const idList = [...trackedIds.keys()];
      const BATCH = 25;
      let fetched = 0;
      for (let i = 0; i < idList.length; i += BATCH) {
        const batchIds = idList.slice(i, i + BATCH);
        const body = await apiCall("dailyWorkout/get", {
          ids: batchIds,
          userID: parseInt(CLIENT_ID, 10),
          unitDistance: "km",
          unitWeight: "kg",
        });
        for (const dw of body?.dailyWorkouts || []) {
          for (const ex of dw.exercises || []) {
            for (const stat of ex.stats || []) {
              // Skip fully-empty set rows (planned-but-not-logged placeholders).
              if (stat.reps == null && stat.weight == null && stat.distance == null && stat.time == null) continue;
              data.workoutResults.push({
                dailyWorkoutId: dw.id,
                workoutName: dw.name,
                performedDate: dw.date,
                rpe: trackedIds.get(dw.id)?.rpe ?? null,
                dailyExerciseId: ex.dailyExerciseID,
                exerciseName: ex.def?.name || null,
                setNumber: stat.setID,
                reps: stat.reps,
                weight: stat.weight,
                distance: stat.distance,
                durationSeconds: stat.time,
              });
            }
          }
        }
        fetched += body?.dailyWorkouts?.length || 0;
        process.stdout.write(`  fetched ${fetched}/${idList.length} workout details\r`);
      }
      console.log(`\n  ${data.workoutResults.length} logged sets captured.`);
    }

    markDone("workout_results");
    writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  }

  // Final extraction — catch anything missed by individual steps
  console.log("\n── Final extraction sweep ──");
  for (const r of apiResponses) {
    if (r.endpoint === "program/getUserProgramTrainingPlanList" && r.responseBody?.plans) {
      if (data.trainingPlans.length === 0) {
        data.trainingPlans = r.responseBody.plans;
        console.log(`  Training plans (late capture): ${data.trainingPlans.length}`);
      }
    }
    if (r.endpoint === "Timeline/getList") {
      // Find Amanda-specific timeline entries
      const items = Array.isArray(r.responseBody) ? r.responseBody : (r.responseBody?.items || []);
      const amandaItems = items.filter(item => String(item.user?.id) === CLIENT_ID);
      if (amandaItems.length > 0 && data.timeline.length === 0) {
        data.timeline = items; // keep all for now, filter at import
        console.log(`  Timeline (late capture): ${data.timeline.length} entries`);
      }
    }
  }

  // If still no training plans, try navigating to the training program page
  if (data.trainingPlans.length === 0) {
    console.log("\n── Retrying training plan capture via training program page ──");
    try {
      await page.goto(
        `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/trainingProgram/custom`,
        { waitUntil: "domcontentloaded", timeout: 30000 },
      );
      await page.waitForTimeout(6000);

      for (const r of apiResponses) {
        if (r.endpoint === "program/getUserProgramTrainingPlanList" && r.responseBody?.plans) {
          data.trainingPlans = r.responseBody.plans;
          console.log(`  Training plans: ${data.trainingPlans.length}`);
          break;
        }
      }
    } catch (e) {
      console.warn(`  ERROR: ${e.message}`);
    }
  }

  // If STILL no training plans extracted but we already marked "workouts" as done
  // due to the earlier short-circuit (0 regular plans), we need to re-do the workout pass
  if (data.trainingPlans.length > 0 && data.workoutsByPlan.length === 0 && done("workouts")) {
    console.log("\n── Re-running workout definition capture with newly-found training plans ──");
    const regularPlans = data.trainingPlans.filter(p => p.planType !== "timeOff");
    console.log(`  Regular plans: ${regularPlans.length}`);

    for (let i = 0; i < regularPlans.length; i++) {
      const plan = regularPlans[i];
      if (data.workoutsByPlan.find(wp => wp.planId === plan.id)) continue;

      console.log(`  [${i + 1}/${regularPlans.length}] ${plan.name} (id: ${plan.id})`);
      try {
        await page.goto(
          `https://eternalfitness8.trainerize.com/app/client/${CLIENT_ID}/trainingProgram/custom/trainingPhase/${plan.id}`,
          { waitUntil: "domcontentloaded", timeout: 30000 },
        );
        await page.waitForTimeout(4000);

        for (const r of apiResponses) {
          if (r.endpoint === "trainingPlan/getWorkoutDefList" && r.responseBody?.workouts) {
            const existing = data.workoutsByPlan.find(wp => wp.planId === plan.id);
            if (!existing || existing.workouts.length < r.responseBody.workouts.length) {
              if (existing) data.workoutsByPlan = data.workoutsByPlan.filter(wp => wp.planId !== plan.id);
              data.workoutsByPlan.push({
                planId: plan.id, planName: plan.name,
                startDate: plan.startDate, endDate: plan.endDate,
                instruction: plan.instruction || null, planType: plan.planType,
                workouts: r.responseBody.workouts,
              });
            }
          }
        }
        console.log(`    ${data.workoutsByPlan.find(wp => wp.planId === plan.id)?.workouts.length || 0} workouts captured`);
      } catch (e) {
        console.warn(`    ERROR: ${e.message}`);
      }
    }
  }

  // Re-run notes enrichment if we now have new data
  if (data.trainingPlans.length > 0 || data.workoutsByPlan.length > 0) {
    // Deduplicate notes
    const seen = new Set(data.notes.map(n => JSON.stringify(n)));

    if (data.profile?.attention?.attentionMessage) {
      const note = { source: "attention", content: data.profile.attention.attentionMessage, attentionLevel: data.profile.attention.attentionLevel || null, sourceDate: data.profile.created || null };
      const key = JSON.stringify(note);
      if (!seen.has(key)) { data.notes.push(note); seen.add(key); }
    }

    for (const plan of data.trainingPlans) {
      if (plan.instruction && plan.instruction.trim()) {
        const note = { source: "program_instruction", planId: plan.id, planName: plan.name, content: plan.instruction, sourceDate: plan.startDate || null };
        const key = JSON.stringify(note);
        if (!seen.has(key)) { data.notes.push(note); seen.add(key); }
      }
    }

    for (const wp of data.workoutsByPlan) {
      for (const wo of wp.workouts) {
        if (wo.instruction && wo.instruction.trim()) {
          const note = { source: "workout_instruction", planId: wp.planId, planName: wp.planName, workoutId: wo.id, workoutName: wo.name, content: wo.instruction, sourceDate: wo.dateCreated || null };
          const key = JSON.stringify(note);
          if (!seen.has(key)) { data.notes.push(note); seen.add(key); }
        }
      }
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));

  // Count total exercises across all workouts
  let totalWorkouts = 0;
  let totalExercises = 0;
  for (const wp of data.workoutsByPlan) {
    totalWorkouts += wp.workouts.length;
    for (const wo of wp.workouts) {
      totalExercises += wo.exercises?.length || 0;
    }
  }

  console.log(`\n\nDone! Full data written to ${OUT_FILE}`);
  console.log(`Summary:`);
  console.log(`  Client: ${data.clientName}`);
  console.log(`  Training plans: ${data.trainingPlans.length}`);
  console.log(`  Workout phases captured: ${data.workoutsByPlan.length}`);
  console.log(`  Total workouts: ${totalWorkouts}`);
  console.log(`  Total exercises: ${totalExercises}`);
  console.log(`  Timeline entries: ${data.timeline.length}`);
  console.log(`  Accomplishments/PBs: ${data.accomplishments.length}`);
  console.log(`  Notes: ${data.notes.length}`);

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
