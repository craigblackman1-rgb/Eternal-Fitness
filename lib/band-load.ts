/**
 * Band load, as a number rather than a colour.
 *
 * Craig, 5 Sep 2026: colours do not work. Esther's studio bands and the bands
 * clients own at home are different colours AND different tensions, so "Red"
 * means one thing in the studio and something else in Emma's front room. The
 * only thing that travels between them is the load itself.
 *
 * So a band is logged as a weight in lb, in 5 lb steps from 10 to 100. This
 * needs no new column: it goes through the existing weight field, which
 * lib/units.ts already locks to lb for band equipment, and is stored in kg
 * like every other load.
 *
 * A useful side effect: band work becomes comparable, so band personal bests
 * can exist. They could not before — a colour cannot be a PB, which is why
 * the Progress drawer has been saying band bests cannot be recorded.
 */

export const BAND_LOAD_MIN_LB = 10;
export const BAND_LOAD_MAX_LB = 100;
export const BAND_LOAD_STEP_LB = 5;

/** 10, 15, 20 … 100 */
export function bandLoadOptionsLb(): number[] {
  const out: number[] = [];
  for (let v = BAND_LOAD_MIN_LB; v <= BAND_LOAD_MAX_LB; v += BAND_LOAD_STEP_LB) out.push(v);
  return out;
}

/**
 * Snap a typed or historic value onto the nearest allowed step, so a legacy
 * free-text entry (or a prefill from an older log) still selects cleanly
 * instead of silently showing blank.
 */
export function snapBandLoadLb(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const clamped = Math.min(BAND_LOAD_MAX_LB, Math.max(BAND_LOAD_MIN_LB, n));
  return Math.round(clamped / BAND_LOAD_STEP_LB) * BAND_LOAD_STEP_LB;
}
