"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { EmptyState } from "@/components/hub/EmptyState";
import { HubCard, HubCardHeader } from "@/components/hub";
import { ExerciseTrendsPanel } from "@/components/progress/ExerciseTrendsPanel";
import { ExerciseHistoryPanel } from "@/components/progress/ExerciseHistoryPanel";
import { TrainerizeHistoryPanel } from "@/components/hub";
import type { TrainerizeHistoryData } from "@/components/hub";

import type { ExerciseTrend } from "@/lib/progress";
import type { ExerciseHistoryEntry } from "@/lib/exercise-history";
import {
  IconFileText,
  IconClipboardList,
  IconBarChart3,
  IconActivity,
  IconPlus,
} from "@/components/icons";

type Segment = "blocks" | "sessions" | "progress" | "history";

interface BlockRow {
  id: string;
  block_number: number;
  created_at: string;
  status: string;
}

interface SessionRow {
  id: string;
  session_number: number;
  block_id: string;
  data?: any;
  blocks?: { block_number: number };
}

interface Props {
  clientNumber: number;
  blocks: BlockRow[];
  sessions: SessionRow[];
  blockSessionCounts: Record<number, number>;
  exerciseTrends: ExerciseTrend[];
  exerciseHistory: ExerciseHistoryEntry[];
  trainerizeHistory: TrainerizeHistoryData;
}

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "blocks", label: "Blocks" },
  { key: "sessions", label: "Sessions" },
  { key: "progress", label: "Progress" },
  { key: "history", label: "Pre-app history" },
];

function SessionCheckinPill({
  fatigue,
  rpe,
}: {
  fatigue?: string | null;
  rpe?: number | null;
}) {
  const isFlagged = fatigue === "high" || (rpe != null && rpe >= 8);
  const label = isFlagged ? "Fatigue flagged" : "Good";
  if (isFlagged) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-px text-[11px] font-semibold text-[var(--status-warning)]">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-1.5 py-px text-[11px] font-semibold text-[var(--status-success)]">
      {label}
    </span>
  );
}

export function TrainingTabContent({
  clientNumber,
  blocks,
  sessions,
  blockSessionCounts,
  exerciseTrends,
  exerciseHistory,
  trainerizeHistory,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewParam = searchParams.get("view");
  const initialView: Segment =
    viewParam === "blocks" || viewParam === "sessions" || viewParam === "progress" || viewParam === "history"
      ? viewParam
      : "blocks";

  const [segment, setSegment] = useState<Segment>(initialView);

  useEffect(() => {
    const vp = searchParams.get("view");
    if (vp === "blocks" || vp === "sessions" || vp === "progress" || vp === "history") {
      setSegment(vp);
    }
  }, [searchParams]);

  const handleSegmentChange = (next: Segment) => {
    setSegment(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg bg-[var(--hub-hover)] p-[3px]">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => handleSegmentChange(s.key)}
            className={cn(
              "rounded-md px-4 py-2 text-[13px] font-semibold transition-all",
              segment === s.key
                ? "bg-[var(--hub-card)] text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {segment === "blocks" && (
        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconFileText className="w-4 h-4" />}
            title="Training Blocks"
            color="slate"
            action={
              <Link
                href={`/hub/clients/${clientNumber}?tab=plan-agent`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-rose/90 transition-colors"
              >
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
                        <Link href={`/hub/clients/${clientNumber}/blocks/${block.id}`} className="text-teal font-medium hover:underline">Open</Link>
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
                <Link href={`/hub/clients/${clientNumber}?tab=plan-agent`} className="text-rose font-medium hover:underline">Create Block</Link>
              </div>
            </div>
          )}
        </HubCard>
      )}

      {segment === "sessions" && (
        <HubCard padded={false}>
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
                    const blockNum = (session as any).blocks?.block_number;
                    const fatigue = log?.fatigue;
                    const rpe = log?.rpe != null ? Number(log.rpe) : null;
                    const checkinLabel = !log ? "—" : fatigue === "high" || (rpe !== null && rpe >= 8) ? "Fatigue flagged" : "Good";
                    return (
                      <tr key={session.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)]">
                        <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">
                          {log?.completed_at
                            ? new Date(log.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                            : "—"}
                        </td>
                        <td className="py-2.5 px-5 font-semibold text-foreground">
                          {blockNum != null ? `Block ${blockNum} \u00b7 S${session.session_number}` : `S${session.session_number}`}
                        </td>
                        <td className="py-2.5 px-5">
                          {log ? (
                            <SessionCheckinPill fatigue={fatigue} rpe={rpe} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-5 text-muted-foreground max-w-[240px] truncate">{log?.notes || "—"}</td>
                        <td className="py-2.5 px-5 text-right whitespace-nowrap">
                          <Link
                            href={`/hub/clients/${clientNumber}/blocks/${session.block_id}/sessions/${session.session_number}`}
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
      )}

      {segment === "progress" && (
        <>
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
              icon={<IconActivity className="w-4 h-4" />}
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
        </>
      )}

      {segment === "history" && (
        <TrainerizeHistoryPanel
          data={trainerizeHistory}
          emptyTitle="No Trainerize history imported yet"
          emptyDescription="Run the Trainerize import for this client to populate their historical training data, PBs, and notes."
        />
      )}
    </div>
  );
}
