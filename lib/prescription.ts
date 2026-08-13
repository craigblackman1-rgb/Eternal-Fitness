import type { Exercise } from "@/types";

export function isTimeBased(reps: string, logType?: "reps" | "time"): boolean {
  if (logType === "time") return true;
  if (logType === "reps") return false;
  return /\d\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i.test(reps || "");
}

export function parsePrescribedSeconds(reps: string): number | null {
  const m = (reps || "").match(/(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return /^m/i.test(m[2]) ? n * 60 : n;
}

export function parsePrescribedReps(reps: string): number | null {
  const m = (reps || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export function parseRestSeconds(rest: string): number | null {
  const trimmed = (rest || "").trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;

  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)?$/i);
  if (rangeMatch) {
    const upper = parseInt(rangeMatch[2], 10);
    const unit = rangeMatch[3];
    return unit && /^m/i.test(unit) ? upper * 60 : upper;
  }

  const m = trimmed.match(/^(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  return unit && /^m/i.test(unit) ? n * 60 : n;
}

export function formatPrescription(ex: Exercise): string {
  const sets = ex.sets ?? 1;
  const reps = ex.reps || "—";
  const tempo = ex.tempo && ex.tempo !== "—" ? ` @ tempo ${ex.tempo}` : "";
  const rest = ex.rest && ex.rest !== "—" ? ` · ${ex.rest} rest` : "";
  return `${sets} × ${reps}${tempo}${rest}`;
}
