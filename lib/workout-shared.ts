/**
 * Shared workout types and utilities for CR-EF-011 + CR-EF-014 + CR-EF-116.
 * Used by both the desktop and mobile workout surfaces.
 */

import type { Exercise, SetLog, SessionVersion } from "@/types";

export type SectionKey = "warm_up" | "main_block" | "cooldown";

export interface SectionDef {
  key: SectionKey;
  label: string;
  /** Icon class for the section header. */
  icon: "warm" | "main" | "cool";
}

export const SECTION_DEFS: SectionDef[] = [
  { key: "warm_up", label: "Warm-up", icon: "warm" },
  { key: "main_block", label: "Main block", icon: "main" },
  { key: "cooldown", label: "Cool-down", icon: "cool" },
];

export type SetStatus = "pending" | "done" | "skipped";

export interface SetState {
  status: SetStatus;
  reps: string;
  weight: string;
  duration: string;
  /** CR-EF-014 — band colour for this set (e.g. "Green"). */
  band_colour: string;
  savedId?: string;
  isNewPb?: boolean;
  isWarmup: boolean;
  pendingSync?: boolean;
  clientOpId?: string;
}

export interface ExState {
  uid: string;
  ref: string;
  sets: SetState[];
  note: string;
  noteOpen: boolean;
  displayUnit: "kg" | "lb";
}

/** How an exercise is loaded — determines the input fields shown. */
export type LoadType = "weight" | "band" | "time" | "bodyweight";

/** Determine the load type for an exercise based on its equipment and log_type. */
export function getLoadType(ex: Exercise): LoadType {
  if (ex.log_type === "time") return "time";
  if (ex.equipment?.some((e) => /band/i.test(e))) return "band";
  if (ex.equipment?.length === 0 || ex.equipment?.every((e) => /bodyweight/i.test(e))) {
    return "bodyweight";
  }
  return "weight";
}

/** Check if an exercise is banded (has band equipment or explicit band_colour). */
export function isBanded(ex: Exercise): boolean {
  return !!ex.band_colour || (ex.equipment?.some((e) => /band/i.test(e)) ?? false);
}

/** Count completed sets for an exercise. */
export function doneCount(sets: SetState[]): number {
  return sets.filter((s) => s.status === "done").length;
}

/** Check if all sets for an exercise have been logged (done or skipped). */
export function isSettled(sets: SetState[]): boolean {
  return sets.every((s) => s.status !== "pending");
}

/** Get the previous best for PB comparison. */
export interface PrevBest {
  reps: number;
  weight_kg?: number;
  band_colour?: string;
}

/**
 * CR-EF-014 + CR-EF-116 PB logic — determine if a set beats the previous best.
 * Rules:
 * - Warm-up sets NEVER register as a PB.
 * - Must be completed (done).
 * - Must meet or exceed the previous best reps.
 * - For weight: heavier load at equal-or-more reps.
 * - For bands: higher bandLoad (tension_kg primary, sort_order fallback) at equal-or-more reps.
 * - Equal load is HOLDING, not setting.
 *
 * @param bandLoad - callback returning a comparable numeric value for a band colour.
 *   Callers provide tension_kg when available, falling back to sort_order for NULL tension_kg.
 */
export function beatsBest(
  set: SetState,
  loadType: LoadType,
  prevBest: PrevBest | null | undefined,
  bandLoad: (colour: string) => number,
): boolean {
  if (set.status !== "done" || set.isWarmup || !prevBest) return false;

  const reps = parseInt(set.reps, 10);
  if (!reps || reps < prevBest.reps) return false;

  if (loadType === "weight") {
    const w = parseFloat(set.weight);
    return !isNaN(w) && w > (prevBest.weight_kg ?? 0);
  }

  if (loadType === "band") {
    if (!set.band_colour) return false;
    return bandLoad(set.band_colour) > bandLoad(prevBest.band_colour ?? "");
  }

  return false;
}

/**
 * CR-EF-014 + CR-EF-116 — ONE badge per exercise. The best qualifying set of the session,
 * earliest on a tie. Repeating the same load is HOLDING a PB, not setting one.
 *
 * @param bandLoad - callback returning a comparable numeric value for a band colour.
 *   Callers provide tension_kg when available, falling back to sort_order for NULL tension_kg.
 */
export function findPbSet(
  sets: SetState[],
  loadType: LoadType,
  prevBest: PrevBest | null | undefined,
  bandLoad: (colour: string) => number,
): number {
  let bestIdx = -1;
  let topLoad = -1;

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    if (!beatsBest(s, loadType, prevBest, bandLoad)) continue;

    let load: number;
    if (loadType === "weight") {
      load = parseFloat(s.weight) || 0;
    } else {
      load = bandLoad(s.band_colour);
    }

    if (load > topLoad) {
      topLoad = load;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/** Format the prescribed line for an exercise. */
export function prescLine(ex: Exercise, bandLookup?: (colour: string) => { colour: string; tension_label: string } | null): string {
  const loadType = getLoadType(ex);
  const setCount = ex.sets - (loadType === "weight" && ex.warmup_sets ? ex.warmup_sets : 0);

  if (loadType === "band" && ex.band_colour) {
    const band = bandLookup?.(ex.band_colour);
    const bandName = band ? `${band.colour} band` : `${ex.band_colour} band`;
    return `${setCount} × ${ex.reps} · ${bandName}`;
  }
  if (loadType === "weight") {
    return `${setCount} × ${ex.reps} @ ${ex.rest} kg`;
  }
  if (loadType === "time") {
    const secs = ex.reps.replace(/\D/g, "");
    return `${ex.sets} × ${secs}s hold`;
  }
  return `${ex.sets} × ${ex.reps}`;
}

/** Format the target text for a single set row. */
export function setTargetText(ex: Exercise, set: SetState, bandLookup?: (colour: string) => { colour: string } | null): string {
  const loadType = getLoadType(ex);

  if (loadType === "time") {
    return set.duration || ex.reps.replace(/\D/g, "") + "s";
  }
  if (loadType === "band") {
    if (set.band_colour) {
      const band = bandLookup?.(set.band_colour);
      return `${set.reps || ex.reps} · ${band ? band.colour + " band" : set.band_colour}`;
    }
    return `${ex.reps} · ${ex.band_colour ?? "Choose band"}`;
  }
  if (loadType === "weight") {
    return `${set.reps || ex.reps} @ ${set.weight || ex.rest} kg`;
  }
  return set.reps || ex.reps;
}
