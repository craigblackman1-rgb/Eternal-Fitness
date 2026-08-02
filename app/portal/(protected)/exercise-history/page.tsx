/**
 * Portal — Exercise History page. Shows personal bests and last-performed
 * weights/durations per exercise, derived from the client's own set_logs.
 * Read-only — no client-editable fields.
 */

import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { buildExerciseHistory } from "@/lib/exercise-history";
import { ExerciseHistoryPanel } from "@/components/progress/ExerciseHistoryPanel";

export default async function PortalExerciseHistoryPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const setLogHistory = await data.getSetLogHistory();
  const history = buildExerciseHistory(setLogHistory.logs);

  return (
    <div className="space-y-8">
      <section aria-labelledby="exercise-history-heading">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Your training
        </p>
        <h1 id="exercise-history-heading" className="text-2xl font-semibold tracking-tight">
          Exercise History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personal bests and your most recent performance for each exercise.
        </p>
      </section>

      <section aria-labelledby="exercise-history-detail">
        <ExerciseHistoryPanel
          history={history}
          emptyTitle="No exercise history yet"
          emptyDescription="Your personal bests and exercise history will appear here once you or your trainer log sets against your sessions."
          idPrefix="portal-exercise-history"
        />
      </section>
    </div>
  );
}
