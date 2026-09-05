import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import { computeComplianceFlags } from "@/lib/compliance";
import { ClientsScreen, type ClientRow, type QueueItem } from "./ClientsScreen";

/* ── S6 Clients (design-systems v3/07-clients.html) ───────────────────────
   "Who needs me today" before "who exists". Two sections: a queue of the
   things that actually need Esther, then the plain alphabetical list.

   The Compliance column is gone on purpose. It read "Action Needed" on more
   than half the roster, which cannot help anyone choose what to do — a status
   that never narrows anything is decoration. It becomes ONE queue line
   instead of eleven badges.

   Every number here is derived at request time. Nothing is copied from the
   mockup's own figures, which are one day's snapshot. */

const QUIET_DAYS = 7;

export default async function ClientsPage() {
  const supabase = createClient();
  const pool = getPool();

  const { data: clientsRaw } = await supabase
    .from("clients")
    .select("*, compliance_status, outstanding_actions, group_type, pace_mode")
    .order("name", { ascending: true });
  const clients = clientsRaw ?? [];
  const ids = clients.map((c: any) => c.id);

  // ── Everything below is one query per grouping, keyed by client id ──
  const todayIso = new Date().toISOString().slice(0, 10);

  const [sessionsToday, draftBlocks, openBookings, lastActivity, docRows, parqRows, agreementRows] =
    ids.length === 0
      ? [[], [], [], [], [], [], []]
      : await Promise.all([
          // Sessions booked for today, not cancelled.
          pool
            .query(
              `SELECT b.client_id, s.scheduled_at
                 FROM sessions s JOIN blocks b ON b.id = s.block_id
                WHERE b.client_id = ANY($1)
                  AND s.scheduled_at::date = $2::date
                  AND s.cancelled_at IS NULL
                  AND s.parent_session_id IS NULL
                ORDER BY s.scheduled_at`,
              [ids, todayIso],
            )
            .then((r) => r.rows),
          pool
            .query(
              `SELECT client_id, block_number FROM blocks
                WHERE client_id = ANY($1) AND status = 'draft'
                ORDER BY block_number`,
              [ids],
            )
            .then((r) => r.rows),
          pool
            .query(
              `SELECT client_id, count(*)::int AS n FROM outlook_booking_events
                WHERE client_id = ANY($1) AND status = 'open'
                GROUP BY client_id`,
              [ids],
            )
            .then((r) => r.rows),
          // Last sign of life, per client, from either side of the logging
          // divide: a set the client logged themselves (home training) OR a
          // session Esther completed (studio). getQuietHomeTrainingClients()
          // only covers the first, so it cannot answer this on its own.
          pool
            .query(
              `SELECT b.client_id,
                      GREATEST(
                        COALESCE(MAX(sl.logged_at), 'epoch'::timestamptz),
                        COALESCE(MAX(s.completed_at), 'epoch'::timestamptz)
                      ) AS last_at,
                      bool_or(b.status IN ('approved','active')) AS has_live_block
                 FROM blocks b
                 LEFT JOIN sessions s ON s.block_id = b.id
                 LEFT JOIN set_logs sl ON sl.session_id = s.id
                WHERE b.client_id = ANY($1)
                GROUP BY b.client_id`,
              [ids],
            )
            .then((r) => r.rows),
          pool
            .query(
              `SELECT client_id, kind, status, updated_at, created_at
                 FROM client_documents WHERE client_id = ANY($1)`,
              [ids],
            )
            .then((r) => r.rows),
          pool
            .query(
              `SELECT client_id, status, client_signature_date, created_at
                 FROM signed_parq WHERE client_id = ANY($1)
                ORDER BY created_at DESC`,
              [ids],
            )
            .then((r) => r.rows),
          pool
            .query(
              `SELECT client_id, status, client_signature_date, parq_date, created_at
                 FROM signed_agreements WHERE client_id = ANY($1)
                ORDER BY created_at DESC`,
              [ids],
            )
            .then((r) => r.rows),
        ]);

  const by = (rows: any[]) => {
    const m = new Map<string, any[]>();
    for (const r of rows) {
      const list = m.get(r.client_id) ?? [];
      list.push(r);
      m.set(r.client_id, list);
    }
    return m;
  };
  const todayBy = by(sessionsToday as any);
  const draftsBy = by(draftBlocks as any);
  const bookingsBy = by(openBookings as any);
  const docsBy = by(docRows as any);
  const parqBy = by(parqRows as any);
  const agreeBy = by(agreementRows as any);
  const activityBy = new Map<string, any>((lastActivity as any[]).map((r) => [r.client_id, r]));

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const rows: ClientRow[] = [];
  const quiet: { name: string; number: number }[] = [];
  const paperwork: { name: string; number: number }[] = [];
  const drafts: { name: string; number: number; block: number }[] = [];
  const todayList: { name: string; number: number; at: string }[] = [];
  const unpaid: { name: string; number: number; pkg: string | null }[] = [];
  const bookings: { name: string; number: number; n: number }[] = [];

  for (const c of clients as any[]) {
    // Compliance is COMPUTED, not read from the stored column — the client
    // record treats the live derivation as authoritative, and a list that
    // disagreed with the record it links to would be worse than no list.
    const flags = computeComplianceFlags({
      client: c,
      latestParq: ((parqBy.get(c.id) ?? [])[0] ?? null) as any,
      latestAgreement: ((agreeBy.get(c.id) ?? [])[0] ?? null) as any,
      hasSignedParqDocument: (docsBy.get(c.id) ?? []).some((d: any) => d.kind === "parq" && d.status === "signed"),
      hasSignedAgreementDocument: (docsBy.get(c.id) ?? []).some((d: any) => d.kind === "terms" && d.status === "signed"),
    });

    const act = activityBy.get(c.id);
    const lastAt: string | null = act?.last_at && String(act.last_at) > "1971" ? act.last_at : null;
    const daysSince = lastAt ? Math.floor((Date.now() - new Date(lastAt).getTime()) / 86_400_000) : null;
    // Only "quiet" if they are supposed to be training: a live block, and
    // either no activity at all or none in the window.
    const isQuiet = Boolean(act?.has_live_block) && (daysSince === null || daysSince >= QUIET_DAYS);

    const todays = todayBy.get(c.id) ?? [];
    const draft = (draftsBy.get(c.id) ?? [])[0];
    const bookingN = (bookingsBy.get(c.id) ?? [])[0]?.n ?? 0;
    const isUnpaid = c.payment_status === "pending" || c.payment_status === "overdue";
    const outstanding = flags.autoOutstanding.length + (c.outstanding_actions?.length ?? 0);
    const doNotTrain = c.medical_clearance_status === "do_not_train" || flags.effectiveStatus === "do_not_train";

    if (todays.length) todayList.push({ name: c.name, number: c.client_number, at: fmtTime(todays[0].scheduled_at) });
    if (draft) drafts.push({ name: c.name, number: c.client_number, block: draft.block_number });
    if (bookingN > 0) bookings.push({ name: c.name, number: c.client_number, n: bookingN });
    if (isQuiet) quiet.push({ name: c.name, number: c.client_number });
    if (isUnpaid) unpaid.push({ name: c.name, number: c.client_number, pkg: c.package_type ?? null });
    if (outstanding > 0) paperwork.push({ name: c.name, number: c.client_number });

    // One reason per row, most time-critical first. Do-not-train outranks
    // everything: it is the one flag where being missed has a physical cost,
    // and the design removed the filter that used to surface it.
    const reason = doNotTrain
      ? { text: "Do not train", hot: true }
      : todays.length
        ? { text: `Session today ${fmtTime(todays[0].scheduled_at)}`, hot: true }
        : draft
          ? { text: `Block ${draft.block_number} waiting for approval`, hot: true }
          : bookingN > 0
            ? { text: `${bookingN} booking${bookingN === 1 ? "" : "s"} to sort`, hot: true }
            : isQuiet
              ? { text: `Nothing logged in ${daysSince === null ? QUIET_DAYS : daysSince} days`, hot: true }
              : isUnpaid
                ? { text: "Unpaid", hot: false }
                : outstanding > 0
                  ? { text: "Paperwork outstanding", hot: false }
                  : null;

    rows.push({
      id: c.id,
      clientNumber: c.client_number,
      name: c.name,
      archived: c.client_status === "archived",
      frequency: c.profile?.logistics?.frequency ?? null,
      sessionsPerWeek: c.profile?.logistics?.sessions_per_week ?? null,
      goal: c.profile?.goals?.primary ?? null,
      conditionCount: c.profile?.health?.conditions?.length ?? 0,
      reason: reason?.text ?? null,
      hot: reason?.hot ?? false,
      dot: doNotTrain || todays.length ? "due" : reason ? "warn" : "nil",
    });
  }

  const names = (xs: { name: string }[], max = 3) => {
    const first = xs.slice(0, max).map((x) => x.name);
    if (xs.length <= max) return first.join(", ").replace(/, ([^,]*)$/, " and $1");
    return `${first.join(", ")} and ${xs.length - max} more`;
  };

  const queue: QueueItem[] = [];
  if (todayList.length)
    queue.push({
      id: "today", dot: "due",
      headline: `${todayList.length} session${todayList.length === 1 ? "" : "s"} today`,
      subline: todayList.map((t) => `${t.name} ${t.at}`).join(" · "),
      actionLabel: "See today", href: "/hub",
    });
  if (drafts.length)
    queue.push({
      id: "drafts", dot: "warn",
      headline: `${drafts.length} block${drafts.length === 1 ? "" : "s"} still draft`,
      subline: `${names(drafts)}. None can run until you approve it.`,
      actionLabel: drafts.length === 1 ? "Review it" : `Review the ${drafts.length}`,
      href: `/hub/clients/${drafts[0].number}`,
    });
  if (bookings.length === 1)
    queue.push({
      id: `bookings-${bookings[0].number}`, dot: "warn",
      headline: `${bookings[0].name} has ${bookings[0].n} booking${bookings[0].n === 1 ? "" : "s"} waiting to be sorted`,
      subline: "Until they are sorted the block reads fewer sessions done than really happened.",
      actionLabel: "Sort in triage", href: "/hub/schedule/outlook",
    });
  else if (bookings.length > 1)
    queue.push({
      id: "bookings", dot: "warn",
      headline: `${bookings.reduce((n, b) => n + b.n, 0)} bookings waiting to be sorted, across ${bookings.length} clients`,
      subline: `${names(bookings)}. Until they are sorted those blocks read fewer sessions done than really happened.`,
      actionLabel: "Sort in triage", href: "/hub/schedule/outlook",
    });
  if (quiet.length)
    queue.push({
      id: "quiet", dot: "warn",
      headline: `${quiet.length} client${quiet.length === 1 ? "" : "s"} logged nothing in ${QUIET_DAYS} days`,
      subline: `${names(quiet)}. All of them have a block running.`,
      actionLabel: quiet.length === 1 ? "See them" : `See the ${quiet.length}`,
      href: `/hub/clients/${quiet[0].number}`,
    });
  // Collapse, exactly as paperwork does. One unpaid client is a person to
  // chase; sixteen is one billing job. A queue with a row per client is the
  // Compliance column all over again -- it never narrows anything.
  if (unpaid.length === 1)
    queue.push({
      id: `unpaid-${unpaid[0].number}`, dot: "due",
      headline: `${unpaid[0].name} has an unpaid ${unpaid[0].pkg ?? "package"}`,
      subline: "Payment is pending.",
      actionLabel: "Raise invoice", href: "/hub/cashflow/invoices",
    });
  else if (unpaid.length > 1)
    queue.push({
      id: "unpaid", dot: "due",
      headline: `${unpaid.length} clients have an unpaid package`,
      subline: `${names(unpaid)}. One billing job, not ${unpaid.length} decisions.`,
      actionLabel: "Raise invoices", href: "/hub/cashflow/invoices",
    });
  if (paperwork.length)
    queue.push({
      id: "paperwork", dot: "warn",
      headline: `${paperwork.length} client${paperwork.length === 1 ? "" : "s"} have paperwork outstanding`,
      subline: "One job, not " + paperwork.length + " decisions. Chase them together.",
      actionLabel: `See the ${paperwork.length}`, href: "/hub/compliance",
    });

  const settled = rows.filter((r) => !r.reason && !r.archived);

  return (
    <ClientsScreen
      rows={rows}
      queue={queue}
      settledNames={settled.map((r) => r.name)}
    />
  );
}
