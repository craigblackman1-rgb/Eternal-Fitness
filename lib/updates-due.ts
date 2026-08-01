/**
 * Derives when a client's next periodic update is due — never stored, always
 * computed from update_interval + the most recent sent_updates.sent_at, same
 * pattern as clients.annual_review_due_date in lib/compliance.ts. Sending the
 * next update naturally advances the due date; there is no separate "mark
 * due" step. See .context/brief-updates-due-opendesign.md.
 */

export type UpdateInterval = "4_week" | "6_week" | "12_week" | "6_session" | "flexible";

export const UPDATE_INTERVAL_LABELS: Record<UpdateInterval, string> = {
  "4_week": "4-week",
  "6_week": "6-week",
  "12_week": "12-week end-of-block",
  "6_session": "6-session block",
  flexible: "Flexible / as agreed",
};

/** Interval length in days. "6_session" and "flexible" have no fixed calendar length. */
const INTERVAL_DAYS: Partial<Record<UpdateInterval, number>> = {
  "4_week": 28,
  "6_week": 42,
  "12_week": 84,
};

export type UpdateDueStatus = "overdue" | "due_soon" | "upcoming";

export const UPDATE_DUE_SOON_DAYS = 7;

export interface UpdateDueInfo {
  nextDueDate: string | null;
  daysUntilDue: number | null;
  status: UpdateDueStatus | null;
}

/**
 * @param lastSentAt ISO date/timestamp of the most recent sent_updates row for this client, or null if never sent.
 */
export function computeUpdateDue(
  interval: UpdateInterval | null,
  lastSentAt: string | null,
): UpdateDueInfo {
  const intervalDays = interval ? INTERVAL_DAYS[interval] : undefined;
  if (!intervalDays || !lastSentAt) {
    return { nextDueDate: null, daysUntilDue: null, status: null };
  }

  const due = new Date(lastSentAt);
  due.setDate(due.getDate() + intervalDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86400000);
  const status: UpdateDueStatus =
    daysUntilDue < 0 ? "overdue" : daysUntilDue <= UPDATE_DUE_SOON_DAYS ? "due_soon" : "upcoming";

  return { nextDueDate: due.toISOString().slice(0, 10), daysUntilDue, status };
}
