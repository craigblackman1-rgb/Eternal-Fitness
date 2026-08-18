// Phase 1 structural pre-pass for the 2026-08-18 hub design-parity review.
//
// Every ef-control-hub mockup carries stable data-od-id markers on its major
// sections (2-33 per file, present across all 44 in-scope mockups). Nobody has
// been using that as a machine-readable contract. This walks every mockup,
// pulls the ordered data-od-id list plus a short label for each (nearest
// heading-ish text), and separately flags quick-actions/tab-strip/status-pill
// presence -- so the Phase 2 browser review has a concrete structural
// checklist per screen instead of "looks different".
//
// Lightweight regex extraction, not a real HTML parser -- fine for this
// purpose since we only need element order and rough labels, not a DOM.
//
// Usage: node .context/tools/extract-mockup-structure.mjs
// Output: .context/tools/mockup-structure-manifest.json (gitignored, point-in-time)

import fs from "fs";
import path from "path";

const MOCKUP_DIR = process.env.MOCKUP_DIR || "D:\\apps\\design-systems\\ef-control-hub";
const OUT_OF_SCOPE_TOP = new Set(["_archive", "documents", ".od-skills", "assets", "preview"]);

function collectMockups(dir, base = "") {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "index.html") continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (base === "" && OUT_OF_SCOPE_TOP.has(entry.name)) continue;
      out.push(...collectMockups(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".html")) {
      out.push(rel.replace(/\\/g, "/"));
    }
  }
  return out;
}

function nearestLabel(html, tagStartIdx) {
  // Look forward up to ~2000 chars for the first heading-ish text: h1-h4, or a
  // class known to carry a section title in this library.
  const window = html.slice(tagStartIdx, tagStartIdx + 2000);
  const headingRe = /<(h[1-4])[^>]*>([^<]{1,120})<\/\1>|class="[^"]*(?:hub-section-t|sec-h|panel-h|card-t|kpi-label)[^"]*"[^>]*>([^<]{1,120})</;
  const m = window.match(headingRe);
  if (m) return (m[2] || m[3] || "").trim();
  return null;
}

// Count elements carrying an EXACT class token (not a substring match --
// "hub-section" must not match "hub-section-t"/"hub-section-b"/etc, which a
// naive word-boundary regex would, because "-" is a non-word char and creates
// a false \b). This is the same false-positive trap hub-parity-spec.md
// documents for the raw-hex-outside-SVG check -- worth getting right here too.
function countClassToken(html, token) {
  let count = 0;
  const classAttrRe = /class="([^"]*)"/g;
  let m;
  while ((m = classAttrRe.exec(html))) {
    if (m[1].split(/\s+/).includes(token)) count++;
  }
  return count;
}

function hasClassToken(html, token) {
  return countClassToken(html, token) > 0;
}

function extractOne(filePath, relPath) {
  const html = fs.readFileSync(filePath, "utf8");

  // ordered data-od-id markers with a nearby label
  const odIdRe = /<(\w+)([^>]*\sdata-od-id="([^"]+)"[^>]*)>/g;
  const sections = [];
  let m;
  while ((m = odIdRe.exec(html))) {
    const [, tag, attrs, id] = m;
    const classMatch = attrs.match(/class="([^"]*)"/);
    sections.push({
      id,
      tag,
      classes: classMatch ? classMatch[1] : null,
      label: nearestLabel(html, m.index),
    });
  }

  const hasQaBar = hasClassToken(html, "qa-bar");
  const qaBarButtonCount = countClassToken(html, "qa-btn");
  const hubSectionCount = countClassToken(html, "hub-section");
  const mSectionCount = countClassToken(html, "m-section");
  const secCount = countClassToken(html, "sec");
  const tabStripCount = ["tab-strip", "hub-tabs", "tabbar", "m-tabs"]
    .reduce((n, t) => n + countClassToken(html, t), 0);

  // status pill vocabulary -- look for the 5-state session pill tokens if present
  const statusTokens = [...new Set(
    [...html.matchAll(/class="[^"]*status-pill[^"]*\s+(?:st-)?([a-z-]+)"/g)].map((x) => x[1])
  )];

  return {
    file: relPath,
    sectionCount: sections.length,
    sections,
    hasQaBar,
    qaBarButtonCount,
    hubSectionCount,
    mSectionCount,
    secCount,
    tabStripCount,
    statusTokens,
  };
}

const mockups = collectMockups(MOCKUP_DIR).sort();
const manifest = mockups.map((rel) => extractOne(path.join(MOCKUP_DIR, rel), rel));

const zeroSection = manifest.filter((m) => m.sectionCount === 0);
console.log(`Extracted structure for ${manifest.length} mockups.`);
if (zeroSection.length) {
  console.log(`WARNING -- ${zeroSection.length} mockup(s) produced zero data-od-id sections (parser may be broken, or the file genuinely has none):`);
  zeroSection.forEach((m) => console.log(`  - ${m.file}`));
}

const outPath = path.join(process.cwd(), ".context", "tools", "mockup-structure-manifest.json");
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Written: ${outPath}`);
