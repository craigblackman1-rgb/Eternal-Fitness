/**
 * Band set management (CR-EF-014 + CR-EF-116) — reads from `band_sets` and `bands` tables.
 * Each band belongs to a band_set. Clients are linked to one set.
 * PB comparison is by tension_kg, not sort_order.
 */

import { getPool } from "@/lib/pg-client";

export interface BandSet {
  id: string;
  name: string;
  owner_type: "studio" | "client";
  client_id: string | null;
  created_at: string;
}

export interface Band {
  id: string;
  colour: string;
  colour_hex: string;
  tension_label: string;
  tension_kg: number | null;
  sort_order: number;
  active: boolean;
  band_set_id: string;
  created_at: string;
}

/** Fetch all active bands for a given set, ordered by sort_order. */
export async function getActiveBandsBySetId(setId: string): Promise<Band[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM bands WHERE active = true AND band_set_id = $1 ORDER BY sort_order ASC`,
    [setId],
  );
  return res.rows;
}

/** Fetch all active bands (across all sets) for the colour picker fallback. */
export async function getAllActiveBands(): Promise<Band[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM bands WHERE active = true ORDER BY sort_order ASC`,
  );
  return res.rows;
}

/** Fetch all bands (including inactive) for settings UI, filtered by set. */
export async function getAllBandsBySetId(setId: string): Promise<Band[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM bands WHERE band_set_id = $1 ORDER BY sort_order ASC`,
    [setId],
  );
  return res.rows;
}

/** Fetch all band sets. */
export async function getAllBandSets(): Promise<BandSet[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM band_sets ORDER BY owner_type ASC, name ASC`,
  );
  return res.rows;
}

/** Get the band_set_id for a client. Returns the EF Studio set ID if client has none. */
export async function getBandSetIdForClient(clientId: string): Promise<string> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT band_set_id FROM clients WHERE id = $1`,
    [clientId],
  );
  if (res.rows[0]?.band_set_id) return res.rows[0].band_set_id;
  // Default to the EF Studio set
  return "00000000-0000-0000-0000-000000000001";
}

/**
 * Get the tension_kg for a band colour within a specific band set.
 * Returns null if not found or tension_kg is null.
 * Used by PB comparison — tension_kg is the real quantity that matters.
 */
export async function getBandTensionKg(
  colour: string,
  setId: string,
): Promise<number | null> {
  if (!colour) return null;
  const pool = getPool();
  const res = await pool.query(
    `SELECT tension_kg FROM bands WHERE colour = $1 AND band_set_id = $2 AND active = true`,
    [colour, setId],
  );
  return res.rows[0]?.tension_kg ?? null;
}

/**
 * Get the sort_order for a band colour within a specific set.
 * Falls back when tension_kg is NULL (provisional bands).
 */
export async function bandOrder(
  colour: string | null | undefined,
  setId: string,
): Promise<number> {
  if (!colour) return 0;
  const pool = getPool();
  const res = await pool.query(
    `SELECT sort_order FROM bands WHERE colour = $1 AND band_set_id = $2 AND active = true`,
    [colour, setId],
  );
  return res.rows[0]?.sort_order ?? 0;
}

/**
 * Get band info by colour name and set. Returns null if not found.
 */
export async function getBandByColour(
  colour: string,
  setId: string,
): Promise<Band | null> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM bands WHERE colour = $1 AND band_set_id = $2`,
    [colour, setId],
  );
  return res.rows[0] ?? null;
}

/**
 * Check if a band colour exists, is active, and belongs to a set.
 */
export async function isValidBandColour(
  colour: string,
  setId: string,
): Promise<boolean> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT 1 FROM bands WHERE colour = $1 AND band_set_id = $2 AND active = true`,
    [colour, setId],
  );
  return (res.rowCount ?? 0) > 0;
}
