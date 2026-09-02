"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Session, SessionLog, SetLog, Exercise } from "@/types";
import type { Band } from "@/lib/bands";
import type { LastSessionPrefill, PbMetadata } from "@/lib/last-session-data";
import { computeGroups } from "@/lib/exercise-groups";
import {
  isTimeBased,
  parsePrescribedSeconds,
  parsePrescribedReps,
  parseRestSeconds,
  formatPrescription,
  estimateSectionSeconds,
  formatDurationEstimate,
} from "@/lib/prescription";
import { defaultUnitForEquipment, isBandEquipment, toKg, fromKg } from "@/lib/units";
import { parseLoad, loadText, prescribedWeight } from "@/lib/load-helpers";
import {
  enqueue,
  getAllPending,
  remove,
  type PendingSetLogEntry,
} from "@/lib/hub/offline-set-log-queue";
import { ExerciseHistoryDrawer } from "./ExerciseHistoryDrawer";

// ── Helpers ──────────────────────────────────────────────────────

function displayWeight(kg: number, unit: "kg" | "lb"): string {
  const v = Math.round(fromKg(kg, unit) * 10) / 10;
  return String(v);
}

type SectionKey = "warm_up" | "main_block" | "cooldown";

const SECTION_DEFS: { key: SectionKey; label: string; color: "teal" | "rose" | "navy" }[] = [
  { key: "warm_up", label: "Warm-up", color: "teal" },
  { key: "main_block", label: "Main block", color: "rose" },
  { key: "cooldown", label: "Cool-down", color: "navy" },
];

const SEC_ICON: Record<string, { bg: string; text: string; svg: React.ReactNode }> = {
  teal: {
    bg: "bg-teal/10",
    text: "text-teal",
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c2.5 3 4 5.2 4 7.5a4 4 0 0 1-8 0C8 8.2 9.5 6 12 3z" /><path d="M6 20h12" /></svg>,
  },
  rose: {
    bg: "bg-rose/10",
    text: "text-rose",
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 10h1.5M3 14h1.5M19.5 10H21M19.5 14H21M9 10h6v4H9z" /></svg>,
  },
  navy: {
    bg: "bg-[var(--hub-sidebar)]/10",
    text: "text-[var(--hub-sidebar)]",
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" /></svg>,
  },
};

interface SetState {
  status: "pending" | "done" | "skipped";
  reps: string;
  weight: string;
  duration: string;
  bandColour: string;
  savedId?: string;
  isNewPb?: boolean;
  isWarmup: boolean;
  pendingSync?: boolean;
  clientOpId?: string;
  /** CR-EF-010 — original prefilled values from last session (for undo). */
  prefillWeight?: string;
  prefillDuration?: string;
  prefillBandColour?: string;
}

interface PbInfo {
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  achieved_at: string;
  source?: "live_log" | "trainerize_import" | "manual";
}

interface LastSessionInfo {
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  band_colour: string | null;
  session_date: string;
  session_number: number | null;
}

interface ExState {
  uid: string;
  ref: string;
  sets: SetState[];
  note: string;
  noteOpen: boolean;
  displayUnit: "kg" | "lb";
  /** CR-EF-010 — PB info for the exercise header chip. */
  pbInfo?: PbInfo;
  /** CR-EF-010 — last session data for the "Last X" chip and prefill. */
  lastSession?: LastSessionInfo;
}

interface RestTimer {
  mode: "countdown" | "stopwatch";
  elapsed: number;
  seconds: number;
}

type SaveSetLogResult =
  | { kind: "saved"; log: SetLog & { is_new_pb?: boolean } }
  | { kind: "queued"; clientOpId: string }
  | { kind: "failed"; message?: string | null };

function exerciseRefKey(version: string, section: SectionKey, index: number, name: string): string {
  return `${version}:${section}:${index}:${name}`;
}

function mmss(total: number): string {
  const m = Math.floor(Math.abs(total) / 60);
  const s = Math.abs(total) % 60;
  return (total < 0 ? "+" : "") + m + ":" + String(s).padStart(2, "0");
}

// ── Icons ────────────────────────────────────────────────────────

const ICO = {
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  checkLg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  skip: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  chev: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  chevSm: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  clock: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  reps: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6v12M17.5 6v12M2 10h2M2 14h2M20 10h2M20 14h2M8.5 10h7v4h-7z" /></svg>,
  rest: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9 2h6" /></svg>,
  mic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></svg>,
  note: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  star: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.5L12 16.9 6.1 20.6l1.3-6.5L2.5 9.5l6.6-.8z" /></svg>,
  cloud: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 12.5 4.5 4.5 0 0 1 17.5 19Z" /><path d="m9 15 2 2 4-4" /></svg>,
  cloudOff: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a5 5 0 0 1-2-9.6" /><path d="M15.7 10a6 6 0 0 1 6.2 2.5A4.5 4.5 0 0 1 17.5 19" /><path d="M2 2l20 20" /></svg>,
  play: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  pause: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>,
  reset: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>,
  video: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 8.5l6 3.5-6 3.5z" /><rect x="2.5" y="4" width="19" height="16" rx="3" /></svg>,
  img: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 16l-5-5-6 6" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  starFilled: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>,
  history: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l3 2"/></svg>,
};

// ── Band component (CR-EF-014) ───────────────────────────────────

function bandById(bands: Band[], colour: string): Band | undefined {
  return bands.find((b) => b.colour.toLowerCase() === colour.toLowerCase());
}

/**
 * CR-EF-116: Build a map of band colour → comparable load value.
 * Primary: tension_kg (the real physical quantity).
 * Fallback: sort_order (for bands with NULL tension_kg).
 */
function bandLoadMap(bands: Band[]): Map<string, number> {
  const m = new Map<string, number>();
  bands.forEach((b) => {
    m.set(b.colour.toLowerCase(), b.tension_kg ?? b.sort_order);
  });
  return m;
}

function BandDot({ band }: { band: Band }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded-full"
      style={{ backgroundColor: band.colour_hex, boxShadow: "inset 0 0 0 1px rgba(19,19,19,.3)" }}
    />
  );
}

function BandChip({ band }: { band: Band }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-0.5 text-xs font-bold text-foreground">
      <BandDot band={band} />
      {band.colour} band
      <span className="text-[var(--body)] font-semibold tabular-nums">{band.tension_label}</span>
    </span>
  );
}

/** CR-EF-124 — prescribed load chip. Rose = prescribed, matching the colour contract. */
function LoadChip({ load }: { load: string | undefined | null }) {
  const parsed = parseLoad(load);
  if (!parsed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--hub-field-border)] px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
        Not prescribed
      </span>
    );
  }
  switch (parsed.kind) {
    case "weight":
      return (
        <span className="inline-flex items-baseline gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-rose">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>
          {parsed.value}<span className="text-[10px] font-bold text-rose/80">{parsed.unit}</span>
        </span>
      );
    case "pair":
      return (
        <span className="inline-flex items-baseline gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-rose">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>
          {parsed.multiplier} × {parsed.value}<span className="text-[10px] font-bold text-rose/80">{parsed.unit}</span>
        </span>
      );
    case "token":
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose">
          <span className="text-[10px] font-extrabold tracking-wider text-rose/80">Load</span>
          {parsed.label}
          {parsed.sub && <span className="text-[10px] font-semibold normal-case tracking-normal text-rose/70">{parsed.sub}</span>}
        </span>
      );
    case "band":
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[12px] font-bold text-rose">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>
          <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full border border-black/20" style={{ backgroundColor: bandColourHex(parsed.colour) }} />
          {parsed.colour} band
        </span>
      );
  }
}

/** Best-effort band colour to hex for the swatch. Falls back to a muted grey. */
function bandColourHex(colour: string): string {
  const map: Record<string, string> = {
    red: "#ef4444", orange: "#f97316", yellow: "#eab308", green: "#22c55e",
    blue: "#3b82f6", purple: "#a855f7", black: "#1a1a1a", white: "#e5e5e5",
    pink: "#ec4899", grey: "#9ca3af", gray: "#9ca3af",
  };
  return map[colour.toLowerCase()] ?? "#9ca3af";
}

// ── PB logic (CR-EF-014) ─────────────────────────────────────────

/**
 * Determine if a set beats the exercise's previous best.
 * Weight exercises: heavier at equal-or-more reps.
 * Band exercises: higher band load (tension_kg primary, sort_order fallback) at equal-or-more reps.
 * Warm-up sets are never eligible.
 */
function setBeatsBest(
  exercise: Exercise,
  set: SetState,
  loadMap: Map<string, number>,
): boolean {
  if (set.status !== "done" || set.isWarmup) return false;
  const best = exercise.band_colour !== undefined && exercise.equipment?.some((e) => /band/i.test(e))
    ? null // band exercises use loadMap comparison inline
    : null;
  const reps = parseInt(set.reps, 10);
  if (isNaN(reps) || reps <= 0) return false;

  const isBand = isBandEquipment(exercise.equipment ?? []);
  if (isBand) {
    // For band exercises, compare by tension_kg (or sort_order fallback)
    const setLoad = loadMap.get(set.bandColour?.toLowerCase() ?? "") ?? -1;
    if (setLoad < 0) return false;
    // If a band is logged and reps are met, it's a candidate
    return true;
  }

  // Weight exercises
  const weight = parseFloat(set.weight);
  if (isNaN(weight)) return false;
  // Any weight logged with sufficient reps is a candidate
  return true;
}

/**
 * Find the ONE qualifying PB set for an exercise — the earliest set that
 * achieves the highest load. Only non-warmup, completed sets qualify.
 */
function findPbSet(
  exercise: Exercise,
  sets: SetState[],
  loadMap: Map<string, number>,
  bestWeights?: Record<string, number>,
): { setIdx: number; set: SetState } | null {
  const isBand = isBandEquipment(exercise.equipment ?? []);
  let winIdx = -1;
  let topLoad = -Infinity;

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    if (s.status !== "done" || s.isWarmup) continue;

    let load: number;
    if (isBand) {
      load = loadMap.get(s.bandColour?.toLowerCase() ?? "") ?? -1;
      if (load < 0) continue;
    } else {
      load = parseFloat(s.weight);
      if (isNaN(load)) continue;
    }

    const reps = parseInt(s.reps, 10);
    if (isNaN(reps) || reps <= 0) continue;

    // Only consider sets that exceed the previous best
    const prevBest = bestWeights?.[exercise.exercise_name] ?? 0;
    if (!isBand && load <= prevBest) continue;
    if (isBand && load <= 0) continue;

    if (load > topLoad) {
      topLoad = load;
      winIdx = i;
    }
  }

  if (winIdx < 0) return null;
  return { setIdx: winIdx, set: sets[winIdx] };
}

// ── Main component ───────────────────────────────────────────────

export function WorkoutLog({
  sessionId,
  sessionNumber,
  version,
  data,
  sessionLog,
  setLogs,
  bestWeights,
  lastSessionData,
  pbDates,
  onSessionLogChange,
  bands,
  clientId,
  clientName,
  onPbRecorded,
}: {
  sessionId: string;
  sessionNumber: number;
  version: "studio" | "home";
  data: Session | null;
  sessionLog: SessionLog | null;
  setLogs: SetLog[];
  bestWeights?: Record<string, number>;
  /** CR-EF-010 — last session's best set per exercise (for prefill). */
  lastSessionData?: Record<string, LastSessionPrefill>;
  /** CR-EF-010 — PB metadata per exercise (for header chip). */
  pbDates?: Record<string, PbMetadata>;
  onSessionLogChange: (log: SessionLog) => void;
  bands: Band[];
  /** CR-EF-131 — client display number for the history drawer route. */
  clientId?: string;
  /** CR-EF-131 — client name for the history drawer header. */
  clientName?: string;
  /** CR-EF-131 — called after a manual PB is saved (triggers refresh). */
  onPbRecorded?: () => void;
}) {
  const sections = data?.versions?.[version] ?? { warm_up: [], main_block: [], cooldown: [] };

  const setLogsMap = useMemo(() => {
    const map: Record<string, SetLog> = {};
    for (const sl of setLogs) {
      map[`${sl.exercise_ref}::${sl.set_number}`] = sl;
    }
    return map;
  }, [setLogs]);

  const loadMap = useMemo(() => bandLoadMap(bands), [bands]);

  const savedNotesRef = useRef<Record<string, string>>({});
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  const sessionLogRef = useRef(sessionLog);
  dataRef.current = data;
  sessionLogRef.current = sessionLog;

  const initExStates = useCallback(
    (exercises: Exercise[], sectionKey: SectionKey): Record<string, ExState> => {
      const map: Record<string, ExState> = {};
      exercises.forEach((ex, idx) => {
        const uid = ex.uid ?? crypto.randomUUID();
        const ref = exerciseRefKey(version, sectionKey, idx, ex.exercise_name);
        const totalSets = Math.max(1, ex.sets || 1);
        const warmupCount = ex.warmup_sets ?? 0;
        const sets: SetState[] = [];
        const isBand = isBandEquipment(ex.equipment ?? []);
        const timeBased = isTimeBased(ex.reps, ex.log_type);
        const unit = ex.weight_unit ?? defaultUnitForEquipment(ex.equipment ?? []);
        const last = lastSessionData?.[ex.exercise_name];

        // CR-EF-010 + CR-EF-124: prescribed load takes precedence over last-session prefill.
        // For weight/pair loads, the prescribed value prefills the weight input.
        // Non-numeric loads (BODYWEIGHT, POWER, band, absent) fall back to last-session.
        const prescKg = prescribedWeight(ex.load);
        const prefillWeight = !isBand && !timeBased
          ? (prescKg != null
            ? displayWeight(prescKg, unit)
            : last?.weight_kg != null
              ? displayWeight(last.weight_kg, unit)
              : undefined)
          : undefined;
        const prefillDuration = timeBased && last?.duration_seconds != null
          ? String(last.duration_seconds)
          : undefined;
        const prefillBandColour = isBand && last?.band_colour
          ? last.band_colour
          : undefined;

        for (let s = 1; s <= totalSets; s++) {
          const log = setLogsMap[`${ref}::${s}`];
          const hasLog = !!log;
          sets.push({
            status: log ? (log.completed ? "done" : "skipped") : "pending",
            reps: log?.reps != null ? String(log.reps) : "",
            weight: log?.weight_kg != null
              ? displayWeight(log.weight_kg, unit)
              : prefillWeight ?? "",
            duration: log?.duration_seconds != null
              ? String(log.duration_seconds)
              : prefillDuration ?? "",
            bandColour: log?.band_colour ?? prefillBandColour ?? ex.band_colour ?? "",
            savedId: log?.id,
            isNewPb: log ? !!(log as SetLog & { is_new_pb?: boolean }).is_new_pb : undefined,
            isWarmup: log ? (log.is_warmup ?? s <= warmupCount) : s <= warmupCount,
            // CR-EF-010: only set prefill values for unlogged sets
            prefillWeight: !hasLog ? prefillWeight : undefined,
            prefillDuration: !hasLog ? prefillDuration : undefined,
            prefillBandColour: !hasLog ? prefillBandColour : undefined,
          });
        }
        if (savedNotesRef.current[uid] === undefined) {
          savedNotesRef.current[uid] = data?.exercise_notes?.[uid] ?? "";
        }
        map[ref] = {
          uid,
          ref,
          sets,
          note: savedNotesRef.current[uid],
          noteOpen: false,
          displayUnit: ex.weight_unit ?? defaultUnitForEquipment(ex.equipment ?? []),
          pbInfo: pbDates?.[ex.exercise_name],
          lastSession: last,
        };
      });
      return map;
    },
    [version, setLogsMap, data, lastSessionData, pbDates],
  );

  const [exStates, setExStates] = useState<Record<string, ExState>>(() => {
    const all: Record<string, ExState> = {};
    for (const sec of SECTION_DEFS) {
      Object.assign(all, initExStates(sections[sec.key] || [], sec.key));
    }
    return all;
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [rpe, setRpe] = useState<number | null>(sessionLog?.rpe ?? null);
  const [fatigue, setFatigue] = useState<SessionLog["fatigue"]>(sessionLog?.fatigue ?? null);
  const [sessionNotes, setSessionNotes] = useState(sessionLog?.notes ?? "");
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [restTimers, setRestTimers] = useState<Record<string, RestTimer>>({});
  const [sessionTimer, setSessionTimer] = useState<{ running: boolean; elapsed: number }>({ running: false, elapsed: 0 });
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  // CR-EF-131 — exercise history drawer
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  // CR-EF-010 — session PB tally and toast
  const pbTallyRef = useRef<Record<string, boolean>>({});

  const [offline, setOffline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allExerciseRefs = useMemo(() => {
    const refs: string[] = [];
    for (const sec of SECTION_DEFS) {
      (sections[sec.key] || []).forEach((ex, idx) => {
        refs.push(exerciseRefKey(version, sec.key, idx, ex.exercise_name));
      });
    }
    return refs;
  }, [sections, version]);

  const progress = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const ref of allExerciseRefs) {
      const state = exStates[ref];
      if (state) {
        total += state.sets.length;
        done += state.sets.filter((s) => s.status !== "pending").length;
      }
    }
    const started = done > 0;
    const doneExCount = allExerciseRefs.filter((ref) => {
      const st = exStates[ref];
      return st && st.sets.every((s) => s.status !== "pending");
    }).length;
    return { total, done, started, doneExCount, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [allExerciseRefs, exStates]);

  const queuedSetsCount = useMemo(() => {
    let n = 0;
    for (const ref of allExerciseRefs) {
      const st = exStates[ref];
      if (st) n += st.sets.filter((s) => s.pendingSync).length;
    }
    return n;
  }, [allExerciseRefs, exStates]);

  // ── started_at write on first mount ─────────────────────────────
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    if (sessionLogRef.current?.started_at) return;
    startedRef.current = true;
    const d = dataRef.current;
    if (!d) return;
    const updatedLog: SessionLog = {
      completed_at: sessionLogRef.current?.completed_at ?? null,
      rpe: sessionLogRef.current?.rpe ?? null,
      fatigue: sessionLogRef.current?.fatigue ?? null,
      notes: sessionLogRef.current?.notes ?? "",
      started_at: new Date().toISOString(),
    };
    fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ...d, session_log: updatedLog } }),
    }).catch(() => {});
    onSessionLogChange(updatedLog);
  }, [sessionId, onSessionLogChange]);

  // ── Debounced exercise-notes save ────────────────────────────────
  const persistExerciseNotes = useCallback(
    (notes: Record<string, string>) => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = setTimeout(() => {
        const d = dataRef.current;
        if (!d) return;
        fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { ...d, exercise_notes: notes } }),
        }).catch(() => {});
      }, 800);
    },
    [sessionId],
  );

  // ── Rest timer + session timer tick ──────────────────────────────
  useEffect(() => {
    const running = sessionTimer.running || Object.keys(restTimers).length > 0;
    if (running && !tickRef.current) {
      tickRef.current = setInterval(() => {
        if (sessionTimer.running) {
          setSessionTimer((prev) => ({ ...prev, elapsed: prev.elapsed + 1 }));
        }
        setRestTimers((prev) => {
          if (Object.keys(prev).length === 0) return prev;
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = { ...next[key], elapsed: next[key].elapsed + 1 };
          }
          return next;
        });
      }, 1000);
    } else if (!running && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [sessionTimer.running, restTimers]);

  // ── Set-log API (offline queue, idempotent) ──────────────────────
  const saveSetLog = async (
    exerciseRef: string,
    setNumber: number,
    fieldValues: { reps: string; weight: string; duration: string; bandColour: string },
    completed: boolean,
    isWarmup: boolean,
    displayUnit: "kg" | "lb",
    reuseClientOpId?: string,
  ): Promise<SaveSetLogResult> => {
    const key = `${exerciseRef}::${setNumber}`;
    const existing = setLogsMap[key];
    const repsVal = fieldValues.reps.trim() === "" ? null : Number(fieldValues.reps);
    const weightVal = fieldValues.weight.trim() === "" ? null : toKg(Number(fieldValues.weight), displayUnit);
    const durationVal = fieldValues.duration.trim() === "" ? null : Number(fieldValues.duration);
    const bandColourVal = fieldValues.bandColour.trim() === "" ? null : fieldValues.bandColour;

    const clientOpId = reuseClientOpId ?? crypto.randomUUID();

    const method = existing ? "PATCH" : "POST";
    const body = existing
      ? { id: existing.id, reps: repsVal, weight_kg: weightVal, duration_seconds: durationVal, band_colour: bandColourVal, completed, is_warmup: isWarmup }
      : { exercise_ref: exerciseRef, set_number: setNumber, reps: repsVal, weight_kg: weightVal, duration_seconds: durationVal, band_colour: bandColourVal, completed, is_warmup: isWarmup, client_op_id: clientOpId };

    const enqueueOffline = async (): Promise<SaveSetLogResult> => {
      try {
        await enqueue({
          client_op_id: clientOpId,
          sessionId,
          exerciseRef,
          setNumber,
          method,
          body,
          capturedAt: new Date().toISOString(),
          queuedAt: new Date().toISOString(),
        });
      } catch {
        return { kind: "failed" };
      }
      return { kind: "queued", clientOpId };
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return enqueueOffline();
    }

    let res: Response;
    try {
      res = await fetch(`/api/sessions/${sessionId}/set-logs`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return enqueueOffline();
    }

    if (!res.ok) {
      const message = await res.json().then((b) => b?.error).catch(() => null);
      return { kind: "failed", message };
    }

    const saved: SetLog & { is_new_pb?: boolean } = await res.json();
    setLogsMap[key] = saved;
    return { kind: "saved", log: saved };
  };

  const handleSetDone = async (ref: string, setIdx: number, exercise: Exercise) => {
    const state = exStates[ref];
    if (!state) return;
    const setNumber = setIdx + 1;
    const set = state.sets[setIdx];
    const timeBased = isTimeBased(exercise.reps, exercise.log_type);

    let newStatus: "pending" | "done";
    let reps = set.reps;
    let weight = set.weight;
    let duration = set.duration;
    let bandColour = set.bandColour;

    if (set.status === "done") {
      newStatus = "pending";
      // CR-EF-010: withdrawing PB when un-ticking done
      if (set.isNewPb) {
        toast("Personal best withdrawn — set is no longer marked done.");
      }
    } else {
      newStatus = "done";
      if (timeBased && !duration) {
        const presc = parsePrescribedSeconds(exercise.reps);
        duration = presc != null ? String(presc) : exercise.reps || "";
      }
      if (!timeBased && !reps) {
        const presc = parsePrescribedReps(exercise.reps);
        reps = presc != null ? String(presc) : "";
      }
    }

    const result = await saveSetLog(ref, setNumber, { reps, weight, duration, bandColour }, newStatus === "done", set.isWarmup, state.displayUnit, set.clientOpId);
    if (result.kind === "failed") {
      toast.error(result.message || "Failed to save set");
      return;
    }

    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      const newSets = [...st.sets];
      if (result.kind === "saved") {
        newSets[setIdx] = {
          status: newStatus,
          reps,
          weight,
          duration,
          bandColour,
          savedId: result.log.id,
          isNewPb: newStatus === "done" ? result.log.is_new_pb === true : false,
          isWarmup: newSets[setIdx].isWarmup,
          pendingSync: false,
          clientOpId: undefined,
          prefillWeight: newSets[setIdx].prefillWeight,
          prefillDuration: newSets[setIdx].prefillDuration,
          prefillBandColour: newSets[setIdx].prefillBandColour,
        };
      } else {
        newSets[setIdx] = {
          status: newStatus,
          reps,
          weight,
          duration,
          bandColour,
          isWarmup: newSets[setIdx].isWarmup,
          pendingSync: newStatus !== "pending",
          clientOpId: result.clientOpId,
          prefillWeight: newSets[setIdx].prefillWeight,
          prefillDuration: newSets[setIdx].prefillDuration,
          prefillBandColour: newSets[setIdx].prefillBandColour,
        };
      }
      return { ...prev, [ref]: { ...st, sets: newSets } };
    });
  };

  const handleSetSkip = async (ref: string, setIdx: number, exercise: Exercise) => {
    const state = exStates[ref];
    if (!state) return;
    const setNumber = setIdx + 1;
    const set = state.sets[setIdx];
    const timeBased = isTimeBased(exercise.reps, exercise.log_type);

    const newStatus = set.status === "skipped" ? "pending" : "skipped";
    const reps = timeBased ? "" : (set.reps || "");
    const weight = timeBased ? "" : (set.weight || "");
    const duration = timeBased ? (set.duration || "") : "";
    const bandColour = set.bandColour;

    const result = await saveSetLog(ref, setNumber, { reps, weight, duration, bandColour }, false, set.isWarmup, state.displayUnit, set.clientOpId);
    if (result.kind === "failed") {
      toast.error(result.message || "Failed to save set");
      return;
    }

    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setIdx] = {
        ...newSets[setIdx],
        status: newStatus,
        savedId: result.kind === "saved" ? result.log.id : newSets[setIdx].savedId,
        isNewPb: result.kind === "saved" ? result.log.is_new_pb === true : newSets[setIdx].isNewPb,
        pendingSync: result.kind === "queued" ? newStatus !== "pending" : false,
        clientOpId: result.kind === "queued" ? result.clientOpId : undefined,
      };
      return { ...prev, [ref]: { ...st, sets: newSets } };
    });
  };

  const handleSetField = (ref: string, setIdx: number, field: "reps" | "weight" | "duration" | "bandColour", value: string) => {
    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setIdx] = { ...newSets[setIdx], [field]: value };
      return { ...prev, [ref]: { ...st, sets: newSets } };
    });
  };

  const handleWarmupToggle = (ref: string, setIdx: number) => {
    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      const newSets = [...st.sets];
      const wasWarmup = newSets[setIdx].isWarmup;
      const wasPb = newSets[setIdx].isNewPb;
      newSets[setIdx] = { ...newSets[setIdx], isWarmup: !wasWarmup };
      // CR-EF-010: withdrawing a PB when toggling to warm-up
      if (!wasWarmup && wasPb) {
        newSets[setIdx].isNewPb = false;
        toast("Personal best withdrawn — set is now a warm-up.");
      }
      return { ...prev, [ref]: { ...st, sets: newSets } };
    });
  };

  const handleNoteToggle = (ref: string) => {
    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      return { ...prev, [ref]: { ...st, noteOpen: !st.noteOpen } };
    });
  };

  const handleNoteInput = (ref: string, value: string) => {
    const uid = exStates[ref]?.uid;
    if (uid) savedNotesRef.current[uid] = value;
    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      return { ...prev, [ref]: { ...st, note: value } };
    });
    if (uid) persistExerciseNotes(savedNotesRef.current);
  };

  const handleAddSet = useCallback((ref: string) => {
    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      const lastSet = st.sets[st.sets.length - 1];
      const newSets = [...st.sets, {
        status: "pending" as const,
        reps: "",
        weight: "",
        duration: "",
        bandColour: lastSet?.bandColour ?? "",
        isWarmup: false,
        prefillWeight: lastSet?.prefillWeight,
        prefillDuration: lastSet?.prefillDuration,
        prefillBandColour: lastSet?.prefillBandColour,
      }];
      return { ...prev, [ref]: { ...st, sets: newSets } };
    });
  }, []);

  const handleSwapUnit = (ref: string, exercise: Exercise) => {
    if (isBandEquipment(exercise.equipment ?? [])) return;
    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      const newUnit: "kg" | "lb" = st.displayUnit === "kg" ? "lb" : "kg";
      return { ...prev, [ref]: { ...st, displayUnit: newUnit } };
    });
  };

  // ── Rest timer actions ───────────────────────────────────────────
  const handleRestOpen = (key: string, seconds: number) => {
    setRestTimers((prev) => ({ ...prev, [key]: { mode: "countdown", elapsed: 0, seconds } }));
  };
  const handleRestMode = (key: string, mode: "countdown" | "stopwatch") => {
    setRestTimers((prev) => {
      const t = prev[key];
      if (!t) return prev;
      return { ...prev, [key]: { ...t, mode, elapsed: 0 } };
    });
  };
  const handleRestReset = (key: string) => {
    setRestTimers((prev) => {
      const t = prev[key];
      if (!t) return prev;
      return { ...prev, [key]: { ...t, elapsed: 0 } };
    });
  };
  const handleRestStop = (key: string) => {
    setRestTimers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // ── Session timer actions ────────────────────────────────────────
  const toggleSessionTimer = () => setSessionTimer((prev) => ({ ...prev, running: !prev.running }));
  const resetSessionTimer = () => setSessionTimer({ running: false, elapsed: 0 });

  // ── Offline queue replay ─────────────────────────────────────────
  const markSetSynced = useCallback(
    (entry: PendingSetLogEntry, synced: SetLog & { is_new_pb?: boolean }) => {
      setExStates((prev) => {
        if (!prev[entry.exerciseRef]) return prev;
        const st = prev[entry.exerciseRef];
        const setIdx = entry.setNumber - 1;
        if (setIdx < 0 || setIdx >= st.sets.length) return prev;
        const newSets = [...st.sets];
        const unit = st.displayUnit;
        newSets[setIdx] = {
          ...newSets[setIdx],
          status: synced.completed ? "done" : "skipped",
          reps: synced.reps != null ? String(synced.reps) : "",
          weight: synced.weight_kg != null ? displayWeight(synced.weight_kg, unit) : "",
          duration: synced.duration_seconds != null ? String(synced.duration_seconds) : "",
          bandColour: synced.band_colour ?? newSets[setIdx].bandColour,
          savedId: synced.id,
          isNewPb: synced.is_new_pb === true,
          pendingSync: false,
          clientOpId: undefined,
        };
        setLogsMap[`${entry.exerciseRef}::${entry.setNumber}`] = synced;
        return { ...prev, [entry.exerciseRef]: { ...st, sets: newSets } };
      });
    },
    [setLogsMap],
  );

  const drainQueue = useCallback(async () => {
    const pending = await getAllPending();
    if (pending.length === 0) return;

    let synced = 0;
    let newPbs = 0;
    let authError = false;

    for (const entry of pending) {
      try {
        const res = await fetch(`/api/sessions/${entry.sessionId}/set-logs`, {
          method: entry.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...entry.body,
            client_op_id: entry.client_op_id,
            logged_at: entry.capturedAt,
          }),
        });
        if (res.status === 401) {
          authError = true;
          break;
        }
        if (!res.ok) break;
        const data: SetLog & { is_new_pb?: boolean } = await res.json();
        await remove(entry.client_op_id);
        markSetSynced(entry, data);
        synced += 1;
        if (data.is_new_pb) newPbs += 1;
      } catch {
        break;
      }
    }

    if (authError) {
      const remaining = (await getAllPending()).length;
      setSyncNotice(`Sign in to sync ${remaining} logged ${remaining === 1 ? "set" : "sets"}`);
      return;
    }

    if (synced > 0) {
      setSyncNotice(null);
      toast.success(`${synced} ${synced === 1 ? "set" : "sets"} synced${newPbs > 0 ? ` — ${newPbs} new PB` : ""}`);
    }
  }, [markSetSynced]);

  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      void drainQueue();
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [drainQueue]);

  useEffect(() => {
    void drainQueue();
  }, [drainQueue]);

  // ── Complete session ─────────────────────────────────────────────
  const handleComplete = async (confirmOffDay?: boolean) => {
    setCompleting(true);
    const d = dataRef.current;
    if (!d) return;
    const updatedLog: SessionLog = {
      completed_at: new Date().toISOString(),
      started_at: sessionLogRef.current?.started_at ?? null,
      rpe,
      fatigue,
      notes: sessionNotes,
    };
    const body: Record<string, unknown> = {
      data: {
        ...d,
        session_log: updatedLog,
        exercise_notes: savedNotesRef.current,
      },
    };
    if (confirmOffDay) body.confirm_off_day = true;
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setCompleting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      if (res.status === 409 && err?.code === "off_day_completion") {
        const scheduledDate = new Date(err.scheduledAt).toLocaleDateString("en-GB", {
          timeZone: "Europe/London",
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        if (window.confirm(`This session is booked for ${scheduledDate}, not today. Complete it anyway?`)) {
          return handleComplete(true);
        }
        return;
      }
      toast.error(err?.error || "Failed to mark session complete");
      return;
    }
    setShowComplete(false);
    onSessionLogChange(updatedLog);
    toast.success(`Session ${sessionNumber} marked complete.`);
  };

  // ── Find exercise for a ref ──────────────────────────────────────
  const exerciseForRef = useCallback(
    (ref: string): Exercise | null => {
      for (const sec of SECTION_DEFS) {
        const list = sections[sec.key] || [];
        for (let idx = 0; idx < list.length; idx++) {
          if (exerciseRefKey(version, sec.key, idx, list[idx].exercise_name) === ref) {
            return list[idx];
          }
        }
      }
      return null;
    },
    [sections, version],
  );

  // CR-EF-010 — detect new PBs across renders and fire one toast per new PB
  useEffect(() => {
    const tally: Record<string, boolean> = {};
    for (const ref of allExerciseRefs) {
      const st = exStates[ref];
      if (!st) continue;
      for (let i = 0; i < st.sets.length; i++) {
        const s = st.sets[i];
        const key = `${ref}::${i}`;
        const isPb = s.status === "done" && !s.isWarmup && !!s.isNewPb;
        if (isPb && !pbTallyRef.current[key]) {
          const ex = exerciseForRef(ref);
          if (ex) {
            const unit = st.displayUnit;
            const pbInfo = st.pbInfo;
            const label = s.duration
              ? `${s.duration}s`
              : `${s.weight || "0"} ${unit} × ${s.reps || "?"}`;
            const prevLabel = pbInfo
              ? pbInfo.duration_seconds != null
                ? `${pbInfo.duration_seconds}s`
                : `${pbInfo.weight_kg ?? 0} ${unit} × ${pbInfo.reps ?? "?"}`
              : "no previous record";
            toast.success(`New PB — ${ex.exercise_name} ${label}. Previous: ${prevLabel}.`);
          }
        }
        tally[key] = isPb;
      }
    }
    pbTallyRef.current = tally;
  }, [exStates, allExerciseRefs, exerciseForRef]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Progress bar + session stopwatch ──────────────────────── */}
      <div className="rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="text-[13px] font-semibold text-foreground">
              <b className="tabular-nums text-rose">{progress.doneExCount}</b> of {allExerciseRefs.length} exercises logged
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {progress.doneExCount === allExerciseRefs.length ? "All logged" : progress.started ? "Partially logged" : "Not started"}
            </span>
            {queuedSetsCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--status-warning-text)]" title={`${queuedSetsCount} set${queuedSetsCount === 1 ? "" : "s"} saved on this device — will sync when the connection is back`}>
                {ICO.cloudOff}Queued · will sync
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hub-border)] bg-[var(--hub-hover)] px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground" title="Everything logged so far is saved">
                {ICO.cloud}Synced
              </span>
            )}
          </div>
          <div className="ml-auto inline-flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Session</span>
            <span className="min-w-[52px] text-right text-[18px] font-extrabold tabular-nums text-foreground">{mmss(sessionTimer.elapsed)}</span>
            <button type="button" onClick={toggleSessionTimer} aria-pressed={sessionTimer.running} title={sessionTimer.running ? "Pause session timer" : "Start session timer"} className={`grid h-[30px] w-[30px] place-items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] ${sessionTimer.running ? "border-rose bg-rose text-white" : ""}`}>
              {sessionTimer.running ? ICO.pause : ICO.play}
            </button>
            <button type="button" onClick={resetSessionTimer} title="Reset session timer" className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)]">
              {ICO.reset}
            </button>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--hub-border)]">
          <div className="h-full rounded-full bg-rose transition-[width] duration-300" style={{ width: `${progress.pct}%` }} />
        </div>
      </div>

      {/* ── Offline / sync banner ──────────────────────────────────── */}
      {(offline || syncNotice) && (
        <div className="flex items-start gap-3 rounded-[12px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-3 text-[13px] leading-relaxed text-[var(--status-warning-text)]">
          <span className="mt-0.5 flex-shrink-0">{ICO.rest}</span>
          <div className="min-w-0 flex-1">
            {syncNotice ? (
              <b className="text-foreground">{syncNotice}</b>
            ) : (
              <>
                <b className="text-foreground">Offline — sets saved on this device</b>
                <br />
                Keep logging. Everything is queued locally and syncs the moment the signal comes back.
              </>
            )}
          </div>
          <button type="button" onClick={() => void drainQueue()} className="shrink-0 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-[var(--hub-hover)]">
            Retry
          </button>
        </div>
      )}

      {/* ── Main content + rail layout ────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left column — sections */}
        <div className="min-w-0 flex-1 space-y-4">
          {SECTION_DEFS.map((sec) => {
            const list = sections[sec.key] || [];
            const blocks = computeGroups(list);
            const isCollapsed = !!collapsed[sec.key];
            const doneCount = list.filter((_, idx) => {
              const ref = exerciseRefKey(version, sec.key, idx, list[idx].exercise_name);
              const st = exStates[ref];
              return st && st.sets.every((s) => s.status !== "pending");
            }).length;
            const estSeconds = estimateSectionSeconds(list);
            const secStyle = SEC_ICON[sec.color];

            return (
              <div key={sec.key} className="overflow-hidden rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm">
                <button
                  type="button"
                  onClick={() => setCollapsed((p) => ({ ...p, [sec.key]: !p[sec.key] }))}
                  className="flex w-full items-center gap-2.5 border-b border-[var(--hub-border)] px-4 py-3.5 text-left"
                >
                  <div className={`grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg ${secStyle.bg} ${secStyle.text}`}>
                    {secStyle.svg}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-foreground">{sec.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {doneCount} of {list.length} logged{list.length > 0 ? ` · est. ${formatDurationEstimate(estSeconds)}` : ""}
                    </div>
                  </div>
                  <span className={`ml-auto text-muted-foreground transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}>{ICO.chev}</span>
                </button>
                {!isCollapsed && (
                  <div className="p-3">
                    {list.length === 0 ? (
                      <p className="rounded-[12px] border border-dashed border-[var(--hub-border)] py-4 text-center text-sm text-muted-foreground">
                        No exercises in {sec.label.toLowerCase()} yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {blocks.map((block) => {
                          if (block.type === "group") {
                            const refs = block.items.map((ex, i) => exerciseRefKey(version, sec.key, block.indices[i], ex.exercise_name));
                            return (
                              <SupersetBlock
                                key={`grp-${block.label}`}
                                block={block as { type: "group"; label?: string; items: Exercise[]; indices: number[] }}
                                refs={refs}
                                exStates={exStates}
                                restTimers={restTimers}
                                collapsed={collapsed}
                                setCollapsed={setCollapsed}
                                bands={bands}
                                loadMap={loadMap}
                                bestWeights={bestWeights}
                                onSetDone={handleSetDone}
                                onSetSkip={handleSetSkip}
                                onSetField={handleSetField}
                                onWarmupToggle={handleWarmupToggle}
                                onNoteToggle={handleNoteToggle}
                                onNoteInput={handleNoteInput}
                                onSwapUnit={handleSwapUnit}
                                onRestOpen={handleRestOpen}
                                onRestMode={handleRestMode}
                                onRestReset={handleRestReset}
                                onRestStop={handleRestStop}
                                openPicker={openPicker}
                                setOpenPicker={setOpenPicker}
                              />
                            );
                          }
                          const ex = block.items[0];
                          const ref = exerciseRefKey(version, sec.key, block.indices[0], ex.exercise_name);
                          return (
                            <ExerciseCard
                              key={ref}
                              exercise={ex}
                              state={exStates[ref]}
                              refKey={ref}
                              restTimerKey={ref}
                              restTimer={restTimers[ref]}
                              restSeconds={parseRestSeconds(ex.rest ?? "") ?? 60}
                              collapsed={!!collapsed[ref]}
                              onToggleCollapse={() => setCollapsed((p) => ({ ...p, [ref]: !p[ref] }))}
                              bands={bands}
                              loadMap={loadMap}
                              bestWeights={bestWeights}
                              onSetDone={handleSetDone}
                              onSetSkip={handleSetSkip}
                              onSetField={handleSetField}
                              onWarmupToggle={handleWarmupToggle}
                              onNoteToggle={handleNoteToggle}
                              onNoteInput={handleNoteInput}
                              onSwapUnit={handleSwapUnit}
                              onRestOpen={handleRestOpen}
                              onRestMode={handleRestMode}
                              onRestReset={handleRestReset}
                              onRestStop={handleRestStop}
                              openPicker={openPicker}
                              setOpenPicker={setOpenPicker}
                              onAddSet={handleAddSet}
                              onOpenHistory={clientId ? () => setHistoryFor(ex.exercise_name) : undefined}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right rail — session summary */}
        <aside className="w-full flex-shrink-0 lg:sticky lg:top-[82px] lg:w-[320px]">
          <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-4 shadow-sm">
            <h2 className="text-[12px] font-extrabold uppercase tracking-widest text-foreground">Finish session</h2>
            <p className="mb-4 mt-1 text-[12px] text-muted-foreground leading-relaxed">Sets save as you log them. This closes the session.</p>

            <div className="mb-4">
              <span className="mb-2 block text-[12px] font-bold text-foreground">Perceived exertion (RPE)</span>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="RPE">
                {Array.from({ length: 10 }, (_, i) => {
                  const val = i + 1;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRpe(rpe === val ? null : val)}
                      className={`h-[38px] w-[38px] rounded-[9px] border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[13.5px] font-bold tabular-nums text-foreground hover:border-[var(--hub-field-hover)] ${rpe === val ? "border-rose bg-rose text-white" : ""}`}
                      aria-pressed={rpe === val}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <span className="mb-2 block text-[12px] font-bold text-foreground">Fatigue after</span>
              <div className="flex gap-2" role="radiogroup" aria-label="Fatigue level">
                {(["low", "moderate", "high"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFatigue(fatigue === f ? null : f)}
                    className={`h-[38px] min-w-[80px] flex-1 rounded-[9px] border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[12px] font-bold capitalize text-foreground ${
                      fatigue === f
                        ? f === "low"
                          ? "border-teal bg-teal/10 text-teal"
                          : f === "moderate"
                            ? "border-[var(--status-warning-text)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                            : "border-[var(--status-danger)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                        : ""
                    }`}
                    aria-pressed={fatigue === f}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-[12px] font-bold text-foreground">Session notes</label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="How it went, anything to carry into next session…"
                className="min-h-[76px] w-full resize-y rounded-[10px] border border-[var(--hub-field-border)] bg-[var(--hub-card)] p-2.5 text-[13.5px] text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30"
              />
            </div>

            <div className="flex items-center justify-between border-t border-[var(--hub-border)] pt-4">
              <span className="text-[12.5px] text-muted-foreground">
                <b className="tabular-nums text-foreground">{progress.doneExCount}</b> of {allExerciseRefs.length} exercises logged
              </span>
              <button
                type="button"
                onClick={() => {
                  if (rpe == null && fatigue == null) {
                    toast("Tip: RPE and fatigue are still blank — you can still complete without them.", { description: "" });
                  }
                  setShowComplete(true);
                }}
                disabled={completing}
                className="inline-flex h-[40px] items-center justify-center gap-1.5 rounded-[9px] bg-rose px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ICO.checkLg}
                Finish &amp; save session
              </button>
            </div>
          </div>

          {/* Band key card */}
          {bands.length > 0 && (
            <div className="mt-4 rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-4 shadow-sm">
              <h2 className="text-[12px] font-extrabold uppercase tracking-widest text-foreground">Band set</h2>
              <p className="mb-3 mt-1 text-[12px] text-muted-foreground leading-relaxed">Prescribe and log the <b>colour</b>; tension is reference only.</p>
              <div className="flex flex-col gap-2">
                {bands.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <BandDot band={b} />
                    <span className="text-[12px] font-bold text-foreground">{b.colour}</span>
                    <span className="ml-auto text-[11px] font-semibold tabular-nums text-muted-foreground">{b.tension_label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Complete overlay ───────────────────────────────────────── */}
      {showComplete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--hub-sidebar)]/50 p-5 backdrop-blur-[2px]" onClick={() => setShowComplete(false)}>
          <div className="w-full max-w-[400px] rounded-[20px] bg-[var(--hub-card)] p-7 text-center shadow-[0_24px_64px_rgba(16,24,40,.24)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-teal/10 text-teal">{ICO.checkLg}</div>
            <h3 className="mb-1.5 text-lg font-extrabold text-foreground">Mark this session complete?</h3>
            <p className="mb-5 text-[13.5px] text-muted-foreground">
              {progress.doneExCount === allExerciseRefs.length
                ? "Every exercise is logged. This saves the session and marks it complete."
                : `${allExerciseRefs.length - progress.doneExCount} of ${allExerciseRefs.length} exercises are still unlogged. You can complete anyway — unlogged sets are saved as not recorded.`}
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => handleComplete()} disabled={completing} className="inline-flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[10px] bg-rose px-[18px] text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                Yes, complete session
              </button>
              <button type="button" onClick={() => setShowComplete(false)} className="inline-flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] px-[18px] text-sm font-bold text-foreground hover:bg-[var(--hub-hover)]">
                Keep logging
              </button>
            </div>
          </div>
        </div>
      )}

      {clientId && (
        <ExerciseHistoryDrawer
          open={!!historyFor}
          onClose={() => setHistoryFor(null)}
          clientId={clientId}
          clientName={clientName ?? "Client"}
          exerciseName={historyFor ?? ""}
          bands={bands}
          onSaved={() => { onPbRecorded?.(); setHistoryFor(null); }}
        />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function BandPicker({
  bands,
  exerciseBand,
  selectedBand,
  onSelect,
  onClose,
}: {
  bands: Band[];
  exerciseBand?: string;
  selectedBand: string;
  onSelect: (colour: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-2.5 rounded-[11px] border border-rose/20 bg-rose/5 p-2.5">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-rose">Band used for this set</p>
      <div className="flex flex-wrap gap-1.5">
        {bands.map((b) => {
          const on = selectedBand.toLowerCase() === b.colour.toLowerCase();
          const isPrescribed = exerciseBand && exerciseBand.toLowerCase() === b.colour.toLowerCase();
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => { onSelect(b.colour); onClose(); }}
              className={`inline-flex items-center gap-[7px] rounded-[9px] border px-2.5 py-2 text-[12.5px] font-bold text-foreground transition-colors ${
                on
                  ? "border-rose bg-white shadow-[0_0_0_2px_rgba(193,131,159,.3)]"
                  : "border-[var(--hub-field-border)] bg-[var(--hub-card)] hover:border-[var(--hub-field-hover)] hover:bg-[var(--hub-hover)]"
              }`}
              aria-pressed={on}
            >
              <BandDot band={b} />
              {b.colour}
              <span className="text-[11px] font-semibold text-[var(--body)] tabular-nums">{b.tension_label}</span>
              {isPrescribed && (
                <span className="rounded bg-rose/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose">Prescribed</span>
              )}
              {on && <span className="text-rose">{ICO.check}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RestControl({
  timerKey,
  restSeconds,
  timer,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
}: {
  timerKey: string;
  restSeconds: number;
  timer?: RestTimer;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
}) {
  if (!restSeconds && !timer) return null;

  if (!timer) {
    return (
      <div className="mt-2.5">
        <button type="button" onClick={() => onRestOpen(timerKey, restSeconds)} className="inline-flex h-[40px] w-full items-center justify-center gap-1.5 rounded-[9px] border border-teal/20 bg-teal/10 text-[13px] font-bold text-teal hover:bg-teal/15">
          {ICO.rest}Start {restSeconds}s rest
        </button>
      </div>
    );
}

  const remaining = timer.mode === "countdown" ? timer.seconds - timer.elapsed : timer.elapsed;
  const over = timer.mode === "countdown" && remaining < 0;
  const pct = timer.mode === "countdown"
    ? Math.max(0, Math.min(100, (1 - timer.elapsed / Math.max(1, timer.seconds)) * 100))
    : Math.min(100, (timer.elapsed / Math.max(1, timer.seconds)) * 100);

  return (
    <div className="mt-2.5 rounded-[12px] border border-teal/20 bg-teal/10 p-2.5">
      <div className="flex gap-1 rounded-lg border border-teal/20 bg-white/70 p-[3px]">
        <button type="button" onClick={() => onRestMode(timerKey, "countdown")} className={`h-[34px] flex-1 rounded-md text-[12.5px] font-bold ${timer.mode === "countdown" ? "bg-teal text-white" : "text-[var(--color-body)] hover:text-foreground"}`}>Countdown</button>
        <button type="button" onClick={() => onRestMode(timerKey, "stopwatch")} className={`h-[34px] flex-1 rounded-md text-[12.5px] font-bold ${timer.mode === "stopwatch" ? "bg-teal text-white" : "text-[var(--color-body)] hover:text-foreground"}`}>Stopwatch</button>
      </div>
      <div className="py-2 text-center">
        <div className={`text-[34px] font-extrabold leading-none tabular-nums text-foreground ${over ? "text-[var(--status-danger)]" : ""}`}>{mmss(remaining)}</div>
        <div className="mt-1 text-[11.5px] text-muted-foreground">
          {timer.mode === "countdown" ? (over ? `Over the prescribed ${timer.seconds}s rest` : `Counting down from ${timer.seconds}s — prescribed rest`) : "Counting up — no target"}
        </div>
      </div>
      <div className="mx-1.5 mb-2 h-1 overflow-hidden rounded-full bg-white/80">
        <i className="block h-full rounded-full bg-teal transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onRestReset(timerKey)} className="h-[34px] flex-1 rounded-lg border border-teal/20 bg-white/80 text-[12.5px] font-bold text-foreground hover:bg-white">Reset</button>
        <button type="button" onClick={() => onRestStop(timerKey)} className="h-[34px] flex-1 rounded-lg bg-teal text-[12.5px] font-bold text-white hover:opacity-90">Stop rest</button>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  state,
  refKey,
  restTimerKey,
  restTimer,
  restSeconds,
  collapsed,
  onToggleCollapse,
  bands,
  loadMap,
  bestWeights,
  onSetDone,
  onSetSkip,
  onSetField,
  onWarmupToggle,
  onNoteToggle,
  onNoteInput,
  onSwapUnit,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
  openPicker,
  setOpenPicker,
  onAddSet,
  onOpenHistory,
}: {
  exercise: Exercise;
  state: ExState | undefined;
  refKey: string;
  restTimerKey: string;
  restTimer?: RestTimer;
  restSeconds: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  bands: Band[];
  loadMap: Map<string, number>;
  bestWeights?: Record<string, number>;
  onSetDone: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetSkip: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetField: (ref: string, setIdx: number, field: "reps" | "weight" | "duration" | "bandColour", value: string) => void;
  onWarmupToggle: (ref: string, setIdx: number) => void;
  onNoteToggle: (ref: string) => void;
  onNoteInput: (ref: string, value: string) => void;
  onSwapUnit: (ref: string, exercise: Exercise) => void;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
  openPicker: string | null;
  setOpenPicker: (v: string | null) => void;
  onAddSet: (refKey: string) => void;
  onOpenHistory?: () => void;
}) {
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);
  const isBand = isBandEquipment(exercise.equipment ?? []);
  const sets = state?.sets ?? [];
  const displayUnit = state?.displayUnit ?? "kg";
  const note = state?.note ?? "";
  const noteOpen = state?.noteOpen ?? false;
  const exComplete = sets.length > 0 && sets.every((s) => s.status !== "pending");
  const doneSets = sets.filter((s) => s.status !== "pending").length;

  // CR-EF-010 — compute PB and Last chips for the exercise header
  const pbInfo = state?.pbInfo;
  const lastInfo = state?.lastSession;
  const isBandEx = isBandEquipment(exercise.equipment ?? []);

  // Current session's best for PB comparison
  const sessionPb = findPbSet(exercise, sets, loadMap, bestWeights);
  const hasNewPb = !!sessionPb && sessionPb.set.status === "done" && !sessionPb.set.isWarmup;

  // Format PB chip label
  const pbLabel = (() => {
    if (hasNewPb && sessionPb) {
      if (timeBased) return sessionPb.set.duration ? `${sessionPb.set.duration}s` : null;
      const w = parseFloat(sessionPb.set.weight);
      const r = parseInt(sessionPb.set.reps, 10);
      if (!isNaN(w) && w > 0) return `${w} ${displayUnit} × ${r || "?"}`;
      if (!isNaN(r) && r > 0) return `${r} reps`;
      return null;
    }
    if (pbInfo) {
      if (pbInfo.duration_seconds != null) return `${pbInfo.duration_seconds}s`;
      if (pbInfo.weight_kg != null && pbInfo.reps != null) return `${pbInfo.weight_kg} ${displayUnit} × ${pbInfo.reps}`;
      return null;
    }
    return null;
  })();

  // Format Last chip label
  const lastLabel = (() => {
    if (!lastInfo) return null;
    if (timeBased) return lastInfo.duration_seconds != null ? `${lastInfo.duration_seconds}s` : null;
    if (isBandEx) return lastInfo.band_colour ? `${lastInfo.band_colour} band` : null;
    if (lastInfo.weight_kg != null) return `${lastInfo.weight_kg} ${displayUnit} × ${lastInfo.reps ?? "?"}`;
    return null;
  })();

  // PB date for tooltip
  const pbDate = hasNewPb ? "this session" : pbInfo?.achieved_at
    ? new Date(pbInfo.achieved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  return (
    <div className={`rounded-[13px] border bg-[var(--hub-card)] ${exComplete ? "border-teal/20" : "border-[var(--hub-border)]"}`}>
      {/* Exercise header row */}
      <div className="flex items-center gap-2.5 p-3">
        {/* Thumbnail */}
        <span className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-hover)] text-muted-foreground">
          {exercise.media?.image_url ? (
            <img src={exercise.media.image_url} alt="" className="h-full w-full rounded-[10px] object-cover" />
          ) : (
            <span className="scale-110 opacity-40">{ICO.img}</span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-foreground truncate">{exercise.exercise_name}</span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isBand ? "border-teal/20 bg-teal/10 text-teal" : timeBased ? "border-teal/20 bg-teal/10 text-teal" : "border-rose/20 bg-rose/5 text-rose"}`}>
              {isBand ? <><BandDot band={bandById(bands, exercise.band_colour ?? "") ?? bands[0]} />Band</> : timeBased ? <>{ICO.clock}Time</> : <>{ICO.reps}Reps &amp; wt</>}
            </span>
          </div>

          {/* Prescription line */}
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            <b className="font-bold text-foreground">Prescribed:</b>{" "}
            {isBand && exercise.band_colour
              ? <>{formatPrescription(exercise).replace(/×/, "×")} — {(() => { const b = bandById(bands, exercise.band_colour); return b ? <BandChip band={b} /> : exercise.band_colour; })()}</>
              : formatPrescription(exercise)
            }
          </p>

          {/* CR-EF-124: Prescribed load chip */}
          {exercise.load && (
            <div className="mt-1.5">
              <LoadChip load={exercise.load} />
            </div>
          )}

          {/* CR-EF-010: PB + Last chips */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {pbLabel ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  hasNewPb
                    ? "border border-[#6E551F] bg-[#8A6A2E] text-white"
                    : "border border-[rgba(176,138,62,.32)] bg-[#F7EFDD] text-[#8A6A2E]"
                }`}
                title={hasNewPb ? "New PB — beaten in this session" : pbDate ? `Best ever, set ${pbDate}` : "Personal best"}
              >
                {ICO.starFilled}PB {pbLabel}
                {hasNewPb && <span className="ml-0.5 rounded bg-white/26 px-1 py-px text-[9px] font-extrabold uppercase tracking-wider">New</span>}
                {!hasNewPb && pbInfo?.source === "manual" && <span className="ml-0.5 rounded bg-black/10 px-1 py-px text-[9px] font-semibold tracking-wide opacity-70">manual</span>}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--hub-border)] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground" title="No qualifying set logged yet">
                {ICO.starFilled}No best yet
              </span>
            )}
            {lastLabel ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[var(--hub-border)] bg-[var(--hub-hover)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-body)] tabular-nums"
                title={lastInfo ? `Session ${lastInfo.session_number ?? "?"}, ${new Date(lastInfo.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — the prefill source` : "Prefill source"}
              >
                {ICO.history}Last {lastLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--hub-border)] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground" title="Nothing logged for this exercise yet">
                {ICO.history}First time logged
              </span>
            )}
          </div>
          {onOpenHistory && (
            <button type="button" onClick={onOpenHistory} className="mt-1.5 text-[11px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
              See all
            </button>
          )}

          {/* Tags */}
          {exercise.equipment && exercise.equipment.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {exercise.equipment.map((t) => (
                <span key={t} className="rounded-full border border-[var(--hub-border)] bg-[var(--hub-hover)] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Collapse toggle + actions */}
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{exComplete ? "Done" : `${doneSets}/${sets.length}`}</span>
          <button type="button" onClick={onToggleCollapse} aria-expanded={!collapsed} className="text-muted-foreground transition-transform duration-200">
            <span className={`block transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}>{ICO.chev}</span>
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {!collapsed && (
        <div className="border-t border-dashed border-[var(--hub-border)] px-3 pb-3 pt-3">
          {/* Coaching cue + modification + notes */}
          <div className="mb-2.5 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {exercise.coaching_cue && <p className="text-[12.5px] text-muted-foreground">{exercise.coaching_cue}</p>}
              {exercise.modification && (
                <span className="mt-1 inline-flex rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--status-warning-text)]">
                  Easier option: {exercise.modification}
                </span>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              {exercise.media?.video_url && (
                <a
                  href={exercise.media.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                  title="Watch video"
                >
                  {ICO.video}
                </a>
              )}
              <button
                type="button"
                onClick={() => onNoteToggle(refKey)}
                className={`grid h-8 w-8 place-items-center rounded-lg border ${note ? "border-rose/20 bg-rose/5 text-rose" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"}`}
                aria-label="Add note"
              >
                {ICO.note}
              </button>
            </div>
          </div>

          {noteOpen && (
            <textarea
              value={note}
              onChange={(e) => onNoteInput(refKey, e.target.value)}
              placeholder="Quick note about this exercise…"
              className="mb-2.5 min-h-[56px] w-full resize-y rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] p-2 text-[13px] text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30"
            />
          )}

          {/* Set rows */}
          <div className="flex flex-col gap-2">
            {sets.map((set, sIdx) => {
              const targetLabel = timeBased
                ? `${exercise.reps} hold`
                : `${exercise.reps}${exercise.tempo && exercise.tempo !== "—" ? ` @ ${exercise.tempo}` : ""}${exercise.rest && exercise.rest !== "—" ? ` · ${exercise.rest} rest` : ""}`;

              return (
                <div key={sIdx}>
                  <div className={`rounded-[11px] border p-2.5 transition-colors ${
                    set.status === "done"
                      ? "border-teal/20 bg-teal/10"
                      : set.status === "skipped"
                        ? "border-dashed border-[var(--hub-border)] bg-transparent opacity-70"
                        : "border-[var(--hub-border)] bg-[var(--hub-hover)]"
                  }`}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full border border-[var(--hub-border)] bg-[var(--hub-card)] text-[11px] font-extrabold text-foreground">{sIdx + 1}</span>
                      <span className="min-w-0 flex-1 text-xs text-muted-foreground">Target <b className="font-bold text-foreground">{targetLabel}</b></span>
                      <button
                        type="button"
                        onClick={() => onWarmupToggle(refKey, sIdx)}
                        aria-pressed={set.isWarmup}
                        title="Warm-up set — excluded from personal bests"
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          set.isWarmup ? "border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Warm-up
                      </button>
                      {/* PB badge — ONE per exercise, only on the winning set */}
                      {sessionPb && sessionPb.setIdx === sIdx && set.status === "done" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-[var(--status-warning-text)]">
                          {ICO.star}New PB
                        </span>
                      )}
                      {set.pendingSync && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--status-warning-text)]">
                          {ICO.cloudOff}Queued
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      {timeBased ? (
                        <div className="flex w-[120px] flex-col gap-[3px]">
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Seconds
                            {set.prefillDuration && set.duration === set.prefillDuration && set.status !== "done" && (
                              <span className="rounded border border-[var(--hub-border)] bg-[var(--hub-hover)] px-1 py-px text-[9px] font-extrabold normal-case tracking-normal text-[#5D646B]" title={`Prefilled from last session`}>Last {set.duration}</span>
                            )}
                            {set.prefillDuration && set.duration !== set.prefillDuration && set.status !== "done" && (
                              <>
                                <span className="rounded border border-[rgba(193,131,159,.2)] bg-[rgba(193,131,159,.1)] px-1 py-px text-[9px] font-extrabold normal-case tracking-normal text-[#8A5570]">Edited</span>
                                <button type="button" onClick={() => onSetField(refKey, sIdx, "duration", set.prefillDuration!)} className="text-[9px] font-extrabold normal-case tracking-normal text-teal underline">undo</button>
                              </>
                            )}
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={set.duration}
                            onChange={(e) => onSetField(refKey, sIdx, "duration", e.target.value)}
                            placeholder={exercise.reps}
                            disabled={set.status === "skipped"}
                            className={`h-[36px] w-full rounded-lg border bg-[var(--hub-card)] px-2.5 text-sm font-semibold tabular-nums text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55 ${
                              set.prefillDuration && set.duration === set.prefillDuration
                                ? "border-[var(--hub-field-border)] shadow-[inset_3px_0_0_0_var(--hub-field-border-hover)]"
                                : set.prefillDuration && set.duration !== set.prefillDuration
                                  ? "border-[var(--hub-field-border)] shadow-[inset_3px_0_0_0_rose]"
                                  : "border-[var(--hub-field-border)]"
                            }`}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex w-[92px] flex-col gap-[3px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reps</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={set.reps}
                              onChange={(e) => onSetField(refKey, sIdx, "reps", e.target.value)}
                              placeholder={parsePrescribedReps(exercise.reps) != null ? String(parsePrescribedReps(exercise.reps)) : exercise.reps}
                              disabled={set.status === "skipped"}
                              className="h-[36px] w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm font-semibold tabular-nums text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
                            />
                          </div>
                          {isBand ? (
                            /* CR-EF-014 — band picker REPLACES the weight field */
                            <div className="flex flex-col gap-[3px]" style={{ width: 186 }}>
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Band
                                {set.prefillBandColour && set.bandColour === set.prefillBandColour && set.status !== "done" && (
                                  <span className="rounded border border-[var(--hub-border)] bg-[var(--hub-hover)] px-1 py-px text-[9px] font-extrabold normal-case tracking-normal text-[#5D646B]" title="Prefilled from last session">Last {set.bandColour}</span>
                                )}
                                {set.prefillBandColour && set.bandColour !== set.prefillBandColour && set.status !== "done" && (
                                  <>
                                    <span className="rounded border border-[rgba(193,131,159,.2)] bg-[rgba(193,131,159,.1)] px-1 py-px text-[9px] font-extrabold normal-case tracking-normal text-[#8A5570]">Edited</span>
                                    <button type="button" onClick={() => onSetField(refKey, sIdx, "bandColour", set.prefillBandColour!)} className="text-[9px] font-extrabold normal-case tracking-normal text-teal underline">undo</button>
                                  </>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpenPicker(openPicker === `${refKey}:${sIdx}` ? null : `${refKey}:${sIdx}`)}
                                aria-expanded={openPicker === `${refKey}:${sIdx}`}
                                className={`inline-flex h-[36px] w-full items-center gap-2 rounded-lg border px-2.5 text-[13px] font-bold transition-colors ${
                                  set.bandColour
                                    ? "border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)]"
                                    : "border-dashed border-[var(--hub-field-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                                }`}
                              >
                                {set.bandColour ? (
                                  <>
                                    {(() => { const b = bandById(bands, set.bandColour); return b ? <BandDot band={b} /> : null; })()}
                                    {set.bandColour} band
                                  </>
                                ) : (
                                  "Choose band"
                                )}
                                <span className="ml-auto text-muted-foreground">{ICO.chevSm}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex w-[120px] flex-col gap-[3px]">
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Weight ({displayUnit})
                                {set.prefillWeight && set.weight === set.prefillWeight && set.status !== "done" && (
                                  <span className="rounded border border-[var(--hub-border)] bg-[var(--hub-hover)] px-1 py-px text-[9px] font-extrabold normal-case tracking-normal text-[#5D646B]" title={prescribedWeight(exercise.load) != null ? "Prefilled from prescription" : "Prefilled from last session"}>{prescribedWeight(exercise.load) != null ? "Prescribed" : "Last"} {set.weight}</span>
                                )}
                                {set.prefillWeight && set.weight !== set.prefillWeight && set.status !== "done" && (
                                  <>
                                    <span className="rounded border border-[rgba(193,131,159,.2)] bg-[rgba(193,131,159,.1)] px-1 py-px text-[9px] font-extrabold normal-case tracking-normal text-[#8A5570]">Edited</span>
                                    <button type="button" onClick={() => onSetField(refKey, sIdx, "weight", set.prefillWeight!)} className="text-[9px] font-extrabold normal-case tracking-normal text-teal underline">undo</button>
                                  </>
                                )}
                                <button type="button" onClick={() => onSwapUnit(refKey, exercise)} className="font-bold normal-case tracking-normal text-teal underline" title="Correct the unit for this exercise">switch</button>
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={set.weight}
                                onChange={(e) => onSetField(refKey, sIdx, "weight", e.target.value)}
                                placeholder="BW"
                                disabled={set.status === "skipped"}
                                className={`h-[36px] w-full rounded-lg border bg-[var(--hub-card)] px-2.5 text-sm font-semibold tabular-nums text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55 ${
                                  set.prefillWeight && set.weight === set.prefillWeight
                                    ? "border-[var(--hub-field-border)] shadow-[inset_3px_0_0_0_var(--hub-field-border-hover)]"
                                    : set.prefillWeight && set.weight !== set.prefillWeight
                                      ? "border-[var(--hub-field-border)] shadow-[inset_3px_0_0_0_rose]"
                                      : "border-[var(--hub-field-border)]"
                                }`}
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div className="ml-auto flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSetDone(refKey, sIdx, exercise)}
                          className={`inline-flex h-[36px] items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-bold ${
                            set.status === "done" ? "border-teal bg-teal text-white" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                          }`}
                        >
                          {ICO.check}Done
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetSkip(refKey, sIdx, exercise)}
                          className={`inline-flex h-[36px] items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-bold ${
                            set.status === "skipped" ? "border-[var(--status-danger)] bg-[var(--status-danger)] text-white" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                          }`}
                        >
                          {ICO.skip}Skip
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CR-EF-010 — PB inline banner on the set that beat the record */}
                  {sessionPb && sessionPb.setIdx === sIdx && set.status === "done" && !set.isWarmup && (
                    <div className="mt-2.5 flex items-center gap-2.5 border-t border-[rgba(176,138,62,.28)] pt-2.5 text-[12.5px] text-[#6E551F]">
                      <span className="grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-full bg-[#8A6A2E] text-white">{ICO.starFilled}</span>
                      <span>
                        <b className="text-[#57430F]">New personal best — {(() => {
                          if (timeBased) return `${set.duration || "?"}s`;
                          return `${set.weight || "?"} ${displayUnit} × ${set.reps || "?"}`;
                        })()}.</b>{" "}
                        {pbInfo ? `Previous best ${pbInfo.duration_seconds != null ? `${pbInfo.duration_seconds}s` : `${pbInfo.weight_kg ?? "?"} ${displayUnit} × ${pbInfo.reps ?? "?"}`}, ${pbInfo.achieved_at ? new Date(pbInfo.achieved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}.` : "First record for this exercise."}
                      </span>
                    </div>
                  )}

                  {/* Band picker dropdown — inline below the set row */}
                  {isBand && openPicker === `${refKey}:${sIdx}` && (
                    <BandPicker
                      bands={bands}
                      exerciseBand={exercise.band_colour}
                      selectedBand={set.bandColour}
                      onSelect={(colour) => onSetField(refKey, sIdx, "bandColour", colour)}
                      onClose={() => setOpenPicker(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Add set button */}
          <button
            type="button"
            onClick={() => onAddSet(refKey)}
            className="mt-2 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-dashed border-[var(--hub-field-border)] bg-transparent text-[12.5px] font-bold text-muted-foreground hover:border-rose hover:bg-rose/5 hover:text-rose"
          >
            {ICO.plus} Add set
          </button>

          <RestControl
            timerKey={restTimerKey}
            restSeconds={restSeconds}
            timer={restTimer}
            onRestOpen={onRestOpen}
            onRestMode={onRestMode}
            onRestReset={onRestReset}
            onRestStop={onRestStop}
          />
        </div>
      )}
    </div>
  );
}

function SupersetBlock({
  block,
  refs,
  exStates,
  restTimers,
  collapsed,
  setCollapsed,
  bands,
  loadMap,
  bestWeights,
  onSetDone,
  onSetSkip,
  onSetField,
  onWarmupToggle,
  onNoteToggle,
  onNoteInput,
  onSwapUnit,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
  openPicker,
  setOpenPicker,
}: {
  block: { type: "group"; label?: string; items: Exercise[]; indices: number[] };
  refs: string[];
  exStates: Record<string, ExState>;
  restTimers: Record<string, RestTimer>;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  bands: Band[];
  loadMap: Map<string, number>;
  bestWeights?: Record<string, number>;
  onSetDone: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetSkip: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetField: (ref: string, setIdx: number, field: "reps" | "weight" | "duration" | "bandColour", value: string) => void;
  onWarmupToggle: (ref: string, setIdx: number) => void;
  onNoteToggle: (ref: string) => void;
  onNoteInput: (ref: string, value: string) => void;
  onSwapUnit: (ref: string, exercise: Exercise) => void;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
  openPicker: string | null;
  setOpenPicker: (v: string | null) => void;
}) {
  const label = block.label ?? "?";
  const groupKey = `grp:${label}`;
  const isCollapsed = !!collapsed[groupKey];
  const totalRounds = Math.max(...block.items.map((ex) => ex.sets || 1));
  const totalSets = block.items.reduce((a, ex) => a + Math.max(1, ex.sets || 1), 0);
  const doneSets = block.items.reduce((a, _ex, i) => {
    const st = exStates[refs[i]];
    return a + (st ? st.sets.filter((s) => s.status !== "pending").length : 0);
  }, 0);
  const complete = totalSets > 0 && doneSets === totalSets;

  return (
    <div className="rounded-[14px] border-[1.5px] border-rose/20 bg-rose/5 p-2.5">
      <button type="button" onClick={() => setCollapsed((p) => ({ ...p, [groupKey]: !p[groupKey] }))} className="flex w-full items-center gap-2 text-left" aria-expanded={!isCollapsed}>
        <span className={`grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full border text-[11px] font-bold tabular-nums ${complete ? "border-teal/20 bg-teal/10 text-teal" : "border-[var(--hub-border)] bg-[var(--hub-hover)] text-muted-foreground"}`}>
          {complete ? ICO.check : totalSets}
        </span>
        <span className="rounded-full border border-rose/20 bg-white/60 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-rose">Superset {label}</span>
        <span className="text-[11.5px] text-rose">{block.items.length} exercises · {totalRounds} rounds</span>
        <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">{complete ? "Done" : `${doneSets}/${totalSets} logged`}</span>
        <span className={`text-rose transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}>{ICO.chev}</span>
      </button>

      {!isCollapsed && (
        <div className="mt-2.5">
          {/* Exercise legends */}
          <div className="flex flex-col gap-2">
            {block.items.map((ex, i) => {
              const ref = refs[i];
              const st = exStates[ref];
              const isBandEx = isBandEquipment(ex.equipment ?? []);
              const timeBased = isTimeBased(ex.reps, ex.log_type);
              const note = st?.note ?? "";
              const noteOpen = st?.noteOpen ?? false;
              return (
                <div key={`leg-${ref}`} className="rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-foreground">{ex.exercise_name}</span>
                    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isBandEx ? "border-teal/20 bg-teal/10 text-teal" : timeBased ? "border-teal/20 bg-teal/10 text-teal" : "border-rose/20 bg-rose/5 text-rose"}`}>
                      {isBandEx ? <><BandDot band={bandById(bands, ex.band_colour ?? "") ?? bands[0]} />Band</> : timeBased ? <>{ICO.clock}Time</> : <>{ICO.reps}Reps &amp; wt</>}
                    </span>
                    {/* CR-EF-124: load chip on the legend card too */}
                    {ex.load && <LoadChip load={ex.load} />}
                    <div className="ml-auto flex shrink-0 gap-1">
                      <button type="button" onClick={() => onNoteToggle(ref)} className={`grid h-7 w-7 place-items-center rounded-md border ${note ? "border-rose/20 bg-rose/5 text-rose" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"}`} aria-label="Add note">{ICO.note}</button>
                    </div>
                  </div>
                  {ex.coaching_cue && <p className="mt-1 text-[12px] text-muted-foreground">{ex.coaching_cue}</p>}
                  {noteOpen && (
                    <textarea
                      value={note}
                      onChange={(e) => onNoteInput(ref, e.target.value)}
                      placeholder="Quick note about this exercise…"
                      className="mt-2 min-h-[52px] w-full resize-y rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] p-2 text-[13px] text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Rounds — interleaved sets */}
          <div className="mt-3 flex flex-col gap-2.5 border-t border-dashed border-rose/20 pt-3">
            {Array.from({ length: totalRounds }, (_, roundIdx) => {
              let anyPresent = false;
              let maxRest = 0;
              const rows: React.ReactNode[] = [];
              block.items.forEach((ex, i) => {
                const ref = refs[i];
                const st = exStates[ref];
                const set = st?.sets[roundIdx];
                if (!set) return;
                anyPresent = true;
                const rs = parseRestSeconds(ex.rest ?? "");
                if (rs && rs > maxRest) maxRest = rs;
                const isBandEx = isBandEquipment(ex.equipment ?? []);
                const timeBased = isTimeBased(ex.reps, ex.log_type);
                const targetLabel = timeBased
                  ? `${ex.reps} hold`
                  : `${ex.reps}${ex.tempo && ex.tempo !== "—" ? ` @ ${ex.tempo}` : ""}`;

                rows.push(
                  <div key={`${ref}-${roundIdx}`}>
                    {/* CR-EF-124: exercise name + load on one line, so the weight is
                        readable at the moment the round is performed. */}
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5 px-0.5">
                      <span className="text-[12.5px] font-bold text-foreground">{ex.exercise_name}</span>
                      {ex.load && <LoadChip load={ex.load} />}
                    </div>
                    <div className={`rounded-[11px] border p-2.5 transition-colors ${
                      set.status === "done"
                        ? "border-teal/20 bg-teal/10"
                        : set.status === "skipped"
                          ? "border-dashed border-[var(--hub-border)] bg-transparent opacity-70"
                          : "border-[var(--hub-border)] bg-[var(--hub-hover)]"
                    }`}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full border border-[var(--hub-border)] bg-[var(--hub-card)] text-[11px] font-extrabold text-foreground">{roundIdx + 1}</span>
                        <span className="min-w-0 flex-1 text-xs text-muted-foreground">Target <b className="font-bold text-foreground">{targetLabel}</b></span>
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        {timeBased ? (
                          <div className="flex w-[120px] flex-col gap-[3px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seconds</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={set.duration}
                              onChange={(e) => onSetField(ref, roundIdx, "duration", e.target.value)}
                              placeholder={ex.reps}
                              disabled={set.status === "skipped"}
                              className="h-[36px] w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm font-semibold tabular-nums text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex w-[92px] flex-col gap-[3px]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reps</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={set.reps}
                                onChange={(e) => onSetField(ref, roundIdx, "reps", e.target.value)}
                                placeholder={parsePrescribedReps(ex.reps) != null ? String(parsePrescribedReps(ex.reps)) : ex.reps}
                                disabled={set.status === "skipped"}
                                className="h-[36px] w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm font-semibold tabular-nums text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
                              />
                            </div>
                            {isBandEx ? (
                              <div className="flex flex-col gap-[3px]" style={{ width: 186 }}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Band</span>
                                <button
                                  type="button"
                                  onClick={() => setOpenPicker(openPicker === `${ref}:${roundIdx}` ? null : `${ref}:${roundIdx}`)}
                                  aria-expanded={openPicker === `${ref}:${roundIdx}`}
                                  className={`inline-flex h-[36px] w-full items-center gap-2 rounded-lg border px-2.5 text-[13px] font-bold transition-colors ${
                                    set.bandColour
                                      ? "border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)]"
                                      : "border-dashed border-[var(--hub-field-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                                  }`}
                                >
                                  {set.bandColour ? (
                                    <>
                                      {(() => { const b = bandById(bands, set.bandColour); return b ? <BandDot band={b} /> : null; })()}
                                      {set.bandColour} band
                                    </>
                                  ) : (
                                    "Choose band"
                                  )}
                                  <span className="ml-auto text-muted-foreground">{ICO.chevSm}</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex w-[120px] flex-col gap-[3px]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Weight ({st?.displayUnit ?? "kg"})</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={set.weight}
                                  onChange={(e) => onSetField(ref, roundIdx, "weight", e.target.value)}
                                  placeholder="BW"
                                  disabled={set.status === "skipped"}
                                  className="h-[36px] w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm font-semibold tabular-nums text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
                                />
                              </div>
                            )}
                          </>
                        )}
                        <div className="ml-auto flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSetDone(ref, roundIdx, ex)}
                            className={`inline-flex h-[36px] items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-bold ${
                              set.status === "done" ? "border-teal bg-teal text-white" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                            }`}
                          >
                            {ICO.check}Done
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetSkip(ref, roundIdx, ex)}
                            className={`inline-flex h-[36px] items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-bold ${
                              set.status === "skipped" ? "border-[var(--status-danger)] bg-[var(--status-danger)] text-white" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                            }`}
                          >
                            {ICO.skip}Skip
                          </button>
                      </div>
                    </div>
                    </div>

                    {/* Band picker for superset sets */}
                    {isBandEx && openPicker === `${ref}:${roundIdx}` && (
                      <BandPicker
                        bands={bands}
                        exerciseBand={ex.band_colour}
                        selectedBand={set.bandColour}
                        onSelect={(colour) => onSetField(ref, roundIdx, "bandColour", colour)}
                        onClose={() => setOpenPicker(null)}
                      />
                    )}
                  </div>
                );
              });
              if (!anyPresent) return null;
              const roundKey = `grp:${label}:${roundIdx}`;
              return (
                <div key={roundIdx} className="rounded-[12px] border border-rose/20 bg-white/55 p-2.5">
                  <div className="mb-2 px-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-rose">Round {roundIdx + 1} of {totalRounds}</div>
                  <div className="flex flex-col gap-2">{rows}</div>
                  <RestControl
                    timerKey={roundKey}
                    restSeconds={maxRest || 60}
                    timer={restTimers[roundKey]}
                    onRestOpen={onRestOpen}
                    onRestMode={onRestMode}
                    onRestReset={onRestReset}
                    onRestStop={onRestStop}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
