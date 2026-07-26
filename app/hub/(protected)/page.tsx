import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { HubCard, HubCardHeader, HubPageHeader, HubQuickActions } from "@/components/hub";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { KpiTile } from "@/components/hub/KpiTile";
import { HubAlert } from "@/components/hub/HubAlert";
import { IconActivity, IconArrowUpRight, IconCalendar, IconCheckCircle, IconFileText, IconTriangleAlert, IconUserPlus, IconUsers, IconPencil, IconPlus, IconMail } from "@/components/icons";
import type { DBClientComplianceStatus } from "@/types";
import { getQuietHomeTrainingClients } from "@/lib/progress-db";
import { HOME_TRAINING_QUIET_DAYS } from "@/lib/progress";

interface RecentCheckIn {
  clientName: string;
  clientNumber: string | number;
  programme: string;
  loggedLabel: string;
}

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, profile, created_at, client_number, compliance_status")
    .order("created_at", { ascending: false });

  const { data: blocks } = await supabase
    .from("blocks")
    .select("id, client_id, block_number, status, created_at, clients!inner(client_number)")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: activeBlocks } = await supabase
    .from("blocks")
    .select("id, block_number, client_id, clients!inner(client_number, name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const activeBlockIds = (activeBlocks ?? []).map((b) => b.id);
  const { data: activeSessions } = activeBlockIds.length > 0
    ? await supabase
        .from("sessions")
        .select("id, block_id, session_number, data, blocks!inner(block_number, client_id, clients!inner(client_number, name, profile))")
        .in("block_id", activeBlockIds)
        .order("session_number", { ascending: false })
    : { data: [] as any[] };

  const nextUpByBlock = (activeBlocks ?? []).map((block) => {
    const blockSessions = (activeSessions ?? []).filter((s) => s.block_id === block.id);
    const nextSession = blockSessions.find((s) => !s.data?.session_log?.completed_at);
    const completedCount = blockSessions.filter((s) => s.data?.session_log?.completed_at).length;
    return { block, nextSession, completedCount, totalCount: blockSessions.length };
  });

  const totalClients = clients?.length ?? 0;
  const draftBlocks = blocks?.filter((b) => b.status === "draft").length ?? 0;
  const approvedBlocks = blocks?.filter((b) => b.status === "approved" || b.status === "active").length ?? 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newClientsLast30Days = (clients ?? []).filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length;

  const needsAttention = (clients ?? []).filter(
    (c) => c.compliance_status && (c.compliance_status as DBClientComplianceStatus) !== "clear",
  );

  // Lane C — home-training clients with no self-logged sets in the last N days
  // (detection only, Esther-facing; no client-facing nudge is sent from here).
  const quietClients = await getQuietHomeTrainingClients();

  const doNotTrain = needsAttention.filter((c) => c.compliance_status === "do_not_train");
  const pendingReview = needsAttention.filter(
    (c) => c.compliance_status === "pending_medical" || c.compliance_status === "action_needed",
  );

  // Recent check-ins — real logged sessions only (no fabricated trends)
  const recentCheckIns: RecentCheckIn[] = (activeSessions ?? [])
    .filter((s) => s.data?.session_log?.completed_at)
    .slice(0, 5)
    .map((session) => {
      const log = session.data.session_log;
      const client = (session.blocks as any)?.clients;
      const profile = client?.profile;
      const primaryGoal = profile?.goals?.primary
        ? profile.goals.primary.replace("_", " ")
        : null;
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
      };
    });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <HubPageHeader
        title="Dashboard"
        subtitle="Welcome back, Esther — here's what's happening today."
      />

      {/* KPI band */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={<IconUsers className="w-5 h-5" />}
          label="Total Clients"
          value={totalClients}
          statusToken="primary"
          trend={newClientsLast30Days > 0 ? `${newClientsLast30Days} this month` : undefined}
          trendUp={newClientsLast30Days > 0 ? true : undefined}
        />
        <KpiTile icon={<IconFileText className="w-5 h-5" />} label="Draft Blocks" value={draftBlocks} statusToken="neutral" />
        <KpiTile icon={<IconCheckCircle className="w-5 h-5" />} label="Active / Approved" value={approvedBlocks} statusToken="success" />
        <KpiTile icon={<IconActivity className="w-5 h-5" />} label="Total Blocks" value={blocks?.length ?? 0} statusToken="primary" />
      </div>

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

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent check-ins */}
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconCheckCircle className="w-4 h-4" />}
              title="Recent Check-ins"
              color="teal"
              subtitle="Logged sessions across active blocks"
              noBottomPadding
              divider
              className="px-5 pt-5"
            />
            <div className="px-5 pb-5">
              {recentCheckIns.length > 0 ? (
                <div className="overflow-x-auto -mx-5">
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
                            <td className="px-5 py-3"><StatusBadge status="on_track" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No check-ins logged yet.</p>
              )}
            </div>
          </HubCard>

          {/* Needs Attention */}
          <HubCard>
            <HubCardHeader
              icon={<IconTriangleAlert className="w-4 h-4" />}
              title="Needs Attention"
              color="amber"
              action={
                needsAttention.length > 8 ? (
                  <Link href="/hub/tracker" className="text-sm text-rose hover:underline">
                    View all {needsAttention.length}
                  </Link>
                ) : undefined
              }
              noBottomPadding
            />
            <div className="px-5 pb-5">
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
                        <div className="w-8 h-8 rounded-full bg-rose/15 text-rose flex items-center justify-center text-xs font-bold shrink-0">
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
          </HubCard>

          {/* Active Blocks — next session widget */}
          <HubCard>
            <HubCardHeader icon={<IconCalendar className="w-4 h-4" />} title="Active Blocks — Next Session" noBottomPadding />
            <div className="px-5 pb-5">
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
                        className="flex items-center gap-3 rounded-xl border border-[var(--hub-border)] p-3 transition-all hover:bg-[var(--hub-hover)] hover:border-rose/20 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-rose/15 text-rose flex items-center justify-center text-xs font-bold shrink-0">
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
          </HubCard>

          {/* Recent Clients */}
          <HubCard>
            <HubCardHeader
              icon={<IconUsers className="w-4 h-4" />}
              title="Recent Clients"
              action={<Link href="/hub/clients" className="text-sm text-rose hover:underline inline-flex items-center gap-1">View all <IconArrowUpRight className="w-3 h-3" /></Link>}
              noBottomPadding
            />
            <div className="px-5 pb-5">
              {clients && clients.length > 0 ? (
                <div className="space-y-1">
                  {clients.slice(0, 5).map((client) => {
                    const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    const sessionsPerWeek = client.profile?.logistics?.sessions_per_week;
                    const conditions = client.profile?.health?.conditions?.length ?? 0;
                    return (
                      <Link
                        key={client.id}
                        href={`/hub/clients/${client.client_number}`}
                        className="flex items-center gap-3 rounded-xl py-2 px-3 transition-colors hover:bg-[var(--hub-hover)] group"
                      >
                        <div className="w-9 h-9 rounded-full bg-rose/15 text-rose flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sessionsPerWeek ? `${sessionsPerWeek}x / week` : "No schedule set"}
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
          </HubCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent Blocks */}
          <HubCard>
            <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Recent Blocks" noBottomPadding />
            <div className="px-5 pb-5">
              {blocks && blocks.length > 0 ? (
                <div className="space-y-2">
                  {blocks.slice(0, 5).map((block) => (
                    <Link
                      key={block.id}
                      href={`/hub/clients/${(block as any).clients?.client_number || block.client_id}/blocks/${block.id}`}
                      className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[var(--hub-hover)] group"
                    >
                      <span className="flex-1 text-sm font-medium text-foreground">Block {block.block_number}</span>
                      <StatusBadge status={block.status} />
                      <IconArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No blocks generated yet.</p>
              )}
            </div>
          </HubCard>

          {/* Quick Actions */}
          <HubCard>
            <HubCardHeader icon={<IconActivity className="w-4 h-4" />} title="Quick Actions" color="navy" noBottomPadding />
            <div className="px-5 pb-5">
              <HubQuickActions actions={[
                { href: "/hub/clients/new", label: "Add a new client", icon: <IconUserPlus className="w-4 h-4" /> },
                { href: "/hub/exercises", label: "Browse exercise library", icon: <IconFileText className="w-4 h-4" /> },
                { href: "/hub/clients", label: "View all clients", icon: <IconUsers className="w-4 h-4" /> },
              ]} />
            </div>
          </HubCard>
        </div>
      </div>
    </div>
  );
}
