import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { IconChevronLeft, IconClipboardList, IconClipboardCheck, IconFileText, IconHeart, IconMail, IconPencil, IconPlus, IconTarget, IconTriangleAlert, IconDumbbell, IconEdit3, IconAlertCircle, IconLayoutDashboard, IconUser, IconBot, IconBarChart3, IconCheckSquare, IconClock, IconActivity } from "@/components/icons";
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

/** Small count pill for the tab strip — only rendered when a tab carries real outstanding state. */
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

/** Tag chip — matches the mockup's rectangular chip (6px radius, canvas fill). */
function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--hub-canvas)] border border-[var(--hub-border)] px-2 py-0.5 text-xs text-[var(--color-body)]">
      {children}
    </span>
  );
}

/** Meta chip — label + value, used in the page header key-facts row. */
function KeyFactChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-lg bg-[var(--hub-card)] border border-[var(--hub-border)] px-2.5 py-1 text-xs font-medium text-foreground">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </span>
  );
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: client } = await supabase.from("clients").select("*, compliance_status, outstanding_actions, group_type, pace_mode").eq("client_number", parseInt(params.id)).single();

  if (!client) notFound();

  const { data: parqs } = await supabase.from("signed_parq").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
  const { data: agreements } = await supabase.from("signed_agreements").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
  const { data: clientDocuments } = await supabase.from("client_documents").select("id, kind, title, status, version, created_at, updated_at, client_name, trainer_name, client_signature, trainer_signature, requires_trainer_signature, emailed, source_type, consent_choices").eq("client_id", client.id).order("created_at", { ascending: false });

  const latestParq = parqs?.[0] ?? null;
  const latestAgreement = agreements?.[0] ?? null;

  const { data: blocks } = await supabase.from("blocks").select("*").eq("client_id", client.id).order("block_number", { ascending: false });
  // Filtered by block_id (this client's own blocks, already fetched above) rather
  // than .eq("blocks.client_id", ...) — a filter on an embedded relation's column,
  // which this app's query-builder shim doesn't resolve (it quotes "blocks.client_id"
  // as one literal column name, which doesn't exist on `sessions`, throws, and the
  // caught error silently became an empty [] with no visible error). Same root
  // cause class as the dashboard fix in 75e498a, confirmed live: Tom Putnam's
  // Training tab showed "No sessions logged yet" despite a real logged session.
  const clientBlockIds = (blocks ?? []).map((b) => b.id);
  const { data: sessions } = clientBlockIds.length > 0
    ? await supabase
        .from("sessions")
        .select(`*, blocks!inner(block_number, client_id)`)
        .in("block_id", clientBlockIds)
        .order("session_number", { ascending: false })
        .limit(50)
    : { data: [] as any[] };

  // Trainerize history data (Lane 1 — historical import). Fetched here (before the
  // combined trends/PB computation below) so workoutResults can feed the same
  // pure functions as live set_logs — one continuous per-exercise timeline
  // spanning both the Trainerize era and the live app, not two disconnected views.
  const { data: trainerizeBlocks } = await supabase.from("trainerize_training_blocks").select("*").eq("client_id", client.id).order("start_date", { ascending: false });
  const blockIds = (trainerizeBlocks ?? []).map((b: any) => b.id);
  const { data: trainerizeWorkouts } = blockIds.length > 0
    ? await supabase.from("trainerize_workouts").select("*").in("trainerize_block_id", blockIds).order("workout_index", { ascending: true })
    : { data: [] };
  const workoutIds = (trainerizeWorkouts ?? []).map((w: any) => w.id);
  const { data: trainerizeExercises } = workoutIds.length > 0
    ? await supabase.from("trainerize_exercises").select("*").in("trainerize_workout_id", workoutIds).order("exercise_order", { ascending: true })
    : { data: [] };
  const { data: trainerizeNotes } = await supabase.from("trainerize_client_notes").select("*").eq("client_id", client.id).order("source_date", { ascending: false });
  const { data: workoutResults } = await supabase.from("trainerize_workout_results").select("*").eq("client_id", client.id).order("performed_date", { ascending: false });

  // Lane C — per-exercise progress from set_logs, unified with Trainerize's
  // per-set results (empty/sparse-safe: no rows → empty state).
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

  // Lane C — "gone quiet" detection for home-training clients (Esther-facing only;
  // no client-facing send is wired — gated on the Work Order's ASK FIRST decision).
  const isHomeTraining = client.delivery_mode === "home_training";
  const lastClientLogAt = isHomeTraining ? await getLastClientLogAt(client.id) : null;
  const goneQuiet = isHomeTraining && isGoneQuiet(lastClientLogAt);

  const { data: clientUpdates } = await supabase.from("sent_updates").select("*").eq("client_id", client.id).order("created_at", { ascending: false });

  // Compose Trainerize history data — program structure + notes only now.
  // PBs and workout results moved to the unified Progress tab above (they're
  // performance data, not program/communication data).
  const composeHistoryData = (): TrainerizeHistoryData => {
    const workoutsByBlock: Record<string, any[]> = {};
    for (const w of (trainerizeWorkouts ?? [])) {
      const blockId = w.trainerize_block_id;
      if (!workoutsByBlock[blockId]) workoutsByBlock[blockId] = [];
      const exs = (trainerizeExercises ?? []).filter((ex: any) => ex.trainerize_workout_id === w.id);
      workoutsByBlock[blockId].push({ ...w, exercises: exs.map((ex: any) => ({ ...ex, targetDetail: ex.raw_data?.targetDetail })) });
    }
    const blocks = (trainerizeBlocks ?? []).map((b: any) => ({
      ...b,
      workouts: workoutsByBlock[b.id] || [],
    }));

    return {
      blocks,
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
  );
  const { data: ruleTypes } = await supabase.from("training_rule_types").select("id, label, bucket");
  const ruleTypesById = new Map((ruleTypes ?? []).map((rt) => [rt.id, rt]));

  const p = client.profile;
  const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const latestBlock = blocks && blocks.length > 0
    ? blocks.find((b) => b.status === "active") ?? blocks.find((b) => b.status === "approved") ?? blocks[0]
    : null;
  const latestSessionLog = sessions?.[0] ? ((sessions[0] as any).data?.session_log ?? null) : null;

  const blockSessionCounts: Record<number, number> = {};
  for (const s of sessions ?? []) {
    const bn = (s as any).blocks?.block_number;
    if (bn != null) blockSessionCounts[bn] = (blockSessionCounts[bn] ?? 0) + 1;
  }

  const metaParts: string[] = [];
  metaParts.push(`Client #${client.client_number}`);
  if (p?.logistics?.sessions_per_week) metaParts.push(`${p.logistics.sessions_per_week}x/week`);
  if (p?.logistics?.package) metaParts.push(p.logistics.package);

  const hasSignedParqDocument = (clientDocuments ?? []).some((d) => d.kind === "parq" && d.status === "signed");
  const hasSignedAgreementDocument = (clientDocuments ?? []).some((d) => d.kind === "terms" && d.status === "signed");
  const flags = computeComplianceFlags({
    client,
    latestParq: latestParq ?? null,
    latestAgreement: latestAgreement ?? null,
    hasSignedParqDocument,
    hasSignedAgreementDocument,
  });
  const complianceLookup = lookupStatus(flags.effectiveStatus);
  const gpClearance = p?.health?.gp_clearance;
  const manualActions = client.outstanding_actions ?? [];
  const outstandingCount = flags.autoOutstanding.length + manualActions.length;
  const draftUpdatesCount = (clientUpdates ?? []).filter((u) => u.status === "draft").length;

  /* ── Right rail (Status, Active Block, Quick Actions) ── */
  const rightRail = (
    <div className="space-y-5">
      <HubCard>
        <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Status" color="slate" noBottomPadding />
        <div className="pb-5 space-y-0">
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted-foreground">Compliance</span>
            {complianceLookup ? <StatusBadge status={flags.effectiveStatus} /> : <span className="text-muted-foreground">—</span>}
          </div>
          <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--hub-border)]">
            <span className="text-muted-foreground">GP Clearance</span>
            {p?.health ? (
              <YesNoPill yes={gpClearance} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--hub-border)]">
            <span className="text-muted-foreground">Outstanding actions</span>
            <span className="font-medium text-foreground">{outstandingCount}</span>
          </div>
        </div>
      </HubCard>

      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Active Block" color="slate" noBottomPadding />
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
        <HubCardHeader icon={<IconTarget className="w-4 h-4" />} title="Quick Actions" color="amber" noBottomPadding />
        <div className="pb-5">
          <HubQuickActions divider actions={[
            { href: `/hub/clients/${client.client_number}/edit`, label: "Edit client", icon: <IconPencil className="w-4 h-4" /> },
            { href: `/hub/clients/${client.client_number}?tab=plan-agent`, label: "Plan a block", icon: <IconPlus className="w-4 h-4" /> },
            { href: `/hub/clients/${client.client_number}/updates`, label: "Updates", icon: <IconMail className="w-4 h-4" /> },
          ]} />
        </div>
      </HubCard>
    </div>
  );

  /* ── Right rail for Profile tab (compact Record card matching mockup) ── */
  const recordRail = (
    <div className="space-y-5">
      <HubCard>
        <HubCardHeader icon={<IconAlertCircle className="w-4 h-4" />} title="Record" color="slate" noBottomPadding />
        <div className="pb-5 space-y-0">
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted-foreground">Client number</span>
            <span className="font-medium text-foreground">#{client.client_number}</span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--hub-border)]">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium text-foreground">{new Date(client.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm border-t border-[var(--hub-border)]">
            <span className="text-muted-foreground">Last edited</span>
            <span className="font-medium text-foreground">{(client as any).updated_at ? new Date((client as any).updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
          </div>
        </div>
      </HubCard>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
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
                {metaParts.slice(1).length > 0 && <p className="text-sm text-muted-foreground mt-[3px]">{metaParts.slice(1).join(" · ")}</p>}
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
            {/* Key facts — label + value chips (matches reference chip-kv) */}
            <div className="flex items-center gap-2 mt-3.5 flex-wrap">
              {client.group_type && (
                <KeyFactChip label="Format"><GroupTypeLabel groupType={client.group_type} /></KeyFactChip>
              )}
              {client.pace_mode && (
                <KeyFactChip label="Pace">{client.pace_mode === 'fast' ? 'Fast' : client.pace_mode === 'medium' ? 'Medium' : 'Slow'}</KeyFactChip>
              )}
              {p?.logistics?.time_tier && (
                <KeyFactChip label="Session"><span className="capitalize">{p.logistics.time_tier}</span></KeyFactChip>
              )}
              {p?.logistics?.sessions_per_week && (
                <KeyFactChip label="Frequency">{p.logistics.sessions_per_week}&times; per week</KeyFactChip>
              )}
              {client.referral_source && (
                <KeyFactChip label="Referral">{client.referral_source}</KeyFactChip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Danger / warning banner ── */}
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
            : "Actions outstanding — see Compliance tab."}
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

      {/* ── Tabs ── */}
      <ClientDetailTabs>
        <HubTabsList>
          <HubTabsTrigger value="overview">
            <IconLayoutDashboard /> Overview
          </HubTabsTrigger>
          <HubTabsTrigger value="profile">
            <IconUser /> Profile
          </HubTabsTrigger>
          <HubTabsTrigger value="compliance">
            <IconClipboardCheck /> Compliance
            {outstandingCount > 0 && <TabCountBadge count={outstandingCount} tone={flags.effectiveStatus === "do_not_train" ? "danger" : "warning"} />}
          </HubTabsTrigger>
          <HubTabsTrigger value="training">
            <IconDumbbell /> Training
          </HubTabsTrigger>
          <HubTabsTrigger value="progress">
            <IconBarChart3 /> Progress
          </HubTabsTrigger>
          <HubTabsTrigger value="training-history">
            <IconActivity /> Training History
          </HubTabsTrigger>
          <HubTabsTrigger value="plan-agent">
            <IconBot /> Plan Agent
          </HubTabsTrigger>
          <HubTabsTrigger value="updates">
            <IconMail /> Updates
            {draftUpdatesCount > 0 && <TabCountBadge count={draftUpdatesCount} tone="warning" />}
          </HubTabsTrigger>
          <HubTabsTrigger value="tasks">
            <IconCheckSquare /> Tasks
          </HubTabsTrigger>
        </HubTabsList>

        {/* ── Tab: Overview ── */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <HubCard>
                <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Snapshot" color="navy" noBottomPadding />
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
                    dueInfo={dueInfo}
                  />
                </div>
              </HubCard>

              <HubCard>
                <HubCardHeader icon={<IconDumbbell className="w-4 h-4" />} title="Training Snapshot" color="teal" noBottomPadding />
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
                  <HubCardHeader icon={<IconAlertCircle className="w-4 h-4" />} title="Active Training Rules" color="amber" noBottomPadding subtitle="Applied to every generated block" />
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
            </div>
            <div className="lg:col-span-4">{rightRail}</div>
          </div>
        </TabsContent>

        {/* ─ Tab: Profile — one card per subject, matching the Overview tab's card-per-concern pattern ── */}
        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 grid gap-6 sm:grid-cols-2 items-start">
              <HubCard className="sm:col-span-2">
                <HubCardHeader icon={<IconMail className="w-4 h-4" />} title="Client Portal" color="slate" noBottomPadding />
                <PortalAccountCard
                  clientNumber={client.client_number}
                  hasEmail={!!client.email}
                />
              </HubCard>
              {/* Health — spans both columns; carries the most content and matters most on a clinical record */}
              {p?.health && (
                <HubCard className="sm:col-span-2">
                  <HubCardHeader
                    icon={<IconHeart className="w-4 h-4" />}
                    title="Health"
                    color="rose"
                    action={complianceLookup ? <StatusBadge status={flags.effectiveStatus} /> : undefined}
                    noBottomPadding
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

              {/* Physical Baseline */}
              {p?.physical_baseline && (
                <HubCard>
                  <HubCardHeader icon={<IconDumbbell className="w-4 h-4" />} title="Physical Baseline" color="teal" noBottomPadding />
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

              {/* Goals */}
              {p?.goals && (
                <HubCard>
                  <HubCardHeader icon={<IconTarget className="w-4 h-4" />} title="Goals" color="rose" noBottomPadding />
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

              {/* Logistics */}
              {p?.logistics && (
                <HubCard>
                  <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Logistics" color="navy" noBottomPadding />
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


              {/* Notes */}
              {(p?.notes?.esther_observations || p?.notes?.motivation_notes || p?.notes?.watch_for) && (
                <HubCard>
                  <HubCardHeader icon={<IconEdit3 className="w-4 h-4" />} title="Notes" color="slate" noBottomPadding />
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

              {/* Training Rules */}
              {p?.programming_adaptations && p.programming_adaptations.length > 0 && (
                <HubCard className="sm:col-span-2">
                  <HubCardHeader
                    icon={<IconAlertCircle className="w-4 h-4" />}
                    title="Active Training Rules"
                    color="amber"
                    action={<span className="text-xs text-muted-foreground">Applied to every generated block</span>}
                    noBottomPadding
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
            </div>
            <div className="lg:col-span-4">{recordRail}</div>
          </div>
        </TabsContent>

        {/* ─ Tab: Compliance ── */}
        <TabsContent value="compliance" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <HubCard>
                <HubCardHeader icon={<IconClipboardCheck className="w-4 h-4" />} title="Compliance & Documents" color="teal" noBottomPadding />
                <div className="px-5 pb-5 space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Compliance Status</span>
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
                      documents={clientDocuments ?? []}
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

              <HubAlert severity="info" title="Compliance drives the banner.">
                While any document is outstanding the record resolves to a pending or action-needed
                status and the warning banner appears above the tabs. The status is never set by
                hand — it is derived by <code className="text-xs">lib/compliance.ts</code> and rendered
                through the shared status tokens in <code className="text-xs">lib/hubStatus.ts</code>.
              </HubAlert>

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
            <div className="lg:col-span-4">{rightRail}</div>
          </div>
        </TabsContent>

        {/* ── Tab: Training ── */}
        <TabsContent value="training" className="mt-6">
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconFileText className="w-4 h-4" />}
              title="Training Blocks"
              color="slate"
              action={
                <Link href={`/hub/clients/${client.client_number}?tab=plan-agent`} className="inline-flex items-center gap-1.5 rounded-lg bg-rose px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-rose/90 transition-colors">
                  <IconPlus className="h-4 w-4" /> Plan Block
                </Link>
              }
              className="px-5 pt-5"
            />
            {blocks && blocks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                      <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Block</th>
                      <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Started</th>
                      <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Sessions</th>
                      <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Status</th>
                      <th className="h-10 px-5 py-0"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((block) => (
                      <tr key={block.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)]">
                        <td className="py-2.5 px-5 font-semibold text-foreground">Block {block.block_number}</td>
                        <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">
                          {new Date(block.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-2.5 px-5 text-foreground">{blockSessionCounts[block.block_number] ?? 0}</td>
                        <td className="py-2.5 px-5"><StatusBadge status={block.status} /></td>
                        <td className="py-2.5 px-5 text-right whitespace-nowrap">
                          <Link href={`/hub/clients/${client.client_number}/blocks/${block.id}`} className="text-teal font-medium hover:underline">Open</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 pb-5">
                <div className="flex items-center justify-between rounded-lg py-2 px-1 text-sm">
                  <span className="text-muted-foreground">No blocks yet</span>
                  <Link href={`/hub/clients/${client.client_number}?tab=plan-agent`} className="text-rose font-medium hover:underline">Create Block</Link>
                </div>
              </div>
            )}
          </HubCard>

          <HubCard padded={false} className="mt-5">
            <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Session Log" color="slate" className="px-5 pt-5" />
            {sessions && sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                      <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Date</th>
                      <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Session</th>
                      <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Check-in</th>
                      <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Note</th>
                      <th className="h-10 px-5 py-0"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const log = (session.data as any)?.session_log;
                      const blockNum = (session?.blocks as any)?.block_number;
                      const fatigue = log?.fatigue;
                      const rpe = log?.rpe != null ? Number(log.rpe) : null;
                      const isFlagged = (fatigue === "high") || (rpe !== null && rpe >= 8);
                      const checkinLabel = !log ? "—" : isFlagged ? "Fatigue flagged" : "Good";
                      const checkinToken: StatusToken = !log ? "neutral" : isFlagged ? "warning" : "success";
                      return (
                        <tr key={session.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)]">
                          <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">
                            {log?.completed_at
                              ? new Date(log.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                              : "—"}
                          </td>
                          <td className="py-2.5 px-5 font-semibold text-foreground">
                            {blockNum != null ? `Block ${blockNum} · S${session.session_number}` : `S${session.session_number}`}
                          </td>
                          <td className="py-2.5 px-5">
                            {log ? <TokenPill token={checkinToken} label={checkinLabel} /> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-2.5 px-5 text-muted-foreground max-w-[240px] truncate">{log?.notes || "—"}</td>
                          <td className="py-2.5 px-5 text-right whitespace-nowrap">
                            <Link
                              href={`/hub/clients/${client.client_number}/blocks/${session.block_id}/sessions/${session.session_number}`}
                              className="text-teal font-medium hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 pb-5">
                <EmptyState title="No sessions logged yet." />
              </div>
            )}
          </HubCard>
        </TabsContent>

        {/* ── Tab: Progress ── */}
        {/* Workout progress from logged sets — deliberately separate from the
            Compliance tab and the /hub/tracker page, whose "status" is the
            medical-compliance meaning (PAR-Q / GP letter / risk level).
            Unified: trends + PBs cover BOTH the live app's set_logs and
            Trainerize's imported per-set results (via lib/trainerize-adapter.ts)
            as one continuous timeline per exercise — was previously split
            across three tabs (Progress/History/Training History) with PBs
            computed two different, disconnected ways. */}
        <TabsContent value="progress" className="mt-6 space-y-6">
          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconBarChart3 className="w-4 h-4" />}
              title="Exercise Progress"
              color="teal"
              subtitle="Working weight and reps per exercise — live sessions and imported Trainerize history combined"
              className="px-5 pt-5"
            />
            <div className="px-5 pb-5">
              <ExerciseTrendsPanel
                trends={exerciseTrends}
                emptyTitle="No logged sessions yet"
                emptyDescription="Log sets from a session page (or a home-training client logs their own) and per-exercise trends will appear here."
                idPrefix="hub-exercise-trends"
              />
            </div>
          </HubCard>

          <HubCard padded={false}>
            <HubCardHeader
              icon={<IconClock className="w-4 h-4" />}
              title="Exercise History"
              color="teal"
              subtitle="Personal bests and last-performed weights — live sessions and imported Trainerize history combined"
              className="px-5 pt-5"
            />
            <div className="px-5 pb-5">
              <ExerciseHistoryPanel
                history={exerciseHistory}
                emptyTitle="No logged sessions yet"
                emptyDescription="Log sets from a session and per-exercise personal bests and history will appear here."
                idPrefix="hub-exercise-history"
              />
            </div>
          </HubCard>
        </TabsContent>

        {/* ── Tab: Plan Agent ── */}
        <TabsContent value="plan-agent" className="mt-6">
          <PlanAgentTab
            clientNumber={client.client_number}
            clientName={client.name}
            paceMode={client.pace_mode ?? "medium"}
          />
        </TabsContent>

        {/* ── Tab: Updates ── */}
        <TabsContent value="updates" className="mt-6">
          <ClientUpdatesPanel
            clientNumber={client.client_number}
            updates={(clientUpdates || []) as SentUpdate[]}
            reportHref={`/hub/clients/${client.client_number}/updates`}
          />
        </TabsContent>

        {/* ── Tab: Tasks ── */}
        <TabsContent value="tasks" className="mt-6">
          <ClientTasksPanel
            clientId={client.id}
            clientNumber={client.client_number}
            updateInterval={(client.update_interval as import("@/lib/updates-due").UpdateInterval) ?? null}
            dueInfo={dueInfo}
            lastSentAt={lastSentAt}
          />
        </TabsContent>

        {/* ── Tab: Training History (Trainerize import) ── */}
        <TabsContent value="training-history" className="mt-6">
          <TrainerizeHistoryPanel
            data={trainerizeHistory}
            emptyTitle="No Trainerize history imported yet"
            emptyDescription="Run the Trainerize import for this client to populate their historical training data, PBs, and notes."
          />
        </TabsContent>
      </ClientDetailTabs>
    </div>
  );
}
