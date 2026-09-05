"use client";

import { useState } from "react";
import Link from "next/link";
import { DrawerShell, useDrawerManager } from "./DrawerManager";
import { BlockMap } from "./BlockMap";
import { sessionWorkoutName } from "@/lib/session-display";
import { blockDisplayName } from "@/lib/block-name";
import { SupplementaryWorkoutsCard } from "@/components/hub/SupplementaryWorkoutsCard";
import type { DBBlock, DBSession } from "@/types";
import type {
  TrainerizeHistoryData,
  TrainerizePerformedWorkoutSummary,
  TrainerizePerformedExerciseDetail,
} from "@/components/hub";

/* ── TrainingDrawer — consolidates Block, Workout, Progress, Before-the-app,
   Supplementary Workouts, Past Blocks, and Trainerize history into one surface.
   The base page retains only the duo panel (next session + is-it-working) and
   the compact block band. */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtShortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function sourceLabel(source: string): string {
  switch (source) {
    case "message": return "Message";
    case "attention": return "Attention flag";
    case "program_instruction": return "Block note";
    case "workout_instruction": return "Workout note";
    default: return source;
  }
}

/** Collapsed row for a Trainerize-performed workout, expanding on click. */
function PerformedWorkoutRow({
  workout,
  clientNumber,
  isOpen,
  onToggle,
  detail,
}: {
  workout: TrainerizePerformedWorkoutSummary;
  clientNumber: number;
  isOpen: boolean;
  onToggle: () => void;
  detail: TrainerizePerformedExerciseDetail[] | "loading" | "error" | undefined;
}) {
  const exerciseCount = workout.exercises.length;
  return (
    <div>
      <button type="button" className="srow" style={{ paddingLeft: 30 }} onClick={onToggle}>
        <span className="srow-d" style={{ width: 18, fontSize: 12 }}>{isOpen ? "\u25be" : "\u25b8"}</span>
        <span className="srow-w">
          {workout.workoutName || "Workout"}
          <small>
            {fmtShortDate(workout.performedDate)} \u00b7 {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} \u00b7 {workout.setCount} set{workout.setCount !== 1 ? "s" : ""}
          </small>
        </span>
      </button>
      {isOpen && (
        <div className="fcard-b pad rounded-control-sm" style={{ background: "var(--hub-hover)", borderBottom: "1px solid var(--hub-border)", marginLeft: 18 }}>
          {detail === "loading" && <p className="miss" style={{ margin: 0 }}>Loading sets\u2026</p>}
          {detail === "error" && <p className="miss" style={{ margin: 0 }}>Couldn&rsquo;t load this workout&rsquo;s sets.</p>}
          {Array.isArray(detail) && detail.length === 0 && (
            <p className="miss" style={{ margin: 0 }}>No sets recorded for this workout.</p>
          )}
          {Array.isArray(detail) && detail.map((ex, i) => (
            <div key={i} style={{ marginBottom: i < detail.length - 1 ? 10 : 0 }}>
              <p className="fk" style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--color-ink)" }}>{ex.name}</p>
              <table className="ptab">
                <thead>
                  <tr><th>Set</th><th>Reps</th><th>Weight</th><th>RPE</th></tr>
                </thead>
                <tbody>
                  {ex.sets.map((s, si) => (
                    <tr key={si}>
                      <td className="n">{s.setNumber}</td>
                      <td className="n">{s.reps ?? "\u2014"}</td>
                      <td className="n">{s.weightKg != null ? `${s.weightKg}kg` : "\u2014"}</td>
                      <td className="n">{s.rpe ?? "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

interface TrainingDrawerProps {
  clientNumber: number;
  clientName: string;
  latestBlock: DBBlock | null;
  blockSessions: DBSession[];
  allBlocks: DBBlock[];
  allSessions: DBSession[];
  blockSessionCounts: Record<number, number>;
  blockDateRangeLabel: string;
  trainerizeHistory: TrainerizeHistoryData;
  sessionsRemaining: number | null;
}

export function TrainingDrawer({
  clientNumber,
  clientName,
  latestBlock,
  blockSessions,
  allBlocks,
  allSessions,
  blockSessionCounts,
  blockDateRangeLabel,
  trainerizeHistory,
  sessionsRemaining,
}: TrainingDrawerProps) {
  const { openWorkoutDrawer } = useDrawerManager();

  // Block map cells from real session data
  const mapSessions = blockSessions.map((s) => ({
    id: s.id,
    sessionNumber: s.session_number ?? 0,
    scheduledAt: s.scheduled_at ?? null,
    isCompleted: !!s.completed_at,
    isNext: false,
    focusLabel: sessionWorkoutName(s),
    hasWorkout: sessionWorkoutName(s) !== "No workout assigned yet",
  }));

  // Past blocks (all except the latest)
  const pastBlocks = allBlocks.filter((b) => latestBlock && b.id !== latestBlock.id);

  // Trainerize history summary
  const tBlocks = trainerizeHistory.blocks ?? [];
  const unmatched = trainerizeHistory.unmatchedPerformedWorkouts ?? [];
  const notes = trainerizeHistory.notes ?? [];
  const tzTotalSessions = tBlocks.reduce(
    (sum: number, b: any) => sum + (b.performedWorkouts?.length ?? 0), 0
  ) + unmatched.length;
  const hasHistory = tBlocks.length > 0 || unmatched.length > 0 || notes.length > 0;

  const allDates: string[] = [];
  for (const b of tBlocks) {
    if (b.start_date) allDates.push(b.start_date);
    if (b.end_date) allDates.push(b.end_date);
  }
  for (const w of unmatched) if (w.performedDate) allDates.push(w.performedDate);
  const sortedDates = allDates.sort();
  const periodStart = sortedDates.length > 0 ? sortedDates[0] : null;
  const periodEnd = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [detailCache, setDetailCache] = useState<Record<string, TrainerizePerformedExerciseDetail[] | "loading" | "error">>({});

  const toggleWorkout = (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null);
      return;
    }
    setExpandedWorkoutId(workoutId);
    if (detailCache[workoutId]) return;
    setDetailCache((c) => ({ ...c, [workoutId]: "loading" }));
    fetch(`/api/clients/${clientNumber}/trainerize-workout/${workoutId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((json) => setDetailCache((c) => ({ ...c, [workoutId]: json.exercises ?? [] })))
      .catch(() => setDetailCache((c) => ({ ...c, [workoutId]: "error" })));
  };

  const renderPerformedList = (workouts: TrainerizePerformedWorkoutSummary[]) =>
    workouts.map((w) => (
      <PerformedWorkoutRow
        key={w.id}
        workout={w}
        clientNumber={clientNumber}
        isOpen={expandedWorkoutId === w.id}
        onToggle={() => toggleWorkout(w.id)}
        detail={detailCache[w.id]}
      />
    ));

  return (
    <DrawerShell
      id="dw-training"
      title="Training"
      subtitle={latestBlock
        ? `Block ${latestBlock.block_number} · ${blockSessionCounts[latestBlock.block_number] ?? blockSessions.length} sessions`
        : allBlocks.length > 0 ? `${allBlocks.length} blocks` : "No training blocks yet"}
      width="lg"
    >
      {/* ── Block map ── */}
      {latestBlock && mapSessions.length > 0 && (
        <div className="mb-3">
          <BlockMap sessions={mapSessions} />
        </div>
      )}

      {/* ── Supplementary work ── */}
      <div className="mb-3">
        <SupplementaryWorkoutsCard
          clientNumber={clientNumber}
          clientName={clientName}
          sessionsRemaining={sessionsRemaining}
        />
      </div>

      {/* ── Past blocks ── */}
      {pastBlocks.length > 0 && (
        <div className="mb-3">
          <p className="dw-h">Past blocks</p>
          {pastBlocks.map((block) => {
            const blockSessionsForCount = allSessions.filter(
              (s) => s.block_id === block.id && !s.parent_session_id
            );
            const dates = blockSessionsForCount
              .filter((s) => s.scheduled_at)
              .map((s) => s.scheduled_at!)
              .sort();
            const dateLabel = dates.length > 0
              ? `${fmtDate(dates[0])}${dates.length > 1 ? `\u2013${fmtDate(dates[dates.length - 1])}` : ""}`
              : "Not scheduled";

            return (
              <div
                key={block.id}
                className="flex items-center gap-[11px] w-full py-[7px] px-[11px] border border-transparent rounded-nested transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)]"
              >
                <Link
                  href={`/hub/clients/${clientNumber}/blocks/${block.id}`}
                  className="flex items-center gap-[11px] flex-1 min-w-0 no-underline focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(193,131,159,.3)] rounded-nested"
                >
                  <span className="w-[26px] h-[26px] shrink-0 rounded-control grid place-items-center text-[11px] font-extrabold bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
                    {block.block_number}
                  </span>
                  <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] font-semibold">
                    {blockDisplayName(block, blockSessionsForCount, blockSessionsForCount.length)}
                    <small className="text-xs font-normal text-[var(--color-body)] ml-2">
                      {blockSessionsForCount.length} session{blockSessionsForCount.length === 1 ? "" : "s"} \u00b7 {dateLabel}
                    </small>
                  </span>
                  <span className="shrink-0">
                    <span className="inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]">
                      {block.status}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-rose)]">
                    See what she lifted \u203a
                  </span>
                </Link>
                {block.status === "complete" && (
                  <Link
                    href={`/hub/clients/${clientNumber}/updates/block-review/${block.id}`}
                    className="shrink-0 inline-flex items-center justify-center rounded-control border border-[var(--hub-field-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold text-foreground no-underline hover:bg-[var(--hub-hover)] transition-colors"
                  >
                    Review &amp; send
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Trainerize pre-app import ── */}
      {hasHistory && (
        <div className="mb-3">
          <p className="dw-h">Before the app</p>
          <div className="fcard acc-ink">
            <div className="fcard-h">Imported</div>
            <div className="fcard-b">
              <div className="fgrid">
                <div className="frow"><span className="fk">Period</span><span className="fv num">{periodStart && periodEnd ? `${fmtShortDate(periodStart)} \u2013 ${fmtShortDate(periodEnd)}` : "\u2014"}</span></div>
                <div className="frow"><span className="fk">Blocks</span><span className="fv num">{tBlocks.length}</span></div>
                <div className="frow"><span className="fk">Sessions</span><span className="fv num">{tzTotalSessions}</span></div>
                <div className="frow"><span className="fk">Notes</span><span className="fv num">{notes.length}</span></div>
              </div>
            </div>
          </div>

          {tBlocks.length > 0 && (
            <>
              <p className="dw-h">Training blocks \u2014 tap to see sessions</p>
              {tBlocks.map((b) => {
                const isOpen = expandedBlockId === b.id;
                const performed = b.performedWorkouts ?? [];
                return (
                  <div key={b.id}>
                    <button
                      type="button"
                      className="srow"
                      onClick={() => setExpandedBlockId(isOpen ? null : b.id)}
                    >
                      <span className="srow-d" style={{ width: 18, fontSize: 13 }}>{isOpen ? "\u25be" : "\u25b8"}</span>
                      <span className="srow-w">
                        {b.phase_name || "Block"}
                        <small>
                          {b.start_date && b.end_date
                            ? `${fmtShortDate(b.start_date)} \u2013 ${fmtShortDate(b.end_date)}`
                            : b.start_date
                              ? `From ${fmtShortDate(b.start_date)}`
                              : "Not dated"}
                          {" \u00b7 "}
                          {performed.length > 0 ? `${performed.length} session${performed.length !== 1 ? "s" : ""} performed` : "no sessions logged"}
                        </small>
                      </span>
                    </button>
                    {isOpen && (
                      performed.length > 0
                        ? renderPerformedList(performed)
                        : <p className="miss" style={{ padding: "10px 0 10px 30px", margin: 0 }}>No logged sessions fell inside this block&rsquo;s dates.</p>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {unmatched.length > 0 && (
            <>
              <p className="dw-h">Outside any block</p>
              <p className="miss" style={{ margin: "0 0 8px" }}>
                {unmatched.length} logged session{unmatched.length !== 1 ? "s" : ""} from before this client&rsquo;s first imported block.
              </p>
              {renderPerformedList(unmatched)}
            </>
          )}

          <button
            type="button"
            className="dw-h"
            style={{ background: "none", border: 0, padding: 0, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, font: "inherit" }}
            onClick={() => setNotesOpen((v) => !v)}
          >
            <span style={{ fontSize: 11 }}>{notesOpen ? "\u25be" : "\u25b8"}</span>
            Notes ({notes.length})
          </button>
          {notesOpen && (
            notes.length > 0 ? (
              notes.map((n) => (
                <div key={n.id} className="drow">
                  <span className="drow-m">
                    {sourceLabel(n.source)}{n.sender_name ? ` \u00b7 ${n.sender_name}` : ""}
                    <small style={{ whiteSpace: "pre-wrap" }}>{n.content}</small>
                  </span>
                  <span className="fk num" style={{ minWidth: 0, flexShrink: 0 }}>{fmtShortDate(n.source_date)}</span>
                </div>
              ))
            ) : (
              <p className="miss">No notes or messages imported.</p>
            )
          )}

          <p className="miss" style={{ margin: "14px 0 0" }}>
            Imported history cannot be edited and does not count toward the session pot.
          </p>
        </div>
      )}
    </DrawerShell>
  );
}
