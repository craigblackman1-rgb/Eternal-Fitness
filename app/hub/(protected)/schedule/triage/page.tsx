import Link from "next/link";
import { getPool } from "@/lib/pg-client";

/* ── A2 · Schedule triage (design-systems v3/06-triage.html) ──────────────
   One screen for every exception queue, instead of six pages nobody can hold
   in their head. Craig, 4 Sep: "treat them as individuals for now."

   C1a — supports ?client=<client_number> to filter the open-bookings queue
   to a single client. The client's Needs-You row links with this param.

   Deliberately NOT built here:
   - No series/recurrence grouping. There is no field to group on — every
     Outlook booking is an independent row — so the mockup's "29 bookings
     become 1 decision" has nothing to hang off. That needs a schema
     decision, not a guess.
   - No bulk confirm/dismiss, and no new mutation of any kind. Each row's
     decision still happens on its existing, already-gated queue page. This
     is the area where a sync bug deleted 25 real Outlook events on
     2026-08-28, so this screen reads and routes; it does not write.

   What it is: the honest count of what is waiting, in the order it blocks
   the most, each linking to the page that can actually action it. */

export const dynamic = "force-dynamic";

interface Queue {
  id: string;
  label: string;
  count: number;
  href: string;
  why: string;
  tone: "warn" | "due" | "quiet";
}

export default async function ScheduleTriagePage({ searchParams }: { searchParams: { client?: string } }) {
  const pool = getPool();
  const clientFilter = searchParams.client ? parseInt(searchParams.client) : null;

  const one = async (sql: string): Promise<number> => {
    try {
      const r = await pool.query(sql);
      return r.rows[0]?.n ?? 0;
    } catch {
      // A queue whose table is missing should not take the whole screen down;
      // it reports as unknown rather than zero, so "0" always means zero.
      return -1;
    }
  };

  // C1a — when client filter is active, scope the open-bookings count to that client
  const openBookingsSql = clientFilter
    ? `SELECT count(*)::int AS n FROM outlook_booking_events WHERE status = 'open' AND client_number = ${clientFilter}`
    : "SELECT count(*)::int AS n FROM outlook_booking_events WHERE status = 'open'";

  const [openBookings, duplicates, pendingSync, lapseFlagged, needsWorkout, clientName] = await Promise.all([
    one(openBookingsSql),
    one("SELECT count(*)::int AS n FROM outlook_duplicate_candidates"),
    one("SELECT count(*)::int AS n FROM calendar_sync_pending_actions"),
    one("SELECT count(*)::int AS n FROM sessions WHERE lapse_flagged_at IS NOT NULL AND status = 'scheduled' AND parent_session_id IS NULL"),
    one(
      `SELECT count(*)::int AS n FROM sessions
        WHERE status = 'scheduled' AND cancelled_at IS NULL
          AND parent_session_id IS NULL
          AND data->'versions' IS NULL`,
    ),
    clientFilter
      ? pool.query("SELECT name FROM clients WHERE client_number = $1", [clientFilter]).then((r) => r.rows[0]?.name ?? null)
      : Promise.resolve(null),
  ]);

  const queues: Queue[] = [
    {
      id: "bookings",
      label: "Outlook bookings waiting to be sorted",
      count: openBookings,
      href: clientFilter ? `/hub/schedule/outlook?client=${clientFilter}` : "/hub/schedule/outlook",
      why: "Until these are confirmed into sessions, the blocks they belong to read fewer sessions done than really happened.",
      tone: "warn",
    },
    {
      id: "pending",
      label: "Calendar changes waiting for your approval",
      count: pendingSync,
      href: "/hub/schedule/outlook/pending-deletions",
      why: "Nothing reaches Outlook until you approve it. Until then the hub and the calendar drift apart.",
      tone: "due",
    },
    {
      id: "lapse",
      label: "Sessions flagged as lapsed",
      count: lapseFlagged,
      href: "/hub/sessions/lapse-review",
      why: "Booked, past, and never marked done or cancelled — so they still count as scheduled.",
      tone: "warn",
    },
    {
      id: "duplicates",
      label: "Possible duplicate bookings",
      count: duplicates,
      href: "/hub/schedule/outlook/duplicates",
      why: "One slot that looks like it was entered twice — once by the app, once by hand.",
      tone: "warn",
    },
    {
      id: "unassigned",
      label: "Scheduled sessions with no workout",
      count: needsWorkout,
      href: "/hub/schedule/outlook/unassigned",
      why: "Booked in, but nothing to deliver on the day.",
      tone: "warn",
    },
    {
      id: "cancellations",
      label: "Cancellations to review",
      count: -1,
      href: "/hub/sessions/review",
      why: "Charged or free, and whether the session goes back on the balance.",
      tone: "quiet",
    },
  ];

  const known = queues.filter((q) => q.count > 0);
  const empty = queues.filter((q) => q.count === 0);
  const unknown = queues.filter((q) => q.count < 0);
  const total = known.reduce((n, q) => n + q.count, 0);

  const DOT: Record<string, string> = {
    due: "bg-rose",
    warn: "bg-[var(--status-warning)]",
    quiet: "bg-[var(--color-muted)]",
  };

  return (
    <div className="w-full max-w-[1680px] mx-auto">
      <div className="flex items-baseline gap-2.5 flex-wrap mb-3.5">
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-[var(--color-ink)]">Triage</h1>
        <span className="text-[13px] text-[var(--color-body)]">
          {total > 0 ? `${total} things waiting across ${known.length} queues` : "Nothing waiting"}
        </span>
      </div>

      {/* C1a — client-scoped filter chip */}
      {clientFilter && clientName && (
        <div className="flex items-center gap-2 mb-3.5 px-3 py-2 rounded-nested border border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[13px] text-[var(--color-teal-text)]">
          <span className="font-semibold">Showing only {clientName}</span>
          <span className="text-[var(--color-muted)]">·</span>
          <Link
            href="/hub/schedule/triage"
            className="font-semibold text-[var(--color-rose-text)] hover:underline underline-offset-2"
          >
            Show all
          </Link>
        </div>
      )}

      <div className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden mb-3.5">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Waiting on you</h2>
          <span className="text-xs text-[var(--color-muted)]">in the order it blocks the most</span>
        </div>
        <div className="px-4 pb-3 pt-1">
          {known.map((q) => (
            <div
              key={q.id}
              className="flex items-center gap-3 py-2 px-3 rounded-nested border border-transparent hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)] transition-colors"
            >
              <span className={`w-[7px] h-[7px] rounded-pill shrink-0 ${DOT[q.tone]}`} />
              <span className="min-w-0 flex-1 text-[13.5px] text-[var(--color-ink)]">
                <b className="font-semibold">
                  {q.count} {q.label.charAt(0).toLowerCase() + q.label.slice(1)}
                </b>
                <span className="block text-xs text-[var(--color-muted)] mt-px">{q.why}</span>
              </span>
              <Link
                href={q.href}
                className="shrink-0 inline-flex items-center justify-center rounded-control border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] text-xs font-semibold no-underline transition-colors"
              >
                Work through them
              </Link>
            </div>
          ))}

          {known.length === 0 && (
            <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
              <span className="w-[7px] h-[7px] rounded-pill bg-[var(--status-success)] shrink-0" />
              <span>Nothing is waiting. Every queue is clear.</span>
            </div>
          )}
        </div>
      </div>

      {(empty.length > 0 || unknown.length > 0) && (
        <div className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden">
          <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
            <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Clear</h2>
            <span className="text-xs text-[var(--color-muted)]">nothing to do, kept so you know it was checked</span>
          </div>
          <div>
            {empty.map((q) => (
              <Link
                key={q.id}
                href={q.href}
                className="flex items-center gap-3 py-2 px-4 border-t border-[var(--hub-border)] first:border-t-0 no-underline hover:bg-[var(--hub-hover)] transition-colors"
              >
                <span className="w-[7px] h-[7px] rounded-pill bg-[var(--status-success)] shrink-0" />
                <span className="flex-1 min-w-0 text-[13px] text-[var(--color-muted)]">{q.label}</span>
                <span className="shrink-0 text-xs text-[var(--color-muted)]">None</span>
              </Link>
            ))}
            {unknown.map((q) => (
              <Link
                key={q.id}
                href={q.href}
                className="flex items-center gap-3 py-2 px-4 border-t border-[var(--hub-border)] first:border-t-0 no-underline hover:bg-[var(--hub-hover)] transition-colors"
              >
                <span className="w-[7px] h-[7px] rounded-pill bg-[var(--color-muted)] shrink-0" />
                <span className="flex-1 min-w-0 text-[13px] text-[var(--color-muted)]">{q.label}</span>
                <span className="shrink-0 text-xs text-[var(--color-muted)]">Open to check</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
