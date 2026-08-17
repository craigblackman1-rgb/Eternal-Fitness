/**
 * Derives when a client's next periodic update is due — never stored, always
 * computed from update_interval + the most recent sent_updates.sent_at, same
 * pattern as clients.annual_review_due_date in lib/compliance.ts. Sending the
 * next update naturally advances the due date; there is no separate "mark
 * due" step. See .context/brief-updates-due-opendesign.md.
 *
 * "custom_weeks" and "fixed_date" (CR-EF-023, 2026-08-17) cover cases the
 * fixed presets don't: an arbitrary interval length, or a one-off date
 * Esther pins directly rather than derives. "custom_weeks" still follows the
 * last-sent-plus-N-days pattern (parameterised instead of a fixed lookup);
 * "fixed_date" is the one case where the due date isn't computed at all —
 * it's read straight off clients.update_interval_next_date and doesn't
 * auto-advance after a send.
 */

export type UpdateInterval =
  | "4_week"
  | "6_week"
  | "12_week"
  | "6_session"
  | "flexible"
  | "custom_weeks"
  | "fixed_date";

export const UPDATE_INTERVAL_LABELS: Record<UpdateInterval, string> = {
  "4_week": "4-week",
  "6_week": "6-week",
  "12_week": "12-week end-of-block",
  "6_session": "6-session block",
  flexible: "Flexible / as agreed",
  custom_weeks: "Custom (N weeks)",
  fixed_date: "Fixed date",
};

/** Interval length in days. "6_session" and "flexible" have no fixed calendar length; "custom_weeks" is parameterised via opts.weeks below and "fixed_date" bypasses this lookup entirely. */
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

/** daysUntilDue/status from a due Date, shared by both the computed and fixed-date paths. */
function dueInfoFromDate(due: Date): UpdateDueInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86400000);
  const status: UpdateDueStatus =
    daysUntilDue < 0 ? "overdue" : daysUntilDue <= UPDATE_DUE_SOON_DAYS ? "due_soon" : "upcoming";

  return { nextDueDate: due.toISOString().slice(0, 10), daysUntilDue, status };
}

/**
 * @param lastSentAt ISO date/timestamp of the most recent sent_updates row for this client, or null if never sent.
 * @param opts.weeks Required when interval is "custom_weeks" — the interval length in weeks.
 * @param opts.fixedDate Required when interval is "fixed_date" — an explicit "YYYY-MM-DD", read as-is rather than derived from lastSentAt.
 */
export function computeUpdateDue(
  interval: UpdateInterval | null,
  lastSentAt: string | null,
  opts?: { weeks?: number | null; fixedDate?: string | null },
): UpdateDueInfo {
  if (interval === "fixed_date") {
    if (!opts?.fixedDate) return { nextDueDate: null, daysUntilDue: null, status: null };
    return dueInfoFromDate(new Date(opts.fixedDate));
  }

  const intervalDays =
    interval === "custom_weeks"
      ? opts?.weeks
        ? opts.weeks * 7
        : undefined
      : interval
        ? INTERVAL_DAYS[interval]
        : undefined;
  if (!intervalDays || !lastSentAt) {
    return { nextDueDate: null, daysUntilDue: null, status: null };
  }

  const due = new Date(lastSentAt);
  due.setDate(due.getDate() + intervalDays);
  return dueInfoFromDate(due);
}
