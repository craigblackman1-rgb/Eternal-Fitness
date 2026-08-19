// One-off: populate the endurance_block document Craig created on staging
// (client_documents id fddd8fd7-8a7f-4d02-8911-3b204dcc0071) with the real
// content from Rick_Block1_Plan_17Aug-5Sept2026.docx. Run once, not part of
// the CR-EF-048 migration set.
import fs from "fs";
import pg from "pg";

const DOC_ID = "fddd8fd7-8a7f-4d02-8911-3b204dcc0071";

const enduranceBlock = {
  targetEvent: "Cross Triatlon Vorden, 1/8th distance",
  startDate: "2026-08-17",
  endDate: "2026-09-05",
  directionIntro:
    "This isn't a fitness-building block — the 20km bike and 5km run are already well within what Rick has shown he can do. The job here is arriving healthy, comfortable with the format, and uninjured, not adding volume.\n\n" +
    "Swim and bike content stays with Rick (his coach/clinics for swim, his own management for bike) — only hours are specified here. Running is fully programmed below.\n\n" +
    "Note: 17–18 Aug already passed before this plan was built — Rick independently completed a 12km Z2 run and his first open-water swim on 18 Aug. No further long runs are needed before the event; that session already covers it.",
  disciplineTargets: [
    { id: "swim", discipline: "Swim", detail: "~1-1.5 hrs/week (2-3 sessions), open water — good long-term exposure for Venice-Jesolo, but not specific prep for a pool swim, so it doesn't need to dominate the week" },
    { id: "bike", discipline: "Bike", detail: "~1-1.5 hrs/week, easy — no volume-building needed" },
    { id: "run", discipline: "Run", detail: "~1-1.5 hrs/week, easy — content specified below" },
    { id: "strength", discipline: "Strength/mobility", detail: "not included in this block — to follow separately" },
    { id: "cutback", discipline: "Cutback", detail: "race week itself (1-4 Sept) is the taper — nothing new introduced" },
  ],
  coachingNotes:
    "Two brick sessions: Brick 1 (27 Aug) is the real exposure — first time linking bike to run. Brick 2 (2 Sept) is deliberately shorter and lighter, functioning as a pre-race opener rather than a second training stimulus, sitting 3 days out from the event. Both are spaced so no two running-legged sessions (runs or bricks) land on consecutive days, giving legs proper recovery between impact sessions.",
  rows: [
    { id: "r1", type: "day", date: "19 Aug", dayLabel: "Wed", run: "", bike: "", swim: "~30-45 min, open water", notes: "", highlight: null },
    { id: "r2", type: "day", date: "20 Aug", dayLabel: "Thu", run: "Easy 20-30 min Z2 + strides (4-6 x 20s)", bike: "", swim: "", notes: "Strides: last 5-10 min of run, build to ~85% effort, 60-90s recovery", highlight: null },
    { id: "r3", type: "day", date: "21 Aug", dayLabel: "Fri", run: "", bike: "~45-60 min, easy", swim: "", notes: "", highlight: null },
    { id: "r4", type: "day", date: "22 Aug", dayLabel: "Sat", run: "", bike: "", swim: "~30-45 min, open water", notes: "", highlight: null },
    { id: "r5", type: "day", date: "23 Aug", dayLabel: "Sun", run: "Rest", bike: "Rest", swim: "Rest", notes: "Full rest day", highlight: null },
    { id: "w1", type: "week_summary", weekLabel: "Week 1 (19-23 Aug, partial)", run: "~20-30 min", bike: "~45-60 min", swim: "~1-1.5 hrs", notes: "Week total: ~2.25-3 hrs" },
    { id: "r6", type: "day", date: "24 Aug", dayLabel: "Mon", run: "Rest", bike: "Rest", swim: "Rest", notes: "Kept free as agreed", highlight: null },
    { id: "r7", type: "day", date: "25 Aug", dayLabel: "Tue", run: "", bike: "", swim: "~30-45 min, open water", notes: "", highlight: null },
    { id: "r8", type: "day", date: "26 Aug", dayLabel: "Wed", run: "", bike: "~45-60 min, easy", swim: "", notes: "", highlight: null },
    { id: "r9", type: "day", date: "27 Aug", dayLabel: "Thu", run: "10 min easy, straight off the bike", bike: "15 min easy, straight into run", swim: "", notes: "BRICK 1 — first exposure, kept deliberately easy. 7 days since last run day.", highlight: "brick" },
    { id: "r10", type: "day", date: "28 Aug", dayLabel: "Fri", run: "Rest", bike: "Rest", swim: "Rest", notes: "Recovery after brick 1", highlight: null },
    { id: "r11", type: "day", date: "29 Aug", dayLabel: "Sat", run: "", bike: "", swim: "~30-45 min, open water", notes: "", highlight: null },
    { id: "r12", type: "day", date: "30 Aug", dayLabel: "Sun", run: "Easy 20-30 min Z2 + strides (4-6 x 20s)", bike: "", swim: "", notes: "3 days since brick 1", highlight: null },
    { id: "w2", type: "week_summary", weekLabel: "Week 2 (24-30 Aug)", run: "~30-40 min", bike: "~1-1.25 hrs", swim: "~1-1.5 hrs", notes: "Week total: ~2.5-3.25 hrs" },
    { id: "r13", type: "day", date: "31 Aug", dayLabel: "Mon", run: "Rest", bike: "Rest", swim: "Rest", notes: "Kept free as agreed — call scheduled", highlight: null },
    { id: "r14", type: "day", date: "1 Sept", dayLabel: "Tue", run: "", bike: "", swim: "Optional short, easy", notes: "Taper begins", highlight: null },
    { id: "r15", type: "day", date: "2 Sept", dayLabel: "Wed", run: "5 min easy, straight off the bike", bike: "10 min easy, straight into run", swim: "", notes: "BRICK 2 — short, light opener only. 3 days since last run day, 3 days before race.", highlight: "brick" },
    { id: "r16", type: "day", date: "3 Sept", dayLabel: "Thu", run: "Rest", bike: "Rest", swim: "Optional light technique only", notes: "Keep it calm — no new effort this close in", highlight: null },
    { id: "r17", type: "day", date: "4 Sept", dayLabel: "Fri", run: "Rest", bike: "Rest", swim: "Rest", notes: "Full rest day — arrive fresh", highlight: null },
    { id: "r18", type: "day", date: "5 Sept", dayLabel: "Sat", run: "", bike: "", swim: "", notes: "EVENT — 1/8th distance: 500m pool swim / 20km gravel bike / 5km run. Race day.", highlight: "race" },
    { id: "w3", type: "week_summary", weekLabel: "Race week (31 Aug-4 Sept, excl. race day)", run: "~5-10 min", bike: "~10-15 min", swim: "~20-30 min", notes: "Week total: ~0.5-0.75 hrs — deliberate taper" },
  ],
};

const env = fs.readFileSync(".env.local", "utf8");
const client = new pg.Client({
  connectionString: "postgresql://ef_staging_app:uZ81HJRRFbBprNVMOzNiaBQr8teMrnpM@localhost:5433/eternal_fitness_staging",
});

async function main() {
  await client.connect();

  const before = await client.query("SELECT id, title, body FROM client_documents WHERE id = $1", [DOC_ID]);
  if (before.rows.length !== 1) throw new Error("Document not found: " + DOC_ID);
  console.log("BEFORE title:", before.rows[0].title);
  console.log("BEFORE rows:", (before.rows[0].body?.enduranceBlock?.rows ?? []).length);

  const newBody = { ...before.rows[0].body, enduranceBlock };
  const newTitle = "Rick — Block 1: Arrival to First Event";

  await client.query("BEGIN");
  try {
    await client.query(
      "UPDATE client_documents SET title = $1, body = $2::jsonb, updated_at = now() WHERE id = $3",
      [newTitle, JSON.stringify(newBody), DOC_ID],
    );
    const after = await client.query("SELECT title, body FROM client_documents WHERE id = $1", [DOC_ID]);
    console.log("AFTER title:", after.rows[0].title);
    console.log("AFTER rows:", after.rows[0].body.enduranceBlock.rows.length, "(expect 21)");
    if (after.rows[0].body.enduranceBlock.rows.length !== 21) throw new Error("Row count mismatch");
    await client.query("COMMIT");
    console.log("COMMITTED.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("ROLLED BACK:", e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
