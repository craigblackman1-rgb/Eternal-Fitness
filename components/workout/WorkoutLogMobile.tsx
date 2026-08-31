"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Session, SessionLog, SetLog, Exercise } from "@/types";
import { computeGroups, nextGroupLabel } from "@/lib/exercise-groups";
import { isTimeBased, parsePrescribedSeconds, parsePrescribedReps, parseRestSeconds, formatPrescription } from "@/lib/prescription";
import { sessionDurationMinutes } from "@/lib/scheduling";
import { defaultUnitForEquipment, isBandEquipment, toKg, fromKg } from "@/lib/units";
import { enqueue, getAllPending, remove, type PendingSetLogEntry } from "@/lib/hub/offline-set-log-queue";

function displayWeight(kg: number, unit: "kg" | "lb"): string {
  const v = Math.round(fromKg(kg, unit) * 10) / 10;
  return String(v);
}

type SectionKey = "warm_up" | "main_block" | "cooldown";

const SECTION_DEFS: { key: SectionKey; label: string; color: "teal" | "rose" | "navy" }[] = [
  { key: "warm_up", label: "Warm-up", color: "teal" },
  { key: "main_block", label: "Main Block", color: "rose" },
  { key: "cooldown", label: "Cooldown", color: "navy" },
];

interface SetState {
  status: "pending" | "done" | "skipped";
  reps: string;
  weight: string;
  duration: string;
  bandColour: string | null;
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

type SaveSetLogResult =
  | { kind: "saved"; log: SetLog & { is_new_pb?: boolean } }
  | { kind: "queued"; clientOpId: string }
  | { kind: "failed"; message?: string | null };

interface PbInfo {
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  achieved_at: string;
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

// ── Helpers ──────────────────────────────────────────────────────

function exerciseRefKey(version: string, section: SectionKey, index: number, name: string): string {
  return `${version}:${section}:${index}:${name}`;
}

function mmss(total: number): string {
  const m = Math.floor(Math.abs(total) / 60);
  const s = Math.abs(total) % 60;
  return (total < 0 ? "+" : "") + m + ":" + String(s).padStart(2, "0");
}

// ── Icons ───────────────────────────────────────────────────────

const ICO = {
  check: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  checkSm: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  checkLg: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  skip: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>),
  note: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  video: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>),
  chev: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>),
  clock: (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  reps: (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6v12M17.5 6v12M2 10h2M2 14h2M20 10h2M20 14h2M8.5 10h7v4h-7z"/></svg>),
  plus: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>),
  rest: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6"/></svg>),
  back: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>),
  flame: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>),
  lightning: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  moon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>),
  flameLg: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>),
  trophy: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>),
  grid: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>),
};

// ── Main Component ───────────────────────────────────────────────

export type WorkoutLogMobileAudience = "trainer" | "client";

export interface WorkoutLogMobileProps {
  sessionId: string;
  sessionNumber: number;
  version: string;
  data: Session | null;
  sessionLog: SessionLog | null;
  setLogs: SetLog[];
  bestWeights?: Record<string, number>;
  /** CR-EF-010 — last session's best set per exercise (for prefill). */
  lastSessionData?: Record<string, import("@/lib/last-session-data").LastSessionPrefill>;
  /** CR-EF-010 — PB metadata per exercise (for header chip). */
  pbDates?: Record<string, import("@/lib/last-session-data").PbMetadata>;
  onSessionLogChange?: (log: SessionLog) => void;
  bands?: { id: string; colour: string; colour_hex: string; tension_label: string }[];
  audience: WorkoutLogMobileAudience;
  clientName?: string;
  clientNumber?: number | null;
  clientId?: string | null;
  archetype?: string;
  phase?: string;
  week?: number;
  scheduledAt?: string | null;
  blockNumber?: number | null;
  deliveryMode?: "studio_1to1" | "home_training";
}

export function WorkoutLogMobile({
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
  bands = [],
  audience,
  clientName = "",
  clientNumber,
  clientId,
  archetype,
  phase,
  week,
  scheduledAt,
  blockNumber,
  deliveryMode = "studio_1to1",
}: WorkoutLogMobileProps) {
  const isTrainer = audience === "trainer";
  const sections = data?.versions?.[version] ?? { warm_up: [], main_block: [], cooldown: [] };
  const durationMinutes = data?.estimated_minutes ?? sessionDurationMinutes(data?.time_tier);

  const setLogsMap = useMemo(() => {
    const map: Record<string, SetLog> = {};
    for (const sl of setLogs) {
      map[`${sl.exercise_ref}::${sl.set_number}`] = sl;
    }
    return map;
  }, [setLogs]);

  const savedNotesRef = useRef<Record<string, string>>({});
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        // CR-EF-010: prefill from last session's heaviest working set
        const prefillWeight = !isBand && !timeBased && last?.weight_kg != null
          ? displayWeight(last.weight_kg, unit)
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
            bandColour: log?.band_colour ?? prefillBandColour ?? null,
            savedId: log?.id,
            isNewPb: log ? !!(log as SetLog & { is_new_pb?: boolean }).is_new_pb : undefined,
            isWarmup: s <= warmupCount,
            prefillWeight: !hasLog ? prefillWeight : undefined,
            prefillDuration: !hasLog ? prefillDuration : undefined,
            prefillBandColour: !hasLog ? prefillBandColour : undefined,
          });
        }
        if (savedNotesRef.current[uid] === undefined) {
          savedNotesRef.current[uid] = data?.exercise_notes?.[uid] ?? "";
        }
        map[uid] = {
          uid,
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
  const [restOverrides, setRestOverrides] = useState<Record<string, number>>({});

  const [offline, setOffline] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertedRef = useRef<Set<string>>(new Set());
  const dataRef = useRef(data);
  const sessionLogRef = useRef(sessionLog);
  dataRef.current = data;
  sessionLogRef.current = sessionLog;

  const allSets = useMemo(() => {
    const total: { uid: string; sets: SetState[] }[] = [];
    for (const sec of SECTION_DEFS) {
      for (const ex of sections[sec.key] || []) {
        const uid = ex.uid;
        if (!uid) continue;
        const state = exStates[uid];
        if (state) total.push({ uid, sets: state.sets });
      }
    }
    return total;
  }, [sections, exStates]);

  const progress = useMemo(() => {
    let total = 0;
    let done = 0;
    let skipped = 0;
    for (const entry of allSets) {
      total += entry.sets.length;
      done += entry.sets.filter((s) => s.status === "done").length;
      skipped += entry.sets.filter((s) => s.status === "skipped").length;
    }
    const started = done > 0 || skipped > 0;
    const doneExCount = allSets.filter((entry) => entry.sets.every((s) => s.status !== "pending")).length;
    const newPbCount = allSets.reduce((acc, entry) => acc + entry.sets.filter((s) => s.isNewPb).length, 0);
    return { total, done, skipped, started, doneExCount, pct: total ? Math.round((done / total) * 100) : 0, newPbCount };
  }, [allSets]);

  // ── Write started_at on first mount (trainer only) ──────────────
  const startedRef = useRef(false);
  useEffect(() => {
    if (!isTrainer) return;
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
  }, [sessionId, isTrainer]);

  // ── Debounced exercise notes save ─────────────────────────────
  const persistExerciseNotes = useCallback(
    (notes: Record<string, string>) => {
      if (!isTrainer) return;
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
    [sessionId, isTrainer],
  );

  // ── Persist prescription changes ──────────────────────────────
  const persistPrescription = useCallback(() => {
    if (!isTrainer) return;
    const d = dataRef.current;
    if (!d) return;
    fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: d }),
    }).catch(() => {});
  }, [sessionId, isTrainer]);

  // ── Rest alert audio ──────────────────────────────────────────
  const primeRestAudio = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch { /* unsupported */ }
  }, []);

  const playRestAlert = useCallback(() => {
    try {
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "running") {
        const now = ctx.currentTime;
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 880;
          const t = now + i * 0.28;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
          osc.start(t);
          osc.stop(t + 0.26);
        }
      }
    } catch { /* ignore */ }
    try { if ("vibrate" in navigator) navigator.vibrate([180, 90, 180]); } catch { /* ignore */ }
  }, []);

  // ── Rest timer interval ───────────────────────────────────────
  useEffect(() => {
    const running = Object.keys(restTimers).length > 0;
    if (running && !tickRef.current) {
      tickRef.current = setInterval(() => {
        setRestTimers((prev) => {
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
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    };
  }, [restTimers]);

  useEffect(() => {
    for (const [key, t] of Object.entries(restTimers)) {
      if (t.mode === "countdown" && t.elapsed >= t.seconds && !alertedRef.current.has(key)) {
        alertedRef.current.add(key);
        playRestAlert();
      }
    }
  }, [restTimers, playRestAlert]);

  // ── Set-log API ───────────────────────────────────────────────
  const saveSetLog = async (
    exerciseRef: string,
    setNumber: number,
    fieldValues: { reps: string; weight: string; duration: string; bandColour: string | null },
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
    const clientOpId = reuseClientOpId ?? crypto.randomUUID();

    const method = existing ? "PATCH" : "POST";
    const body: Record<string, unknown> = existing
      ? { id: existing.id, reps: repsVal, weight_kg: weightVal, duration_seconds: durationVal, completed, is_warmup: isWarmup }
      : { exercise_ref: exerciseRef, set_number: setNumber, reps: repsVal, weight_kg: weightVal, duration_seconds: durationVal, completed, is_warmup: isWarmup, client_op_id: clientOpId };

    if (fieldValues.bandColour) {
      body.band_colour = fieldValues.bandColour;
    }

    const enqueueOffline = async (): Promise<SaveSetLogResult> => {
      try {
        await enqueue({
          client_op_id: clientOpId,
          sessionId,
          exerciseRef,
          setNumber,
          method: method as "POST" | "PATCH",
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

  const handleSetDone = async (uid: string, setIdx: number) => {
    if (!isTrainer) return;
    const state = exStates[uid];
    if (!state) return;
    const setNumber = setIdx + 1;
    const set = state.sets[setIdx];
    const ex = findExerciseByUid(uid);
    if (!ex) return;
    const timeBased = isTimeBased(ex.reps, ex.log_type);
    const ref = findExerciseRef(uid);
    if (!ref) return;

    let newStatus: "pending" | "done";
    let reps = set.reps;
    let weight = set.weight;
    let duration = set.duration;

    if (set.status === "done") {
      newStatus = "pending";
    } else {
      newStatus = "done";
      if (timeBased && !duration) {
        const presc = parsePrescribedSeconds(ex.reps);
        duration = presc != null ? String(presc) : ex.reps || "";
      }
      if (!timeBased && !reps) {
        const presc = parsePrescribedReps(ex.reps);
        reps = presc != null ? String(presc) : "";
      }
    }

    const result = await saveSetLog(ref, setNumber, { reps, weight, duration, bandColour: set.bandColour }, newStatus === "done", set.isWarmup, state.displayUnit, set.clientOpId);
    if (result.kind === "failed") {
      toast.error(result.message || "Failed to save set");
      return;
    }

    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newSets = [...st.sets];
      if (result.kind === "saved") {
        newSets[setIdx] = {
          status: newStatus,
          reps,
          weight,
          duration,
          bandColour: set.bandColour,
          savedId: result.log.id,
          isNewPb: result.log.is_new_pb === true,
          isWarmup: newSets[setIdx].isWarmup,
          pendingSync: false,
          clientOpId: undefined,
        };
      } else {
        newSets[setIdx] = {
          status: newStatus,
          reps,
          weight,
          duration,
          bandColour: set.bandColour,
          isWarmup: newSets[setIdx].isWarmup,
          pendingSync: newStatus !== "pending",
          clientOpId: result.clientOpId,
        };
      }
      return { ...prev, [uid]: { ...st, sets: newSets } };
    });
  };

  const handleSetSkip = async (uid: string, setIdx: number) => {
    if (!isTrainer) return;
    const state = exStates[uid];
    if (!state) return;
    const setNumber = setIdx + 1;
    const set = state.sets[setIdx];
    const ex = findExerciseByUid(uid);
    if (!ex) return;
    const timeBased = isTimeBased(ex.reps, ex.log_type);
    const ref = findExerciseRef(uid);
    if (!ref) return;

    const newStatus = set.status === "skipped" ? "pending" : "skipped";
    const reps = timeBased ? "" : (set.reps || "");
    const weight = timeBased ? "" : (set.weight || "");
    const duration = timeBased ? (set.duration || "") : "";

    const result = await saveSetLog(ref, setNumber, { reps, weight, duration, bandColour: set.bandColour }, false, set.isWarmup, state.displayUnit, set.clientOpId);
    if (result.kind === "failed") {
      toast.error(result.message || "Failed to save set");
      return;
    }

    setExStates((prev) => {
      const st = prev[uid];
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
      return { ...prev, [uid]: { ...st, sets: newSets } };
    });
  };

  const handleSetField = (uid: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => {
    if (!isTrainer) return;
    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setIdx] = { ...newSets[setIdx], [field]: value };
      return { ...prev, [uid]: { ...st, sets: newSets } };
    });
  };

  const handleBandSelect = (uid: string, setIdx: number, colour: string) => {
    if (!isTrainer) return;
    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newSets = [...st.sets];
      const current = newSets[setIdx].bandColour;
      newSets[setIdx] = { ...newSets[setIdx], bandColour: current === colour ? null : colour };
      return { ...prev, [uid]: { ...st, sets: newSets } };
    });
  };

  const handleAddSet = (uid: string) => {
    if (!isTrainer) return;
    const ex = findExerciseByUid(uid);
    if (!ex) return;
    const timeBased = isTimeBased(ex.reps, ex.log_type);
    ex.sets = (ex.sets || 0) + 1;
    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets.push({
        status: "pending",
        reps: timeBased ? "" : String(leadNum(ex.reps) || ""),
        weight: "",
        duration: timeBased ? ex.reps : "",
        bandColour: null,
        isWarmup: false,
      });
      return { ...prev, [uid]: { ...st, sets: newSets } };
    });
    persistPrescription();
  };

  const handleNoteToggle = (uid: string) => {
    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      return { ...prev, [uid]: { ...st, noteOpen: !st.noteOpen } };
    });
  };

  const handleNoteInput = (uid: string, value: string) => {
    savedNotesRef.current[uid] = value;
    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      return { ...prev, [uid]: { ...st, note: value } };
    });
    persistExerciseNotes(savedNotesRef.current);
  };

  const handleSwapUnit = (uid: string) => {
    if (!isTrainer) return;
    const ex = findExerciseByUid(uid);
    if (!ex) return;
    if (isBandEquipment(ex.equipment ?? [])) return;
    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newUnit: "kg" | "lb" = st.displayUnit === "kg" ? "lb" : "kg";
      return { ...prev, [uid]: { ...st, displayUnit: newUnit } };
    });
  };

  // ── Rest timer actions ────────────────────────────────────────
  const handleRestOpen = (key: string, seconds: number) => {
    primeRestAudio();
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
    alertedRef.current.delete(key);
    setRestTimers((prev) => {
      const t = prev[key];
      if (!t) return prev;
      return { ...prev, [key]: { ...t, elapsed: 0 } };
    });
  };

  const handleRestStop = (key: string) => {
    alertedRef.current.delete(key);
    setRestTimers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleRestAdjust = (key: string, delta: number, fallbackSeconds: number) => {
    if (restTimers[key]) {
      setRestTimers((prev) => {
        const t = prev[key];
        if (!t) return prev;
        return { ...prev, [key]: { ...t, elapsed: Math.max(0, t.elapsed - delta) } };
      });
    } else {
      setRestOverrides((prev) => {
        const base = prev[key] ?? fallbackSeconds;
        return { ...prev, [key]: Math.max(5, base + delta) };
      });
    }
  };

  // ── Uid → exercise / exercise_ref lookup ──────────────────────
  const uidToRefMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const sec of SECTION_DEFS) {
      (sections[sec.key] || []).forEach((ex, idx) => {
        if (ex.uid) map.set(ex.uid, exerciseRefKey(version, sec.key, idx, ex.exercise_name));
      });
    }
    return map;
  }, [sections, version]);

  const uidToExMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const sec of SECTION_DEFS) {
      for (const ex of sections[sec.key] || []) {
        if (ex.uid) map.set(ex.uid, ex);
      }
    }
    return map;
  }, [sections]);

  const findExerciseRef = useCallback((uid: string) => uidToRefMap.get(uid) ?? null, [uidToRefMap]);
  const findExerciseByUid = useCallback((uid: string) => uidToExMap.get(uid) ?? null, [uidToExMap]);

  // ── Offline queue replay ──────────────────────────────────────
  const markSetSynced = useCallback(
    (entry: PendingSetLogEntry, data: SetLog & { is_new_pb?: boolean }) => {
      setExStates((prev) => {
        let targetUid: string | null = null;
        for (const [uid, ref] of uidToRefMap) {
          if (ref === entry.exerciseRef) { targetUid = uid; break; }
        }
        if (!targetUid) return prev;
        const st = prev[targetUid];
        if (!st) return prev;
        const setIdx = entry.setNumber - 1;
        if (setIdx < 0 || setIdx >= st.sets.length) return prev;
        const newSets = [...st.sets];
        const unit = st.displayUnit;
        newSets[setIdx] = {
          ...newSets[setIdx],
          status: data.completed ? "done" : "skipped",
          reps: data.reps != null ? String(data.reps) : "",
          weight: data.weight_kg != null ? displayWeight(data.weight_kg, unit) : "",
          duration: data.duration_seconds != null ? String(data.duration_seconds) : "",
          bandColour: data.band_colour ?? null,
          savedId: data.id,
          isNewPb: data.is_new_pb === true,
          pendingSync: false,
          clientOpId: undefined,
        };
        setLogsMap[`${entry.exerciseRef}::${entry.setNumber}`] = data;
        return { ...prev, [targetUid]: { ...st, sets: newSets } };
      });
    },
    [uidToRefMap, setLogsMap],
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
          body: JSON.stringify({ ...entry.body, client_op_id: entry.client_op_id, logged_at: entry.capturedAt }),
        });
        if (res.status === 401) { authError = true; break; }
        if (!res.ok) break;
        const data: SetLog & { is_new_pb?: boolean } = await res.json();
        await remove(entry.client_op_id);
        markSetSynced(entry, data);
        synced += 1;
        if (data.is_new_pb) newPbs += 1;
      } catch { break; }
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
    setOffline(!navigator.onLine);
    const onOnline = () => { setOffline(false); void drainQueue(); };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [drainQueue]);

  useEffect(() => { void drainQueue(); }, [drainQueue]);

  // ── Complete session (trainer only) ────────────────────────────
  const handleComplete = async (confirmOffDay?: boolean) => {
    if (!isTrainer) return;
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
      data: { ...d, session_log: updatedLog, exercise_notes: savedNotesRef.current },
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
    dataRef.current = { ...d, session_log: updatedLog, exercise_notes: savedNotesRef.current };
    sessionLogRef.current = updatedLog;
    setShowComplete(false);
    toast.success(`Session ${sessionNumber} marked complete.`);
  };

  // ── Exercise-complete check ────────────────────────────────────
  const exComplete = useCallback(
    (uid: string): boolean => {
      const st = exStates[uid];
      if (!st) return false;
      return st.sets.length > 0 && st.sets.every((s) => s.status !== "pending");
    },
    [exStates],
  );

  // ── Render helpers ─────────────────────────────────────────────
  const sessionDate = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  const topStatusLabel = progress.doneExCount === allSets.length
    ? "All logged"
    : progress.started ? "In progress" : "Not started";

  const secIconEl = (color: "teal" | "rose" | "navy") => {
    const cls = color === "teal" ? "bg-teal-100 text-teal-700" : color === "rose" ? "bg-rose-100 text-rose-700" : "bg-navy-100 text-navy-700";
    const icon = color === "teal" ? ICO.flameLg : color === "rose" ? ICO.lightning : ICO.moon;
    return <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${cls}`}>{icon}</div>;
  };

  const isBandExercise = (ex: Exercise) => isBandEquipment(ex.equipment ?? []);

  // ── Client view: closing summary card stats ────────────────────
  const clientStats = useMemo(() => {
    if (audience !== "client") return null;
    let totalSetsCount = 0;
    let doneCount = 0;
    let skippedCount = 0;
    let toComeCount = 0;
    let pbCount = 0;
    for (const entry of allSets) {
      for (const s of entry.sets) {
        totalSetsCount++;
        if (s.status === "done") doneCount++;
        else if (s.status === "skipped") skippedCount++;
        else toComeCount++;
        if (s.isNewPb) pbCount++;
      }
    }
    return { totalSetsCount, doneCount, skippedCount, toComeCount, pbCount };
  }, [allSets, audience]);

  // ── Active tab state (client view) ────────────────────────────
  const [activeTab, setActiveTab] = useState<"workout" | "progress">("workout");

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Sticky top bar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            href={isTrainer ? "/hub/m" : "/portal"}
            aria-label="Back"
          >
            {ICO.back}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{clientName}</div>
            <div className="text-xs text-gray-500 truncate">
              Session {sessionNumber}
              {blockNumber != null ? ` · Block ${blockNumber}` : ""}
              {archetype ? ` · ${archetype}` : ""} · {phase ?? ""}
              {scheduledAt ? ` · Wk ${new Date(scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : week != null ? ` · Plan wk ${week}` : ""}
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            progress.doneExCount === allSets.length
              ? "bg-emerald-100 text-emerald-700"
              : progress.started
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-500"
          }`}>
            {topStatusLabel}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-rose transition-all duration-300"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-1.5 text-xs text-gray-500">
          <span>{progress.done} of {progress.total} sets logged</span>
          <span className="flex items-center gap-1">
            {ICO.clock}
            ~{durationMinutes} min guide
          </span>
        </div>
      </header>

      {/* ── Offline / sync bar ──────────────────────────────────── */}
      {(offline || syncNotice) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-3">
          <span className="text-amber-600 mt-0.5">{ICO.rest}</span>
          <div className="flex-1 text-xs text-amber-800">
            {syncNotice ? (
              <b>{syncNotice}</b>
            ) : (
              <>
                <b>Offline — sets saved on this phone</b>
                <p className="mt-0.5">Everything syncs when signal returns.</p>
              </>
            )}
          </div>
          <button
            className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-full transition-colors"
            onClick={() => void drainQueue()}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 pb-40">
        {/* Trainer info banner */}
        {isTrainer && (
          <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed">
            <b>Real-time session screen.</b> Fields are pre-filled from the prescription — tap Done to log as prescribed, or edit first. Sets save as you log them.
          </div>
        )}

        {/* Exercise sections */}
        <div className="space-y-4 px-4 mt-4">
          {SECTION_DEFS.map((sec) => {
            const list = sections[sec.key] || [];
            const blocks: { type: "group" | "single"; label?: string; items: Exercise[] }[] = computeGroups(list) as { type: "group" | "single"; label?: string; items: Exercise[] }[];
            const isCollapsed = !!collapsed[sec.key];
            const doneCount = list.filter((ex) => ex.uid && exComplete(ex.uid)).length;

            return (
              <div key={sec.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Section header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition-colors"
                  onClick={() => setCollapsed((p) => ({ ...p, [sec.key]: !p[sec.key] }))}
                  aria-expanded={!isCollapsed}
                >
                  {secIconEl(sec.color)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{sec.label}</div>
                    <div className="text-xs text-gray-500">{doneCount} of {list.length} logged</div>
                  </div>
                  <span className={`text-gray-400 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`}>{ICO.chev}</span>
                </button>

                {/* Section exercises */}
                {!isCollapsed && (
                  <div className="border-t border-gray-100">
                    {blocks.map((block) => (
                      block.type === "group" ? (
                        <SupersetBlockMobile
                          key={`grp-${block.label}`}
                          block={block as unknown as { type: "group"; label?: string; items: Exercise[] }}
                          exStates={exStates}
                          restTimers={restTimers}
                          restOverrides={restOverrides}
                          onSetDone={handleSetDone}
                          onSetSkip={handleSetSkip}
                          onSetField={handleSetField}
                          onBandSelect={handleBandSelect}
                          onNoteToggle={handleNoteToggle}
                          onNoteInput={handleNoteInput}
                          onSwapUnit={handleSwapUnit}
                          onAddSet={handleAddSet}
                          onRestOpen={handleRestOpen}
                          onRestMode={handleRestMode}
                          onRestReset={handleRestReset}
                          onRestStop={handleRestStop}
                          onRestAdjust={handleRestAdjust}
                          exComplete={exComplete}
                          bands={bands}
                          isTrainer={isTrainer}
                          isBandExercise={isBandExercise}
                        />
                      ) : (
                        <ExerciseCardMobile
                          key={block.items[0].uid ?? block.items[0].exercise_name}
                          sessionId={sessionId}
                          exercise={block.items[0]}
                          state={exStates[block.items[0].uid ?? ""]}
                          restTimerKey={block.items[0].uid ?? ""}
                          restTimer={restTimers[block.items[0].uid ?? ""]}
                          restSeconds={parseRestSeconds(block.items[0].rest ?? "") ?? 60}
                          restOverride={restOverrides[block.items[0].uid ?? ""]}
                          onSetDone={handleSetDone}
                          onSetSkip={handleSetSkip}
                          onSetField={handleSetField}
                          onBandSelect={handleBandSelect}
                          onNoteToggle={handleNoteToggle}
                          onNoteInput={handleNoteInput}
                          onSwapUnit={handleSwapUnit}
                          onAddSet={handleAddSet}
                          onRestOpen={handleRestOpen}
                          onRestMode={handleRestMode}
                          onRestReset={handleRestReset}
                          onRestStop={handleRestStop}
                          onRestAdjust={handleRestAdjust}
                          isComplete={block.items[0].uid ? exComplete(block.items[0].uid) : false}
                          bands={bands}
                          isTrainer={isTrainer}
                          isBandExercise={isBandExercise}
                        />
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Session summary (trainer only) ────────────────────── */}
        {isTrainer && (
          <div className="mx-4 mt-6 p-4 bg-white rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Session summary</h3>

            <div className="mb-4">
              <span className="text-xs text-gray-500 block mb-2">
                RPE <span className="text-gray-400">— rate of perceived exertion, 1 (very light) – 10 (maximal)</span>
              </span>
              <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="RPE">
                {Array.from({ length: 10 }, (_, i) => {
                  const val = i + 1;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRpe(rpe === val ? null : val)}
                      className={`h-10 rounded-lg text-sm font-medium transition-all ${
                        rpe === val
                          ? "bg-rose text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 active:bg-gray-200"
                      }`}
                      aria-pressed={rpe === val}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <span className="text-xs text-gray-500 block mb-2">Fatigue level</span>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Fatigue level">
                {(["low", "moderate", "high"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFatigue(fatigue === f ? null : f)}
                    className={`h-10 rounded-lg text-sm font-medium capitalize transition-all ${
                      fatigue === f
                        ? f === "low" ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400"
                        : f === "moderate" ? "bg-amber-100 text-amber-700 ring-2 ring-amber-400"
                        : "bg-red-100 text-red-700 ring-2 ring-red-400"
                        : "bg-gray-100 text-gray-700 active:bg-gray-200"
                    }`}
                    aria-pressed={fatigue === f}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-500 block mb-2">Session notes</span>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose"
                rows={3}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="How did the session go overall?"
              />
            </div>
          </div>
        )}

        {/* ── Client closing summary card ───────────────────────── */}
        {audience === "client" && clientStats && (
          <div className="mx-4 mt-6 p-4 bg-white rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Session summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600">{clientStats.doneCount}</div>
                <div className="text-xs text-emerald-700">Sets done</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{clientStats.toComeCount}</div>
                <div className="text-xs text-amber-700">Still to come</div>
              </div>
              {clientStats.pbCount > 0 && (
                <div className="col-span-2 bg-rose-50 rounded-lg p-3 text-center flex items-center justify-center gap-2">
                  {ICO.trophy}
                  <span className="text-sm font-semibold text-rose-700">{clientStats.pbCount} new personal best{clientStats.pbCount > 1 ? "s" : ""}</span>
                </div>
              )}
              {clientStats.skippedCount > 0 && (
                <div className="col-span-2 bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-600">{clientStats.skippedCount} set{clientStats.skippedCount > 1 ? "s" : ""} skipped</div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom action bar (trainer) ─────────────────────────── */}
      {isTrainer && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="text-xs text-gray-500 flex-1">Sets save as you log them</span>
            <button
              type="button"
              className="flex items-center gap-2 bg-rose text-white font-semibold text-sm px-5 py-2.5 rounded-xl active:bg-rose/90 transition-colors disabled:opacity-50"
              onClick={() => {
                if (rpe == null && fatigue == null) {
                  toast("Tip: RPE and fatigue are still blank — you can still complete without them.");
                }
                setShowComplete(true);
              }}
              disabled={completing}
            >
              {ICO.check}
              Finish
            </button>
          </div>
        </div>
      )}

      {/* ── Tab bar (client) ────────────────────────────────────── */}
      {audience === "client" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex">
            <button
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${activeTab === "workout" ? "text-rose" : "text-gray-400"}`}
              onClick={() => setActiveTab("workout")}
            >
              {ICO.grid}
              <span className="text-[10px] font-medium">Workout</span>
            </button>
            <button
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${activeTab === "progress" ? "text-rose" : "text-gray-400"}`}
              onClick={() => setActiveTab("progress")}
            >
              {ICO.flame}
              <span className="text-[10px] font-medium">Progress</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Complete overlay ────────────────────────────────────── */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowComplete(false)}>
          <div className="bg-white rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600">
              {ICO.checkLg}
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Mark this session complete?</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              {progress.doneExCount === allSets.length
                ? "Every exercise is logged. This saves the session and marks it complete."
                : `${allSets.length - progress.doneExCount} of ${allSets.length} exercises are still unlogged. You can complete anyway — unlogged sets save as not recorded.`}
            </p>
            <div className="space-y-2">
              <button
                type="button"
                className="w-full bg-rose text-white font-semibold text-sm py-3 rounded-xl active:bg-rose/90 transition-colors disabled:opacity-50"
                onClick={() => handleComplete()}
                disabled={completing}
              >
                Yes, complete session
              </button>
              <button
                type="button"
                className="w-full border border-gray-200 text-gray-700 font-medium text-sm py-3 rounded-xl active:bg-gray-50 transition-colors"
                onClick={() => setShowComplete(false)}
              >
                Keep logging
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: lead number from a string ────────────────────────────
function leadNum(s: string): number | null {
  const m = /^(\d+)/.exec(String(s).trim());
  return m ? parseInt(m[1], 10) : null;
}

// ── Sub-components ───────────────────────────────────────────────

function SetRowMobile({
  exercise,
  set,
  setIdx,
  displayUnit,
  onSetDone,
  onSetSkip,
  onSetField,
  onBandSelect,
  onSwapUnit,
  bands,
  isTrainer,
  isBand,
}: {
  exercise: Exercise;
  set: SetState;
  setIdx: number;
  displayUnit: "kg" | "lb";
  onSetDone: (uid: string, setIdx: number) => void;
  onSetSkip: (uid: string, setIdx: number) => void;
  onSetField: (uid: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onBandSelect: (uid: string, setIdx: number, colour: string) => void;
  onSwapUnit: (uid: string) => void;
  bands: { id: string; colour: string; colour_hex: string; tension_label: string }[];
  isTrainer: boolean;
  isBand: boolean;
}) {
  const uid = exercise.uid ?? "";
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);

    // ── Client read-only row ──────────────────────────────────────
    if (!isTrainer) {
      const statusTag = set.status === "done"
        ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Done</span>
        : set.status === "skipped"
          ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Skipped</span>
          : <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">To come</span>;

    let valueText: React.ReactNode = "";
    if (set.status !== "pending") {
      if (timeBased) {
        valueText = set.duration ? `${set.duration}s` : exercise.reps;
      } else if (isBand && set.bandColour) {
        const band = bands.find((b) => b.colour === set.bandColour);
        const repsPart = set.reps ? `${set.reps} reps` : "";
        const chip = band
          ? <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-1" style={{ backgroundColor: band.colour_hex + "22", color: band.colour_hex, border: `1px solid ${band.colour_hex}44` }}>{band.colour}</span>
          : set.bandColour ? <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 ml-1">{set.bandColour}</span> : null;
        valueText = (
          <>
            {repsPart}
            {chip}
          </>
        );
      } else {
        const parts: string[] = [];
        if (set.reps) parts.push(`${set.reps} reps`);
        if (set.weight) parts.push(`${set.weight} ${displayUnit}`);
        valueText = parts.join(" · ");
      }
    }

    return (
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="w-6 text-center text-xs font-medium text-gray-500">{setIdx + 1}</span>
        {set.isWarmup && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">Warm-up</span>}
        <div className="flex-1 text-sm text-gray-900 min-w-0">
          {set.status === "pending" ? (
            <span className="text-gray-400 italic">Not yet logged</span>
          ) : (
            <span className="flex items-center flex-wrap">
              {valueText}
              {set.isNewPb && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 ml-1.5">
                  {ICO.trophy} PB
                </span>
              )}
            </span>
          )}
        </div>
        {statusTag}
      </div>
    );
  }

  // ── Trainer editable row ──────────────────────────────────────
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 text-center text-xs font-medium text-gray-500">{setIdx + 1}</span>
        {set.isWarmup && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">Warm-up</span>}
        {set.isNewPb && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 ml-auto">
            {ICO.trophy} New PB
          </span>
        )}
        {set.pendingSync && (
          <span className="text-[10px] text-gray-400 ml-auto">queued</span>
        )}
      </div>

      {/* Input row */}
      {isBand ? (
        /* Band picker — 2-column grid for touch targets */
        <div className="grid grid-cols-2 gap-2 mb-2">
          {bands.map((b) => {
            const selected = set.bandColour === b.colour;
            return (
              <button
                key={b.id}
                type="button"
                className={`flex items-center gap-2 h-11 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  selected
                    ? "border-current shadow-sm"
                    : "border-gray-200 bg-white active:bg-gray-50"
                }`}
                style={selected ? { borderColor: b.colour_hex, backgroundColor: b.colour_hex + "12", color: b.colour_hex } : undefined}
                onClick={() => onBandSelect(uid, setIdx, b.colour)}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.colour_hex }} />
                {b.colour}
                <span className="text-xs opacity-60 ml-auto">{b.tension_label}</span>
              </button>
            );
          })}
        </div>
      ) : timeBased ? (
        <div className="mb-2">
          <label className="text-[10px] text-gray-500 mb-1 block">Duration</label>
          <input
            className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose"
            type="text"
            inputMode="numeric"
            value={set.duration}
            onChange={(e) => onSetField(uid, setIdx, "duration", e.target.value)}
            placeholder={exercise.reps}
          />
        </div>
      ) : (
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-500 mb-1 block">Reps</label>
            <input
              className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose"
              type="number"
              inputMode="numeric"
              value={set.reps}
              onChange={(e) => onSetField(uid, setIdx, "reps", e.target.value)}
              placeholder={parsePrescribedReps(exercise.reps) != null ? String(parsePrescribedReps(exercise.reps)) : exercise.reps}
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
              Weight ({displayUnit})
              <button
                className="text-rose text-[10px] font-medium"
                onClick={() => onSwapUnit(uid)}
              >switch</button>
            </label>
            <input
              className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose"
              type="text"
              inputMode="decimal"
              value={set.weight}
              onChange={(e) => onSetField(uid, setIdx, "weight", e.target.value)}
              placeholder="BW"
            />
          </div>
        </div>
      )}

      {/* Done / Skip buttons — side by side, 44px tap targets */}
      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all ${
            set.status === "done"
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 active:bg-emerald-100 active:text-emerald-700"
          }`}
          onClick={() => onSetDone(uid, setIdx)}
          aria-pressed={set.status === "done"}
        >
          {ICO.check} Done
        </button>
        <button
          type="button"
          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all ${
            set.status === "skipped"
              ? "bg-gray-400 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 active:bg-gray-200"
          }`}
          onClick={() => onSetSkip(uid, setIdx)}
          aria-pressed={set.status === "skipped"}
        >
          {ICO.skip} Skip
        </button>
      </div>
    </div>
  );
}

function RestControlMobile({
  timerKey,
  restSeconds,
  restOverride,
  timer,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
  onRestAdjust,
}: {
  timerKey: string;
  restSeconds: number;
  restOverride?: number;
  timer?: RestTimer;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
  onRestAdjust?: (key: string, delta: number, fallbackSeconds: number) => void;
}) {
  const effective = restOverride ?? restSeconds;
  if (!effective && !timer) return null;

  if (!timer) {
    return (
      <div className="px-4 pb-3 flex items-center gap-2">
        <button
          className="flex items-center gap-2 h-9 px-3 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg active:bg-gray-200 transition-colors"
          onClick={() => onRestOpen(timerKey, effective)}
        >
          {ICO.rest} Rest {effective}s
        </button>
        {onRestAdjust && (
          <>
            <button
              className="h-9 px-2.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg active:bg-gray-200 transition-colors"
              onClick={() => onRestAdjust(timerKey, -15, restSeconds)}
            >-15</button>
            <button
              className="h-9 px-2.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg active:bg-gray-200 transition-colors"
              onClick={() => onRestAdjust(timerKey, 15, restSeconds)}
            >+15</button>
          </>
        )}
      </div>
    );
  }

  const remaining = timer.mode === "countdown" ? timer.seconds - timer.elapsed : timer.elapsed;
  const over = timer.mode === "countdown" && remaining < 0;
  const pct = timer.mode === "countdown"
    ? Math.max(0, Math.min(100, (1 - timer.elapsed / Math.max(1, timer.seconds)) * 100))
    : Math.min(100, (timer.elapsed / Math.max(1, timer.seconds)) * 100);

  return (
    <div className="px-4 pb-3">
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <div className="flex gap-1 mb-2">
          <button
            className={`flex-1 h-8 text-xs font-medium rounded-lg transition-colors ${timer.mode === "countdown" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            onClick={() => onRestMode(timerKey, "countdown")}
          >Countdown</button>
          <button
            className={`flex-1 h-8 text-xs font-medium rounded-lg transition-colors ${timer.mode === "stopwatch" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            onClick={() => onRestMode(timerKey, "stopwatch")}
          >Stopwatch</button>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold tabular-nums ${over ? "text-red-500" : "text-gray-900"}`} role="timer" aria-live="off">
            {mmss(remaining)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {timer.mode === "countdown"
              ? (over ? `Over the prescribed ${timer.seconds}s rest` : `${timer.seconds}s prescribed rest`)
              : "Counting up — no target"}
          </div>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${over ? "bg-red-400" : "bg-rose"}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-2 mt-2">
          {onRestAdjust && timer.mode === "countdown" && (
            <>
              <button className="flex-1 h-8 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg active:bg-gray-200" onClick={() => onRestAdjust(timerKey, 15, restSeconds)}>+15s</button>
              <button className="flex-1 h-8 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg active:bg-gray-200" onClick={() => onRestAdjust(timerKey, -15, restSeconds)}>-15s</button>
            </>
          )}
          <button className="flex-1 h-8 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg active:bg-gray-200" onClick={() => onRestReset(timerKey)}>Reset</button>
          <button className="flex-1 h-8 bg-red-50 text-red-600 text-xs font-medium rounded-lg active:bg-red-100" onClick={() => onRestStop(timerKey)}>Stop</button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCardMobile({
  sessionId,
  exercise,
  state,
  restTimerKey,
  restTimer,
  restSeconds,
  restOverride,
  onSetDone,
  onSetSkip,
  onSetField,
  onBandSelect,
  onNoteToggle,
  onNoteInput,
  onSwapUnit,
  onAddSet,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
  onRestAdjust,
  isComplete,
  bands,
  isTrainer,
  isBandExercise,
}: {
  sessionId: string;
  exercise: Exercise;
  state: ExState | undefined;
  restTimerKey: string;
  restTimer?: RestTimer;
  restSeconds: number;
  restOverride?: number;
  onSetDone: (uid: string, setIdx: number) => void;
  onSetSkip: (uid: string, setIdx: number) => void;
  onSetField: (uid: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onBandSelect: (uid: string, setIdx: number, colour: string) => void;
  onNoteToggle: (uid: string) => void;
  onNoteInput: (uid: string, value: string) => void;
  onSwapUnit: (uid: string) => void;
  onAddSet: (uid: string) => void;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
  onRestAdjust: (key: string, delta: number, fallbackSeconds: number) => void;
  isComplete: boolean;
  bands: { id: string; colour: string; colour_hex: string; tension_label: string }[];
  isTrainer: boolean;
  isBandExercise: (ex: Exercise) => boolean;
}) {
  const uid = exercise.uid ?? "";
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);
  const sets = state?.sets ?? [];
  const displayUnit = state?.displayUnit ?? "kg";
  const note = state?.note ?? "";
  const noteOpen = state?.noteOpen ?? false;
  const presc = formatPrescription(exercise);
  const hasVideo = !!(exercise.media?.video_url);
  const band = isBandExercise(exercise);

  return (
    <div className={`border-b border-gray-100 ${isComplete ? "bg-emerald-50/30" : ""}`}>
      {/* Exercise header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isComplete && <span className="text-emerald-500">{ICO.check}</span>}
            <span className="text-sm font-semibold text-gray-900 truncate">{exercise.exercise_name}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Prescribed <b className="text-gray-700">{presc}</b></div>
          {exercise.coaching_cue && <div className="text-xs text-gray-400 mt-0.5 italic">{exercise.coaching_cue}</div>}
          {exercise.equipment && exercise.equipment.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {exercise.equipment.map((t) => (
                <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasVideo ? (
            <a
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors"
              href={exercise.media!.video_url!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Play demo video for ${exercise.exercise_name}`}
            >
              {ICO.video}
            </a>
          ) : (
            <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 text-gray-300" disabled>
              {ICO.video}
            </button>
          )}
          {isTrainer && (
            <button
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${note ? "bg-rose-50 text-rose" : "bg-gray-100 text-gray-600"} active:bg-gray-200`}
              onClick={() => onNoteToggle(uid)}
              aria-label={`Note on ${exercise.exercise_name}`}
            >
              {ICO.note}
            </button>
          )}
        </div>
      </div>

      {/* Exercise note */}
      {noteOpen && isTrainer && (
        <div className="px-4 pb-3">
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose"
            rows={2}
            placeholder="Quick note about this exercise…"
            value={note}
            onChange={(e) => onNoteInput(uid, e.target.value)}
          />
        </div>
      )}

      {/* Sets */}
      <div className="divide-y divide-gray-100">
        {sets.map((set, sIdx) => (
          <SetRowMobile
            key={sIdx}
            exercise={exercise}
            set={set}
            setIdx={sIdx}
            displayUnit={displayUnit}
            onSetDone={onSetDone}
            onSetSkip={onSetSkip}
            onSetField={onSetField}
            onBandSelect={onBandSelect}
            onSwapUnit={onSwapUnit}
            bands={bands}
            isTrainer={isTrainer}
            isBand={band}
          />
        ))}
      </div>

      {/* Add set button (trainer only) */}
      {isTrainer && (
        <div className="px-4 py-2">
          <button
            className="flex items-center gap-1.5 text-xs font-medium text-rose active:text-rose/70 transition-colors"
            onClick={() => onAddSet(uid)}
          >
            {ICO.plus} Add set
          </button>
        </div>
      )}

      {/* Rest timer */}
      <RestControlMobile
        timerKey={restTimerKey}
        restSeconds={restSeconds}
        restOverride={restOverride}
        timer={restTimer}
        onRestOpen={onRestOpen}
        onRestMode={onRestMode}
        onRestReset={onRestReset}
        onRestStop={onRestStop}
        onRestAdjust={onRestAdjust}
      />
    </div>
  );
}

function SupersetBlockMobile({
  block,
  exStates,
  restTimers,
  restOverrides,
  onSetDone,
  onSetSkip,
  onSetField,
  onBandSelect,
  onNoteToggle,
  onNoteInput,
  onSwapUnit,
  onAddSet,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
  onRestAdjust,
  exComplete,
  bands,
  isTrainer,
  isBandExercise,
}: {
  block: { type: "group"; label?: string; items: Exercise[] };
  exStates: Record<string, ExState>;
  restTimers: Record<string, RestTimer>;
  restOverrides: Record<string, number>;
  onSetDone: (uid: string, setIdx: number) => void;
  onSetSkip: (uid: string, setIdx: number) => void;
  onSetField: (uid: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onBandSelect: (uid: string, setIdx: number, colour: string) => void;
  onNoteToggle: (uid: string) => void;
  onNoteInput: (uid: string, value: string) => void;
  onSwapUnit: (uid: string) => void;
  onAddSet: (uid: string) => void;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
  onRestAdjust: (key: string, delta: number, fallbackSeconds: number) => void;
  exComplete: (uid: string) => boolean;
  bands: { id: string; colour: string; colour_hex: string; tension_label: string }[];
  isTrainer: boolean;
  isBandExercise: (ex: Exercise) => boolean;
}) {
  const label = block.label ?? "?";
  const totalRounds = Math.max(...block.items.map((ex) => ex.sets || 1));

  return (
    <div className="border-b border-gray-100">
      {/* Superset header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
          Superset {label}
        </span>
        <span className="text-[10px] text-gray-500">{block.items.length} exercises — round by round</span>
      </div>

      {/* Exercise headers */}
      {block.items.map((ex) => {
        const uid = ex.uid ?? "";
        const st = exStates[uid];
        const complete = ex.uid ? exComplete(ex.uid) : false;
        const presc = formatPrescription(ex);

        return (
          <div key={uid} className={`px-4 py-2.5 border-b border-gray-50 ${complete ? "bg-emerald-50/30" : ""}`}>
            <div className="flex items-center gap-2">
              {complete && <span className="text-emerald-500">{ICO.check}</span>}
              <span className="text-sm font-medium text-gray-900 truncate">{ex.exercise_name}</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Prescribed <b className="text-gray-700">{presc}</b></div>
          </div>
        );
      })}

      {/* Rounds */}
      {Array.from({ length: totalRounds }, (_, roundIdx) => {
        let anyPresent = false;
        let maxRest = 0;
        const roundRows: React.ReactNode[] = [];
        block.items.forEach((ex) => {
          const uid = ex.uid ?? "";
          const st = exStates[uid];
          const set = st?.sets[roundIdx];
          if (!set) return;
          anyPresent = true;
          if (parseRestSeconds(ex.rest ?? "") && (parseRestSeconds(ex.rest ?? "") ?? 0) > maxRest) {
            maxRest = parseRestSeconds(ex.rest ?? "") ?? 0;
          }
          roundRows.push(
            <div key={`${uid}-${roundIdx}`} className="border-b border-gray-50">
              <div className="px-4 pt-2 text-[11px] text-gray-500 font-medium">{ex.exercise_name}</div>
              <SetRowMobile
                exercise={ex}
                set={set}
                setIdx={roundIdx}
                displayUnit={st?.displayUnit ?? "kg"}
                onSetDone={onSetDone}
                onSetSkip={onSetSkip}
                onSetField={onSetField}
                onBandSelect={onBandSelect}
                onSwapUnit={onSwapUnit}
                bands={bands}
                isTrainer={isTrainer}
                isBand={isBandExercise(ex)}
              />
            </div>
          );
        });
        if (!anyPresent) return null;
        const roundKey = `grp:${label}:${roundIdx}`;
        return (
          <div key={roundIdx}>
            <div className="px-4 py-1.5 text-[10px] font-medium text-gray-400 bg-gray-50/50">
              Round {roundIdx + 1} of {totalRounds}
            </div>
            {roundRows}
            <RestControlMobile
              timerKey={roundKey}
              restSeconds={maxRest || 60}
              restOverride={restOverrides[roundKey]}
              timer={restTimers[roundKey]}
              onRestOpen={onRestOpen}
              onRestMode={onRestMode}
              onRestReset={onRestReset}
              onRestStop={onRestStop}
              onRestAdjust={onRestAdjust}
            />
          </div>
        );
      })}
    </div>
  );
}
