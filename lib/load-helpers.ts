/**
 * CR-EF-124 — Prescribed load parsing and rendering.
 *
 * The `load` field on Exercise is free-text: "12 kg", "2 × 16 kg",
 * "BODYWEIGHT", "POWER" (with optional "6 kg ball"), a band colour name,
 * or absent (not prescribed).
 *
 * This module parses the raw string into structured variants for rendering
 * in cards, superset round rows, and the print view.
 */

// ── Parsed load variants ────────────────────────────────────────

export type ParsedLoad =
  | { kind: "weight"; value: number; unit: string }
  | { kind: "pair"; multiplier: number; value: number; unit: string }
  | { kind: "token"; label: string; sub?: string }
  | { kind: "band"; colour: string }
  | null;

/** Known uppercase tokens that represent load types, not numbers. */
const TOKEN_RE = /^(BODYWEIGHT|BW|POWER|MAX|RPE|AIR)\b/i;

/** Match "2 × 16 kg" or "2x16kg" patterns. */
const PAIR_RE = /^(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|lb|lbs)?$/i;

/** Match a plain weight like "12 kg" or "2.5kg" or just "12". */
const WEIGHT_RE = /^(\d+(?:\.\d+)?)\s*(kg|lb|lbs)$/i;

/**
 * Parse a raw load string into a structured variant.
 * Returns null when the string is empty, whitespace-only, or unparseable.
 */
export function parseLoad(raw: string | undefined | null): ParsedLoad {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // Token: BODYWEIGHT, POWER, MAX, RPE 8, etc.
  const tokenMatch = s.match(TOKEN_RE);
  if (tokenMatch) {
    const label = tokenMatch[1].toUpperCase();
    // Everything after the token keyword is a sub-line (e.g. "6 kg ball")
    const remainder = s.slice(tokenMatch[0].length).replace(/^[,\s]+/, "").trim();
    return { kind: "token", label, sub: remainder || undefined };
  }

  // Pair: "2 × 16 kg"
  const pairMatch = s.match(PAIR_RE);
  if (pairMatch) {
    return {
      kind: "pair",
      multiplier: parseInt(pairMatch[1], 10),
      value: parseFloat(pairMatch[2]),
      unit: (pairMatch[3] || "kg").toLowerCase(),
    };
  }

  // Plain weight: "12 kg" or "2.5kg"
  const weightMatch = s.match(WEIGHT_RE);
  if (weightMatch) {
    return {
      kind: "weight",
      value: parseFloat(weightMatch[1]),
      unit: weightMatch[2].toLowerCase(),
    };
  }

  // Bare number (e.g. "12" without unit)
  const bareNum = /^(\d+(?:\.\d+)?)$/.exec(s);
  if (bareNum) {
    return { kind: "weight", value: parseFloat(bareNum[1]), unit: "kg" };
  }

  // Band colour: "Green", "Red", etc. (single word, not a number)
  const bandMatch = /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)$/i.exec(s);
  if (bandMatch && !WEIGHT_RE.test(s) && !PAIR_RE.test(s)) {
    return { kind: "band", colour: bandMatch[1] };
  }

  // Fall through: treat as a token (e.g. "RPE 8", "Heavy")
  return { kind: "token", label: s.toUpperCase() };
}

/**
 * Render a short human-readable text for a load value.
 * Used in the prescription line and set target line.
 */
export function loadText(load: string | undefined | null): string {
  const p = parseLoad(load);
  if (!p) return "Not prescribed";

  switch (p.kind) {
    case "weight":
      return `${p.value} ${p.unit}`;
    case "pair":
      return `${p.multiplier} × ${p.value} ${p.unit}`;
    case "token":
      return p.sub ? `${p.label} (${p.sub})` : p.label;
    case "band":
      return `${p.colour} band`;
  }
}

/**
 * Returns true if the load is a numeric value that can prefill a weight input.
 */
export function isNumericLoad(load: string | undefined | null): boolean {
  const p = parseLoad(load);
  return p?.kind === "weight" || p?.kind === "pair";
}

/**
 * Returns the numeric weight value for prefilling the weight input,
 * or null for non-numeric loads (tokens, bands, absent).
 */
export function prescribedWeight(load: string | undefined | null): number | null {
  const p = parseLoad(load);
  if (!p) return null;
  if (p.kind === "weight") return p.value;
  if (p.kind === "pair") return p.value; // per-unit weight
  return null;
}

/**
 * Migration helper: attempt to split a tempo string that was prefixed with a load.
 * Returns { load, tempo } if the load was split out, or null if the string cannot
 * be split confidently.
 *
 * Examples:
 *   "2.5kg · Controlled" → { load: "2.5 kg", tempo: "Controlled" }
 *   "12kg 2-1-2" → { load: "12 kg", tempo: "2-1-2" }
 *   "POWER Fast" → { load: "POWER", tempo: "Fast" }
 *   "Controlled" → null (no load prefix detected)
 */
export function splitLoadFromTempo(tempoStr: string): { load: string; tempo: string } | null {
  const s = (tempoStr ?? "").trim();
  if (!s) return null;

  // Try splitting on common separators: " · ", " + ", ", "
  const separators = [" · ", " + ", ", ", " - "];
  for (const sep of separators) {
    const idx = s.indexOf(sep);
    if (idx > 0) {
      const left = s.slice(0, idx).trim();
      const right = s.slice(idx + sep.length).trim();
      if (looksLikeLoad(left) && right) {
        return { load: left, tempo: right };
      }
    }
  }

  // Try splitting on space: "2.5kg Controlled", "12kg 2-1-2", "POWER Fast"
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

/**
 * Heuristic: does this string look like a prescribed load value?
 */
function looksLikeLoad(s: string): boolean {
  if (!s) return false;
  // Weight with unit
  if (/^\d+(?:\.\d+)?\s*(kg|lb|lbs)$/i.test(s)) return true;
  // Bare number + unit abbreviation
  if (/^\d+(?:\.\d+)?(kg|lb)$/i.test(s)) return true;
  // Pair
  if (/^\d+\s*[x×]\s*\d+/i.test(s)) return true;
  // Token
  if (/^(BODYWEIGHT|BW|POWER|MAX|RPE|AIR)\b/i.test(s)) return true;
  // Bare number followed by something (e.g. "2.5kg")
  if (/^\d+(?:\.\d+)?kg/i.test(s)) return true;
  return false;
}
