/**
 * Server-side query for clients whose next periodic update is due or
 * approaching, derived per lib/updates-due.ts. Shared by the dashboard tile,
 * the reports/updates due view, and the daily due-soon cron — keep all three
 * reading from here rather than re-deriving independently.
 */

import { getPool } from "@/lib/pg-client";
import { computeUpdateDue, type UpdateDueInfo, type UpdateInterval } from "@/lib/updates-due";

export interface ClientUpdateDue extends UpdateDueInfo {
  clientId: string;
  clientNumber: number;
  name: string;
  interval: UpdateInterval;
  lastSentAt: string | null;
}

/**
 * Clients with a fixed-length update_interval set and at least one past send
 * (no send yet = nothing to derive from, so excluded — matches
 * computeUpdateDue returning nulls). Errors degrade to [] so a dashboard
 * render never crashes on a missing table/column in an un-migrated
 * environment.
 */
export async function getClientsWithUpdateDue(): Promise<ClientUpdateDue[]> {
  try {
    const res = await getPool().query(
      `SELECT c.id, c.client_number, c.name, c.update_interval, MAX(su.sent_at) AS last_sent_at
         FROM clients c
         JOIN sent_updates su ON su.client_id = c.id AND su.status = 'sent'
        WHERE c.update_interval IN ('4_week', '6_week', '12_week')
        GROUP BY c.id, c.client_number, c.name, c.update_interval
        ORDER BY c.client_number ASC`,
    );
    return res.rows
      .map((r) => {
        const interval = r.update_interval as UpdateInterval;
        const due = computeUpdateDue(interval, r.last_sent_at);
        return {
          clientId: r.id,
          clientNumber: r.client_number,
          name: r.name,
          interval,
          lastSentAt: r.last_sent_at ?? null,
          ...due,
        };
      })
      .filter((c): c is ClientUpdateDue => c.status !== null)
      .sort((a, b) => (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0));
  } catch (e) {
    console.error("[updates-due-db] getClientsWithUpdateDue failed:", e);
    return [];
  }
}

/** Subset due within `withinDays` (default: due-soon threshold), overdue included. */
export async function getClientsUpdateDueSoon(withinDays = 7): Promise<ClientUpdateDue[]> {
  const all = await getClientsWithUpdateDue();
  return all.filter((c) => c.daysUntilDue !== null && c.daysUntilDue <= withinDays);
}
