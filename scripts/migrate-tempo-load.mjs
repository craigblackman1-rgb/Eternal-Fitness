/**
 * CR-EF-124 — Migration: extract prescribed load from the `tempo` workaround.
 *
 * Trainers have been prefixing the load into tempo because there was no load field.
 * Examples: "2.5kg · Controlled", "12kg 2-1-2", "POWER Fast".
 * This script reads each tempo string, attempts to split a leading load token into
 * the new `load` key, and leaves the remainder as the tempo.
 *
 * Anything that cannot be split confidently is LEFT UNTOUCHED and LISTED for Esther
 * to confirm — a prescription is never silently rewritten.
 *
 * Usage:
 *   node scripts/migrate-tempo-load.mjs --dry-run   (default — reads only, reports counts)
 *   node scripts/migrate-tempo-load.mjs --apply      (writes changes in a transaction)
 *
 * Reads DATABASE_URL from .env.local. Run from the repo root.
 */

import fs from "fs";
import pg from "pg";

// ── Load splitting logic (mirrors lib/load-helpers.ts) ──────────

const SEPARATORS = [" · ", " + ", ", ", " - "];

const WEIGHT_RE = /^\d+(?:\.\d+)?\s*(kg|lb|lbs)$/i;
const PAIR_RE = /^\d+\s*[x×]\s*\d+(?:\.\d+)?\s*(kg|lb|lbs)?$/i;
const TOKEN_RE = /^(BODYWEIGHT|BW|POWER|MAX|RPE|AIR)\b/i;

function looksLikeLoad(s) {
  if (!s) return false;
  if (WEIGHT_RE.test(s)) return true;
  if (PAIR_RE.test(s)) return true;
  if (TOKEN_RE.test(s)) return true;
  // Bare number followed by unit
  if (/^\d+(?:\.\d+)?kg/i.test(s)) return true;
  return false;
}

function splitLoadFromTempo(tempoStr) {
  const s = (tempoStr ?? "").trim();
  if (!s) return null;

  for (const sep of SEPARATORS) {
    const idx = s.indexOf(sep);
    if (idx > 0) {
      const left = s.slice(0, idx).trim();
      const right = s.slice(idx + sep.length).trim();
      if (looksLikeLoad(left) && right) {
        return { load: left, tempo: right };
      }
    }
  }

  const spaceIdx = s.indexOf(" ");
  if (spaceIdx > 0) {
    const left = s.slice(0, spaceIdx).trim();
    const right = s.slice(spaceIdx + 1).trim();
    if (looksLikeLoad(left) && right) {
      return { load: left, tempo: right };
    }
  }

  return null;
}

// ── DB helpers ──────────────────────────────────────────────────

function allExercises(data) {
  if (!data?.versions) return [];
  const out = [];
  for (const version of Object.values(data.versions)) {
    if (!version) continue;
    for (const section of ["warm_up", "main_block", "cooldown"]) {
      if (Array.isArray(version[section])) {
        out.push(...version[section]);
      }
    }
  }
  return out;
}

// ── Main ────────────────────────────────────────────────────────

const isApply = process.argv.includes("--apply");
const isDryRun = !isApply;

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: match[1].trim() });

async function main() {
  await client.connect();

  console.log(`\nMode: ${isDryRun ? "DRY RUN (no changes written)" : "APPLY (writing changes)"}`);
  console.log("─".repeat(60));

  // ── Scan sessions ──
  const sessions = await client.query(
    "SELECT id, data FROM sessions WHERE data IS NOT NULL"
  );
  console.log(`\nSessions to scan: ${sessions.rows.length}`);

  let sessionSplit = 0;
  let sessionUntouched = 0;
  const sessionUntouchedList = [];

  for (const row of sessions.rows) {
    const exs = allExercises(row.data);
    for (const ex of exs) {
      if (!ex.tempo || ex.load) continue; // skip if no tempo or already has load
      const result = splitLoadFromTempo(ex.tempo);
      if (result) {
        sessionSplit++;
        if (!isDryRun) {
          ex.load = result.load;
          ex.tempo = result.tempo;
        }
      } else if (looksLikeLoad(ex.tempo.split(/[·+,]/)[0]?.trim())) {
        // Tempo looks like it might contain a load but we can't split confidently
        sessionUntouched++;
        sessionUntouchedList.push({
          session_id: row.id,
          exercise: ex.exercise_name,
          tempo: ex.tempo,
        });
      }
    }
    if (!isDryRun && sessionSplit > 0) {
      await client.query("UPDATE sessions SET data = $1 WHERE id = $2", [
        JSON.stringify(row.data),
        row.id,
      ]);
    }
  }

  // ── Scan workout_templates ──
  const templates = await client.query(
    "SELECT id, name, data FROM workout_templates WHERE data IS NOT NULL"
  );
  console.log(`Workout templates to scan: ${templates.rows.length}`);

  let templateSplit = 0;
  let templateUntouched = 0;
  const templateUntouchedList = [];

  for (const row of templates.rows) {
    const exs = allExercises(row.data);
    for (const ex of exs) {
      if (!ex.tempo || ex.load) continue;
      const result = splitLoadFromTempo(ex.tempo);
      if (result) {
        templateSplit++;
        if (!isDryRun) {
          ex.load = result.load;
          ex.tempo = result.tempo;
        }
      } else if (looksLikeLoad(ex.tempo.split(/[·+,]/)[0]?.trim())) {
        templateUntouched++;
        templateUntouchedList.push({
          template_id: row.id,
          template_name: row.name,
          exercise: ex.exercise_name,
          tempo: ex.tempo,
        });
      }
    }
    if (!isDryRun && templateSplit > 0) {
      await client.query("UPDATE workout_templates SET data = $1 WHERE id = $2", [
        JSON.stringify(row.data),
        row.id,
      ]);
    }
  }

  // ── Report ──
  console.log("\n" + "═".repeat(60));
  console.log("RESULTS");
  console.log("═".repeat(60));

  console.log(`\nSessions:   ${sessionSplit} split · ${sessionUntouched} left untouched for Esther`);
  console.log(`Templates:  ${templateSplit} split · ${templateUntouched} left untouched for Esther`);
  console.log(`Total:      ${sessionSplit + templateSplit} split · ${sessionUntouched + templateUntouched} left untouched`);

  if (sessionUntouchedList.length > 0 || templateUntouchedList.length > 0) {
    console.log("\n── LEFT UNTOUCHED (Esther must confirm) ──\n");
    for (const item of sessionUntouchedList) {
      console.log(`  Session ${item.session_id}: "${item.exercise}" — tempo: "${item.tempo}"`);
    }
    for (const item of templateUntouchedList) {
      console.log(`  Template "${item.template_name}" (${item.template_id}): "${item.exercise}" — tempo: "${item.tempo}"`);
    }
  }

  if (sessionSplit + templateSplit > 0) {
    console.log("\n── EXAMPLE SPLITS ──\n");
    // Show first few splits as examples
    let count = 0;
    for (const row of sessions.rows) {
      const exs = allExercises(row.data);
      for (const ex of exs) {
        if (!ex.tempo || ex.load) continue;
        const result = splitLoadFromTempo(ex.tempo);
        if (result && count < 5) {
          console.log(`  "${ex.exercise_name}": tempo "${ex.tempo}" → load "${result.load}", tempo "${result.tempo}"`);
          count++;
        }
      }
    }
  }

  if (isDryRun) {
    console.log("\n⚠ DRY RUN — no changes written. Re-run with --apply to write.");
  } else {
    console.log("\n✓ Changes written.");
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
