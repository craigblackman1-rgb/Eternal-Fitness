#!/usr/bin/env node
/**
 * verify-client-profiles.mjs — READ-ONLY report on the 10 profile-checklist fields.
 *
 * Usage:
 *   node scripts/verify-client-profiles.mjs                # table to stdout
 *   node scripts/verify-client-profiles.mjs --json          # JSON output
 *   node scripts/verify-client-profiles.mjs --client <id>   # single-client detail
 *
 * Requires DATABASE_URL in the environment (or in .env.local at repo root).
 * Exit code is always 0 — this is a report, not a gate.
 *
 * The 10 checks (per client):
 *   1. package_type — set and one of the allowed values
 *   2. sessions_purchased — NOT NULL
 *   3. profile.logistics.frequency — present with {unit, per_unit}
 *   4. delivery_mode — set and consistent with profile.logistics.training_location
 *   5. clients.equipment — not NULL ([] is valid = bodyweight-only)
 *   6. clients.band_set_id — set
 *   7. Medication consistency — structured vs free-text
 *   8. profile.health.gp_clearance_required — explicitly set (true or false)
 *   9. PAR-Q satisfied — signed_parq row, client_documents kind='parq', or override
 *  10. Session archetypes — current block main sessions must not all be the same value
 */

import pg from "pg";
import fs from "fs";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

let connStr = process.env.DATABASE_URL;
if (!connStr) {
  const envPath = new URL("../.env.local", import.meta.url);
  try {
    const env = fs.readFileSync(envPath, "utf8");
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (m) connStr = m[1].trim();
  } catch {
    // file missing — fall through to error below
  }
}
if (!connStr) {
  console.error("DATABASE_URL is not set. Export it or add it to .env.local.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: connStr });

// ---------------------------------------------------------------------------
// Allowed values (from types/index.ts — no DB CHECK constraint)
// ---------------------------------------------------------------------------
const ALLOWED_PACKAGE_TYPES = ["4-week", "6-week", "12-week", "24-week", "ongoing"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ok = "OK";
const missing = "MISSING";
const mismatch = "MISMATCH";
const unknownField = "UNKNOWN-FIELD";

function label(status, extra) {
  return extra ? `${status}(${extra})` : status;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await client.connect();

  // Fetch all clients — use clients.name (the actual column; no full_name on this table)
  const { rows: clients } = await client.query(
    `SELECT id, name, package_type, sessions_purchased,
            delivery_mode, equipment, band_set_id, profile
     FROM clients
     ORDER BY name`
  );

  if (clients.length === 0) {
    console.log("No clients found.");
    await client.end();
    process.exit(0);
  }

  // Parse CLI flags
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const clientIdx = args.indexOf("--client");
  const filterClient = clientIdx !== -1 ? args[clientIdx + 1] : null;

  // ---------------------------------------------------------------------------
  // Bulk queries — each wrapped so a table-level error degrades gracefully
  // ---------------------------------------------------------------------------
  const allClientIds = clients.map((c) => c.id);

  // Active blocks
  let activeBlockByClient = new Map();
  try {
    const { rows: blocks } = await client.query(
      `SELECT id, client_id, status
       FROM blocks
       WHERE status = 'active'`
    );
    for (const b of blocks) {
      activeBlockByClient.set(b.client_id, b.id);
    }
  } catch (err) {
    console.error(`${unknownField} (bulk/blocks): ${err.message}`);
  }

  // Main sessions for active blocks (parent_session_id IS NULL → main session)
  let mainSessionsByBlock = new Map();
  const blockIds = [...new Set([...activeBlockByClient.values()])];
  if (blockIds.length > 0) {
    try {
      const { rows: sessions } = await client.query(
        `SELECT block_id, archetype
         FROM sessions
         WHERE block_id = ANY($1)
           AND parent_session_id IS NULL`,
        [blockIds]
      );
      for (const s of sessions) {
        if (!mainSessionsByBlock.has(s.block_id))
          mainSessionsByBlock.set(s.block_id, []);
        mainSessionsByBlock.get(s.block_id).push(s);
      }
    } catch (err) {
      console.error(`${unknownField} (bulk/sessions): ${err.message}`);
    }
  }

  // signed_parq rows (check 9)
  let signedParqByClient = new Map();
  try {
    const { rows: signedParqs } = await client.query(
      `SELECT client_id, status
       FROM signed_parq
       WHERE client_id = ANY($1)`,
      [allClientIds]
    );
    for (const sp of signedParqs) {
      if (!signedParqByClient.has(sp.client_id))
        signedParqByClient.set(sp.client_id, []);
      signedParqByClient.get(sp.client_id).push(sp);
    }
  } catch (err) {
    console.error(`${unknownField} (bulk/signed_parq): ${err.message}`);
  }

  // client_documents kind='parq' (check 9)
  let parqDocsByClient = new Map();
  try {
    const { rows: parqDocs } = await client.query(
      `SELECT client_id, status
       FROM client_documents
       WHERE client_id = ANY($1) AND kind = 'parq'`,
      [allClientIds]
    );
    for (const d of parqDocs) {
      if (!parqDocsByClient.has(d.client_id))
        parqDocsByClient.set(d.client_id, []);
      parqDocsByClient.get(d.client_id).push(d);
    }
  } catch (err) {
    console.error(`${unknownField} (bulk/client_documents): ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // Run checks — each wrapped so one failing check doesn't kill the rest
  // ---------------------------------------------------------------------------
  const results = [];

  for (const c of clients) {
    if (filterClient && !matchesFilter(c, filterClient)) continue;

    const p = c.profile || {};
    const logistics = p.logistics || {};
    const health = p.health || {};
    const checks = {};

    // 1. package_type
    try {
      if (!c.package_type) {
        checks.package_type = label(missing);
      } else if (!ALLOWED_PACKAGE_TYPES.includes(c.package_type)) {
        checks.package_type = label(mismatch, `unexpected: ${c.package_type}`);
      } else {
        checks.package_type = ok;
      }
    } catch (err) {
      checks.package_type = `${unknownField}(package_type): ${err.message}`;
    }

    // 2. sessions_purchased
    try {
      checks.sessions_purchased = c.sessions_purchased !== null ? ok : missing;
    } catch (err) {
      checks.sessions_purchased = `${unknownField}(sessions_purchased): ${err.message}`;
    }

    // 3. profile.logistics.frequency
    try {
      const freq = logistics.frequency;
      if (
        freq &&
        typeof freq === "object" &&
        typeof freq.unit === "string" &&
        typeof freq.per_unit === "number"
      ) {
        checks.frequency = ok;
      } else if (freq && typeof freq === "object") {
        checks.frequency = label(mismatch, JSON.stringify(freq));
      } else {
        checks.frequency = missing;
      }
    } catch (err) {
      checks.frequency = `${unknownField}(frequency): ${err.message}`;
    }

    // 4. delivery_mode + training_location consistency
    try {
      const tl = logistics.training_location;
      if (!c.delivery_mode) {
        checks.delivery_mode = missing;
      } else if (!tl) {
        checks.delivery_mode = label(
          mismatch,
          `mode=${c.delivery_mode}, location=absent`
        );
      } else {
        const expected = c.delivery_mode === "home_training" ? "home" : "studio";
        if (tl === expected || tl === "both") {
          checks.delivery_mode = ok;
        } else {
          checks.delivery_mode = label(
            mismatch,
            `mode=${c.delivery_mode}, location=${tl}`
          );
        }
      }
    } catch (err) {
      checks.delivery_mode = `${unknownField}(delivery_mode): ${err.message}`;
    }

    // 5. equipment
    try {
      if (c.equipment === null || c.equipment === undefined) {
        checks.equipment = missing;
      } else if (Array.isArray(c.equipment) && c.equipment.length === 0) {
        checks.equipment = "OK(bodyweight-only)";
      } else {
        checks.equipment = ok;
      }
    } catch (err) {
      checks.equipment = `${unknownField}(equipment): ${err.message}`;
    }

    // 6. band_set_id
    try {
      checks.band_set_id = c.band_set_id ? ok : missing;
    } catch (err) {
      checks.band_set_id = `${unknownField}(band_set_id): ${err.message}`;
    }

    // 7. Medication consistency
    try {
      const meds = health.medications;
      const medsRelevant = health.medications_relevant;
      const hasStructured = Array.isArray(meds) && meds.length > 0;
      const hasFreeText = Array.isArray(medsRelevant) && medsRelevant.length > 0;
      if (hasFreeText && !hasStructured) {
        checks.medications = label(
          mismatch,
          "free-text only, no structured entries"
        );
      } else if (hasStructured && hasFreeText) {
        checks.medications = ok;
      } else if (hasStructured) {
        checks.medications = ok;
      } else {
        checks.medications = ok;
      }
    } catch (err) {
      checks.medications = `${unknownField}(medications): ${err.message}`;
    }

    // 8. gp_clearance_required
    try {
      if (
        health.gp_clearance_required === true ||
        health.gp_clearance_required === false
      ) {
        checks.gp_clearance = ok;
      } else {
        checks.gp_clearance = missing;
      }
    } catch (err) {
      checks.gp_clearance = `${unknownField}(gp_clearance): ${err.message}`;
    }

    // 9. PAR-Q satisfaction
    try {
      const hasOverride = health.parq_trainer_override === true;
      const signedParqs = signedParqByClient.get(c.id) || [];
      const hasSignedParq = signedParqs.some(
        (sp) => sp.status === "signed" || sp.status === "received"
      );
      const parqDocuments = parqDocsByClient.get(c.id) || [];
      const hasParqDoc = parqDocuments.some(
        (d) => d.status === "signed" || d.status === "sent"
      );

      if (hasOverride) {
        checks.parq = "OK(override)";
      } else if (hasSignedParq) {
        checks.parq = "OK(signed_parq)";
      } else if (hasParqDoc) {
        checks.parq = "OK(document)";
      } else {
        checks.parq = missing;
      }
    } catch (err) {
      checks.parq = `${unknownField}(parq): ${err.message}`;
    }

    // 10. Session archetypes
    try {
      const blockId = activeBlockByClient.get(c.id);
      if (!blockId) {
        checks.archetypes = "N/A(no active block)";
      } else {
        const sessions = mainSessionsByBlock.get(blockId) || [];
        if (sessions.length === 0) {
          checks.archetypes = "N/A(no main sessions)";
        } else {
          const archetypes = [
            ...new Set(sessions.map((s) => s.archetype).filter(Boolean)),
          ];
          if (archetypes.length === 0) {
            checks.archetypes = label(mismatch, "no archetype set");
          } else if (archetypes.length === 1) {
            checks.archetypes = label(mismatch, `all=${archetypes[0]}`);
          } else {
            checks.archetypes = `OK(${archetypes.join(",")})`;
          }
        }
      }
    } catch (err) {
      checks.archetypes = `${unknownField}(archetypes): ${err.message}`;
    }

    const failCount = Object.values(checks).filter(
      (v) =>
        v === missing ||
        v.startsWith(mismatch) ||
        v.startsWith(unknownField)
    ).length;

    results.push({ client: c.name, id: c.id, checks, failCount });
  }

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------
  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
  } else if (filterClient) {
    printDetail(results);
  } else {
    printTable(results);
  }

  await client.end();
}

// ---------------------------------------------------------------------------
// Filter helper
// ---------------------------------------------------------------------------
function matchesFilter(client, term) {
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      term
    )
  ) {
    return client.id === term;
  }
  return client.name.toLowerCase().includes(term.toLowerCase());
}

// ---------------------------------------------------------------------------
// Table output
// ---------------------------------------------------------------------------
function printTable(results) {
  const cols = [
    "package_type",
    "sessions_purchased",
    "frequency",
    "delivery_mode",
    "equipment",
    "band_set_id",
    "medications",
    "gp_clearance",
    "parq",
    "archetypes",
  ];

  const nameW = Math.max(20, ...results.map((r) => r.client.length));
  const header = ["Client".padEnd(nameW), ...cols.map((c) => c.padEnd(18))].join(
    " "
  );
  console.log(header);
  console.log("-".repeat(header.length));

  for (const r of results) {
    const row = [
      r.client.padEnd(nameW),
      ...cols.map((c) => r.checks[c].padEnd(18)),
    ].join(" ");
    console.log(row);
  }

  const complete = results.filter((r) => r.failCount === 0).length;
  console.log();
  console.log(`${complete} of ${results.length} clients complete`);

  const sorted = [...results].sort((a, b) => b.failCount - a.failCount);
  console.log();
  console.log("Priority order (most issues first):");
  for (const r of sorted) {
    if (r.failCount === 0) break;
    const failing = Object.entries(r.checks)
      .filter(
        ([, v]) =>
          v === missing || v.startsWith(mismatch) || v.startsWith(unknownField)
      )
      .map(([k]) => k)
      .join(", ");
    console.log(`  ${r.failCount} issues — ${r.client}: ${failing}`);
  }
}

// ---------------------------------------------------------------------------
// Single-client detail
// ---------------------------------------------------------------------------
function printDetail(results) {
  if (results.length === 0) {
    console.log("No matching client found.");
    return;
  }
  const r = results[0];
  console.log(`Client: ${r.client} (${r.id})`);
  console.log();
  for (const [check, status] of Object.entries(r.checks)) {
    console.log(`  ${check.padEnd(22)} ${status}`);
  }
  console.log();
  console.log(`Failing checks: ${r.failCount}`);
}

// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
