/**
 * Shared session display helpers — CR-EF-115.
 *
 * Workout name is primary, block context is secondary.
 * Every surface that shows a session name should use `sessionWorkoutName`
 * so the resolution chain is identical everywhere.
 */

import { DEFAULT_ARCHETYPE_FOCUS_LABELS } from "@/lib/planAgentPrompt";

const OUTLOOK_BOOKING_PREFIX = "Outlook booking — ";

/**
 * Detect an Outlook-auto-created session with no workout assigned.
 * Structural signature: focus_label starts with "Outlook booking — ",
 * archetype/week/phase are all null, and all exercise arrays are empty.
 */
function isOutlookPlaceholder(session: {
  archetype?: string | null;
  week?: number | null;
  phase?: string | null;
  data?: {
    focus_label?: string;
    versions?: {
      studio?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
      home?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
    };
  };
}): boolean {
  if (session.archetype != null || session.week != null || session.phase != null) return false;
  const v = session.data?.versions;
  const isEmpty = (arr?: unknown[]) => !arr || arr.length === 0;
  const studioEmpty = isEmpty(v?.studio?.warm_up) && isEmpty(v?.studio?.main_block) && isEmpty(v?.studio?.cooldown);
  const homeEmpty = isEmpty(v?.home?.warm_up) && isEmpty(v?.home?.main_block) && isEmpty(v?.home?.cooldown);
  if (!studioEmpty || !homeEmpty) return false;
  return (session.data?.focus_label ?? "").startsWith(OUTLOOK_BOOKING_PREFIX);
}

/**
 * Resolve the primary workout name for a session.
 *
 * Resolution chain:
 *   1. "No workout assigned yet" for Outlook placeholders (CR-EF-111)
 *   2. `data.focus_label` (the trainer-assigned workout name)
 *   3. Archetype-derived default ("Mobility & Movement Quality", etc.)
 *   4. Fallback string
 *
 * This is the single source of truth for session name resolution.
 * All surfaces should use this function.
 */
export function sessionWorkoutName(
  session: {
    archetype?: string | null;
    week?: number | null;
    phase?: string | null;
    data?: {
      focus_label?: string;
      versions?: {
        studio?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
        home?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
      };
    };
  },
  fallback: string = "—",
): string {
  if (isOutlookPlaceholder(session)) return "No workout assigned yet";
  const focusLabel = session.data?.focus_label?.trim();
  if (focusLabel) return focusLabel;
  return DEFAULT_ARCHETYPE_FOCUS_LABELS[session.archetype ?? ""] || fallback;
}

/**
 * Check whether a session has no exercises in any section of any version.
 * Used to decide whether to show "Assign workout" vs "Edit" on the block
 * overview. A cancelled or completed session is never treated as "empty"
 * for this purpose — the caller gates on status before using this.
 */
export function sessionHasNoExercises(data: {
  versions?: {
    studio?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
    home?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
  };
}): boolean {
  const v = data.versions;
  const isEmpty = (arr?: unknown[]) => !arr || arr.length === 0;
  const studioEmpty = isEmpty(v?.studio?.warm_up) && isEmpty(v?.studio?.main_block) && isEmpty(v?.studio?.cooldown);
  const homeEmpty = isEmpty(v?.home?.warm_up) && isEmpty(v?.home?.main_block) && isEmpty(v?.home?.cooldown);
  return studioEmpty && homeEmpty;
}

/**
 * Format the secondary block context line: "Block 1 · Session 3 of 6".
 * Returns an empty string when there is no block context to show.
 */
export function sessionBlockContext(
  blockNumber: number | null | undefined,
  position: number | null | undefined,
  total: number | null | undefined,
): string {
  if (blockNumber == null) return "";
  const posLabel = position != null && total != null ? `Session ${position} of ${total}` : "";
  return posLabel ? `Block ${blockNumber} · ${posLabel}` : `Block ${blockNumber}`;
}
