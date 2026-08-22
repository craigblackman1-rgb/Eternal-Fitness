// Backfills exercise image_url from the exercises library into existing session JSONB.
//
// Usage: node scripts/backfill-session-images.mjs [--dry-run]
//
// For each session, walks warm_up/main_block/cooldown exercises, looks up the
// matching exercises row by name, and sets media.image_url if the session JSONB
// doesn't already have one. Also does the same for workout_templates.

import { existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const MAP_FILE = join(ROOT, "scripts/trainerize-image-map.json");
const DRY_RUN = process.argv.includes("--dry-run");

let _pool;
async function getPool() {
  if (_pool) return _pool;
  const { Pool } = await import("pg");
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ path: join(ROOT, ".env.local") });
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

function backfillSection(section, imageByName) {
  if (!section) return 0;
  let count = 0;
  for (const ex of section) {
    if (ex.media?.image_url) continue;
    const localPath = imageByName.get((ex.exercise_name || "").toLowerCase());
    if (localPath) {
      ex.media = { ...(ex.media || {}), image_url: localPath };
      count++;
    }
  }
  return count;
}

async function main() {
  if (!existsSync(MAP_FILE)) {
    console.error("Run download-trainerize-images.mjs first to generate the URL map.");
    process.exit(1);
  }

  const pool = await getPool();

  console.log("Loading exercise library...");
  const { rows: exercises } = await pool.query(
    "SELECT name, image_url FROM exercises WHERE image_url LIKE '/images/exercises/%'"
  );
  const imageByName = new Map(exercises.map((r) => [r.name.toLowerCase(), r.image_url]));
  console.log("  " + imageByName.size + " exercises with local images.");

  if (imageByName.size === 0) {
    console.error("No exercises have local image paths yet. Run the SQL migration first.");
    process.exit(1);
  }

  // Backfill sessions
  console.log("\nBackfilling sessions...");
  const { rows: sessions } = await pool.query("SELECT id, data FROM sessions WHERE data IS NOT NULL");

  let sessionsUpdated = 0;
  let exercisesUpdated = 0;

  for (const session of sessions) {
    const data = session.data;
    if (!data || !data.versions) continue;

    let changed = false;
    for (const version of Object.values(data.versions)) {
      for (const section of [version.warm_up, version.main_block, version.cooldown]) {
        exercisesUpdated += backfillSection(section, imageByName);
        if (section) {
          for (const ex of section) {
            if (ex.media && ex.media.image_url && !data._prev) changed = true;
          }
        }
      }
    }

    // Recalculate changed more carefully
    changed = false;
    for (const version of Object.values(data.versions)) {
      for (const section of [version.warm_up, version.main_block, version.cooldown]) {
        if (!section) continue;
        for (const ex of section) {
          if (ex.media && ex.media.image_url && ex.media.image_url.startsWith("/images/")) {
            changed = true;
          }
        }
      }
    }

    if (changed) {
      if (DRY_RUN) {
        console.log("  [DRY] Would update session " + session.id);
      } else {
        await pool.query("UPDATE sessions SET data = $1 WHERE id = $2", [JSON.stringify(data), session.id]);
      }
      sessionsUpdated++;
    }
  }
  console.log("  " + sessionsUpdated + " sessions updated.");

  // Backfill workout templates
  console.log("\nBackfilling workout templates...");
  const { rows: templates } = await pool.query("SELECT id, data FROM workout_templates WHERE data IS NOT NULL");

  let templatesUpdated = 0;

  for (const tmpl of templates) {
    const data = tmpl.data;
    if (!data) continue;

    for (const section of [data.warm_up, data.main_block, data.cooldown]) {
      backfillSection(section, imageByName);
    }

    let changed = false;
    for (const section of [data.warm_up, data.main_block, data.cooldown]) {
      if (!section) continue;
      for (const ex of section) {
        if (ex.media && ex.media.image_url && ex.media.image_url.startsWith("/images/")) {
          changed = true;
        }
      }
    }

    if (changed) {
      if (DRY_RUN) {
        console.log("  [DRY] Would update template " + tmpl.id);
      } else {
        await pool.query("UPDATE workout_templates SET data = $1 WHERE id = $2", [JSON.stringify(data), tmpl.id]);
      }
      templatesUpdated++;
    }
  }
  console.log("  " + templatesUpdated + " templates updated.");

  await pool.end();
  console.log("\nDone.");
}

main().catch((err) => { console.error(err); process.exit(1); });
