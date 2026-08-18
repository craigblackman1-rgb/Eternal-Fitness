/**
 * Best (heaviest) weight_kg ever logged per exercise for a client — sourced
 * from personal_records (metric='weight'), which checkAndUpsertPB
 * (lib/personal-records.ts) keeps live-consistent with set_logs on every
 * save. Used to prefill a new session's weight fields with what the client
 * lifted at their best, so Esther isn't re-entering/looking up a starting
 * weight for every exercise every session. Server-only (getPool()).
 */

import { getPool } from "@/lib/pg-client";

export async function getBestWeightsForClient(clientId: string): Promise<Record<string, number>> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT exercise, MAX(value) AS best_weight
       FROM personal_records
      WHERE client_id = $1 AND metric = 'weight'
      GROUP BY exercise`,
    [clientId],
  );
  const map: Record<string, number> = {};
  for (const row of res.rows) {
    map[row.exercise] = Number(row.best_weight);
  }
  return map;
}
