/**
 * Lane C — server-side progress queries (gone-quiet detection).
 *
 * Uses the raw pg pool directly because the shim in lib/pg-client.ts does not
 * support multi-level joins/aggregates (clients -> blocks -> sessions ->
 * set_logs). Server-only: never import from a client component.
 *
 * Detection only, Esther-facing only — no client-facing send/notification is
 * wired here (that mechanism is gated on the Work Order's ASK FIRST decision).
 */

import { getPool } from "@/lib/pg-client";
import { HOME_TRAINING_QUIET_DAYS } from "@/lib/progress";

export interface QuietHomeTrainingClient {
  clientId: string;
  clientNumber: number;
  name: string;
  /** Last self-logged set (logged_by='client'); null = never logged. */
  lastClientLogAt: string | null;
}

/**
 * Home-training clients with no self-logged set (logged_by='client') in the
 * last `days` days. Empty set_logs table → every home-training client is
 * flagged (correct: they've never logged); no home-training clients → [].
 * Errors degrade to [] so a dashboard render never crashes on a missing
 * table in an un-migrated environment.
 */
export async function getQuietHomeTrainingClients(
  days: number = HOME_TRAINING_QUIET_DAYS,
): Promise<QuietHomeTrainingClient[]> {
  try {
    const res = await getPool().query(
      `SELECT c.id, c.client_number, c.name, MAX(sl.logged_at) AS last_client_log_at
         FROM clients c
         LEFT JOIN blocks b ON b.client_id = c.id
         LEFT JOIN sessions s ON s.block_id = b.id
         LEFT JOIN set_logs sl ON sl.session_id = s.id AND sl.logged_by = 'client'
        WHERE c.delivery_mode = 'home_training'
        GROUP BY c.id, c.client_number, c.name
       HAVING MAX(sl.logged_at) IS NULL
           OR MAX(sl.logged_at) < NOW() - make_interval(days => $1)
        ORDER BY MAX(sl.logged_at) ASC NULLS FIRST, c.client_number ASC`,
      [days],
    );
    return res.rows.map((r) => ({
      clientId: r.id,
      clientNumber: r.client_number,
      name: r.name,
      lastClientLogAt: r.last_client_log_at ?? null,
    }));
  } catch (e) {
    console.error("[progress-db] getQuietHomeTrainingClients failed:", e);
    return [];
  }
}

/**
 * Timestamp of a single client's most recent self-logged set, or null if
 * they have never logged. Used on the client detail page.
 */
export async function getLastClientLogAt(clientId: string): Promise<string | null> {
  try {
    const res = await getPool().query(
      `SELECT MAX(sl.logged_at) AS last_client_log_at
         FROM set_logs sl
         JOIN sessions s ON s.id = sl.session_id
         JOIN blocks b ON b.id = s.block_id
        WHERE b.client_id = $1 AND sl.logged_by = 'client'`,
      [clientId],
    );
    return res.rows[0]?.last_client_log_at ?? null;
  } catch (e) {
    console.error("[progress-db] getLastClientLogAt failed:", e);
    return null;
  }
}
