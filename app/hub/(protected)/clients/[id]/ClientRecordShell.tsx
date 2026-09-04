"use client";

import { DrawerManager } from "./DrawerManager";
import { ClientRecordHeader } from "./ClientRecordHeader";
import { ClientDrawerStrip } from "./ClientDrawerStrip";
import { NeedsYouQueue, buildNeedsYouItems } from "./NeedsYouQueue";
import { TrainingSection } from "./TrainingSection";
import { ClientDrawers } from "./ClientDrawers";
import type { DBBlock, DBSession } from "@/types";
import type { ExerciseTrend } from "@/lib/progress";
import type { ComplianceFlags } from "@/lib/compliance";

/* ── ClientRecordShell — the client-side wrapper that composes the new
   single-screen, no-tabs client record layout. Wrapped in DrawerManager
   for drawer state. The server page fetches data and passes it as props. */

interface ClientRecordShellProps {
  client: any; // DBClient — using `any` to avoid type serialization issues across the boundary
  blocks: DBBlock[];
  sessions: DBSession[];
  blockSessionCounts: Record<number, number>;
  blockCompletedCounts: Record<number, number>;
  blockDateRangeLabel: string;
  trainerizeHistory: { blocks: any[]; notes: any[] };
  pendingTaskCount: number;
  draftBlockCount: number;
  undatedSessionCount: number;
  blockSessionCountMismatch: boolean;
  unpaidBlocks: string[];
  outstandingActions: string[];
  autoOutstanding: string[];
  effectiveStatus: string;
  dueInfo: { nextDueDate: string | null; daysUntilDue: number | null; status: string | null };
  hasAllDocsSigned: boolean;
  healthFlagsCount: number;
  trainingRulesCount: number;
  exerciseTrendSummary?: {
    totalExercisesLogged: number;
    personalBests: number;
    heaviestLift: string | null;
    belowBestCount: number;
    recentNotes: string | null;
  };
  missingBandSet: boolean;
  /** S1 — home-training variant of this same surface. */
  isHomeTraining: boolean;
  goneQuiet: boolean;
  lastClientLogAt: string | null;
  quietDays: number;
  packageUnderSpecified: boolean;
  trainingRules: { id: string; rule_type_id: string; detail: string; severity?: string }[];
  latestBlock: DBBlock | null;
  derivedStatusByBlock: Map<string, import("@/types").BlockStatus>;
  /* S0b drawer data */
  portalAccount: any;
  clientNotes: any[];
  clientReviews: any[];
  bandSetName: string | null;
  allTaskRows: any[];
  clientDocuments: any[];
  legacyDocumentRows: any[];
  flags: ComplianceFlags;
  clientUpdates: any[];
  exerciseTrends: ExerciseTrend[];
  ruleTypesById: Map<string, any>;
  complianceLookup: any;
  gpClearance: any;
  sessionsRemaining: number | null;
  sessionsUsed: number | null;
  paymentStatus: string;
  packageType: string | null;
  medicalClearanceStatus: string;
  riskLevel: string;
  annualReviewDueDate: string | null;
  clearanceFrom: string | null;
  specialistName: string | null;
  exerciseModifications: string | null;
  clientStatus: string;
  referralSource: string | null;
  startDate: string | null;
  blockExpiryDate: string | null;
  countCompletedSessions: number;
}

export function ClientRecordShell({
  client,
  blocks,
  sessions,
  blockSessionCounts,
  blockCompletedCounts,
  blockDateRangeLabel,
  trainerizeHistory,
  pendingTaskCount,
  draftBlockCount,
  undatedSessionCount,
  blockSessionCountMismatch,
  unpaidBlocks,
  outstandingActions,
  autoOutstanding,
  effectiveStatus,
  dueInfo,
  hasAllDocsSigned,
  healthFlagsCount,
  trainingRulesCount,
  exerciseTrendSummary,
  missingBandSet,
  isHomeTraining,
  goneQuiet,
  lastClientLogAt,
  quietDays,
  packageUnderSpecified,
  trainingRules,
  latestBlock: latestBlockProp,
  derivedStatusByBlock,
  /* S0b drawer data */
  portalAccount,
  clientNotes,
  clientReviews,
  bandSetName,
  allTaskRows,
  clientDocuments,
  legacyDocumentRows,
  flags,
  clientUpdates,
  exerciseTrends,
  ruleTypesById,
  complianceLookup,
  gpClearance,
  sessionsRemaining,
  sessionsUsed,
  paymentStatus,
  packageType,
  medicalClearanceStatus,
  riskLevel,
  annualReviewDueDate,
  clearanceFrom,
  specialistName,
  exerciseModifications,
  clientStatus,
  referralSource,
  startDate,
  blockExpiryDate,
  countCompletedSessions,
}: ClientRecordShellProps) {
  const latestBlock = latestBlockProp;

  const blockSessions = latestBlock
    ? sessions.filter((s) => s.block_id === latestBlock.id)
    : [];

  // Health flags count: from profile health data
  const healthFlags = (() => {
    const p = client.profile;
    if (!p?.health) return 0;
    let count = 0;
    if (p.health.conditions?.length > 0) count++;
    if (p.health.medications?.length > 0) count++;
    if (p.health.pain_points?.length > 0) count++;
    if (p.health.contraindications?.length > 0) count++;
    return count;
  })();

  // Built once so the header count and the rendered rows can never disagree.
  const needsYouInput = {
    pendingTaskCount,
    draftBlockCount,
    undatedSessionCount,
    blockSessionCountMismatch,
    unpaidBlocks,
    missingBandSet,
    outstandingActions,
    autoOutstanding,
    effectiveStatus,
    dueInfo,
    hasAllDocsSigned,
    healthFlagsCount: healthFlags,
    trainingRulesCount,
    clientNumber: client.client_number,
    latestBlock,
    isHomeTraining,
    goneQuiet,
    lastClientLogAt,
    quietDays,
    packageUnderSpecified,
    clientFirstName: String(client.name ?? "").split(" ")[0],
  };
  const needsYouCount = buildNeedsYouItems(needsYouInput).length;

  return (
    <DrawerManager>
      <div className="max-w-[940px] mx-auto">
        <ClientRecordHeader client={client} status={effectiveStatus} />

        <ClientDrawerStrip
          items={[
            { id: "dw-profile", label: "Profile" },
            { id: "dw-health", label: "Health", count: healthFlags },
            { id: "dw-arrangement", label: "Arrangement" },
            { id: "dw-documents", label: "Documents" },
            { id: "dw-comms", label: "Comms", count: pendingTaskCount },
          ]}
        />

        {/* ── Section 1: Needs You ── */}
        <div className="bg-white border border-[var(--hub-border)] rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden mb-3.5">
          <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
            <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Needs you</h2>
            <span className="text-xs text-[var(--color-muted)]">
              {needsYouCount > 0
                ? `${needsYouCount} thing${needsYouCount === 1 ? "" : "s"} · in the order you'd work them`
                : "All clear"}
            </span>
          </div>

          <NeedsYouQueue {...needsYouInput} />
        </div>

        {/* ── Section 2: Training ── */}
        <TrainingSection
          clientNumber={client.client_number}
          clientName={client.name}
          sessionDuration={client.session_duration}
          deliveryMode={(client as any).delivery_mode ?? null}
          preferredTime={client.profile?.logistics?.preferred_time ?? null}
          latestBlock={latestBlock}
          blockSessions={blockSessions}
          allBlocks={blocks}
          allSessions={sessions}
          blockSessionCounts={blockSessionCounts}
          blockCompletedCounts={blockCompletedCounts}
          blockDateRangeLabel={blockDateRangeLabel}
          exerciseTrendSummary={exerciseTrendSummary}
          trainerizeHistory={trainerizeHistory}
          standingRules={
            isHomeTraining
              ? (trainingRules ?? []).map((r) => ({
                  id: r.id,
                  label: ruleTypesById.get(r.rule_type_id)?.label ?? null,
                  detail: r.detail,
                }))
              : []
          }
        />
      </div>

      {/* ── Drawers ── */}
      <ClientDrawers
        client={client}
        blocks={blocks}
        sessions={sessions}
        latestBlock={latestBlock}
        blockSessions={blockSessions}
        portalAccount={portalAccount}
        clientNotes={clientNotes}
        clientReviews={clientReviews}
        bandSetName={bandSetName}
        missingBandSet={missingBandSet}
        allTaskRows={allTaskRows}
        clientDocuments={clientDocuments}
        legacyDocumentRows={legacyDocumentRows}
        flags={flags}
        clientUpdates={clientUpdates}
        dueInfo={dueInfo}
        exerciseTrends={exerciseTrends}
        exerciseTrendSummary={exerciseTrendSummary}
        trainerizeHistory={trainerizeHistory}
        ruleTypesById={ruleTypesById}
        complianceLookup={complianceLookup}
        gpClearance={gpClearance}
        sessionsRemaining={sessionsRemaining}
        sessionsUsed={sessionsUsed}
        paymentStatus={paymentStatus}
        packageType={packageType}
        medicalClearanceStatus={medicalClearanceStatus}
        riskLevel={riskLevel}
        annualReviewDueDate={annualReviewDueDate}
        clearanceFrom={clearanceFrom}
        specialistName={specialistName}
        exerciseModifications={exerciseModifications}
        clientStatus={clientStatus}
        referralSource={referralSource}
        startDate={startDate}
        blockExpiryDate={blockExpiryDate}
        blockSessionCountMismatch={blockSessionCountMismatch}
        unpaidBlocks={unpaidBlocks}
        countCompletedSessions={countCompletedSessions}
      />
    </DrawerManager>
  );
}
