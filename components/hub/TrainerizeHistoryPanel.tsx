"use client";

import { useState } from "react";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconDumbbell, IconClock, IconHeart, IconEdit3 } from "@/components/icons";
import type { TrainerizeHistoryData } from "./types";

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function formatNum(n: number | null | undefined, unit?: string): string {
  if (n == null) return "—";
  return unit ? `${n} ${unit}` : String(n);
}

export function TrainerizeHistoryPanel({
  data,
  emptyTitle,
  emptyDescription,
}: {
  data: TrainerizeHistoryData;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  const hasBlocks = data.blocks && data.blocks.length > 0;
  const hasPBs = data.personalRecords && data.personalRecords.length > 0;
  const hasNotes = data.notes && data.notes.length > 0;

  if (!hasBlocks && !hasPBs && !hasNotes) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-semibold text-foreground">{emptyTitle || "No Trainerize history imported yet"}</p>
        {emptyDescription && <p className="text-xs text-muted-foreground mt-1">{emptyDescription}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Training Blocks ── */}
      {hasBlocks && (
        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconDumbbell className="w-4 h-4" />}
            title="Trainerize Training Blocks"
            color="teal"
            subtitle={`${data.blocks.length} blocks imported from Trainerize`}
            className="px-5 pt-5"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                  <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Block</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Dates</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Workouts</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Notes</th>
                  <th className="h-10 px-5 py-0"></th>
                </tr>
              </thead>
              <tbody>
                {data.blocks.map((block) => {
                  const isExpanded = expandedBlock === block.id;
                  const workoutCount = block.workouts?.length || 0;
                  const exerciseCount = block.workouts?.reduce((sum: number, w: any) => sum + (w.exercises?.length || 0), 0) || 0;

                  return (
                    <tr key={block.id} className="border-b border-[var(--hub-border)] last:border-0">
                      <td className="py-2.5 px-5 font-semibold text-foreground">{block.phase_name || "Unnamed block"}</td>
                      <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">
                        {formatDate(block.start_date)} – {formatDate(block.end_date)}
                      </td>
                      <td className="py-2.5 px-5 text-muted-foreground">
                        {workoutCount} workouts &middot; {exerciseCount} exercises
                      </td>
                      <td className="py-2.5 px-5 text-muted-foreground max-w-[200px] truncate">
                        {block.instruction || "—"}
                      </td>
                      <td className="py-2.5 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                          className="text-teal font-medium hover:underline text-sm"
                        >
                          {isExpanded ? "Collapse" : "View workouts"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded block detail */}
          {expandedBlock && (() => {
            const block = data.blocks.find(b => b.id === expandedBlock);
            if (!block || !block.workouts) return null;
            return (
              <div className="px-5 pb-5 border-t border-[var(--hub-border)]">
                {block.instruction && (
                  <p className="text-sm text-muted-foreground py-3 border-b border-[var(--hub-border)]">{block.instruction}</p>
                )}
                <div className="divide-y divide-[var(--hub-border)]">
                  {block.workouts.map((workout: any, wi: number) => (
                    <div key={workout.id || wi} className="py-3">
                      <p className="text-sm font-semibold text-foreground mb-1.5">
                        {workout.name || `Workout ${wi + 1}`}
                        {workout.duration && <span className="text-xs text-muted-foreground font-normal ml-2">{Math.round(workout.duration / 60)} min</span>}
                      </p>
                      {workout.instruction && (
                        <p className="text-xs text-muted-foreground mb-1.5 italic">{workout.instruction}</p>
                      )}
                      {workout.exercises && workout.exercises.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[var(--hub-border)]">
                                <th className="text-left text-muted-foreground font-medium py-1 pr-3">Exercise</th>
                                <th className="text-left text-muted-foreground font-medium py-1 pr-3">Sets</th>
                                <th className="text-left text-muted-foreground font-medium py-1 pr-3">Target</th>
                                <th className="text-left text-muted-foreground font-medium py-1">Rest</th>
                              </tr>
                            </thead>
                            <tbody>
                              {workout.exercises.map((ex: any, ei: number) => (
                                <tr key={ei} className="border-b border-[var(--hub-border)]/50 last:border-0">
                                  <td className="py-1 pr-3 text-foreground">{ex.name || `Exercise ${ei + 1}`}</td>
                                  <td className="py-1 pr-3 text-muted-foreground">{ex.sets || 1}</td>
                                  <td className="py-1 pr-3 text-muted-foreground">{ex.target || "—"}</td>
                                  <td className="py-1 text-muted-foreground">{ex.restTime ? `${ex.restTime}s` : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </HubCard>
      )}

      {/* ── Personal Records ── */}
      {hasPBs && (
        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconHeart className="w-4 h-4" />}
            title="Personal Records"
            color="rose"
            subtitle={`${data.personalRecords.length} records from Trainerize`}
            className="px-5 pt-5"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                  <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Exercise</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Record</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Value</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Achieved</th>
                </tr>
              </thead>
              <tbody>
                {data.personalRecords.map((pb) => (
                  <tr key={pb.id} className="border-b border-[var(--hub-border)] last:border-0">
                    <td className="py-2.5 px-5 font-semibold text-foreground">{pb.exercise}</td>
                    <td className="py-2.5 px-5 text-muted-foreground">
                      {pb.metric === "weight" ? (pb.rep_count ? `${pb.rep_count} Rep Max` : "Rep Max") : "Best Duration"}
                    </td>
                    <td className="py-2.5 px-5 text-muted-foreground">{formatNum(pb.value, pb.metric === "weight" ? "kg" : "s")}</td>
                    <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">{formatDate(pb.achieved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HubCard>
      )}

      {/* ── Client Notes ── */}
      {hasNotes && (
        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconEdit3 className="w-4 h-4" />}
            title="Trainerize Notes"
            color="slate"
            subtitle={`${data.notes.length} notes and messages from Trainerize`}
            className="px-5 pt-5"
          />
          <div className="px-5 pb-5 divide-y divide-[var(--hub-border)]">
            {data.notes.map((note) => {
              const dateLabel = formatDate(note.source_date);
              const sourceLabel = note.source === "message" ? "Message"
                : note.source === "attention" ? "Attention flag"
                : note.source === "program_instruction" ? "Block note"
                : note.source === "workout_instruction" ? "Workout note"
                : note.source;

              return (
                <div key={note.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{sourceLabel}</span>
                    <span className="text-xs text-muted-foreground">{dateLabel}</span>
                  </div>
                  {note.sender_name && (
                    <p className="text-xs text-muted-foreground mb-0.5">{note.sender_name}</p>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                </div>
              );
            })}
          </div>
        </HubCard>
      )}
    </div>
  );
}
