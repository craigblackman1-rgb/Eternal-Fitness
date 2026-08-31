/**
 * Client-side band utilities (CR-EF-014).
 * Fetches band data from the API — the frontend never hardcodes band values.
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

/** Get the sort_order for a band colour from a pre-fetched list. */
export function bandOrder(bands: Band[], colour: string | null | undefined): number {
  if (!colour) return 0;
  const b = bands.find((b) => b.colour === colour);
  return b?.sort_order ?? 0;
}

/** Find a band by colour from a pre-fetched list. */
export function getBandByColour(bands: Band[], colour: string): Band | undefined {
  return bands.find((b) => b.colour === colour);
}
