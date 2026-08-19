// CR-EF-037 Phase 2 / CR-EF-036: backfill exercise_uid on set_logs rows that
// still only carry the old positional exercise_ref ("version:section:index:
// name" -- lib/exercise-ref.ts's parseExerciseRef format). Positional refs
// break the moment a prescription is edited (index shifts, or the exercise
// is removed) -- uid-keyed identity is what CR-EF-036 needs to make logged
// data survive prescription edits and be visible across surfaces.
//
// Resolution: parse the ref, load the owning session's `data` JSONB, walk
// data.versions[version][section][index], read its `.uid` and
// `.exercise_name`. A ref that no longer resolves (prescription edited since
// the log was written) is left untouched and reported -- there's no safe way
// to guess its uid, so this is exactly the "derived verification" case where
// the scope is computed at run time, not hand-typed.
//
// Dry-runs by default (SELECT only, no writes). Pass --apply to actually run
// the UPDATEs inside one transaction, print before/after counts, and COMMIT.
//
// Run from the repo root: node scripts/backfill-exercise-uid.mjs [--apply]

import fs from "fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: match[1].trim() });

function parseExerciseRef(ref) {
  const parts = String(ref).split(":");
  if (parts.length < 4) return null;
  const index = Number(parts[2]);
  if (!Number.isInteger(index) || index < 0) return null;
  return { version: parts[0], section: parts[1], index, name: parts.slice(3).join(":") };
}

async function main() {
  await client.connect();

  const unresolved = await client.query(`
    SELECT sl.id, sl.session_id, sl.exercise_ref
      FROM set_logs sl
     WHERE sl.exercise_uid IS NULL
     ORDER BY sl.session_id, sl.created_at
  `);
  console.log(`${unresolved.rows.length} set_logs row(s) missing exercise_uid.`);

  if (unresolved.rows.length === 0) {
    await client.end();
    return;
  }

  const sessionIds = [...new Set(unresolved.rows.map((r) => r.session_id))];
  const sessions = await client.query(
    `SELECT id, data FROM sessions WHERE id = ANY($1::uuid[])`,
    [sessionIds],
  );
  const sessionData = new Map(sessions.rows.map((r) => [r.id, r.data]));

  const resolved = [];
  const stillUnresolved = [];

  for (const row of unresolved.rows) {
    const parsed = parseExerciseRef(row.exercise_ref);
    const data = sessionData.get(row.session_id);
    const section = parsed && data?.versions?.[parsed.version]?.[parsed.section];
    const exercise = Array.isArray(section) ? section[parsed.index] : undefined;
    if (parsed && exercise?.uid) {
      resolved.push({ id: row.id, uid: exercise.uid, name: exercise.exercise_name ?? null });
    } else {
      stillUnresolved.push({ id: row.id, session_id: row.session_id, exercise_ref: row.exercise_ref });
    }
  }

  console.log(`Resolvable now: ${resolved.length}`);
  console.log(`Cannot resolve (prescription changed since log, or malformed ref): ${stillUnresolved.length}`);
  if (stillUnresolved.length > 0) {
    console.log("Unresolved rows (left untouched):");
    for (const r of stillUnresolved) {
      console.log(`  set_logs ${r.id} (session ${r.session_id}): ref="${r.exercise_ref}"`);
    }
  }

  if (!APPLY) {
    console.log("\nDry run only — no changes made. Re-run with --apply to update the resolvable rows.");
    await client.end();
    return;
  }

  if (resolved.length === 0) {
    console.log("\nNothing resolvable to apply.");
    await client.end();
    return;
  }

  await client.query("BEGIN");
  try {
    let updated = 0;
    for (const r of resolved) {
      const res = await client.query(
        `UPDATE set_logs SET exercise_uid = $1, exercise_name = COALESCE(exercise_name, $2) WHERE id = $3`,
        [r.uid, r.name, r.id],
      );
      updated += res.rowCount;
    }
    console.log(`\nUpdated ${updated} row(s).`);

    const recheck = await client.query(`SELECT count(*) FROM set_logs WHERE exercise_uid IS NULL`);
    const remaining = Number(recheck.rows[0].count);
    const expectedRemaining = stillUnresolved.length;
    if (remaining !== expectedRemaining) {
      console.error(
        `Post-update check: expected ${expectedRemaining} rows still missing exercise_uid, found ${remaining} — rolling back.`,
      );
      await client.query("ROLLBACK");
      process.exit(1);
    }
    console.log(`Post-update check: ${remaining} row(s) remain unresolved, as expected.`);

    await client.query("COMMIT");
    console.log("COMMITTED.");
  } catch (e) {
    console.error("Backfill errored — rolling back.", e);
    await client.query("ROLLBACK");
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
