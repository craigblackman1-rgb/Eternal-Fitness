import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { IconChevronLeft, IconDumbbell } from "@/components/icons";
import { BlockOverviewClient } from "./BlockOverviewClient";
import { SessionList } from "./SessionList";
import { BlockPoolView } from "@/components/hub/BlockPoolView";
import { groupSessionsByWeek, isoToMonday, shiftDay } from "@/lib/schedule-dates";
import { deriveSessionStatus } from "@/lib/session-status";
import { deriveChronologicalPositions } from "@/lib/session-chronological-order";
import { sessionWorkoutName } from "@/lib/session-display";
import type { Weekday } from "@/lib/scheduling";
import { BlockGlanceProvider, GlanceToggle, GlanceSessionsView } from "./BlockAtAGlance";
import type { Session, SessionStatus, DBSession, BlockStatus } from "@/types";

const archetypeTint: Record<string, string> = {
  A: "bg-teal/10 text-teal",
  B: "bg-rose/10 text-rose",
  C: "bg-dark-navy/10 text-dark-navy",
};

interface SessionRow {
  id: string;
  block_id: string;
  session_number: number;
  archetype: string | null;
  week: number;
  phase: string;
  data: Session;
  scheduled_at: string | null;
  status: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  completed_at: string | null;
  parent_session_id: string | null;
}

/**
 * CR-EF-037 — the first-class `status` column is the source of truth, but it
 * can lag the older JSON/columns (the transition API only syncs on
 * complete/cancel, not on schedule). Derive defensively with the migration's
 * own backfill precedence — cancelled > completed > in_progress > scheduled >
 * planned — so a freshly-scheduled session never reads as "Planned" and a
 * cancelled session never reads as "Completed".
 */
function sessionStatus(s: SessionRow): SessionStatus {
  return deriveSessionStatus({
    status: s.status,
    cancelled_at: s.cancelled_at,
    scheduled_at: s.scheduled_at,
    completed_at: s.completed_at,
    session_log: s.data?.session_log,
  });
}

export default async function BlockViewPage({
  params,
}: {
  params: { id: string; blockId: string };
}) {
  const supabase = createClient();

  const { data: block } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", params.blockId)
    .single();

  if (!block) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("name, client_number, profile, sessions_purchased, block_expiry_date, block_expiry_extensions")
    .eq("client_number", parseInt(params.id))
    .single();

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("*")
    .eq("block_id", params.blockId)
    .order("session_number", { ascending: true });

  const sessions = (sessionsData || []) as SessionRow[];
  const clientId = client?.client_number || params.id;

  // Chronological positions derived from scheduled_at (NULLs last) — used for
  // "Session N of M" labels everywhere. Does NOT replace session_number.
  const chronologicalPositions = deriveChronologicalPositions(
    sessions.map((s) => ({ id: s.id, scheduled_at: s.scheduled_at, parent_session_id: s.parent_session_id })),
  );

  // CR-EF-101 — sub-sessions (parent_session_id) are excluded from pot count
  // and numbering. They are supplementary work within a slot.
  const potSessions = sessions.filter((s) => !s.parent_session_id);
  const totalSessions = potSessions.length;
  const completedSessions = potSessions.filter((s) => sessionStatus(s) === "completed").length;

  // BUG-EF-109 — derive displayed status from sessions: all settled → complete
  const derivedStatus: "draft" | "approved" | "active" | "complete" =
    potSessions.length > 0 && potSessions.every((s) => {
      const st = sessionStatus(s);
      return st === "completed" || st === "cancelled";
    })
      ? "complete"
      : (block.status as "draft" | "approved" | "active" | "complete");

  // Client context descriptor for the header line — the primary declared
  // condition, reused from the profile rather than a new field (matches the
  // hub's medical tracker, which also surfaces `conditions[0]` as the short
  // client descriptor).
  const clientCondition = client?.profile?.health?.conditions?.[0] ?? null;

  // Weeks are DERIVED from dates, not read from the stored `week` ordinal
  // (CR-EF-032: hand-built blocks pile everything into "week 1"). Scheduled
  // sessions group into real Monday–Sunday weeks; unscheduled ones fall back to
  // their stored `week` as "Plan week N". The stored ordinals survive only for
  // the Add-workout week picker (`planWeeks`).
  //
  // CR-EF-101 — sub-sessions are excluded from week groups. They are
  // supplementary work within a parent slot and should not appear as
  // standalone rows in the block overview.
  const displaySessions = sessions.filter((s) => !s.parent_session_id);
  const weekGroups = groupSessionsByWeek(displaySessions);
  const planWeeks = Array.from(new Set(displaySessions.map((s) => s.week))).sort((a, b) => a - b);

  // BUG-EF-109 — first incomplete session regardless of date (for week expansion)
  const firstIncomplete = displaySessions.find((s) => {
    const st = sessionStatus(s);
    return st !== "completed" && st !== "cancelled";
  });
  const targetKey = firstIncomplete
    ? firstIncomplete.scheduled_at
      ? isoToMonday(firstIncomplete.scheduled_at)
      : `p${firstIncomplete.week}`
    : null;
  const scheduledDates = displaySessions.map((s) => s.scheduled_at).filter((d): d is string => Boolean(d)).sort();
  const scheduledStartIso = (block.scheduled_start as string | null) ?? (scheduledDates[0] ?? null);
  // CR-EF-073 — a block is a dated period: derive its end from the latest
  // scheduled session, never fabricated. Null until at least one session has
  // a date.
  const scheduledEndIso = scheduledDates.length > 0 ? scheduledDates[scheduledDates.length - 1] : null;

  const weekdays: Weekday[] = Array.from(
    new Set(
      displaySessions
        .filter((s) => s.scheduled_at)
        .map((s) => new Date(s.scheduled_at as string).getDay() as Weekday),
    ),
  ).sort((a, b) => a - b);

  // CR-EF-073 — a session's identity is its booking (date + time); an
  // unbooked session leads with its ordinal instead of a meaningless "Day N".

  const formatShortDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  /** "24 Aug – 30 Aug" — the full Monday–Sunday span of a derived week. */
  const formatWeekRange = (monday: string): string => {
    const start = formatShortDate(monday);
    const end = formatShortDate(shiftDay(monday, 6));
    return start === end ? start : `${start} – ${end}`;
  };

  // BUG-EF-109 — first upcoming incomplete session for the "next session" label.
  // Never advertise a session whose scheduled_at has already passed.
  const todayISO = new Date().toISOString().split("T")[0];
  const sortedIncomplete = displaySessions
    .filter((s) => {
      const st = sessionStatus(s);
      return st !== "completed" && st !== "cancelled";
    })
    .sort((a, b) => {
      if (!a.scheduled_at && !b.scheduled_at) return 0;
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });

  const firstUpcoming = sortedIncomplete.find((s) => {
    if (!s.scheduled_at) return true;
    return s.scheduled_at >= todayISO;
  });

  const nextSessionLabel = firstUpcoming
    ? (() => {
        const pos = chronologicalPositions.get(firstUpcoming.id);
        const workoutName = sessionWorkoutName(firstUpcoming, pos ? `Session ${pos.position}` : "Session");
        if (!pos) return workoutName;
        if (firstUpcoming.scheduled_at) {
          return `${workoutName} · ${new Date(firstUpcoming.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
        }
        return `${workoutName} · not yet booked`;
      })()
    : sortedIncomplete.length > 0
      ? "No upcoming sessions"
      : "All sessions done";

  // CR-EF-073 — the block's own header names its dated period ("6 Aug – 12
  // Sep"), never a fabricated range: unscheduled blocks fall back to plain text.
  const formatShortDateFull = (iso: string): string =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const blockDateSpanLabel = scheduledStartIso
    ? scheduledEndIso && scheduledEndIso !== scheduledStartIso
      ? `${formatShortDateFull(scheduledStartIso)} – ${formatShortDateFull(scheduledEndIso)}`
      : formatShortDateFull(scheduledStartIso)
    : "not yet scheduled";

  const scheduledStartLabel = scheduledStartIso
    ? new Date(scheduledStartIso).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not yet";

  const blockForClient = {
    id: block.id,
    block_number: block.block_number,
    block_note: block.block_note as string | null,
    summary: block.summary as string | null,
    status: block.status as "draft" | "approved" | "active" | "complete",
  };

  return (
    <BlockGlanceProvider
      sessions={sessions as unknown as DBSession[]}
      positions={Array.from(chronologicalPositions.entries())}
      blockId={params.blockId}
      clientId={String(clientId)}
      clientName={client?.name || "Client"}
      blockNumber={block.block_number}
      blockStatus={derivedStatus as BlockStatus}
      approvedAt={(block as { approved_at?: string | null }).approved_at ?? null}
      dateSpanLabel={blockDateSpanLabel}
    >
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Link href={`/hub/clients/${clientId}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <IconChevronLeft className="h-5 w-5" />
            Back to {client?.name || "Client"}
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                Block {block.block_number}
              </h1>
              <StatusBadge status={derivedStatus} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client?.name || "Client"}{clientCondition ? ` · ${clientCondition}` : ""} · {blockDateSpanLabel} · {totalSessions}-session block
            </p>
          </div>
          <GlanceToggle />
          <Link
            href={`/hub/clients/${clientId}/add-workout`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-rose hover:bg-rose/90 text-white text-[13px] font-semibold transition-colors shrink-0"
          >
            <IconDumbbell className="w-4 h-4" /> Add workout
          </Link>
        </div>

      <BlockOverviewClient
        block={blockForClient}
        clientId={String(clientId)}
        blockId={params.blockId}
        clientName={client?.name || "Client"}
        weeks={planWeeks}
        sessionCount={totalSessions}
        scheduledStartIso={scheduledStartIso}
        weekdays={weekdays}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--hub-card)] overflow-hidden border border-[var(--hub-border)]" style={{ borderRadius: "var(--r-surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-4 py-3 border-r border-b border-[var(--hub-border)] md:border-b-0 last:border-r-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sessions</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{completedSessions} of {totalSessions} done</p>
          </div>
          <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-[var(--hub-border)] last:border-r-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled start</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{scheduledStartLabel}</p>
          </div>
          <div className="px-4 py-3 border-r border-[var(--hub-border)] last:border-r-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
            <div className="mt-0.5"><StatusBadge status={derivedStatus} /></div>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next session</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{nextSessionLabel}</p>
          </div>
        </div>
      </BlockOverviewClient>

      <GlanceSessionsView>
        {/* CR-EF-099 — Session pot counter, sequence ribbon, booked slots vs planned workouts */}
        <BlockPoolView
          sessions={sessions as unknown as DBSession[]}
          clientId={String(clientId)}
          blockId={params.blockId}
          clientName={client?.name || "Client"}
          sessionsPurchased={client?.sessions_purchased ?? null}
          blockExpiryDate={client?.block_expiry_date ?? null}
          blockExpiryExtensions={client?.block_expiry_extensions ?? []}
        />

        <div className="space-y-3.5">
          {weekGroups.map((group) => {
            const isScheduled = group.kind === "scheduled";
            const weekOpen = group.key === targetKey;
            // CR-EF-101 — exclude sub-sessions from week totals
            const weekPotSessions = group.sessions.filter((s) => !s.parent_session_id);
            const done = weekPotSessions.filter((s) => sessionStatus(s) === "completed").length;
            const cancelled = weekPotSessions.filter((s) => sessionStatus(s) === "cancelled").length;
            const total = weekPotSessions.length;

            const numLabel = isScheduled ? String(Number(group.monday!.split("-")[2])) : String(group.planWeek);
            const title = isScheduled ? `Week of ${formatShortDate(group.monday!)}` : `Plan week ${group.planWeek}`;
            const sub = isScheduled
              ? formatWeekRange(group.monday!)
              : `${total} session${total === 1 ? "" : "s"} planned · no dates yet`;
            const progress = isScheduled
              ? `${done} of ${total} done${cancelled ? ` · ${cancelled} cancelled` : ""}`
              : "Not scheduled";

            return (
              <details
                key={group.key}
                open={weekOpen}
                className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden group"
              >
                <summary className="list-none cursor-pointer flex items-center gap-3 px-4 py-3 hover:bg-[var(--hub-hover)] transition-colors">
                  <span
                    className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[13px] font-extrabold shrink-0 ${
                      isScheduled ? "bg-rose/10 text-rose" : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]"
                    }`}
                  >
                    {numLabel}
                  </span>
                  <span className="text-sm font-bold text-foreground">{title}</span>
                  {sub && <span className="text-xs text-muted-foreground ml-0.5">{sub}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{progress}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </summary>
                <div className="border-t border-[var(--hub-border)]">
                  <SessionList
                    sessions={group.sessions}
                    totalSessions={totalSessions}
                    clientId={String(clientId)}
                    blockId={params.blockId}
                    archetypeTint={archetypeTint}
                    chronologicalPositions={chronologicalPositions}
                    allSessions={sessions as unknown as DBSession[]}
                  />
                </div>
              </details>
            );
          })}
        </div>
      </GlanceSessionsView>
    </div>
    </BlockGlanceProvider>
  );
}
