/**
 * CR-EF-132 — pure helpers for the "Show all exercises" glance view.
 * No React imports; no side effects; no data fetching.
 */

import { loadText, parseLoad } from "@/lib/load-helpers";
import type { Exercise, DBSession, SessionVersion } from "@/types";

// ── Exercise subset for the glance view ────────────────────────

/** Structural subset of Exercise that the glance view reads. Does NOT include
 *  coaching_cue, modification, or equipment — fields the glance table never renders. */
export type GlanceExercise = Pick<
  Exercise,
  "exercise_name" | "sets" | "reps" | "tempo" | "rest" | "load" | "band_colour" | "group_label"
>;

// ── Section extraction ─────────────────────────────────────────

export interface GlanceSection {
  label: string;
  version: "studio" | "home";
  exercises: GlanceExercise[];
}

const SECTION_LABELS: [keyof SessionVersion, string][] = [
  ["warm_up", "Warm-up"],
  ["main_block", "Main block"],
  ["cooldown", "Cool-down"],
];

/**
 * Extract labelled exercise sections from a session's data.
 * Prefers studio; falls back to home when studio is empty.
 * Returns [] when the session has no workout at all.
 */
export function glanceSections(session: DBSession): GlanceSection[] {
  const v = session.data?.versions;
  if (!v) return [];

  const fromVersion = (
    ver: SessionVersion | undefined,
    prefix: string,
  ): GlanceSection[] => {
    if (!ver) return [];
    return SECTION_LABELS
      .map(([key, label]) => ({
        label: prefix ? `${prefix} — ${label}` : label,
        version: prefix ? "home" as const : "studio" as const,
        exercises: (ver[key] ?? []) as Exercise[],
      }))
      .filter((s) => s.exercises.length > 0);
  };

  const studio = fromVersion(v.studio, "");
  if (studio.length > 0) return studio;

  const home = fromVersion(v.home, "Home");
  return home;
}

// ── Load label ─────────────────────────────────────────────────

export interface LoadLabel {
  text: string;
  muted: boolean;
}

/**
 * Render a load label for a single exercise.
 * muted = true for bodyweight/token loads and "Not prescribed".
 */
export function exerciseLoadLabel(ex: Pick<Exercise, "load" | "band_colour">): LoadLabel {
  if (ex.load) {
    const p = parseLoad(ex.load);
    const text = loadText(ex.load);
    const muted = p?.kind === "token";
    return { text, muted };
  }
  if (ex.band_colour) {
    return { text: `${ex.band_colour} band`, muted: false };
  }
  return { text: "Not prescribed", muted: true };
}

// ── Structural signature for "Same as" collapse ────────────────

/**
 * Build a deterministic string that captures the structural content
 * of a session's exercises. Two sessions with the same signature
 * have identical exercise names, sets, reps, and load in the same order.
 * Returns null when the session has no sections.
 */
export function exerciseSignature(session: DBSession): string | null {
  const sections = glanceSections(session);
  if (sections.length === 0) return null;

  return sections
    .map((section) => {
      const lines = section.exercises.map((ex) => {
        const name = String(ex.exercise_name ?? "").trim().toLowerCase();
        const sets = String(ex.sets ?? "");
        const reps = String(ex.reps ?? "").trim().toLowerCase();
        const load = String(ex.load ?? ex.band_colour ?? "").trim().toLowerCase();
        return [
          name,
          sets,
          reps,
          load,
        ].join("|");
      });
      return [section.label, ...lines].join("\n");
    })
    .join("\n");
}

// ── Repeat detection ───────────────────────────────────────────

/**
 * Walk sessions in order; first occurrence of a signature keeps its
 * position. Later identical signatures map to the first occurrence's
 * position for the "Same as session N" label.
 */
export function glanceRepeats(
  ordered: DBSession[],
  positions: Map<string, { position: number; total: number }>,
): Map<string, number> {
  const seen = new Map<string, string>();
  const result = new Map<string, number>();

  for (const s of ordered) {
    const sig = exerciseSignature(s);
    if (sig === null) continue;
    const firstId = seen.get(sig);
    if (firstId === undefined) {
      seen.set(sig, s.id);
    } else {
      const firstPos = positions.get(firstId)?.position;
      result.set(s.id, firstPos ?? ordered.find(o => o.id === firstId)?.session_number ?? 0);
    }
  }

  return result;
}

// ── Workout count ──────────────────────────────────────────────

/**
 * Number of distinct non-null exercise signatures across sessions.
 */
export function glanceWorkoutCount(ordered: DBSession[]): number {
  const sigs = new Set<string>();
  for (const s of ordered) {
    const sig = exerciseSignature(s);
    if (sig !== null) sigs.add(sig);
  }
  return sigs.size;
}
