// Read-only reconciliation: Trainerize archive → hub blocks/sessions
// Reports what exists in Trainerize but not (or differently) in the hub, per client.
// Strictly read-only — no INSERT, UPDATE, DELETE, TRUNCATE.
//
// Usage:
//   node scripts/reconcile-trainerize-hub.mjs [--since 2026-08-02] [--client <uuid>] [--json] [--out <path>]
//
// Requires .env.local with DATABASE_URL (tunneled to prod).

import { createRequire } from "module";
import { join } from "path";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

// Minimal .env parser — avoids adding a `dotenv` dependency (not installed anywhere
// in this project's pnpm store; pnpm install is always a gate) for something this small.
function parse(contents) {
  const out = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

// --- Arg parsing ---
const SINCE_ARG = process.argv.indexOf("--since");
const SINCE = SINCE_ARG !== -1 ? process.argv[SINCE_ARG + 1] : "2026-08-02";

const CLIENT_ARG = process.argv.indexOf("--client");
const CLIENT_FILTER = CLIENT_ARG !== -1 ? process.argv[CLIENT_ARG + 1] : null;

const JSON_MODE = process.argv.includes("--json");

const OUT_ARG = process.argv.indexOf("--out");
const OUT_PATH = OUT_ARG !== -1
  ? process.argv[OUT_ARG + 1]
  : join(process.cwd(), ".context", `trainerize-hub-reconcile-${SINCE}.json`);

// --- DB connection ---
const envFile = join(process.cwd(), ".env.local");
if (!existsSync(envFile)) {
  console.error(".env.local not found");
  process.exit(1);
}
const env = parse(readFileSync(envFile, "utf-8"));
const connStr = env.DATABASE_URL;
if (!connStr) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: connStr });

// BIGINT (int8) returns as string from node-postgres; INT (int4) returns as
// number.  Normalise every id to string at the boundary so comparisons are
// always string-vs-string.
const idStr = (v) => (v === null || v === undefined ? null : String(v));

// --- Client identity resolution ---
// `trainerize_training_blocks.client_id` is already a UUID foreign key to
// `clients(id)` — the loader resolves the hub client at import time. No fuzzy
// name matching is needed; the FK join is authoritative.

async function resolveClients(pool, clientFilter) {
  // Archive clients: join blocks → clients on the FK. This is the exact match.
  const archiveQuery = clientFilter
    ? `SELECT DISTINCT b.client_id, c.name, c.trainerize_client_id
       FROM trainerize_training_blocks b
       JOIN clients c ON c.id = b.client_id
       WHERE b.client_id = $1`
    : `SELECT DISTINCT b.client_id, c.name, c.trainerize_client_id
       FROM trainerize_training_blocks b
       JOIN clients c ON c.id = b.client_id
       ORDER BY c.name`;
  const archiveParams = clientFilter ? [clientFilter] : [];
  const { rows: archiveClients } = await pool.query(archiveQuery, archiveParams);

  const resolved = [];
  const unlinked = [];

  for (const a of archiveClients) {
    resolved.push({
      hub_client_id: a.client_id,
      hub_name: a.name,
      tz_client_id: a.client_id,
      tz_client_name: a.name,
      trainerize_client_id: a.trainerize_client_id,
      match_rule: "archive_fk",
      match_confidence: "exact_id",
    });
  }

  // Check for any blocks whose client_id doesn't join to a clients row
  // (shouldn't happen, but report rather than drop)
  const unlinkedQuery = clientFilter
    ? `SELECT DISTINCT b.client_id
       FROM trainerize_training_blocks b
       LEFT JOIN clients c ON c.id = b.client_id
       WHERE c.id IS NULL
         AND b.client_id = $1`
    : `SELECT DISTINCT b.client_id
       FROM trainerize_training_blocks b
       LEFT JOIN clients c ON c.id = b.client_id
       WHERE c.id IS NULL`;
  const unlinkedParams = clientFilter ? [clientFilter] : [];
  const { rows: unlinkedRows } = await pool.query(unlinkedQuery, unlinkedParams);

  for (const u of unlinkedRows) {
    unlinked.push({
      tz_client_id: u.client_id,
      reason: "client_id has no matching row in clients table",
    });
  }

  return { resolved, ambiguous: [], unresolved: [], unlinked };
}

// --- Block comparison ---
async function compareClientBlocks(pool, tzClientId, hubClientId, since) {
  // Fetch Trainerize blocks with workouts, filtered by since date
  const { rows: tzBlocks } = await pool.query(
    `SELECT tb.id as tz_block_id, tb.trainerize_phase_id, tb.phase_name,
            tb.start_date, tb.end_date, tb.plan_type,
            COALESCE(tw.workout_count, 0) as workout_count,
            tw.workout_names
     FROM trainerize_training_blocks tb
     LEFT JOIN (
       SELECT trainerize_block_id,
              COUNT(*) as workout_count,
              ARRAY_AGG(workout_name ORDER BY workout_index) as workout_names
       FROM trainerize_workouts
       GROUP BY trainerize_block_id
     ) tw ON tw.trainerize_block_id = tb.id
     WHERE tb.client_id = $1
       AND tb.start_date >= $2
     ORDER BY tb.start_date`,
    [tzClientId, since],
  );

  // Fetch hub blocks with session counts
  const { rows: hubBlocks } = await pool.query(
    `SELECT b.id as hub_block_id, b.trainerize_phase_id, b.block_number,
            b.scheduled_start, b.block_note,
            COALESCE(sc.session_count, 0) as session_count,
            sc.session_names
     FROM blocks b
     LEFT JOIN (
       SELECT block_id,
              COUNT(*) as session_count,
              ARRAY_AGG(
                COALESCE(data->>'name', 'Session ' || session_number)
                ORDER BY session_number
              ) as session_names
       FROM sessions
       GROUP BY block_id
     ) sc ON sc.block_id = b.id
     WHERE b.client_id = $1
     ORDER BY b.block_number`,
    [hubClientId],
  );

  const tzMatched = new Set();
  const hubMatched = new Set();
  const classified = [];

  for (const tz of tzBlocks) {
    let hubBlock = null;
    let blockMatchRule = null;

    // Primary match: blocks.trainerize_phase_id
    const tzPhaseId = idStr(tz.trainerize_phase_id);
    if (tzPhaseId) {
      hubBlock = hubBlocks.find(
        (h) => idStr(h.trainerize_phase_id) === tzPhaseId,
      );
      if (hubBlock) blockMatchRule = "phase_id";
    }

    // Fallback: overlapping date range
    if (!hubBlock && tz.start_date) {
      const tzStart = new Date(tz.start_date);
      const candidates = hubBlocks.filter((h) => {
        if (!h.scheduled_start) return false;
        const hubStart = new Date(h.scheduled_start);
        // Overlap: hub block starts within 14 days of Trainerize block start
        const diffMs = Math.abs(hubStart - tzStart);
        return diffMs <= 14 * 24 * 60 * 60 * 1000;
      });
      if (candidates.length === 1) {
        hubBlock = candidates[0];
        blockMatchRule = "date_overlap";
      } else if (candidates.length > 1) {
        // Pick closest date
        hubBlock = candidates.reduce((closest, c) => {
          const cDist = Math.abs(
            new Date(c.scheduled_start) - tzStart,
          );
          const closestDist = Math.abs(
            new Date(closest.scheduled_start) - tzStart,
          );
          return cDist < closestDist ? c : closest;
        });
        blockMatchRule = "date_overlap_closest";
      }
    }

    const tzWorkoutNames = tz.workout_names || [];
    const hubSessionNames = hubBlock ? hubBlock.session_names || [] : [];

    if (!hubBlock) {
      classified.push({
        tz_phase_id: tzPhaseId,
        tz_phase_name: tz.phase_name,
        tz_start: tz.start_date,
        tz_end: tz.end_date,
        tz_workout_count: tz.workout_count,
        tz_workout_names: tzWorkoutNames,
        status: "NEW",
        block_match_rule: null,
      });
      tzMatched.add(tz.tz_block_id);
    } else {
      hubMatched.add(hubBlock.hub_block_id);

      // Check if block has changed
      const workoutCountDiff = tz.workout_count !== hubBlock.session_count;
      const nameDiff =
        JSON.stringify(tzWorkoutNames) !== JSON.stringify(hubSessionNames);

      const status = workoutCountDiff || nameDiff ? "CHANGED" : "MATCHED";

      classified.push({
        tz_phase_id: tzPhaseId,
        tz_phase_name: tz.phase_name,
        tz_start: tz.start_date,
        tz_end: tz.end_date,
        tz_workout_count: tz.workout_count,
        tz_workout_names: tzWorkoutNames,
        hub_block_id: hubBlock.hub_block_id,
        hub_block_number: hubBlock.block_number,
        hub_session_count: hubBlock.session_count,
        hub_session_names: hubSessionNames,
        status,
        block_match_rule: blockMatchRule,
        diff: workoutCountDiff || nameDiff
          ? {
              workout_count: tz.workout_count - hubBlock.session_count,
              names_differ: nameDiff,
            }
          : null,
      });
    }
  }

  // Hub-only blocks (not matched to any Trainerize block)
  const hubOnly = hubBlocks
    .filter((h) => !hubMatched.has(h.hub_block_id))
    .map((h) => ({
      hub_block_id: h.hub_block_id,
      hub_block_number: h.block_number,
      hub_session_count: h.session_count,
      hub_session_names: h.session_names || [],
      hub_scheduled_start: h.scheduled_start,
      status: "HUB_ONLY",
    }));

  // Unpromotable: Trainerize blocks with >18 workouts (exceeds CHECK constraint)
  const unpromotable = tzBlocks
    .filter((t) => t.workout_count > 18)
    .map((t) => ({
      tz_phase_id: t.trainerize_phase_id,
      tz_phase_name: t.phase_name,
      tz_workout_count: t.workout_count,
      reason: `workout count ${t.workout_count} exceeds session_number CHECK (BETWEEN 1 AND 18)`,
    }));

  return { classified, hubOnly, unpromotable };
}

// --- Main ---
async function main() {
  console.log(`Reconciling Trainerize → hub (since ${SINCE})\n`);

  const { resolved, ambiguous, unresolved, unlinked } = await resolveClients(pool, CLIENT_FILTER);

  if (resolved.length === 0 && ambiguous.length === 0) {
    console.log("No clients to reconcile.");
    await pool.end();
    return;
  }

  // Report any unlinked blocks (FK orphan — shouldn't happen)
  if (unlinked.length > 0) {
    console.log(`WARNING: ${unlinked.length} block(s) with unresolvable client_id:`);
    for (const u of unlinked) {
      console.log(`  ${u.tz_client_id}: ${u.reason}`);
    }
    console.log();
  }

  const clients = [];
  const totals = {
    new: 0,
    changed: 0,
    matched: 0,
    hub_only: 0,
    unpromotable: 0,
  };

  for (const r of resolved) {
    const { classified, hubOnly, unpromotable } = await compareClientBlocks(
      pool,
      r.tz_client_id,
      r.hub_client_id,
      SINCE,
    );

    const newBlocks = classified.filter((b) => b.status === "NEW");
    const changedBlocks = classified.filter((b) => b.status === "CHANGED");
    const matchedBlocks = classified.filter((b) => b.status === "MATCHED");

    totals.new += newBlocks.length;
    totals.changed += changedBlocks.length;
    totals.matched += matchedBlocks.length;
    totals.hub_only += hubOnly.length;
    totals.unpromotable += unpromotable.length;

    clients.push({
      hub_client_id: r.hub_client_id,
      hub_name: r.hub_name,
      tz_client_id: r.tz_client_id,
      tz_client_name: r.tz_client_name,
      trainerize_client_id: r.trainerize_client_id,
      match_rule: r.match_rule,
      match_confidence: r.match_confidence,
      blocks: classified,
      hub_only_blocks: hubOnly,
      unpromotable,
      summary: {
        tz_blocks: classified.length,
        new: newBlocks.length,
        changed: changedBlocks.length,
        matched: matchedBlocks.length,
        hub_only: hubOnly.length,
        unpromotable: unpromotable.length,
      },
    });
  }

  const output = {
    generated_at: new Date().toISOString(),
    since: SINCE,
    totals: {
      clients_resolved: resolved.length,
      clients_ambiguous: ambiguous.length,
      clients_unresolved: unresolved.length,
      ...totals,
    },
    clients,
    ambiguous,
    unresolved,
    unlinked,
  };

  // --- Write output files ---
  const outDir = join(process.cwd(), ".context");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // JSON output
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

  // Markdown summary alongside JSON
  const mdPath = OUT_PATH.replace(/\.json$/, ".md");
  const md = [];
  md.push(`# Trainerize ↔ Hub Reconciliation`);
  md.push(``);
  md.push(`Generated: ${output.generated_at}`);
  md.push(`Since: ${SINCE}`);
  md.push(``);

  md.push(`## Totals`);
  md.push(``);
  md.push(`| Metric | Count |`);
  md.push(`|--------|-------|`);
  md.push(`| Clients resolved | ${resolved.length} |`);
  md.push(`| Clients ambiguous | ${ambiguous.length} |`);
  md.push(`| Clients unresolved | ${unresolved.length} |`);
  md.push(`| Trainerize blocks — NEW | ${totals.new} |`);
  md.push(`| Trainerize blocks — CHANGED | ${totals.changed} |`);
  md.push(`| Trainerize blocks — MATCHED | ${totals.matched} |`);
  md.push(`| Hub-only blocks | ${totals.hub_only} |`);
  md.push(`| Unpromotable blocks (>18 workouts) | ${totals.unpromotable} |`);
  md.push(``);

  if (clients.length > 0) {
    md.push(`## Per-client detail`);
    md.push(``);
    for (const c of clients) {
      md.push(`### ${c.hub_name} (Trainerize: ${c.tz_client_name || "N/A"})`);
      md.push(``);
      md.push(`- Match: ${c.match_rule} (${c.match_confidence})`);
      if (c.trainerize_client_id) {
        md.push(`- Trainerize account ID: ${c.trainerize_client_id}`);
      }
      md.push(`- Trainerize blocks: ${c.summary.tz_blocks} | NEW: ${c.summary.new} | CHANGED: ${c.summary.changed} | MATCHED: ${c.summary.matched}`);
      md.push(`- Hub-only blocks: ${c.summary.hub_only}`);
      if (c.unpromotable.length > 0) {
        md.push(`- **Unpromotable:** ${c.unpromotable.map((u) => `${u.tz_phase_name} (${u.tz_workout_count} workouts)`).join(", ")}`);
      }
      md.push(``);

      for (const b of c.blocks) {
        if (b.status === "NEW") {
          md.push(`  - **NEW** — ${b.tz_phase_name} (${b.tz_start} → ${b.tz_end || "?"}), ${b.tz_workout_count} workouts`);
        } else if (b.status === "CHANGED") {
          md.push(`  - **CHANGED** — ${b.tz_phase_name} → hub block #${b.hub_block_number} (${b.diff.workout_count !== 0 ? `${b.diff.workout_count > 0 ? "+" : ""}${b.diff.workout_count} workouts` : ""}${b.diff.names_differ ? (b.diff.workout_count !== 0 ? ", " : "") + "names differ" : ""})`);
        } else {
          md.push(`  - MATCHED — ${b.tz_phase_name} ↔ hub block #${b.hub_block_number}`);
        }
      }
      for (const b of c.hub_only_blocks) {
        md.push(`  - HUB-ONLY — block #${b.hub_block_number}, ${b.hub_session_count} sessions`);
      }
      md.push(``);
    }
  }

  if (ambiguous.length > 0) {
    md.push(`## Ambiguous clients (NOT counted as matched)`);
    md.push(``);
    for (const a of ambiguous) {
      md.push(`- **${a.hub_name}**: ${a.reason}`);
      for (const c of a.candidates) {
        md.push(`  - Candidate: ${c.name} (id: ${c.id})`);
      }
    }
    md.push(``);
  }

  if (unresolved.length > 0) {
    md.push(`## Unresolved clients`);
    md.push(``);
    for (const u of unresolved) {
      md.push(`- **${u.hub_name}**: ${u.reason}`);
    }
    md.push(``);
  }

  if (unlinked.length > 0) {
    md.push(`## Unlinked blocks (FK orphan)`);
    md.push(``);
    for (const u of unlinked) {
      md.push(`- client_id \`${u.tz_client_id}\`: ${u.reason}`);
    }
    md.push(``);
  }

  writeFileSync(mdPath, md.join("\n"));

  // --- Stdout summary (one line per client) ---
  for (const c of clients) {
    const tzName = c.tz_client_name || "N/A";
    const tzAccountId = c.trainerize_client_id || "N/A";
    console.log(
      `${c.hub_name} | ${tzName} | tz_account:${tzAccountId} | ${c.match_rule} | NEW:${c.summary.new} CHANGED:${c.summary.changed} MATCHED:${c.summary.matched} HUB_ONLY:${c.summary.hub_only} UNPROMOTABLE:${c.summary.unpromotable}`,
    );
  }

  if (ambiguous.length > 0) {
    console.log(`\n${ambiguous.length} ambiguous client(s) — see ${mdPath}`);
  }

  console.log(`\nOutput: ${OUT_PATH}`);
  console.log(`Summary: ${mdPath}`);

  if (!JSON_MODE) {
    console.log(`\nTotals: ${resolved.length} resolved, ${ambiguous.length} ambiguous, ${unresolved.length} unresolved`);
    console.log(`Blocks: ${totals.new} new, ${totals.changed} changed, ${totals.matched} matched, ${totals.hub_only} hub-only, ${totals.unpromotable} unpromotable`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
