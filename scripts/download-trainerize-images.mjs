// Downloads Trainerize-hosted exercise thumbnails to public/images/exercises/
// and generates a SQL migration to update the URLs.
//
// Usage: node scripts/download-trainerize-images.mjs [--dry-run] [--concurrency 10]
//
// Reads the Trainerize seed migration to extract all video.trainerize.com image URLs,
// downloads each to public/images/exercises/{sanitized-name}.jpg, then writes:
//   1. The images themselves
//   2. scripts/trainerize-image-migration.sql — UPDATE statements for the exercises table
//   3. scripts/trainerize-image-map.json — old URL → local path (for session JSONB backfill)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { mkdir } from "fs/promises";

const ROOT = process.cwd();
const SEED_FILE = join(ROOT, "db/migrations/20260710_exercises_trainerize_seed.sql");
const OUT_DIR = join(ROOT, "public/images/exercises");
const MAP_FILE = join(ROOT, "scripts/trainerize-image-map.json");
const SQL_FILE = join(ROOT, "scripts/trainerize-image-migration.sql");

const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY_ARG = process.argv.indexOf("--concurrency");
const CONCURRENCY = CONCURRENCY_ARG !== -1 ? parseInt(process.argv[CONCURRENCY_ARG + 1], 10) : 8;

// ── Parse seed SQL ───────────────────────────────────────────────

function parseSeedUrls(sql) {
  const rows = [];
  // Match each VALUES row: ('name', 'trainerize', ..., 'https://video.trainerize.com/images/...', ...)
  const rowRegex = /\('([^']*)',\s*'trainerize',\s*'([^']*)',\s*(TRUE|FALSE),\s*'[^']*',\s*[^,]*,\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*[^,]*,\s*'[^']*',\s*[^,]*,\s*[^,]*,\s*'?(https?:\/\/[^',]*)'?\s*,\s*(NULL|'[^']*')\)/g;
  let match;
  while ((match = rowRegex.exec(sql)) !== null) {
    const [, name, trainerizeId, custom, imageUrl, videoUrl] = match;
    if (imageUrl && imageUrl.includes("video.trainerize.com")) {
      rows.push({ name, trainerizeId, custom: custom === "TRUE", imageUrl });
    }
  }
  return rows;
}

// ── Sanitize filename ────────────────────────────────────────────

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Download with retry ──────────────────────────────────────────

async function downloadFile(url, dest, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "EternalFitness/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      return true;
    } catch (err) {
      if (attempt === retries) {
        console.error(`  ✗ Failed after ${retries + 1} attempts: ${url} — ${err.message}`);
        return false;
      }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

// ── Process in batches ───────────────────────────────────────────

async function processBatch(items, fn, concurrency) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + concurrency < items.length) {
      process.stdout.write(`  ${Math.min(i + concurrency, items.length)}/${items.length}...\r`);
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("Reading seed migration...");
  const sql = readFileSync(SEED_FILE, "utf-8");
  const rows = parseSeedUrls(sql);
  console.log(`Found ${rows.length} exercises with Trainerize image URLs.`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Would download to:", OUT_DIR);
    const sample = rows.slice(0, 5);
    for (const r of sample) {
      const filename = `${sanitizeFilename(r.name)}.jpg`;
      console.log(`  ${r.imageUrl} → public/images/exercises/${filename}`);
    }
    if (rows.length > 5) console.log(`  ... and ${rows.length - 5} more`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // Check which are already downloaded
  const toDownload = rows.filter((r) => {
    const filename = `${sanitizeFilename(r.name)}.jpg`;
    return !existsSync(join(OUT_DIR, filename));
  });

  if (toDownload.length === 0) {
    console.log("All images already downloaded.");
  } else {
    console.log(`Downloading ${toDownload.length} images (${rows.length - toDownload.length} already cached)...`);
    let success = 0;
    let failed = 0;

    await processBatch(
      toDownload,
      async (r) => {
        const filename = `${sanitizeFilename(r.name)}.jpg`;
        const dest = join(OUT_DIR, filename);
        const ok = await downloadFile(r.imageUrl, dest);
        if (ok) success++;
        else failed++;
      },
      CONCURRENCY
    );

    console.log(`\nDone: ${success} downloaded, ${failed} failed.`);
  }

  // Generate mapping JSON
  const map = {};
  for (const r of rows) {
    const filename = `${sanitizeFilename(r.name)}.jpg`;
    map[r.imageUrl] = `/images/exercises/${filename}`;
  }
  writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  console.log(`Wrote URL mapping to ${MAP_FILE}`);

  // Generate SQL migration for exercises table
  const updates = rows.map((r) => {
    const localPath = `/images/exercises/${sanitizeFilename(r.name)}.jpg`;
    return `UPDATE exercises SET image_url = '${localPath}' WHERE image_url = '${r.imageUrl}';`;
  });

  const sqlContent = [
    "-- Migrate exercise images from Trainerize CDN to local hosting.",
    "-- Generated by scripts/download-trainerize-images.mjs",
    "-- Run after downloading images to public/images/exercises/",
    "",
    ...updates,
    "",
  ].join("\n");

  writeFileSync(SQL_FILE, sqlContent);
  console.log(`Wrote SQL migration to ${SQL_FILE}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review a few images in public/images/exercises/`);
  console.log(`  2. Run the SQL migration against the database`);
  console.log(`  3. Backfill session JSONB with: node scripts/backfill-session-images.mjs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
