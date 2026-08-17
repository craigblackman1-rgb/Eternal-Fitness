import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { IconChevronLeft, IconClipboardList, IconClipboardCheck, IconFileText, IconHeart, IconMail, IconPencil, IconPlus, IconTarget, IconTriangleAlert, IconDumbbell, IconEdit3, IconAlertCircle, IconLayoutDashboard, IconUser, IconBot, IconCheckSquare, IconActivity, IconPanelLeft, IconCalendar, IconBarChart3 } from "@/components/icons";
import { computeUpdateDue } from "@/lib/updates-due";
import { UpdateIntervalControl } from "./UpdateIntervalControl";
import { ClientTasksPanel } from "./ClientTasksPanel";
import { EmptyState } from "@/components/hub/EmptyState";
import { HubCard, HubCardHeader, HubSection, HubDataGrid, HubDataField, HubQuickActions, HubTabsList, HubTabsTrigger, TrainerizeHistoryPanel } from "@/components/hub";
import type { TrainerizeHistoryData } from "@/components/hub";
import { StatusBadge, TokenPill } from "@/components/hub/StatusBadge";
import { HubAlert } from "@/components/hub/HubAlert";
import { lookupStatus, type StatusToken } from "@/lib/hubStatus";
import { computeComplianceFlags } from "@/lib/compliance";
import type { DBClientGroupType, DBClientPaceMode } from "@/types";
import { PlanAgentTab } from "./PlanAgentTab";
import { ClientDetailTabs } from "./ClientDetailTabs";
import { GpLetterCard } from "@/components/hub/GpLetterCard";
import { DocumentRegister } from "@/components/hub/DocumentRegister";
import { ClinicalComplianceCard } from "@/components/hub/ClinicalComplianceCard";
import { PackagePaymentsCard } from "@/components/hub/PackagePaymentsCard";
import { ClientUpdatesPanel } from "@/components/hub/ClientUpdatesPanel";
import { PortalAccountCard } from "./PortalAccountCard";
import type { SentUpdate, SetLog } from "@/types";
import { ExerciseTrendsPanel } from "@/components/progress/ExerciseTrendsPanel";
import { ExerciseHistoryPanel } from "@/components/progress/ExerciseHistoryPanel";
import { buildExerciseTrends, isGoneQuiet, HOME_TRAINING_QUIET_DAYS, type TrendSessionMeta } from "@/lib/progress";
import { buildExerciseHistory } from "@/lib/exercise-history";
import { getLastClientLogAt } from "@/lib/progress-db";
import { trainerizeResultsToSetLogs } from "@/lib/trainerize-adapter";
import { RESOURCES } from "@/lib/resources";
import { ContextStrip } from "./ContextStrip";
import { TrainingTabContent } from "./TrainingTabContent";
import { CommsTabContent } from "./CommsTabContent";

function YesNoPill({ yes }: { yes: boolean }) {
  return <TokenPill token={yes ? "success" : "danger"} label={yes ? "Yes" : "No"} />;
}

function GroupTypeLabel({ groupType }: { groupType: DBClientGroupType | null }) {
  if (!groupType) return null;
  return groupType === 'individual_journey' ? 'Individual Journey' : 'Calendar Block';
}

function PaceModeDisplay({ paceMode }: { paceMode: DBClientPaceMode | null }) {
  if (!paceMode) return null;
  const label = paceMode === 'fast' ? 'Fast pace' : paceMode === 'medium' ? 'Medium pace' : 'Slow pace';
  const exerciseCount = paceMode === 'fast' ? '~10 exercises per session' : paceMode === 'medium' ? '~8 exercises per session' : '~5–6 exercises per session';
  return <span>{label} — {exerciseCount}</span>;
}

function OutstandingActionsInline({ actions }: { actions: string[] | null }) {
  if (!actions || actions.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-0.5">
      {actions.map((action, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <IconTriangleAlert className="w-[15px] h-[15px] shrink-0" />
          <span>{action}</span>
        </li>
      ))}
    </ul>
  );
}

function TabCountBadge({ count, tone }: { count: number; tone: "danger" | "warning" }) {
  const classes = tone === "danger"
    ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border)]"
    : "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]";
  return (
    <span className={`inline-grid place-items-center min-w-[18px] h-[18px] px-[5px] rounded-full border text-[11px] font-bold leading-none tabular-nums ${classes}`}>
      {count}
    </span>
  );
}

function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--hub-canvas)] border border-[var(--hub-border)] px-2 py-0.5 text-xs text-[var(--color-body)]">
      {children}
    </span>
  );
}

function formatDeliveryMode(mode: string | null): string {
  if (!mode) return "—";
  return mode === "studio_1to1" ? "Studio 1-to-1" : mode === "home_training" ? "Home Training" : mode;
}

function formatPaceMode(mode: string | null): string {
  if (!mode) return "—";
  return mode === "fast" ? "Fast" : mode === "medium" ? "Medium" : "Slow";
}

function formatSessionDuration(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return "—";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${minutes}min`;
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: client } = await supabase.from("clients").select("*, compliance_status, outstanding_actions, group_type, pace_mode, resource_visibility").eq("client_number", parseInt(params.id)).single();

  if (!client) notFound();

  const resourceVisibility: Record<string, boolean> = (client as any).resource_visibility ?? {};

  const { data: parqs } = await supabase.from("signed_parq").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
  const { data: agreements } = await supabase.from("signed_agreements").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
  const { data: clientDocuments } = await supabase.from("client_documents").select("id, kind, title, status, version, created_at, updated_at, client_name, trainer_name, client_signature, trainer_signature, requires_trainer_signature, emailed, source_type, consent_choices").eq("client_id", client.id).order("created_at", { ascending: false });

  const latestParq = parqs?.[0] ?? null;
  const latestAgreement = agreements?.[0] ?? null;

  const { data: blocks } = await supabase.from("blocks").select("*").eq("client_id", client.id).order("block_number", { ascending: false });
  const clientBlockIds = (blocks ?? []).map((b) => b.id);
  // Ordered by scheduled_at (a real column the pg shim can sort on) rather than
  // session_number, which repeats per block and used to interleave block 1's
  // session 12 with block 3's session 12 (CR-EF-027). completed_at lives inside
  // the `data` JSONB and isn't sortable at the DB level — TrainingTabContent
  // re-sorts client-side by completed-or-scheduled date, and independently by
  // session number, once the rows are in memory.
  const { data: sessions } = clientBlockIds.length > 0
    ? await supabase
        .from("sessions")
        .select(`*, blocks!inner(block_number, client_id)`)
        .in("block_id", clientBlockIds)
        .order("scheduled_at", { ascending: false })
        .limit(50)
    : { data: [] as any[] };

  const { data: trainerizeBlocks } = await supabase.from("trainerize_training_blocks").select("*").eq("client_id", client.id).order("start_date", { ascending: false });
  const tBlockIds = (trainerizeBlocks ?? []).map((b: any) => b.id);
  const { data: trainerizeWorkouts } = tBlockIds.length > 0
    ? await supabase.from("trainerize_workouts").select("*").in("trainerize_block_id", tBlockIds).order("workout_index", { ascending: true })
    : { data: [] };
  const workoutIds = (trainerizeWorkouts ?? []).map((w: any) => w.id);
  const { data: trainerizeExercises } = workoutIds.length > 0
    ? await supabase.from("trainerize_exercises").select("*").in("trainerize_workout_id", workoutIds).order("exercise_order", { ascending: true })
    : { data: [] };
  const { data: trainerizeNotes } = await supabase.from("trainerize_client_notes").select("*").eq("client_id", client.id).order("source_date", { ascending: false });
  const { data: workoutResults } = await supabase.from("trainerize_workout_results").select("*").eq("client_id", client.id).order("performed_date", { ascending: false });

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: setLogs } = sessionIds.length > 0
    ? await supabase.from("set_logs").select("*").in("session_id", sessionIds).order("logged_at", { ascending: true })
    : { data: [] as SetLog[] };
  const trendSessionMeta: Record<string, TrendSessionMeta> = {};
  for (const s of sessions ?? []) {
    trendSessionMeta[s.id] = {
      blockNumber: (s as any).blocks?.block_number ?? null,
      sessionNumber: s.session_number ?? null,
    };
  }
  const combinedSetLogs: SetLog[] = [
    ...((setLogs ?? []) as SetLog[]),
    ...trainerizeResultsToSetLogs((workoutResults ?? []) as any),
  ];
  const exerciseTrends = buildExerciseTrends(combinedSetLogs, trendSessionMeta);
  const exerciseHistory = buildExerciseHistory(combinedSetLogs);

  const isHomeTraining = client.delivery_mode === "home_training";
  const lastClientLogAt = isHomeTraining ? await getLastClientLogAt(client.id) : null;
  const goneQuiet = isHomeTraining && isGoneQuiet(lastClientLogAt);

  const { data: clientUpdates } = await supabase.from("sent_updates").select("*").eq("client_id", client.id).order("created_at", { ascending: false });

  const composeHistoryData = (): TrainerizeHistoryData => {
    const workoutsByBlock: Record<string, any[]> = {};
    for (const w of (trainerizeWorkouts ?? [])) {
      const bId = w.trainerize_block_id;
      if (!workoutsByBlock[bId]) workoutsByBlock[bId] = [];
      const exs = (trainerizeExercises ?? []).filter((ex: any) => ex.trainerize_workout_id === w.id);
      workoutsByBlock[bId].push({ ...w, exercises: exs.map((ex: any) => ({ ...ex, targetDetail: ex.raw_data?.targetDetail })) });
    }
    const tBlocks = (trainerizeBlocks ?? []).map((b: any) => ({
      ...b,
      workouts: workoutsByBlock[b.id] || [],
    }));
    return {
      blocks: tBlocks,
      notes: trainerizeNotes ?? [],
    };
  };
  const trainerizeHistory = composeHistoryData();

  const lastSentAt =
    (clientUpdates ?? [])
      .filter((u) => u.status === "sent" && u.sent_at)
      .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime())[0]
      ?.sent_at ?? null;
  const dueInfo = computeUpdateDue(
    (client.update_interval as import("@/lib/updates-due").UpdateInterval) ?? null,
    lastSentAt,
    {
      weeks: (client as any).update_interval_weeks ?? null,
      fixedDate: (client as any).update_interval_next_date ?? null,
    },
  );
  const { data: ruleTypes } = await supabase.from("training_rule_types").select("id, label, bucket");
  const ruleTypesById = new Map((ruleTypes ?? []).map((rt) => [rt.id, rt]));

  const p = client.profile;
  const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const latestBlock = blocks && blocks.length > 0
    ? blocks.find((b) => b.status === "active") ?? blocks.find((b) => b.status === "approved") ?? blocks[0]
    : null;
  // Most-recently-*completed* session, found by completed_at rather than by
  // taking sessions[0] — array order now follows scheduled_at (see the query
  // above), so an upcoming future session could otherwise sort first and this
  // would silently pick up a session with no log at all.
  const completedSessions = (sessions ?? []).filter((s: any) => s.data?.session_log?.completed_at);
  const latestSessionLog = completedSessions.length > 0
    ? completedSessions.reduce((latest: any, s: any) =>
        new Date(s.data.session_log.completed_at) > new Date(latest.data.session_log.completed_at) ? s : latest,
      ).data.session_log
    : null;

  const blockSessionCounts: Record<number, number> = {};
  for (const s of sessions ?? []) {
    const bn = (s as any).blocks?.block_number;
    if (bn != null) blockSessionCounts[bn] = (blockSessionCounts[bn] ?? 0) + 1;
  }

  const hasSignedParqDocument = (clientDocuments ?? []).some((d) => d.kind === "parq" && d.status === "signed");
  const hasSignedAgreementDocument = (clientDocuments ?? []).some((d) => d.kind === "terms" && d.status === "signed");
  const flags = computeComplianceFlags({
    client,
    latestParq: latestParq ?? null,
    latestAgreement: latestAgreement ?? null,
    hasSignedParqDocument,
    hasSignedAgreementDocument,
  });

  // CR-EF-026: when compliance is satisfied entirely through a legacy
  // signed_parq/signed_agreements row (pre-dating the document engine) with
  // no corresponding signed client_documents row, the Document Register
  // used to show nothing for that document kind at all — reading as "not
  // signed" even though compliance was quietly fine. Surface it as a
  // read-only row so what's satisfying compliance is visible on the same
  // screen someone would check.
  const legacyDocumentRows = [
    !hasSignedParqDocument && latestParq
      ? {
          id: `legacy-parq-${latestParq.id}`,
          kind: "parq",
          title: "PAR-Q (legacy record)",
          status: "signed",
          version: 1,
          created_at: latestParq.created_at,
          legacy: true as const,
        }
      : null,
    !hasSignedAgreementDocument && latestAgreement?.status === "signed"
      ? {
          id: `legacy-agreement-${latestAgreement.id}`,
          kind: "terms",
          title: "Personal Training Agreement (legacy record)",
          status: "signed",
          version: 1,
          created_at: latestAgreement.created_at,
          legacy: true as const,
        }
      : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);
  const complianceLookup = lookupStatus(flags.effectiveStatus);
  const gpClearance = p?.health?.gp_clearance;
  const manualActions = client.outstanding_actions ?? [];
  const outstandingCount = flags.autoOutstanding.length + manualActions.length;
  const draftUpdatesCount = (clientUpdates ?? []).filter((u) => u.status === "draft").length;

  const { data: taskRows } = await supabase.from("tasks").select("status").eq("client_id", client.id);
  const pendingTaskCount = (taskRows ?? []).filter((t: any) => t.status !== "done").length;

  const contextItems = [
    { label: "Format", value: formatDeliveryMode(client.delivery_mode) },
    { label: "Pace", value: formatPaceMode(client.pace_mode) },
    { label: "Session", value: formatSessionDuration(client.session_duration ?? null) },
    { label: "Frequency", value: p?.logistics?.sessions_per_week ? `${p.logistics.sessions_per_week}× per week` : "—" },
    { label: "Package", value: client.package_type ?? "—" },
    { label: "Next update", value: dueInfo.nextDueDate ? new Date(dueInfo.nextDueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—" },
  ];

  const rightRail = (
    <div className="space-y-5">
      <HubCard>
        <HubCardHeader icon={<IconClipboardCheck className="w-4 h-4" />} title="Status" color="slate" />
        <div className="pb-5 space-y-0">
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted-foreground">Compliance</span>
            {complianceLookup ? <StatusBadge status={flags.effectiveStatus} /> : <span className="text-muted-foreground">—</span>}
          </div>
          <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--hub-border)]">
            <span className="text-muted-foreground">GP Clearance</span>
            {p?.health ? <YesNoPill yes={gpClearance} /> : <span className="text-muted-foreground">—</span>}
          </div>
          <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--hub-border)]">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="font-medium text-foreground">{outstandingCount}</span>
          </div>
        </div>
      </HubCard>

      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Active Block" color="slate" />
        <div className="pb-5">
          {latestBlock ? (
            <Link href={`/hub/clients/${client.client_number}/blocks/${latestBlock.id}`} className="flex items-center justify-between group py-1">
              <div>
                <p className="font-semibold text-sm text-foreground group-hover:text-rose transition-colors">Block {latestBlock.block_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(latestBlock.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <StatusBadge status={latestBlock.status} />
            </Link>
          ) : (
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-muted-foreground">No blocks yet</span>
              <Link href={`/hub/clients/${client.client_number}?tab=plan-agent`} className="text-rose font-medium hover:underline">Create Block</Link>
            </div>
          )}
        </div>
      </HubCard>

      <HubCard>
        <HubCardHeader icon={<IconTarget className="w-4 h-4" />} title="Quick Actions" color="amber" />
        <div className="pb-5">
          <HubQuickActions divider actions={[
            { href: `/hub/clients/${client.client_number}?tab=training&view=sessions`, label: "New Session", icon: <IconCalendar className="w-4 h-4" /> },
            { href: `/hub/clients/${client.client_number}?tab=plan-agent`, label: "Plan Block", icon: <IconFileText className="w-4 h-4" /> },
            { href: `/hub/clients/${client.client_number}?tab=comms&view=updates`, label: "Send Update", icon: <IconMail className="w-4 h-4" /> },
            { href: `/hub/clients/${client.client_number}/documents`, label: "View Documents", icon: <IconFileText className="w-4 h-4" /> },
            { href: `/hub/clients/${client.client_number}/edit`, label: "Edit Client", icon: <IconPencil className="w-4 h-4" /> },
          ]} />
        </div>
      </HubCard>

      <HubCard>
        <HubCardHeader icon={<IconPanelLeft className="w-4 h-4" />} title="Resources" action={<span className="text-xs text-muted-foreground">Portal access</span>} color="teal" />
        <div className="pb-5">
          <div className="space-y-0">
            {RESOURCES.map((r) => (
              <div key={r.key} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">{r.name}</span>
                <TokenPill token={resourceVisibility[r.key] ? "success" : "neutral"} label={resourceVisibility[r.key] ? "Enabled" : "Disabled"} />
              </div>
            ))}
          </div>
          <div className="flex gap-3.5 pt-2.5">
            <Link href="/hub/resources" className="text-[12.5px] font-semibold text-teal hover:underline">View all clients →</Link>
            <Link href={`/hub/clients/${client.client_number}/edit`} className="text-[12.5px] font-semibold text-muted-foreground hover:underline">Manage in Edit</Link>
          </div>
        </div>
      </HubCard>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hub/clients" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-1 py-0.5 -ml-1 mb-3 transition-colors">
          <IconChevronLeft className="h-3.5 w-3.5" />
          All clients
        </Link>
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-full bg-rose/15 text-rose flex items-center justify-center text-base font-bold shrink-0" aria-hidden="true">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="text-[26px] font-bold tracking-tight text-foreground inline-flex items-center gap-2.5 flex-wrap">
                  {client.name}
                  <span className="text-xs font-medium text-muted-foreground bg-[var(--hub-canvas)] border border-[var(--hub-border)] rounded-md px-1.5 py-0.5">
                    #{client.client_number}
                  </span>
                  {complianceLookup && <StatusBadge status={flags.effectiveStatus} />}
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/hub/clients/${client.client_number}/edit`}>
                  <Button variant="outline" className="border border-[var(--color-muted-text)] rounded-lg px-3.5 py-1.5 h-auto text-sm font-medium hover:bg-[var(--hub-hover)] gap-1.5">
                    <IconPencil className="h-4 w-4" /> Edit
                  </Button>
                </Link>
                <Link href={`/hub/clients/${client.client_number}?tab=plan-agent`}>
                  <Button className="bg-rose hover:bg-rose/90 text-white rounded-lg px-3.5 py-1.5 h-auto text-sm font-semibold gap-1.5">
                    <IconPlus className="h-4 w-4" /> Plan Block
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {flags.effectiveStatus === "do_not_train" && (
        <HubAlert severity="danger" title="Do Not Train">
          Outstanding paperwork must be resolved before any further sessions.
          <OutstandingActionsInline actions={flags.autoOutstanding} />
          <OutstandingActionsInline actions={manualActions} />
        </HubAlert>
      )}
      {(flags.effectiveStatus === "pending_medical" || flags.effectiveStatus === "action_needed") && (
        <HubAlert severity="warning" title={lookupStatus(flags.effectiveStatus)?.label ?? "Action Needed"}>
          {flags.effectiveStatus === "pending_medical"
            ? "Do not train until clearance is confirmed."
            : "Actions outstanding — see Admin tab."}
          <OutstandingActionsInline actions={flags.autoOutstanding} />
          <OutstandingActionsInline actions={manualActions} />
        </HubAlert>
      )}
      {goneQuiet && (
        <HubAlert severity="warning" title="Home-training client gone quiet">
          No self-logged sets in the last {HOME_TRAINING_QUIET_DAYS} days
          {lastClientLogAt
            ? ` — last logged ${new Date(lastClientLogAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
            : " — no sets logged yet."}{" "}
          Worth checking in with {client.name.split(" ")[0]}.
        </HubAlert>
      )}

      <ContextStrip items={contextItems} />

      <ClientDetailTabs>
        <HubTabsList>
          <HubTabsTrigger value="overview">
            <IconLayoutDashboard /> Overview
          </HubTabsTrigger>
          <HubTabsTrigger value="profile">
            <IconUser /> Profile
          </HubTabsTrigger>
          <HubTabsTrigger value="admin">
            <IconClipboardCheck /> Admin
            {outstandingCount > 0 && <TabCountBadge count={outstandingCount} tone={flags.effectiveStatus === "do_not_train" ? "danger" : "warning"} />}
          </HubTabsTrigger>
          <HubTabsTrigger value="training">
            <IconDumbbell /> Training
          </HubTabsTrigger>
          <HubTabsTrigger value="comms">
            <IconCheckSquare /> Comms
            {pendingTaskCount > 0 && <TabCountBadge count={pendingTaskCount} tone="warning" />}
          </HubTabsTrigger>
          <HubTabsTrigger value="plan-agent">
            <IconBot /> Plan Agent
          </HubTabsTrigger>
        </HubTabsList>

        <div className="grid gap-5 lg:grid-cols-12 mt-6">
          <div className="lg:col-span-8 space-y-5">
            <TabsContent value="overview">
              <HubCard>
                <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Active Block" color="teal" />
                <div className="pb-5">
                  {latestBlock ? (
                    <HubDataGrid cols={3}>
                      <HubDataField label="Block">
                        <Link href={`/hub/clients/${client.client_number}/blocks/${latestBlock.id}`} className="font-semibold text-foreground hover:text-rose transition-colors">
                          Block {latestBlock.block_number}
                        </Link>
                      </HubDataField>
                      <HubDataField label="Started">{new Date(latestBlock.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</HubDataField>
                      <HubDataField label="Progress">{blockSessionCounts[latestBlock.block_number] ?? 0} sessions</HubDataField>
                    </HubDataGrid>
                  ) : (
                    <div className="flex items-center justify-between py-1 text-sm">
                      <span className="text-muted-foreground">No blocks yet</span>
                      <Link href={`/hub/clients/${client.client_number}?tab=plan-agent`} className="text-rose font-medium hover:underline">Create Block</Link>
                    </div>
                  )}
                </div>
              </HubCard>

              <HubCard>
                <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Last Session" color="slate" />
                <div className="pb-5">
                  {latestSessionLog ? (
                    <HubDataGrid cols={3}>
                      <HubDataField label="Completed">
                        {new Date(latestSessionLog.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </HubDataField>
                      <HubDataField label="Duration">{formatSessionDuration(client.session_duration ?? null)}</HubDataField>
                      <HubDataField label="Format">{formatDeliveryMode(client.delivery_mode)}</HubDataField>
                      {latestSessionLog.notes && (
                        <HubDataField label="Notes" span>{latestSessionLog.notes}</HubDataField>
                      )}
                    </HubDataGrid>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
                  )}
                </div>
              </HubCard>

              <HubCard>
                <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Snapshot" color="navy" />
                <div className="pb-5">
                  <HubDataGrid cols={2}>
                    {client.referral_source && (
                      <HubDataField label="Referral source">{client.referral_source}</HubDataField>
                    )}
                    <HubDataField label="Primary goal"><span className="capitalize">{p?.goals?.primary?.replace("_", " ") ?? "—"}</span></HubDataField>
                    <HubDataField label="Sessions per week">{p?.logistics?.sessions_per_week ? `${p.logistics.sessions_per_week}×` : "—"}</HubDataField>
                    <HubDataField label="Session length"><span className="capitalize">{p?.logistics?.time_tier ?? "—"}</span></HubDataField>
                    {p?.health?.conditions && (
                      <HubDataField label="Conditions recorded">{p.health.conditions.length}</HubDataField>
                    )}
                    <HubDataField label="Package">{p?.logistics?.package ?? "—"}</HubDataField>
                    <HubDataField label="Last check-in">
                      {latestSessionLog?.completed_at
                        ? new Date(latestSessionLog.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </HubDataField>
                  </HubDataGrid>
                  <UpdateIntervalControl
                    clientNumber={client.client_number}
                    updateInterval={(client.update_interval as import("@/lib/updates-due").UpdateInterval) ?? null}
                    updateIntervalWeeks={(client as any).update_interval_weeks ?? null}
                    updateIntervalNextDate={(client as any).update_interval_next_date ?? null}
                    dueInfo={dueInfo}
                  />
                </div>
              </HubCard>

              <HubCard>
                <HubCardHeader icon={<IconDumbbell className="w-4 h-4" />} title="Training Snapshot" color="teal" />
                <div className="pb-5">
                  <HubDataGrid cols={2}>
                    <HubDataField label="Blocks completed">{blocks?.length ?? 0}</HubDataField>
                    <HubDataField label="Current block">
                      {latestBlock ? (
                        <Link href={`/hub/clients/${client.client_number}/blocks/${latestBlock.id}`} className="font-semibold text-foreground hover:text-rose transition-colors">
                          Block {latestBlock.block_number}
                        </Link>
                      ) : "—"}
                    </HubDataField>
                    <HubDataField label="Sessions logged">{sessions?.length ?? 0}</HubDataField>
                    <HubDataField label="Pace mode"><span className="capitalize">{client.pace_mode ?? "—"}</span></HubDataField>
                    <HubDataField label="Last session">
                      {latestSessionLog?.completed_at
                        ? new Date(latestSessionLog.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </HubDataField>
                  </HubDataGrid>
                </div>
              </HubCard>

              {p?.programming_adaptations?.some((rule: { severity: string }) => rule.severity === "hard") && (
                <HubCard>
                  <HubCardHeader icon={<IconAlertCircle className="w-4 h-4" />} title="Active Training Rules" color="amber" subtitle="Applied to every generated block" />
                  <div className="pb-5">
                    <ul className="list-none space-y-2">
                      {p!.programming_adaptations
                        .filter((rule: { severity: string }) => rule.severity === "hard")
                        .map((rule: { id: string; rule_type_id: string; detail: string }) => {
                          const ruleType = ruleTypesById.get(rule.rule_type_id);
                          return (
                            <li key={rule.id} className="flex items-start gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-2 shrink-0" />
                              <span className="text-foreground">
                                {rule.detail}
                                {ruleType && <span className="text-muted-foreground"> — {ruleType.label}</span>}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                </HubCard>
              )}
            </TabsContent>

            <TabsContent value="profile">
              <div className="grid gap-6 sm:grid-cols-2 items-start">
                <HubCard className="sm:col-span-2">
                  <HubCardHeader icon={<IconMail className="w-4 h-4" />} title="Client Portal" color="slate" />
                  <PortalAccountCard
                    clientNumber={client.client_number}
                    hasEmail={!!client.email}
                  />
                </HubCard>
                {p?.health && (
                  <HubCard className="sm:col-span-2">
                    <HubCardHeader
                      icon={<IconHeart className="w-4 h-4" />}
                      title="Health"
                      color="rose"
                      action={complianceLookup ? <StatusBadge status={flags.effectiveStatus} /> : undefined}
                    />
                    <div className="pb-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">GP Clearance</span>
                        <YesNoPill yes={!!p.health.gp_clearance} />
                      </div>
                      {client.referral_source && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Referral route</span>
                          <span className="text-sm font-medium text-foreground">{client.referral_source}</span>
                        </div>
                      )}
                      <HubDataGrid cols={2}>
                        {p.health.conditions?.length > 0 && (
                          <HubDataField label="Conditions">
                            <div className="flex flex-wrap gap-1.5">{p.health.conditions.map((item, i) => <TagChip key={i}>{item}</TagChip>)}</div>
                          </HubDataField>
                        )}
                        {p.health.medications_relevant?.length > 0 && (
                          <HubDataField label="Relevant Medications">
                            <div className="flex flex-wrap gap-1.5">{p.health.medications_relevant.map((item, i) => <TagChip key={i}>{item}</TagChip>)}</div>
                          </HubDataField>
                        )}
                        {p.health.pain_points?.length > 0 && (
                          <HubDataField label="Pain Points" span>
                            <div className="flex flex-wrap gap-1.5">{p.health.pain_points.map((item, i) => <TagChip key={i}>{item}</TagChip>)}</div>
                          </HubDataField>
                        )}
                        {p.health.contraindications?.length > 0 && (
                          <HubDataField label="Contraindications" span>
                            <div className="flex flex-wrap gap-1.5">{p.health.contraindications.map((item, i) => <TagChip key={i}>{item}</TagChip>)}</div>
                          </HubDataField>
                        )}
                      </HubDataGrid>
                      {p.health.injury_history?.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1.5">Injury History</span>
                          <div className="overflow-x-auto rounded-lg border border-[var(--hub-border)]">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                  <th className="px-3 py-1.5 text-left font-medium">Date</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Description</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Body Area</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.health.injury_history.map((injury: { id: string; date: string | null; description: string; body_area: string; status: string }) => (
                                  <tr key={injury.id} className="border-b border-[var(--hub-border)] last:border-0">
                                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                                      {injury.date ? new Date(injury.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                    </td>
                                    <td className="px-3 py-1.5 text-foreground">{injury.description || "—"}</td>
                                    <td className="px-3 py-1.5 text-foreground">{injury.body_area || "—"}</td>
                                    <td className="px-3 py-1.5">
                                      <Badge variant={injury.status === "active" ? "destructive" : injury.status === "monitoring" ? "secondary" : "default"} className="rounded-full capitalize text-xs">
                                        {injury.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </HubCard>
                )}

                {p?.physical_baseline && (
                  <HubCard>
                    <HubCardHeader icon={<IconDumbbell className="w-4 h-4" />} title="Physical Baseline" color="teal" />
                    <div className="pb-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Fitness Level</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span
                              key={n}
                              className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                                n <= (p.physical_baseline.fitness_level ?? 0)
                                  ? "bg-rose text-white"
                                  : "bg-border/40 text-muted-foreground"
                              }`}
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                      <HubDataGrid cols={2}>
                        <HubDataField label="Lower Body"><span className="capitalize">{p.physical_baseline.strength_baseline?.lower_body ?? "—"}</span></HubDataField>
                        <HubDataField label="Upper Body"><span className="capitalize">{p.physical_baseline.strength_baseline?.upper_body ?? "—"}</span></HubDataField>
                        <HubDataField label="Core" span><span className="capitalize">{p.physical_baseline.strength_baseline?.core ?? "—"}</span></HubDataField>
                      </HubDataGrid>
                      {p.physical_baseline.movement_quality_flags?.length > 0 && (
                        <ul className="list-none space-y-1">
                          {p.physical_baseline.movement_quality_flags.map((flag, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <IconTriangleAlert className="w-[15px] h-[15px] text-amber-500 mt-0.5 shrink-0" />
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </HubCard>
                )}

                {p?.goals && (
                  <HubCard>
                    <HubCardHeader icon={<IconTarget className="w-4 h-4" />} title="Goals" color="rose" />
                    <div className="pb-5">
                      <HubDataGrid cols={2}>
                        <HubDataField label="Primary"><span className="capitalize">{p.goals.primary?.replace("_", " ") ?? "—"}</span></HubDataField>
                        {p.goals.secondary?.length > 0 && (
                          <HubDataField label="Secondary">
                            <div className="flex flex-wrap gap-1.5">{p.goals.secondary.map((item, i) => <TagChip key={i}>{item}</TagChip>)}</div>
                          </HubDataField>
                        )}
                      </HubDataGrid>
                      {p.goals.milestones?.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs text-muted-foreground block mb-1">Milestones</span>
                          <ul className="list-none space-y-1">
                            {p.goals.milestones.map((m, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose/50 mt-1.5 shrink-0" />
                                {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </HubCard>
                )}

                {p?.logistics && (
                  <HubCard>
                    <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Logistics" color="navy" />
                    <div className="pb-5">
                      <HubDataGrid cols={2}>
                        <HubDataField label="Location"><span className="capitalize">{p.logistics.training_location?.replace("_", " ") ?? "—"}</span></HubDataField>
                        <HubDataField label="Sessions/week">{p.logistics.sessions_per_week ?? "—"}x</HubDataField>
                        <HubDataField label="Time tier"><span className="capitalize">{p.logistics.time_tier ?? "—"}</span></HubDataField>
                        <HubDataField label="Package">{p.logistics.package ?? "—"}</HubDataField>
                        <HubDataField label="Pace mode"><PaceModeDisplay paceMode={client.pace_mode} /></HubDataField>
                        <HubDataField label="Group type"><GroupTypeLabel groupType={client.group_type} /></HubDataField>
                    </HubDataGrid>
                  </div>
                  </HubCard>
                )}

                {(p?.notes?.esther_observations || p?.notes?.motivation_notes || p?.notes?.watch_for) && (
                  <HubCard>
                    <HubCardHeader icon={<IconEdit3 className="w-4 h-4" />} title="Notes" color="slate" />
                    <div className="pb-5 space-y-3">
                      {p.notes.esther_observations && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">Observations</span>
                          <p className="text-foreground text-sm">{p.notes.esther_observations}</p>
                        </div>
                      )}
                      {p.notes.motivation_notes && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">Motivation</span>
                          <p className="text-foreground text-sm">{p.notes.motivation_notes}</p>
                        </div>
                      )}
                      {p.notes.watch_for && (
                        <div className="mt-1 p-3 rounded-lg bg-rose/5 border border-rose/10">
                          <span className="text-rose font-semibold text-xs uppercase tracking-wide">Watch for</span>
                          <p className="text-rose/80 mt-1 text-sm">{p.notes.watch_for}</p>
                        </div>
                      )}
                    </div>
                  </HubCard>
                )}

                {p?.programming_adaptations && p.programming_adaptations.length > 0 && (
                  <HubCard className="sm:col-span-2">
                    <HubCardHeader
                      icon={<IconAlertCircle className="w-4 h-4" />}
                      title="Active Training Rules"
                      color="amber"
                      action={<span className="text-xs text-muted-foreground">Applied to every generated block</span>}
                    />
                    <div className="pb-5">
                      <ul className="list-none divide-y divide-[var(--hub-border)]">
                        {p.programming_adaptations.map((rule) => {
                          const ruleType = ruleTypesById.get(rule.rule_type_id);
                          return (
                            <li key={rule.id} className="flex items-start gap-2 text-sm py-[9px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-[7px] shrink-0" />
                              <span className="text-foreground">
                                <span className={rule.severity === "hard" ? "font-semibold" : "text-muted-foreground"}>
                                  {rule.severity === "hard" ? "[HARD]" : "[soft]"}
                                </span>{" "}
                                {rule.detail}
                                {ruleType && <span className="text-muted-foreground"> — {ruleType.label}</span>}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </HubCard>
                )}

                <HubCard className="sm:col-span-2">
                  <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Record" color="slate" />
                  <div className="pb-5">
                    <HubDataGrid cols={3}>
                      <HubDataField label="Client number">#{client.client_number}</HubDataField>
                      <HubDataField label="Created">{new Date(client.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</HubDataField>
                      <HubDataField label="Last edited">{(client as any).updated_at ? new Date((client as any).updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</HubDataField>
                    </HubDataGrid>
                  </div>
                </HubCard>
              </div>
            </TabsContent>

            <TabsContent value="admin">
              <div className="space-y-5">
                <HubCard>
                  <HubCardHeader icon={<IconClipboardCheck className="w-4 h-4" />} title="Compliance Status" color="teal" />
                  <div className="px-5 pb-5 space-y-4">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Overall status</span>
                      {complianceLookup ? <StatusBadge status={flags.effectiveStatus} /> : <span className="font-medium text-foreground">—</span>}
                    </div>

                    <div className="pt-3 border-t border-[var(--hub-border)]">
                      <ClinicalComplianceCard
                        clientId={client.id}
                        initial={{
                          medical_clearance_status: client.medical_clearance_status ?? "not_required",
                          risk_level: client.risk_level ?? "low",
                          exercise_modifications: client.exercise_modifications ?? null,
                        }}
                      />
                    </div>

                    <div className="pt-3 border-t border-[var(--hub-border)]">
                      <DocumentRegister
                        clientNumber={client.client_number}
                        documents={[...(clientDocuments ?? []), ...legacyDocumentRows]}
                        clientEmail={client.email}
                        clientName={client.name}
                      />
                    </div>

                    <div className="pt-3 border-t border-[var(--hub-border)]">
                      <span className="text-xs text-muted-foreground block mb-2">GP Clearance Letter</span>
                      <GpLetterCard
                        clientId={client.id}
                        gpLetterStatus={client.gp_letter_status}
                        requestedDate={client.gp_letter_requested_date}
                        receivedDate={client.gp_letter_received_date}
                      />
                    </div>

                    {outstandingCount > 0 && (
                      <div className="pt-3 border-t border-[var(--hub-border)]">
                        <span className="text-xs text-muted-foreground block mb-1">Outstanding</span>
                        <ul className="list-none space-y-1.5">
                          {flags.autoOutstanding.map((action, i) => (
                            <li key={`auto-${i}`} className="flex items-start gap-2 text-sm">
                              <IconTriangleAlert className="h-3.5 w-3.5 text-rose mt-0.5 shrink-0" />
                              <span className="text-foreground">{action}</span>
                            </li>
                          ))}
                          {manualActions.map((action, i) => (
                            <li key={`manual-${i}`} className="flex items-start gap-2 text-sm">
                              <IconTriangleAlert className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                              <span className="text-foreground">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </HubCard>

                <PackagePaymentsCard
                  clientId={client.id}
                  initial={{
                    package_type: client.package_type ?? null,
                    sessions_purchased: client.sessions_purchased ?? null,
                    sessions_used: client.sessions_used ?? 0,
                    sessions_remaining: client.sessions_remaining ?? null,
                    session_duration: client.session_duration ?? 60,
                    payment_method: client.payment_method ?? null,
                    payment_status: client.payment_status ?? "pending",
                    block_expiry_date: client.block_expiry_date ?? null,
                    client_status: client.client_status ?? "active",
                    referral_source: client.referral_source ?? null,
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="training">
              <TrainingTabContent
                clientNumber={client.client_number}
                blocks={blocks ?? []}
                sessions={sessions ?? []}
                blockSessionCounts={blockSessionCounts}
                exerciseTrends={exerciseTrends}
                exerciseHistory={exerciseHistory}
                trainerizeHistory={trainerizeHistory}
              />
            </TabsContent>

            <TabsContent value="comms">
              <CommsTabContent
                clientId={client.id}
                clientNumber={client.client_number}
                updates={(clientUpdates || []) as SentUpdate[]}
                updateInterval={(client.update_interval as import("@/lib/updates-due").UpdateInterval) ?? null}
                dueInfo={dueInfo}
                lastSentAt={lastSentAt}
              />
            </TabsContent>

            <TabsContent value="plan-agent">
              <PlanAgentTab
                clientNumber={client.client_number}
                clientName={client.name}
                paceMode={client.pace_mode ?? "medium"}
              />
            </TabsContent>
          </div>

          <div className="lg:col-span-4">{rightRail}</div>
        </div>
      </ClientDetailTabs>
    </div>
  );
}
