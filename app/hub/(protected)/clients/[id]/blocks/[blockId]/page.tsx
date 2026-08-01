import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HubCard, HubCardHeader } from "@/components/hub";
import { KpiTile } from "@/components/hub/KpiTile";
import { StatusBadge } from "@/components/hub/StatusBadge";
import {
  IconChevronLeft,
  IconClipboardList,
  IconCheckCircle,
  IconCalendar,
  IconDumbbell,
} from "@/components/icons";
import { PrescriptionTable } from "@/components/hub/PrescriptionTable";
import { BlockOverviewClient } from "./BlockOverviewClient";
import type { Session } from "@/types";

const phaseColors: Record<string, string> = {
  foundation: "bg-teal/10 text-teal",
  build: "bg-rose/10 text-rose",
  develop: "bg-dark-navy/10 text-dark-navy",
  peak: "bg-rose text-white",
  deload: "bg-slate/10 text-slate",
};

const phaseTimeline = [
  { label: "Foundation", weeks: "Wk 1-2", phase: "foundation" },
  { label: "Build", weeks: "Wk 3", phase: "build" },
  { label: "Develop", weeks: "Wk 4", phase: "develop" },
  { label: "Peak", weeks: "Wk 5", phase: "peak" },
  { label: "Deload", weeks: "Wk 6", phase: "deload" },
];

const archetypeInfo: Record<string, { name: string; tint: string }> = {
  A: { name: "Mobility & Movement", tint: "bg-teal/10 text-teal" },
  B: { name: "Strength & Stability", tint: "bg-rose/10 text-rose" },
  C: { name: "Power & Conditioning", tint: "bg-dark-navy/10 text-dark-navy" },
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
  const completedSessions = sessions.filter((s) => s.data?.session_log?.completed_at).length;
  const archetypeCounts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.archetype] = (acc[s.archetype] || 0) + 1;
    return acc;
  }, {});
  const archetypeMix = ["A", "B", "C"]
    .filter((a) => archetypeCounts[a])
    .map((a) => `${a} ${archetypeCounts[a]}`)
    .join(" · ");

  const weeks = Array.from(new Set(sessions.map((s) => s.week))).sort((a, b) => a - b);
  const sessionsByWeek = weeks.map((week) => ({
    week,
    sessions: sessions.filter((s) => s.week === week),
  }));

  const firstIncomplete = sessions.find((s) => !s.data?.session_log?.completed_at);
  const targetWeek = firstIncomplete?.week ?? null;
  const targetSessionNum = firstIncomplete?.session_number ?? null;

  const formatDayLabel = (session: SessionRow, dayIndex: number): string => {
    if (session.scheduled_at) {
      const d = new Date(session.scheduled_at);
      return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    }
    return `Day ${dayIndex + 1}`;
  };

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
            {client?.name || "Client"} · {totalSessions} sessions · {weeks.length} week{weeks.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <BlockOverviewClient
        block={blockForClient}
        clientId={String(clientId)}
        blockId={params.blockId}
        clientName={client?.name || "Client"}
      >
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <KpiTile
            icon={<IconClipboardList className="h-5 w-5" />}
            label="Sessions"
            value={totalSessions}
            statusToken="primary"
          />
          <KpiTile
            icon={<IconCheckCircle className="h-5 w-5" />}
            label="Completed"
            value={`${completedSessions}/${totalSessions}`}
            statusToken="success"
          />
          <KpiTile
            icon={<IconCalendar className="h-5 w-5" />}
            label="Weeks"
            value={weeks.length}
            statusToken="neutral"
          />
          <KpiTile
            icon={<IconDumbbell className="h-5 w-5" />}
            label="Archetype Mix"
            value={archetypeMix || "—"}
            statusToken="primary"
          />
        </div>

        <div className="flex gap-2 mt-6">
          {phaseTimeline.map((p) => (
            <div
              key={p.phase}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-center ${phaseColors[p.phase] || "bg-muted text-muted-foreground"}`}
            >
              {p.label} {p.weeks}
            </div>
          ))}
        </div>
      </BlockOverviewClient>

      <div className="space-y-3.5">
        {sessionsByWeek.map(({ week, sessions: weekSessions }) => {
          const weekPhase = weekSessions[0]?.phase || "foundation";
          const weekOpen = week === targetWeek;
          const weekCompleted = weekSessions.every((s) => s.data?.session_log?.completed_at);

          return (
            <details
              key={week}
              open={weekOpen}
              className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden group"
            >
              <summary className="list-none cursor-pointer flex items-center gap-3 px-4 py-3 hover:bg-[var(--hub-hover)] transition-colors">
                <span className="w-[30px] h-[30px] rounded-lg bg-rose/10 text-rose flex items-center justify-center text-[13px] font-extrabold shrink-0">
                  {week}
                </span>
                <span className="text-sm font-bold text-foreground">Week {week}</span>
                <span className="text-xs text-muted-foreground ml-0.5">
                  {weekSessions.length} session{weekSessions.length === 1 ? "" : "s"}
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${phaseColors[weekPhase] || "bg-muted text-muted-foreground"}`}>
                  {weekPhase}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {weekSessions.filter((s) => s.data?.session_log?.completed_at).length}/{weekSessions.length} logged
                </span>
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
                {weekSessions.map((session, dayIndex) => {
                  const info = archetypeInfo[session.archetype];
                  const focusLabel = session.data?.focus_label || info?.name || "—";
                  const completedAt = session.data?.session_log?.completed_at;
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
                      <summary className="list-none cursor-pointer flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--hub-hover)] transition-colors">
                        <span className="w-[92px] shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {dayLabel}
                        </span>
                        <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${info?.tint || "bg-muted text-muted-foreground"}`}>
                            {session.archetype} · {info?.name || "Session"}
                          </span>
                          <span className="text-sm font-semibold text-foreground truncate">{focusLabel}</span>
                        </div>
                        <span className="w-[150px] shrink-0 flex justify-end">
                          {completedAt ? (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-bd)]">
                              Logged
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--hub-hover)] text-muted-foreground border-[var(--hub-border)]">
                              Not logged
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/hub/log/${session.id}`}
                            className="inline-flex items-center rounded-lg bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                          >
                            Log
                          </Link>
                          <Link
                            href={`${sessionUrl}?edit=1`}
                            className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
                          >
                            Edit session
                          </Link>
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
                      </summary>
                      <div className="px-4 pb-4 overflow-x-auto">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-lg hover:bg-[var(--hub-hover)] transition-colors mb-1.5"
                          onClick={(e) => {
                            const details = e.currentTarget.closest("details");
                            if (details) details.open = false;
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                          Hide exercise table
                        </button>
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
