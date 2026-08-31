import type { DBSession } from "@/types";

export function buildSessionLogSection(sessions: DBSession[]): string {
  if (sessions.length === 0) return "No session records for the recent blocks.";

  // CR-EF-101 — sub-sessions excluded from attendance count
  const potSessions = sessions.filter((s) => !s.parent_session_id);
  const total = potSessions.length;
  const completed = potSessions.filter((s) => s.data?.session_log?.completed_at).length;
  const cancelled = potSessions.filter((s) => s.cancelled_at).length;

  let result = `Attendance: ${completed}/${total} sessions completed`;
  if (cancelled > 0) result += `, ${cancelled} cancelled`;
  result += ".";

  const notable = sessions
    .filter((s) => {
      if (s.data?.session_log?.notes) return true;
      if (s.data?.session_log?.rpe != null) return true;
      if (s.data?.session_log?.fatigue) return true;
      if (s.cancel_reason) return true;
      return false;
    })
    .sort((a, b) => a.session_number - b.session_number);

  for (const s of notable) {
    if (s.cancelled_at && s.cancel_reason) {
      result += `\nSession ${s.session_number} (week ${s.week}): cancelled — reason: "${s.cancel_reason}"`;
    } else {
      const log = s.data.session_log;
      let line = `\nSession ${s.session_number} (week ${s.week})`;
      const details: string[] = [];
      if (log?.rpe != null) details.push(`RPE ${log.rpe}`);
      if (log?.fatigue) details.push(`fatigue: ${log.fatigue}`);
      if (details.length) line += `: ${details.join(", ")}`;
      if (log?.notes) line += ` — notes: "${log.notes}"`;
      result += line;
    }
  }

  return result;
}
