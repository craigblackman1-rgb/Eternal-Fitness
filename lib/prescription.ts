import type { Exercise, SessionVersion } from "@/types";
import { computeGroups } from "@/lib/exercise-groups";

export function isTimeBased(reps: string, logType?: "reps" | "time"): boolean {
  if (logType === "time") return true;
  if (logType === "reps") return false;
  return /\d\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i.test(reps || "");
}

export function parsePrescribedSeconds(reps: string): number | null {
  const m = (reps || "").match(/(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return /^m/i.test(m[2]) ? n * 60 : n;
}

export function parsePrescribedReps(reps: string): number | null {
  const m = (reps || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export function parseRestSeconds(rest: string): number | null {
  const trimmed = (rest || "").trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;

  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)?$/i);
  if (rangeMatch) {
    const upper = parseInt(rangeMatch[2], 10);
    const unit = rangeMatch[3];
    return unit && /^m/i.test(unit) ? upper * 60 : upper;
  }

  const m = trimmed.match(/^(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  return unit && /^m/i.test(unit) ? n * 60 : n;
}

export function formatPrescription(ex: Exercise): string {
  const sets = ex.sets ?? 1;
  const reps = ex.reps || "—";
  const tempo = ex.tempo && ex.tempo !== "—" ? ` @ tempo ${ex.tempo}` : "";
  const rest = ex.rest && ex.rest !== "—" ? ` · ${ex.rest} rest` : "";
  return `${sets} × ${reps}${tempo}${rest}`;
}

// ── Derived estimated duration (CR-EF-037 — Lane C) ─────────────
// The "Est." chip and each section header are computed from the prescription,
// never stored: per-set work time (tempo × reps, or the held duration) plus one
// rest per set, with a superset costing one shared rest per round. Coaching,
// setup and changeover are deliberately excluded, so the figure reads under the
// booked slot. Recompute on every render so edits to sets/reps/tempo/rest move
// the numbers live.

function parseLeadingNumber(str: string | null | undefined): number | null {
  const m = /^(\d+)/.exec(String(str ?? "").trim());
  return m ? parseInt(m[1], 10) : null;
}

/** Sum of the numeric tempo components ("2-1-2" → 5s); null when the tempo is
 *  prose ("Controlled", "Slow", "Explosive") so the caller can fall back to a
 *  default rep cadence. */
function tempoSeconds(tempo: string | null | undefined): number | null {
  const digits = String(tempo ?? "").match(/\d+/g);
  if (!digits || digits.length < 2) return null;
  return digits.reduce((sum, n) => sum + parseInt(n, 10), 0);
}

/** Reps-based work time: prescribed reps × rep cadence. "6 each leg" counts both
 *  limbs. No numeric tempo → a controlled rep is assumed to take ~4s. */
function repWorkSeconds(ex: Exercise): number {
  let reps = parseLeadingNumber(ex.reps) ?? 0;
  if (/each\s+(leg|side|arm)/i.test(ex.reps ?? "")) reps *= 2;
  return reps * (tempoSeconds(ex.tempo) ?? 4);
}

/** Held-duration work time for time-based exercises ("20s hold" → 20s, "2 min" →
 *  120s). A "1 round" breathing drill at a numeric tempo (4-4-4-4) falls back to
 *  the tempo sum (16s). */
function holdWorkSeconds(ex: Exercise): number {
  const s = /(\d+)\s*s/i.exec(ex.reps ?? "");
  if (s) return parseInt(s[1], 10);
  const m = /(\d+)\s*min/i.exec(ex.reps ?? "");
  if (m) return parseInt(m[1], 10) * 60;
  return tempoSeconds(ex.tempo) ?? 0;
}

function setWorkSeconds(ex: Exercise): number {
  return isTimeBased(ex.reps, ex.log_type) ? holdWorkSeconds(ex) : repWorkSeconds(ex);
}

function prescribedSetCount(ex: Exercise): number {
  return Math.max(1, ex.sets || 1);
}

/** Leading number from the rest field ("60s" → 60); "—" / absent → 0 (no rest). */
function prescribedRestSeconds(ex: Exercise): number {
  return parseLeadingNumber(ex.rest) ?? 0;
}

interface EstimateBlock {
  type: "group" | "single";
  items: Exercise[];
  indices: number[];
}

function blockEstimateSeconds(block: EstimateBlock): number {
  if (block.type !== "group") {
    const ex = block.items[0];
    return prescribedSetCount(ex) * (setWorkSeconds(ex) + prescribedRestSeconds(ex));
  }
  const rounds = Math.max(...block.items.map(prescribedSetCount));
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    let maxRest = 0;
    for (const ex of block.items) {
      if (r >= prescribedSetCount(ex)) continue;
      total += setWorkSeconds(ex);
      const rs = prescribedRestSeconds(ex);
      if (rs > maxRest) maxRest = rs;
    }
    total += maxRest; // one shared rest closes the round, not one per exercise
  }
  return total;
}

export function estimateSectionSeconds(exercises: Exercise[]): number {
  return computeGroups(exercises).reduce((sum, b) => sum + blockEstimateSeconds(b), 0);
}

export function estimateSessionSeconds(version: SessionVersion): number {
  return (
    estimateSectionSeconds(version.warm_up || []) +
    estimateSectionSeconds(version.main_block || []) +
    estimateSectionSeconds(version.cooldown || [])
  );
}

export function formatDurationEstimate(seconds: number): string {
  if (seconds <= 0) return "—";
  return seconds < 60 ? "<1 min" : `${Math.round(seconds / 60)} min`;
}
