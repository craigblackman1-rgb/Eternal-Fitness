import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { IconChevronLeft } from "@/components/icons";
import { PrescriptionTable } from "@/components/hub/PrescriptionTable";
import { BlockOverviewClient } from "./BlockOverviewClient";
import { HideExerciseTableButton } from "./HideExerciseTableButton";
import { SessionRowActions } from "./SessionRowActions";
import { groupSessionsByWeek, isoToMonday, shiftDay } from "@/lib/schedule-dates";
import type { Weekday } from "@/lib/scheduling";
import type { Session } from "@/types";

const archetypeInfo: Record<string, { name: string; tint: string }> = {
  A: { name: "Mobility & Movement", tint: "bg-teal/10 text-teal" },
  B: { name: "Strength & Stability", tint: "bg-rose/10 text-rose" },
  C: { name: "Power & Conditioning", tint: "bg-dark-navy/10 text-dark-navy" },
};

type SessionStatus = "planned" | "scheduled" | "in_progress" | "completed" | "cancelled";

const STATUS_META: Record<SessionStatus, { label: string; cls: string }> = {
  planned: {
    label: "Planned",
    cls: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] border-[var(--status-neutral-border)]",
  },
  scheduled: {
    label: "Scheduled",
    cls: "bg-[var(--status-primary-bg)] text-[var(--status-primary-text)] border-[var(--status-primary-border)]",
  },
  in_progress: {
    label: "In progress",
    cls: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
  },
  completed: {
    label: "Completed",
    cls: "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border)]",
  },
};

interface SessionRow {
  id: string;
  block_id: string;
  session_number: number;
  archetype: string;
  week: number;
  phase: string;
  data: Session;
  scheduled_at: string | null;
  status: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
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
  if (s.cancelled_at || s.status === "cancelled") return "cancelled";
  if (s.data?.session_log?.completed_at || s.status === "completed") return "completed";
  if (s.status === "in_progress") return "in_progress";
  if (s.scheduled_at || s.status === "scheduled") return "scheduled";
  return "planned";
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
    .select("name, client_number")
    .eq("client_number", parseInt(params.id))
    .single();

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("*")
    .eq("block_id", params.blockId)
    .order("session_number", { ascending: true });

  const sessions = (sessionsData || []) as SessionRow[];
  const clientId = client?.client_number || params.id;

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => sessionStatus(s) === "completed").length;

  // Weeks are DERIVED from dates, not read from the stored `week` ordinal
  // (CR-EF-032: hand-built blocks pile everything into "week 1"). Scheduled
  // sessions group into real Monday–Sunday weeks; unscheduled ones fall back to
  // their stored `week` as "Plan week N". The stored ordinals survive only for
  // the Add-workout week picker (`planWeeks`).
  const weekGroups = groupSessionsByWeek(sessions);
  const planWeeks = Array.from(new Set(sessions.map((s) => s.week))).sort((a, b) => a - b);

  const firstIncomplete = sessions.find((s) => {
    const st = sessionStatus(s);
    return st !== "completed" && st !== "cancelled";
  });
  const targetKey = firstIncomplete
    ? firstIncomplete.scheduled_at
      ? isoToMonday(firstIncomplete.scheduled_at)
      : `p${firstIncomplete.week}`
    : null;
  const targetSessionNum = firstIncomplete?.session_number ?? null;

  const scheduledStartIso =
    (block.scheduled_start as string | null) ??
    (sessions.map((s) => s.scheduled_at).filter((d): d is string => Boolean(d)).sort()[0] ?? null);

  const weekdays: Weekday[] = Array.from(
    new Set(
      sessions
        .filter((s) => s.scheduled_at)
        .map((s) => new Date(s.scheduled_at as string).getDay() as Weekday),
    ),
  ).sort((a, b) => a - b);

  const formatDayLabel = (session: SessionRow, dayIndex: number): string => {
    if (session.scheduled_at) {
      const d = new Date(session.scheduled_at);
      return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    }
    return `Day ${dayIndex + 1}`;
  };

  const formatShortDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  /** "24 Aug – 30 Aug" — the full Monday–Sunday span of a derived week. */
  const formatWeekRange = (monday: string): string => {
    const start = formatShortDate(monday);
    const end = formatShortDate(shiftDay(monday, 6));
    return start === end ? start : `${start} – ${end}`;
  };

  const nextSessionLabel = firstIncomplete
    ? firstIncomplete.scheduled_at
      ? `${new Date(firstIncomplete.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · S${firstIncomplete.session_number}`
      : `S${firstIncomplete.session_number}`
    : "All sessions done";

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/hub/clients/${clientId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              Block {block.block_number}
            </h1>
            <StatusBadge status={block.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {client?.name || "Client"} · {totalSessions} sessions · {weekGroups.length} week{weekGroups.length === 1 ? "" : "s"}
          </p>
        </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--hub-border)] rounded-2xl overflow-hidden border border-[var(--hub-border)]">
          <div className="bg-[var(--hub-card)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sessions</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{completedSessions} of {totalSessions} done</p>
          </div>
          <div className="bg-[var(--hub-card)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled start</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{scheduledStartLabel}</p>
          </div>
          <div className="bg-[var(--hub-card)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
            <div className="mt-0.5"><StatusBadge status={block.status} /></div>
          </div>
          <div className="bg-[var(--hub-card)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next session</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{nextSessionLabel}</p>
          </div>
        </div>
      </BlockOverviewClient>

      <div className="space-y-3.5">
        {weekGroups.map((group) => {
          const isScheduled = group.kind === "scheduled";
          const weekOpen = group.key === targetKey;
          const done = group.sessions.filter((s) => sessionStatus(s) === "completed").length;
          const cancelled = group.sessions.filter((s) => sessionStatus(s) === "cancelled").length;
          const total = group.sessions.length;

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
              className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden group"
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
                {group.sessions.map((session, dayIndex) => {
                  const info = archetypeInfo[session.archetype];
                  const focusLabel = session.data?.focus_label || info?.name || "—";
                  const status = sessionStatus(session);
                  const statusMeta = STATUS_META[status];
                  const settled = status === "completed" || status === "cancelled";
                  const sessionOpen = weekOpen && session.session_number === targetSessionNum;
                  const sessionUrl = `/hub/clients/${clientId}/blocks/${params.blockId}/sessions/${session.session_number}`;
                  const studioVersion = session.data?.versions?.studio;
                  const dayLabel = formatDayLabel(session, dayIndex);

                  return (
                    <details
                      key={session.id}
                      open={sessionOpen}
                      className="border-t border-[var(--hub-border)] first:border-t-0 group/sess"
                    >
                      <summary className="list-none cursor-pointer flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-2.5 hover:bg-[var(--hub-hover)] transition-colors">
                        <span className="w-[92px] shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {dayLabel}
                        </span>
                        <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${info?.tint || "bg-muted text-muted-foreground"}`}>
                            {session.archetype} · {info?.name || "Session"}
                          </span>
                          <span className={`text-sm font-semibold text-foreground truncate ${settled ? "text-muted-foreground" : ""}`}>{focusLabel}</span>
                        </div>
                        <div className="flex items-center gap-3.5 w-full justify-end sm:w-auto sm:contents">
                          <span className="w-[150px] shrink-0 flex justify-end">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.cls}`}>
                              {statusMeta.label}
                            </span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {settled ? (
                              <Link
                                href={sessionUrl}
                                className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] transition-colors"
                              >
                                View
                              </Link>
                            ) : (
                              <>
                                <Link
                                  href={sessionUrl}
                                  className="inline-flex items-center rounded-lg bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                                >
                                  {status === "in_progress" ? "Resume" : "Log"}
                                </Link>
                                <Link
                                  href={`${sessionUrl}?edit=1`}
                                  className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
                                >
                                  Edit session
                                </Link>
                              </>
                            )}
                            <SessionRowActions sessionId={session.id} sessionNumber={session.session_number} />
                          </div>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className="text-muted-foreground transition-transform duration-200 group-open/sess:rotate-90 shrink-0"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </div>
                      </summary>
                      <div className="px-4 pb-4 overflow-x-auto">
                        {status === "cancelled" && session.cancel_reason && (
                          <p className="text-sm text-muted-foreground mb-3">Cancelled — {session.cancel_reason}</p>
                        )}
                        <HideExerciseTableButton />
                        {studioVersion ? (
                          <PrescriptionTable version={studioVersion} />
                        ) : (
                          <p className="text-sm text-muted-foreground">No exercise data for this session.</p>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
