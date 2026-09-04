"use client";

import { DrawerManager } from "./DrawerManager";
import { ClientRecordHeader } from "./ClientRecordHeader";
import { ClientDrawerStrip } from "./ClientDrawerStrip";
import { NeedsYouQueue } from "./NeedsYouQueue";
import { TrainingSection } from "./TrainingSection";
import { ClientDrawers } from "./ClientDrawers";
import type { DBBlock, DBSession } from "@/types";

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
  latestBlock: DBBlock | null;
  derivedStatusByBlock: Map<string, import("@/types").BlockStatus>;
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
  latestBlock: latestBlockProp,
  derivedStatusByBlock,
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
              {(() => {
                const count = pendingTaskCount + draftBlockCount + undatedSessionCount
                  + (blockSessionCountMismatch ? 1 : 0) + unpaidBlocks.length
                  + autoOutstanding.length + outstandingActions.length;
                return count > 0 ? `${count} thing${count === 1 ? "" : "s"} · in the order you'd work them` : "All clear";
              })()}
            </span>
          </div>

          <NeedsYouQueue
            pendingTaskCount={pendingTaskCount}
            draftBlockCount={draftBlockCount}
            undatedSessionCount={undatedSessionCount}
            blockSessionCountMismatch={blockSessionCountMismatch}
            unpaidBlocks={unpaidBlocks}
            missingBandSet={missingBandSet}
            outstandingActions={outstandingActions}
            autoOutstanding={autoOutstanding}
            effectiveStatus={effectiveStatus}
            dueInfo={dueInfo}
            hasAllDocsSigned={hasAllDocsSigned}
            healthFlagsCount={healthFlags}
            trainingRulesCount={trainingRulesCount}
          />
        </div>

        {/* ── Section 2: Training ── */}
        <TrainingSection
          clientNumber={client.client_number}
          clientName={client.name}
          clientPaceMode={client.pace_mode}
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
        />
      </div>

      {/* ── Drawers (stub shells for S0b) ── */}
      <ClientDrawers />
    </DrawerManager>
  );
}
