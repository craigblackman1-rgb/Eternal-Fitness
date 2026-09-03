"use client";

/**
 * Per-exercise history panel — PB + last performed. Shared by the hub (any
 * client) and the portal (own data only). Receives pre-computed, serialisable
 * history data from a server component — no data fetching here.
 *
 * CR-EF-147 — when clientId/clientName/bands are provided, shows an
 * "Add personal best manually" button that opens the ExerciseHistoryDrawer.
 */

import { useState } from "react";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconClock, IconAward, IconBarChart3 } from "@/components/icons";
import { ExerciseHistoryDrawer } from "@/components/workout/ExerciseHistoryDrawer";
import type { ExerciseHistoryEntry } from "@/lib/exercise-history";
import type { Band } from "@/lib/bands";
import { formatDate } from "@/lib/exercise-history";

interface ExerciseHistoryPanelProps {
  history: ExerciseHistoryEntry[];
  emptyTitle?: string;
  emptyDescription?: string;
  idPrefix?: string;
  /** CR-EF-147 — when provided, enables the "Add PB" button + drawer. */
  clientId?: string;
  clientName?: string;
  bands?: Band[];
  /** Called after a manual PB is saved, so the parent can refresh data. */
  onPbSaved?: () => void;
}

export function ExerciseHistoryPanel({
  history,
  emptyTitle = "No logged sessions yet",
  emptyDescription = "Once sets are logged against a session, exercise history will appear here.",
  idPrefix = "exercise-history",
  clientId,
  clientName,
  bands,
  onPbSaved,
}: ExerciseHistoryPanelProps) {
  const [selectedName, setSelectedName] = useState<string>(history[0]?.exerciseName ?? "");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const canAddPb = !!clientId && !!clientName && !!bands;

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<IconBarChart3 className="w-7 h-7" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const entry = history.find((e) => e.exerciseName === selectedName) ?? history[0];
  const selectId = `${idPrefix}-select`;
  const hasWeightData = entry.personalBests.some((pb) => pb.weightKg !== null);
  const isTimeBased = entry.personalBests.length === 1 && entry.personalBests[0].durationSeconds !== null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5"
          >
            Exercise
          </label>
          <select
            id={selectId}
            value={entry.exerciseName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="h-9 max-w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose/40"
          >
            {history.map((e) => (
              <option key={e.exerciseName} value={e.exerciseName}>
                {e.exerciseName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {entry.totalSessions} logged session{entry.totalSessions === 1 ? "" : "s"}
          </div>
          {canAddPb && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add PB
            </button>
          )}
        </div>
      </div>

      {/* Personal Bests */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <IconAward className="w-4 h-4 text-amber" />
          <h3 className="text-sm font-semibold text-foreground">Personal Bests</h3>
        </div>
        {entry.personalBests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No personal bests recorded yet for this exercise.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--hub-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                  {hasWeightData && (
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Reps
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isTimeBased ? "Duration" : hasWeightData ? "Weight" : "Best"}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Achieved
                  </th>
                </tr>
              </thead>
              <tbody>
                {entry.personalBests.map((pb, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--hub-border)] last:border-0"
                  >
                    {hasWeightData && (
                      <td className="px-3 py-2 font-medium text-foreground tabular-nums">
                        {pb.reps !== null ? `×${pb.reps}` : "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 font-semibold text-foreground tabular-nums">
                      {pb.weightKg !== null
                        ? `${pb.weightKg} kg`
                        : pb.durationSeconds !== null
                          ? `${pb.durationSeconds}s`
                          : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {formatDate(pb.achievedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Last Performed */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <IconClock className="w-4 h-4 text-teal" />
          <h3 className="text-sm font-semibold text-foreground">Last Performed</h3>
        </div>
        {entry.lastPerformed ? (
          <div className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] p-4">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Date</dt>
                <dd className="text-sm font-medium text-foreground">
                  {formatDate(entry.lastPerformed.loggedAt)}
                </dd>
              </div>
              {entry.lastPerformed.weightKg !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Weight</dt>
                  <dd className="text-sm font-semibold text-foreground tabular-nums">
                    {entry.lastPerformed.weightKg} kg
                  </dd>
                </div>
              )}
              {entry.lastPerformed.reps !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Reps</dt>
                  <dd className="text-sm font-medium text-foreground tabular-nums">
                    ×{entry.lastPerformed.reps}
                  </dd>
                </div>
              )}
              {entry.lastPerformed.durationSeconds !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Duration</dt>
                  <dd className="text-sm font-medium text-foreground tabular-nums">
                    {entry.lastPerformed.durationSeconds}s
                  </dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No logged sessions yet for this exercise.
          </p>
        )}
      </div>

      {/* CR-EF-147 — ExerciseHistoryDrawer for adding a manual PB */}
      {canAddPb && (
        <ExerciseHistoryDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          clientId={clientId}
          clientName={clientName}
          exerciseName={entry.exerciseName}
          bands={bands}
          onSaved={() => {
            setDrawerOpen(false);
            onPbSaved?.();
          }}
        />
      )}
    </div>
  );
}
