/**
 * Client-side band utilities (CR-EF-014 + CR-EF-116).
 * Fetches band data from the API — the frontend never hardcodes band values.
 * PB comparison is by tension_kg, not sort_order.
 */

import type { Band } from "@/lib/bands";

let cachedBands: Band[] | null = null;

/** Fetch active bands from the API (cached in memory for the session). */
export async function fetchActiveBands(): Promise<Band[]> {
  if (cachedBands) return cachedBands;
  const res = await fetch("/api/bands");
  if (!res.ok) return [];
  cachedBands = await res.json();
  return cachedBands;
}

/**
 * Get the tension_kg for a band colour from a pre-fetched list.
 * Returns null if not found or if the band has no tension_kg.
 */
export function bandTensionKg(
  bands: Band[],
  colour: string | null | undefined,
): number | null {
  if (!colour) return null;
  const b = bands.find((b) => b.colour === colour);
  return b?.tension_kg ?? null;
}

/**
 * Get the sort_order for a band colour from a pre-fetched list.
 * Used as fallback when tension_kg is NULL (provisional/unconfirmed bands).
 */
export function bandOrder(
  bands: Band[],
  colour: string | null | undefined,
): number {
  if (!colour) return 0;
  const b = bands.find((b) => b.colour === colour);
  return b?.sort_order ?? 0;
}

/**
 * Compare two band colours for PB detection.
 * Primary: compare by tension_kg (higher is better).
 * Fallback: when tension_kg is NULL on either band, compare by sort_order.
 * Returns positive if `colour` beats `prevColour`, 0 on equal, negative if not.
 */
export function compareBands(
  bands: Band[],
  colour: string | null | undefined,
  prevColour: string | null | undefined,
): number {
  const kg = bandTensionKg(bands, colour);
  const prevKg = bandTensionKg(bands, prevColour);

  // Both have tension_kg — compare by real tension
  if (kg != null && prevKg != null) {
    return kg - prevKg;
  }

  // One or both lack tension_kg — fall back to sort_order
  const order = bandOrder(bands, colour);
  const prevOrder = bandOrder(bands, prevColour);
  return order - prevOrder;
}

/** Find a band by colour from a pre-fetched list. */
export function getBandByColour(
  bands: Band[],
  colour: string,
): Band | undefined {
  return bands.find((b) => b.colour === colour);
}
