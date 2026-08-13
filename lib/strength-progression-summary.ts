import type { SetLog } from "@/types";
import { buildExerciseHistory, formatDate } from "@/lib/exercise-history";

/**
 * Plain-text strength-progression section for the update-generation AI
 * prompts (lib/generate-six-week-update.ts, app/api/claude/update-chat/route.ts).
 *
 * 2026-08-13: the update generator previously had zero visibility into a
 * client's actual set_logs/personal_records — Esther described "having to
 * argue" with the Plan Agent to get it to reflect real progress, and this is
 * likely why: the richest, most concrete data the app collects (real weights
 * and reps per exercise) was never in the prompt at all. This reuses
 * lib/exercise-history.ts's existing PB/last-performed derivation rather than
 * computing anything new — no period-over-period trend/delta math here (see
 * the plan for why that's deliberately out of scope for this pass).
 */
export function buildStrengthProgressionSection(logs: SetLog[]): string {
  const history = buildExerciseHistory(logs);
  if (history.length === 0) return "No logged set data for the recent blocks.";

  const lines: string[] = [];
  for (const entry of history) {
    const pb = entry.personalBests[0];
    const pbText = pb
      ? pb.weightKg != null
        ? `PB ${pb.weightKg}kg x ${pb.reps} (${formatDate(pb.achievedAt)})`
        : `PB: held ${pb.durationSeconds}s (${formatDate(pb.achievedAt)})`
      : "no PB on file";

    const last = entry.lastPerformed;
    const lastText = last
      ? last.weightKg != null
        ? `last performed ${last.weightKg}kg x ${last.reps} on ${formatDate(last.loggedAt)}`
        : last.durationSeconds != null
          ? `last performed: held ${last.durationSeconds}s on ${formatDate(last.loggedAt)}`
          : `last performed ${formatDate(last.loggedAt)}`
      : "not yet performed";

    lines.push(`- ${entry.exerciseName}: ${pbText}; ${lastText} (${entry.totalSessions} session${entry.totalSessions === 1 ? "" : "s"} logged)`);
  }

  return `Strength progression (real logged set data for the recent blocks):\n${lines.join("\n")}`;
}
