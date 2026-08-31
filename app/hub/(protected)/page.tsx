import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { HubCard, HubCardHeader, HubQuickActions, HubAccordionSection, HubRail } from "@/components/hub";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { TokenPill } from "@/components/hub/StatusBadge";
import { KpiTile } from "@/components/hub/KpiTile";
import { HubAlert } from "@/components/hub/HubAlert";
import {
  IconAlertCircle, IconArrowUpRight, IconCalendar, IconCheck, IconCheckCircle, IconFileText,
  IconTriangleAlert, IconUserPlus, IconUsers, IconClock, IconBot, IconMail,
} from "@/components/icons";
import type { DBClientComplianceStatus } from "@/types";
import { formatFrequency } from "@/types";
import { getQuietHomeTrainingClients } from "@/lib/progress-db";
import { HOME_TRAINING_QUIET_DAYS } from "@/lib/progress";
import { getClientsWithUpdateDue, getClientsUpdateDueSoon } from "@/lib/updates-due-db";
import { UPDATE_INTERVAL_LABELS, type UpdateDueStatus } from "@/lib/updates-due";
import type { StatusToken } from "@/lib/hubStatus";

interface RecentCheckIn {
  clientName: string;
  clientNumber: string | number;
  programme: string;
  loggedLabel: string;
  complianceStatus: DBClientComplianceStatus | null;
}

interface WeekPlanEntry {
  id: string;
  dayLabel: string;
  clientName: string;
  clientNumber: number | null;
  blockNumber: number | null;
  sessionNumber: number;
  focusLabel: string | null;
  meta: string | null;
  metaDanger: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Monday-start week boundary — matches the studio schedule's own week convention. */
function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const trainerFirstName = user?.name?.split(" ")[0] ?? null;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const lastWeekStart = addDays(weekStart, -7);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = addDays(todayStart, 1);

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, profile, created_at, client_number, compliance_status, annual_review_due_date")
    .order("created_at", { ascending: false });

  // Looked up by client_id instead of embedding clients inside a second-level
  // blocks!inner(...clients!inner(...)) select — the query builder's embed
  // parser only resolves one level of nesting (it naively comma-splits the
  // embed's own column list, which breaks on a nested "rel!inner(...)" call
  // and throws, silently dropping the whole query to []). Confirmed live:
  // this is why the dashboard's Sessions this week / Check-ins logged /
  // Recent Check-ins / This Week's Plan all showed empty despite real data.
  const clientsById = new Map((clients ?? []).map((c) => [c.id, c]));

  const { data: blocks } = await supabase
    .from("blocks")
    .select("id, client_id, block_number, status, created_at, block_note, clients!inner(client_number, name)")
    .order("created_at", { ascending: false });

  const activeBlocks = (blocks ?? []).filter((b) => b.status === "active");
  const activeBlockIds = activeBlocks.map((b) => b.id);

  const { data: activeSessions } = activeBlockIds.length > 0
    ? await supabase
        .from("sessions")
        .select("id, block_id, session_number, archetype, data, scheduled_at, cancelled_at, blocks!inner(block_number, client_id)")
        .in("block_id", activeBlockIds)
        .order("session_number", { ascending: false })
    : { data: [] as any[] };

  const nextUpByBlock = activeBlocks.map((block) => {
    const blockSessions = (activeSessions ?? []).filter((s) => s.block_id === block.id);
    const nextSession = blockSessions.find((s) => !s.data?.session_log?.completed_at);
    const completedCount = blockSessions.filter((s) => s.data?.session_log?.completed_at).length;
    return { block, nextSession, completedCount, totalCount: blockSessions.length };
  });

  const activeClientCount = new Set(activeBlocks.map((b) => b.client_id)).size;

  const needsAttention = (clients ?? []).filter(
    (c) => c.compliance_status && (c.compliance_status as DBClientComplianceStatus) !== "clear",
  );
  const quietClients = await getQuietHomeTrainingClients();

  const updatesDueClients = await getClientsWithUpdateDue();
  const updatesDueSoon = await getClientsUpdateDueSoon(7);
  const updatesOverdueCount = updatesDueClients.filter((c) => c.status === "overdue").length;

  const STATUS_COLORS: Record<UpdateDueStatus, { token: StatusToken; label: string }> = {
    overdue: { token: "danger", label: "Overdue" },
    due_soon: { token: "warning", label: "Due soon" },
    upcoming: { token: "primary", label: "Upcoming" },
  };

  const doNotTrain = needsAttention.filter((c) => c.compliance_status === "do_not_train");
  const pendingReview = needsAttention.filter(
    (c) => c.compliance_status === "pending_medical" || c.compliance_status === "action_needed",
  );

  // CR-EF-099 — flagged sessions awaiting Esther's review (did it happen or not?)
  const { count: flaggedSessionCount } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .not("lapse_flagged_at", "is", null)
    .eq("status", "scheduled");

  // Alerts accordion — hub-dashboard.html collapses every flat status banner
  // into one collapsible section ("3 alerts" + a breakdown) so they cost a
  // single row of chrome instead of stacking four banners above the fold.
  const alertSummaries: string[] = [];
  if (doNotTrain.length > 0) alertSummaries.push(`${doNotTrain.length} Do Not Train`);
  if (pendingReview.length > 0) alertSummaries.push(`${pendingReview.length} client${pendingReview.length === 1 ? "" : "s"} need action`);
  if (quietClients.length > 0) alertSummaries.push(`${quietClients.length} gone quiet`);
  if (updatesDueSoon.length > 0) alertSummaries.push(`${updatesDueSoon.length} update${updatesDueSoon.length === 1 ? "" : "s"} due in 7 days`);
  if (flaggedSessionCount && flaggedSessionCount > 0) alertSummaries.push(`${flaggedSessionCount} flagged session${flaggedSessionCount === 1 ? "" : "s"}`);
  const totalAlerts = doNotTrain.length + pendingReview.length + quietClients.length + updatesDueSoon.length + (flaggedSessionCount ?? 0);

  // Reviews due — same real signal as the Process & Quality "Reviews due" tile
  // (annual_review_due_date elapsed), not a separately-invented definition.
  const reviewsDueClients = (clients ?? []).filter(
    (c) => c.annual_review_due_date && new Date(c.annual_review_due_date) < now,
  );

  // Studio-wide scheduled sessions this week (and last week, for a real trend) —
  // same "scheduled_at set, not cancelled" convention as /hub/schedule.
  const { data: weekSessionRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, data, scheduled_at, cancelled_at, blocks!inner(block_number, client_id)")
    .not("scheduled_at", "is", null)
    .is("cancelled_at", null)
    .gte("scheduled_at", lastWeekStart.toISOString())
    .lt("scheduled_at", weekEnd.toISOString())
    .order("scheduled_at", { ascending: true });

  const allWeekSessions = weekSessionRows ?? [];
  const thisWeekSessions = allWeekSessions.filter((s) => {
    const t = new Date(s.scheduled_at as string);
    return t >= weekStart && t < weekEnd;
  });
  const lastWeekSessionCount = allWeekSessions.filter((s) => {
    const t = new Date(s.scheduled_at as string);
    return t >= lastWeekStart && t < weekStart;
  }).length;

  const sessionsThisWeek = thisWeekSessions.length;
  const sessionsTrend = sessionsThisWeek - lastWeekSessionCount;

  const sessionsToday = thisWeekSessions.filter((s) => {
    const t = new Date(s.scheduled_at as string);
    return t >= todayStart && t < todayEnd;
  }).length;
  const checkInsToLogToday = thisWeekSessions.filter((s) => {
    const t = new Date(s.scheduled_at as string);
    return t >= todayStart && t < todayEnd && !s.data?.session_log?.completed_at;
  }).length;

  // Check-ins logged — real completed session_log entries this week vs last week.
  // `sessions` has no created_at/updated_at column, so there is no server-side
  // recency order to fetch by — pull every session (this business's total row
  // count is small) and sort/filter by session_log.completed_at in JS below.
  const { data: allSessionRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, data, blocks!inner(block_number, client_id)");

  const loggedRows = (allSessionRows ?? []).filter((s) => s.data?.session_log?.completed_at);
  const checkInsThisWeek = loggedRows.filter((s) => {
    const t = new Date(s.data.session_log.completed_at as string);
    return t >= weekStart && t < weekEnd;
  }).length;
  const checkInsLastWeek = loggedRows.filter((s) => {
    const t = new Date(s.data.session_log.completed_at as string);
    return t >= lastWeekStart && t < weekStart;
  }).length;
  const checkInsTrend = checkInsThisWeek - checkInsLastWeek;

  // Recent check-ins table — real logged sessions only, status reused directly
  // from the client's own compliance_status (the same signal "Needs Attention"
  // uses below), not a separately-invented time-based classification.
  const recentCheckIns: RecentCheckIn[] = loggedRows
    .slice()
    .sort((a, b) => new Date(b.data.session_log.completed_at).getTime() - new Date(a.data.session_log.completed_at).getTime())
    .slice(0, 5)
    .map((session) => {
      const log = session.data.session_log;
      const client = clientsById.get((session.blocks as any)?.client_id);
      const profile = client?.profile;
      const primaryGoal = profile?.goals?.primary ? profile.goals.primary.replace("_", " ") : null;
      const completedAt = new Date(log.completed_at);
      const daysAgo = Math.floor((Date.now() - completedAt.getTime()) / 86_400_000);
      const loggedLabel =
        daysAgo <= 0 ? "Today"
        : daysAgo === 1 ? "Yesterday"
        : daysAgo < 7 ? `${daysAgo} days ago`
        : completedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      return {
        clientName: client?.name ?? "Unknown client",
        clientNumber: client?.client_number ?? "#?",
        programme: primaryGoal ? `Block ${(session.blocks as any)?.block_number} · ${primaryGoal}` : `Block ${(session.blocks as any)?.block_number}`,
        loggedLabel,
        complianceStatus: (client?.compliance_status as DBClientComplianceStatus) ?? null,
      };
    });

  // This week's plan — real scheduled sessions, day by day. The "blocked" meta
  // note only appears when the client's own compliance_status is do_not_train
  // (a real, already-computed signal) — never an invented editorial comment.
  const weekPlan: WeekPlanEntry[] = thisWeekSessions
    .map((s) => {
      const client = clientsById.get((s.blocks as any)?.client_id);
      const blocked = client?.compliance_status === "do_not_train";
      const completed = !!s.data?.session_log?.completed_at;
      return {
        id: s.id,
        dayLabel: DAY_LABELS[new Date(s.scheduled_at as string).getDay()],
        clientName: client?.name ?? "Unknown client",
        clientNumber: client?.client_number ?? null,
        blockNumber: (s.blocks as any)?.block_number ?? null,
        sessionNumber: s.session_number,
        focusLabel: s.data?.focus_label ?? null,
        meta: blocked
          ? "Blocked until clearance renewed"
          : completed
          ? "Logged"
          : null,
        metaDanger: blocked,
      };
    })
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Quick Actions — shared top-left bar, per hub-dashboard.html. Was previously a
          card buried in the side column below Recent Blocks; moved per Craig's
          2026-08-18 direction (most prominent position, not the right rail). */}
      <HubQuickActions
        variant="bar"
        actions={[
          { href: "/hub/clients/new", label: "New client", icon: <IconUserPlus className="w-4 h-4" />, primary: true },
          { href: "/hub/schedule", label: "Log check-in", icon: <IconCheck className="w-4 h-4" /> },
          { href: "/hub/exercises", label: "Browse exercise library", icon: <IconFileText className="w-4 h-4" /> },
          { href: "/hub/clients", label: "View all clients", icon: <IconUsers className="w-4 h-4" /> },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]" style={{ fontFamily: "var(--font-body)" }}>
          {greeting}{trainerFirstName ? `, ${trainerFirstName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {now.toLocaleDateString("en-GB", { weekday: "long" })} · {sessionsToday} session{sessionsToday === 1 ? "" : "s"} today
          {checkInsToLogToday > 0 && `, ${checkInsToLogToday} check-in${checkInsToLogToday === 1 ? "" : "s"} to log`}
        </p>
      </div>

      {/* KPI band — sessions/check-ins/reviews/active-clients, per hub-dashboard.html */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-5">
        <KpiTile
          icon={<IconCalendar className="w-5 h-5" />}
          label="Sessions this week"
          value={sessionsThisWeek}
          statusToken="primary"
          trend={sessionsTrend !== 0 ? `${Math.abs(sessionsTrend)}` : undefined}
          trendUp={sessionsTrend >= 0}
        />
        <KpiTile
          icon={<IconCheckCircle className="w-5 h-5" />}
          label="Check-ins logged"
          value={checkInsThisWeek}
          statusToken="success"
          trend={checkInsTrend !== 0 ? `${Math.abs(checkInsTrend)}` : undefined}
          trendUp={checkInsTrend >= 0}
        />
        <KpiTile
          icon={<IconClock className="w-5 h-5" />}
          label="Reviews due"
          value={reviewsDueClients.length}
          statusToken={reviewsDueClients.length > 0 ? "warning" : "success"}
        />
        <KpiTile
          icon={<IconUsers className="w-5 h-5" />}
          label="Active clients"
          value={activeClientCount}
          statusToken="neutral"
        />
        <KpiTile
          icon={<IconMail className="w-5 h-5" />}
          label="Updates due"
          value={updatesDueSoon.length}
          statusToken="warning"
          trend={updatesOverdueCount > 0 ? `${updatesOverdueCount} overdue` : undefined}
          trendUp={false}
        />
      </div>

      {totalAlerts > 0 && (
        <HubAccordionSection
          icon={<IconAlertCircle className="w-4 h-4" />}
          title={`${totalAlerts} alert${totalAlerts === 1 ? "" : "s"}`}
          subtitle={alertSummaries.join(" · ")}
          color="danger"
        >
          <div className="px-4 pt-4 pb-4 space-y-3">
            {doNotTrain.length > 0 && (
              <HubAlert severity="danger" title={`Do Not Train — ${doNotTrain.length} client${doNotTrain.length > 1 ? "s" : ""}`}>
                {doNotTrain.map((c) => c.name).join(", ")}
                {doNotTrain.length === 1 ? " has" : " have"} outstanding paperwork that must be resolved before any further sessions.
              </HubAlert>
            )}
            {pendingReview.length > 0 && (
              <HubAlert severity="warning" title={`Action needed — ${pendingReview.length} client${pendingReview.length > 1 ? "s" : ""}`}>
                {pendingReview.map((c) => c.name).join(", ")}
                {pendingReview.length === 1 ? " needs" : " need"} clearance or outstanding actions resolved.
              </HubAlert>
            )}
            {quietClients.length > 0 && (
              <HubAlert severity="warning" title={`Gone quiet — ${quietClients.length} home-training client${quietClients.length > 1 ? "s" : ""}`}>
                <span>
                  {quietClients.map((c, i) => (
                    <span key={c.clientId}>
                      {i > 0 && ", "}
                      <Link href={`/hub/clients/${c.clientNumber}`} className="font-medium underline underline-offset-2 hover:no-underline">
                        {c.name}
                      </Link>
                    </span>
                  ))}{" "}
                  {quietClients.length === 1 ? "has" : "have"} not logged any sets in the last {HOME_TRAINING_QUIET_DAYS} days — worth checking in.
                </span>
              </HubAlert>
            )}
            {updatesDueSoon.length > 0 && (
              <HubAlert severity="warning" title={`${updatesDueSoon.length} update${updatesDueSoon.length === 1 ? "" : "s"} due in the next 7 days`}>
                <span>
                  {updatesDueSoon.map((c, i) => (
                    <span key={c.clientId}>
                      {i > 0 && ", "}
                      <Link href={`/hub/clients/${c.clientNumber}`} className="font-medium underline underline-offset-2 hover:no-underline">
                        {c.name}
                      </Link>
                    </span>
                  ))}{" "}
                  {updatesDueSoon.length === 1 ? "is" : "are"} approaching {updatesDueSoon.length === 1 ? "their" : ""} next update deadline. Updates are derived from each client's interval schedule — send the update to advance the due date.
                </span>
              </HubAlert>
            )}
            {flaggedSessionCount != null && flaggedSessionCount > 0 && (
              <HubAlert severity="warning" title={`${flaggedSessionCount} flagged session${flaggedSessionCount === 1 ? "" : "s"} — did they happen?`}>
                <span>
                  Sessions past their slot with no logged activity. Confirm each one individually.
                  {" "}
                  <Link href="/hub/sessions/lapse-review" className="font-medium underline underline-offset-2 hover:no-underline">
                    Review flagged sessions
                  </Link>
                </span>
              </HubAlert>
            )}
          </div>
        </HubAccordionSection>
      )}

      {/* Accordion stack + narrow side rail — the attn-grid + side-stack split
          hub-dashboard.html specifies. One accordion pattern, closed by default;
          Needs Attention starts open because it's the first thing to check. */}
      <div className="hub-layout">
        <div className="flex flex-col gap-3">
          <HubAccordionSection
            icon={<IconTriangleAlert className="w-4 h-4" />}
            title="Needs attention"
            subtitle={`${needsAttention.length} client${needsAttention.length === 1 ? "" : "s"} need${needsAttention.length === 1 ? "s" : ""} clearance or action — the first thing to check`}
            color="amber"
            defaultOpen
            viewAllHref={needsAttention.length > 8 ? "/hub/tracker" : undefined}
            viewAllLabel={`View all ${needsAttention.length}`}
          >
            <div className="px-5 pt-4 pb-4">
              {needsAttention.length > 0 ? (
                <div className="space-y-1">
                  {needsAttention.slice(0, 8).map((client) => {
                    const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <Link
                        key={client.id}
                        href={`/hub/clients/${client.client_number}`}
                        className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[var(--hub-hover)] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{client.name}</span>
                        <StatusBadge status={client.compliance_status as string} />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">All clients clear — nothing needs attention.</p>
              )}
            </div>
          </HubAccordionSection>

          <HubAccordionSection
            icon={<IconCheckCircle className="w-4 h-4" />}
            title="Recent check-ins"
            subtitle="Logged sessions across active blocks"
            color="teal"
          >
            {recentCheckIns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Client</th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Programme</th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Logged</th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCheckIns.map((row, i) => {
                      const initials = row.clientName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <tr key={i} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                          <td className="px-5 py-3">
                            <Link href={`/hub/clients/${row.clientNumber}`} className="inline-flex items-center gap-2.5 min-w-0 group">
                              <span className="w-7 h-7 rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] grid place-items-center text-[11px] font-bold shrink-0">{initials}</span>
                              <span className="font-semibold text-foreground group-hover:text-rose transition-colors truncate">{row.clientName}</span>
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{row.programme}</td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{row.loggedLabel}</td>
                          <td className="px-5 py-3">{row.complianceStatus && <StatusBadge status={row.complianceStatus} />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground px-5 pt-4 pb-4">No check-ins logged yet.</p>
            )}
          </HubAccordionSection>

          <HubAccordionSection
            icon={<IconBot className="w-4 h-4" />}
            title="This week's plan"
            subtitle="Generated by the Plan Agent"
            color="navy"
          >
            <div className="px-5 pt-1 pb-2">
              {weekPlan.length > 0 ? (
                <div>
                  {weekPlan.map((entry, i) => (
                    <div key={entry.id} className={`flex gap-3.5 py-3.5 ${i > 0 ? "border-t border-[var(--hub-border)]" : ""}`}>
                      <div className="w-[26px] h-[26px] rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={entry.clientNumber ? `/hub/clients/${entry.clientNumber}` : "#"} className="text-[13.5px] font-semibold text-foreground hover:text-rose transition-colors">
                          {entry.dayLabel} · {entry.clientName}
                          {entry.blockNumber !== null && ` · Block ${entry.blockNumber} · Session ${entry.sessionNumber}`}
                        </Link>
                        {entry.focusLabel && <p className="text-[13px] text-muted-foreground mt-0.5">{entry.focusLabel}</p>}
                        {entry.meta && (
                          <p className={`text-xs mt-1 ${entry.metaDanger ? "text-[var(--status-danger)] font-medium" : "text-muted-foreground"}`}>
                            {entry.meta}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pt-3 pb-4">No sessions scheduled this week yet.</p>
              )}
            </div>
          </HubAccordionSection>

          {updatesDueClients.length > 0 && (
            <HubAccordionSection
              icon={<IconMail className="w-4 h-4" />}
              title="Updates due"
              subtitle="Clients approaching or past their next update deadline — most urgent first"
              color="amber"
              viewAllHref="/hub/reports/updates"
              viewAllLabel={`View all ${updatesDueClients.length}`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Client</th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Interval</th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Last sent</th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Next due</th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10 text-right">Days</th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {updatesDueClients.slice(0, 8).map((row) => {
                      const initials = row.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      const sc = STATUS_COLORS[row.status!];
                      const daysClass = row.status === "overdue" ? "text-[var(--status-danger)]" : row.status === "due_soon" ? "text-[var(--status-warning)]" : "text-foreground";
                      return (
                        <tr key={row.clientId} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                          <td className="px-5 py-3">
                            <Link href={`/hub/clients/${row.clientNumber}`} className="inline-flex items-center gap-2.5 min-w-0 group">
                              <span className="w-7 h-7 rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] grid place-items-center text-[11px] font-bold shrink-0">{initials}</span>
                              <span className="font-semibold text-foreground group-hover:text-rose transition-colors truncate">{row.name}</span>
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{UPDATE_INTERVAL_LABELS[row.interval]}</td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{row.lastSentAt ? new Date(row.lastSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "—"}</td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{row.nextDueDate ? new Date(row.nextDueDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "—"}</td>
                          <td className={`px-5 py-3 text-right font-semibold tabular-nums ${daysClass}`}>
                            {row.daysUntilDue != null ? (row.daysUntilDue < 0 ? `+${Math.abs(row.daysUntilDue)}` : row.daysUntilDue) : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <TokenPill token={sc.token} label={sc.label} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </HubAccordionSection>
          )}

          <HubAccordionSection
            icon={<IconCalendar className="w-4 h-4" />}
            title="Active blocks — next session"
            subtitle="Where each client's programme is right now"
            color="teal"
          >
            <div className="px-5 pt-4 pb-4">
              {nextUpByBlock.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {nextUpByBlock.map(({ block, nextSession, completedCount, totalCount }) => {
                    const clientNumber = (block as any).clients?.client_number;
                    const clientName = (block as any).clients?.name;
                    const initials = (clientName ?? "").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    const href = nextSession
                      ? `/hub/clients/${clientNumber}/blocks/${block.id}/sessions/${nextSession.session_number}`
                      : `/hub/clients/${clientNumber}/blocks/${block.id}`;
                    return (
                      <Link
                        key={block.id}
                        href={href}
                        className="flex items-center gap-3 rounded-[12px] border border-[var(--hub-border)] p-3 transition-all hover:bg-[var(--hub-hover)] hover:border-rose/20 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-rose transition-colors">{clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            Block {block.block_number}
                            {nextSession ? ` · Session ${nextSession.session_number}` : " · All sessions logged"}
                            {totalCount > 0 && ` · ${completedCount}/${totalCount} done`}
                          </p>
                        </div>
                        <IconArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground">
                  <IconCalendar className="w-4 h-4 shrink-0" />
                  <span>No active blocks right now — approve a block to see it here.</span>
                  <Link href="/hub/clients" className="text-rose hover:underline shrink-0 ml-auto">View clients</Link>
                </div>
              )}
            </div>
          </HubAccordionSection>

          <HubAccordionSection
            icon={<IconUsers className="w-4 h-4" />}
            title="Recent clients"
            subtitle="Last five records opened"
            color="slate"
            viewAllHref="/hub/clients"
          >
            <div className="px-5 pt-4 pb-4">
              {clients && clients.length > 0 ? (
                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {clients.slice(0, 6).map((client) => {
                    const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    const sessionsPerWeek = client.profile?.logistics?.frequency
                      ? formatFrequency(client.profile.logistics.frequency)
                      : client.profile?.logistics?.sessions_per_week
                      ? `${client.profile.logistics.sessions_per_week}× per week`
                      : null;
                    const conditions = client.profile?.health?.conditions?.length ?? 0;
                    return (
                      <Link
                        key={client.id}
                        href={`/hub/clients/${client.client_number}`}
                        className="flex items-center gap-3 rounded-[12px] py-2 px-3 transition-colors hover:bg-[var(--hub-hover)] group"
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sessionsPerWeek || "No schedule set"}
                            {conditions > 0 && ` · ${conditions} condition(s)`}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {new Date(client.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No clients yet.</p>
              )}
            </div>
          </HubAccordionSection>
        </div>

        {/* Side rail — non-action content only. Quick Actions moved to the top-left
            bar above; this keeps just Recent Blocks, per hub-dashboard.html's
            side-stack. */}
        <aside className="hub-rail">
          <HubCard padded={false}>
            <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Recent blocks" divider className="px-5 pt-5 pb-3.5" />
            <div className="px-5 pt-5 pb-5">
              {blocks && blocks.length > 0 ? (
                <div className="space-y-2">
                  {blocks.slice(0, 5).map((block) => {
                    const clientName = (block as any).clients?.name ?? "Unknown client";
                    const blockNote = (block as any).block_note;
                    return (
                      <Link
                        key={block.id}
                        href={`/hub/clients/${(block as any).clients?.client_number || block.client_id}/blocks/${block.id}`}
                        className="flex items-center gap-3 rounded-[12px] p-2.5 transition-colors hover:bg-[var(--hub-hover)] group"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-foreground truncate group-hover:text-rose transition-colors">
                            {clientName} — Block {block.block_number}
                          </span>
                          {blockNote && <span className="block text-xs text-muted-foreground truncate">{blockNote}</span>}
                        </span>
                        <StatusBadge status={block.status} />
                        <IconArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No blocks generated yet.</p>
              )}
            </div>
          </HubCard>
        </aside>
      </div>
    </div>
  );
}
