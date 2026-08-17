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
  /** Set when interval === "custom_weeks" — the actual week count, for display (e.g. "Custom (6 weeks)"). */
  intervalWeeks: number | null;
  lastSentAt: string | null;
}

/**
 * Clients with a computable update_interval and at least one past send (no
 * send yet = nothing to derive from, so excluded — matches computeUpdateDue
 * returning nulls). "custom_weeks" and "fixed_date" (CR-EF-023) are included
 * alongside the fixed presets: LEFT JOIN so "fixed_date" clients (who may
 * never have sent an update) aren't dropped by the sent_updates join.
 * Errors degrade to [] so a dashboard render never crashes on a missing
 * table/column in an un-migrated environment.
 */
export async function getClientsWithUpdateDue(): Promise<ClientUpdateDue[]> {
  try {
    const res = await getPool().query(
      `SELECT c.id, c.client_number, c.name, c.update_interval,
              c.update_interval_weeks, c.update_interval_next_date,
              MAX(su.sent_at) AS last_sent_at
         FROM clients c
         LEFT JOIN sent_updates su ON su.client_id = c.id AND su.status = 'sent'
        WHERE c.update_interval IN ('4_week', '6_week', '12_week', 'custom_weeks', 'fixed_date')
        GROUP BY c.id, c.client_number, c.name, c.update_interval,
                 c.update_interval_weeks, c.update_interval_next_date
        ORDER BY c.client_number ASC`,
    );
    return res.rows
      .map((r) => {
        const interval = r.update_interval as UpdateInterval;
        const due = computeUpdateDue(interval, r.last_sent_at, {
          weeks: r.update_interval_weeks ?? null,
          fixedDate: r.update_interval_next_date ?? null,
        });
        return {
          clientId: r.id,
          clientNumber: r.client_number,
          name: r.name,
          interval,
          intervalWeeks: r.update_interval_weeks ?? null,
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
