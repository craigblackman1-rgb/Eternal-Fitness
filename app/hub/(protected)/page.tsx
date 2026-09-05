import { getPool } from "@/lib/pg-client";
import { getClientsNeedingAttention } from "@/lib/hub/attention";
import { getClientsUpdateDueSoon } from "@/lib/updates-due-db";
import { TodayScreen, type TodaySession, type AlertRow, type TaskRow } from "./TodayScreen";

/* ── S5 Today (design-systems v3/03-today.html) ───────────────────────────
   Booked sessions, then outstanding tasks, then alerts — each alert linking
   to the thing you do about it.

   Replaces the previous dashboard's seven browse widgets (recent clients,
   recent blocks, this week's plan, recent check-ins, active blocks…). Those
   answered "what has been happening"; this surface answers "what needs me",
   so dropping them is the design rather than an omission.

   ONE exception, kept deliberately: "updates due". The old dashboard
   surfaced clients approaching or past their next update deadline, and
   nothing else in the hub chases that — dropping it would quietly stop
   updates going out. It survives as an alert row, which is the shape this
   screen uses for exactly this kind of thing. */

/* This page reads the database on every request and must never be
   statically prerendered: the Docker build has no database, so Next trying to
   generate it at build time fails the build outright. The other hub pages get
   this implicitly by calling createClient() (which reads cookies); this one
   only uses the pool, so it has to say so. */
export const dynamic = "force-dynamic";

const QUIET_DAYS = 7;

function startOfWeek(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

export default async function HubTodayPage() {
  const pool = getPool();
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const weekStart = startOfWeek(now);

  const [todayRows, weekRow, taskRows, clearanceRows, quietRows, draftRows, updateRows] =
    await Promise.all([
      pool
        .query(
          `SELECT s.scheduled_at, c.name, c.client_number, s.data->>'focus_label' AS focus
             FROM sessions s
             JOIN blocks b ON b.id = s.block_id
             JOIN clients c ON c.id = b.client_id
            WHERE s.scheduled_at::date = $1::date
              AND s.cancelled_at IS NULL
              AND s.parent_session_id IS NULL
            ORDER BY s.scheduled_at`,
          [todayIso],
        )
        .then((r) => r.rows),
      pool
        .query(
          `SELECT count(*)::int AS n FROM sessions s
            WHERE s.scheduled_at >= $1::date AND s.scheduled_at < $1::date + INTERVAL '7 days'
              AND s.cancelled_at IS NULL AND s.parent_session_id IS NULL`,
          [weekStart],
        )
        .then((r) => r.rows[0]?.n ?? 0),
      pool
        .query(
          `SELECT t.id, t.title, t.due_date, c.name, c.client_number
             FROM tasks t LEFT JOIN clients c ON c.id = t.client_id
            WHERE t.status IS DISTINCT FROM 'done'
            ORDER BY (t.due_date IS NULL), t.due_date, t.created_at`,
        )
        .then((r) => r.rows),
      // Clearance / action outstanding — the SAME derivation the clients list
      // uses, so the two screens cannot quote different numbers.
      getClientsNeedingAttention(),
      // Gone quiet — silence from either side of the logging divide, and only
      // for people who are supposed to be training (a live block).
      pool
        .query(
          `SELECT c.client_number, c.name
             FROM clients c
             JOIN blocks b ON b.client_id = c.id
             LEFT JOIN sessions s ON s.block_id = b.id
             LEFT JOIN set_logs sl ON sl.session_id = s.id
            WHERE c.client_status IS DISTINCT FROM 'archived'
            GROUP BY c.id, c.client_number, c.name
           HAVING bool_or(b.status IN ('approved','active'))
              AND GREATEST(
                    COALESCE(MAX(sl.logged_at), 'epoch'::timestamptz),
                    COALESCE(MAX(s.completed_at), 'epoch'::timestamptz)
                  ) < now() - ($1 || ' days')::interval
            ORDER BY c.name`,
          [String(QUIET_DAYS)],
        )
        .then((r) => r.rows),
      pool
        .query(
          `SELECT c.client_number, c.name, b.block_number
             FROM blocks b JOIN clients c ON c.id = b.client_id
            WHERE b.status = 'draft' AND c.client_status IS DISTINCT FROM 'archived'
            ORDER BY c.name`,
        )
        .then((r) => r.rows),
      // Updates due — kept from the old dashboard on purpose (see header note).
      // Uses the real cadence derivation: only 1 client in 22 has a fixed
      // next-date, so keying off that column alone would leave this
      // permanently empty while looking present.
      getClientsUpdateDueSoon(7),
    ]);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: any) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const sessions: TodaySession[] = (todayRows as any[]).map((r) => ({
    time: fmtTime(r.scheduled_at),
    clientName: r.name,
    clientNumber: r.client_number,
    focus: r.focus ?? null,
  }));

  const tasks: TaskRow[] = (taskRows as any[]).map((t) => ({
    id: t.id,
    title: t.title,
    clientName: t.name ?? null,
    clientNumber: t.client_number ?? null,
    due: t.due_date ? fmtDate(t.due_date) : null,
    overdue: Boolean(t.due_date && new Date(t.due_date) < now),
  }));

  const names = (xs: any[], max = 3) => {
    const first = xs.slice(0, max).map((x) => x.name);
    if (xs.length <= max) return first.join(", ").replace(/, ([^,]*)$/, " and $1");
    return `${first.join(", ")} and ${xs.length - max} more`;
  };

  const alerts: AlertRow[] = [];
  if (draftRows.length)
    alerts.push({
      id: "drafts", dot: "warn",
      headline: `${draftRows.length} block${draftRows.length === 1 ? "" : "s"} still in draft`,
      subline: `${names(draftRows)}. None can run until you approve it.`,
      actionLabel: "Review", href: `/hub/clients/${(draftRows as any[])[0].client_number}`,
    });
  if (quietRows.length)
    alerts.push({
      id: "quiet", dot: "warn",
      headline: `${quietRows.length} client${quietRows.length === 1 ? "" : "s"} logged nothing in ${QUIET_DAYS} days`,
      subline: `${names(quietRows)}. ${quietRows.length === 1 ? "They have" : "All of them have"} a block running.`,
      actionLabel: "See them", href: "/hub/clients",
    });
  if (clearanceRows.length)
    alerts.push({
      id: "clearance", dot: "warn",
      headline: `${clearanceRows.length} client${clearanceRows.length === 1 ? "" : "s"} needing clearance or action`,
      subline: names(clearanceRows),
      actionLabel: "See them", href: "/hub/clients",
    });
  if (updateRows.length)
    alerts.push({
      id: "updates", dot: "due",
      headline: `${updateRows.length} training update${updateRows.length === 1 ? "" : "s"} due`,
      subline: `${names(updateRows)}. Due within the next week.`,
      actionLabel: "Review updates", href: "/hub/updates",
    });

  return (
    <TodayScreen
      dateLabel={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      sessions={sessions}
      weekCount={weekRow as number}
      tasks={tasks}
      alerts={alerts}
    />
  );
}
