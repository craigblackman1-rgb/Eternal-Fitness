/**
 * Band set management (CR-EF-014) — reads from the `bands` table.
 * All band colour/tension/order data lives in the DB, never in app code.
 * The mockup's values are provisional — Esther must confirm her actual set.
 */

import { getPool } from "@/lib/pg-client";

export interface Band {
  id: string;
  colour: string;
  colour_hex: string;
  tension_label: string;
  tension_kg: number | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

/** Fetch all active bands, ordered by sort_order (lightest → heaviest). */
export async function getActiveBands(): Promise<Band[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM bands WHERE active = true ORDER BY sort_order ASC`,
  );
  return res.rows;
}

/** Fetch all bands (including inactive) for settings UI. */
export async function getAllBands(): Promise<Band[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM bands ORDER BY sort_order ASC`,
  );
  return res.rows;
}

/**
 * Get the sort_order for a band colour. Returns 0 if the colour is not found
 * (unknown bands can never beat a known band in PB comparison).
 */
export async function bandOrder(colour: string | null | undefined): Promise<number> {
  if (!colour) return 0;
  const pool = getPool();
  const res = await pool.query(
    `SELECT sort_order FROM bands WHERE colour = $1 AND active = true`,
    [colour],
  );
  return res.rows[0]?.sort_order ?? 0;
}

/**
 * Get band info by colour name. Returns null if not found.
 */
export async function getBandByColour(colour: string): Promise<Band | null> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM bands WHERE colour = $1`,
    [colour],
  );
  return res.rows[0] ?? null;
}

/**
 * Check if a band colour exists and is active.
 */
export async function isValidBandColour(colour: string): Promise<boolean> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT 1 FROM bands WHERE colour = $1 AND active = true`,
    [colour],
  );
  return (res.rowCount ?? 0) > 0;
}
