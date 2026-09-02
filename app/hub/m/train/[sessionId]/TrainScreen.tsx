"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Session, SessionLog, SetLog, Exercise, DeliveryMode } from "@/types";
import type { Band } from "@/lib/bands";
import type { LastSessionPrefill, PbMetadata } from "@/lib/last-session-data";
import { computeGroups, nextGroupLabel, checkSupersetSetCounts } from "@/lib/exercise-groups";
import { isTimeBased, parsePrescribedSeconds, parsePrescribedReps, parseRestSeconds, formatPrescription } from "@/lib/prescription";
import { parseLoad, prescribedWeight } from "@/lib/load-helpers";
import { sessionDurationMinutes } from "@/lib/scheduling";
import { defaultUnitForEquipment, isBandEquipment, toKg, fromKg } from "@/lib/units";
import { sessionWorkoutName } from "@/lib/session-display";
import { enqueue, getAllPending, remove, type PendingSetLogEntry } from "@/lib/hub/offline-set-log-queue";

/** Round a converted weight to 1 decimal and trim trailing .0 for display. */
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
  bandColour?: string;
  savedId?: string;
  isNewPb?: boolean;
  isWarmup: boolean;
  /** Set write is parked in the offline queue, not yet on the server. */
  pendingSync?: boolean;
  /** Idempotency key for the queued write — reused across re-taps so a toggle
   *  overwrites the queued entry rather than stacking a second one. */
  clientOpId?: string;
  /** CR-EF-010 — original prefilled values from last session (for undo). */
  prefillWeight?: string;
  prefillDuration?: string;
  prefillBandColour?: string;
}

/** Three-way outcome of a set-log save: saved to server, parked for later, or a
 *  genuine server-side failure (which must NOT be queued). */
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

function leadNum(s: string): number | null {
  const m = /^(\d+)/.exec(String(s).trim());
  return m ? parseInt(m[1], 10) : null;
}

function mmss(total: number): string {
  const m = Math.floor(Math.abs(total) / 60);
  const s = Math.abs(total) % 60;
  return (total < 0 ? "+" : "") + m + ":" + String(s).padStart(2, "0");
}

// ── Icons (inline SVG, matching mockup) ─────────────────────────

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
  ungroup: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6H5a2 2 0 0 0-2 2v3M16 6h3a2 2 0 0 1 2 2v3M8 18H5a2 2 0 0 1-2-2v-3M16 18h3a2 2 0 0 0 2-2v-3M2 2l20 20"/></svg>),
  link: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>),
  img: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.7" cy="8.7" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>),
  back: (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>),
  edit: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>),
  flame: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>),
  lightning: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  moon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>),
};

// ── Main Component ───────────────────────────────────────────────

export function TrainScreen({
  sessionId,
  sessionNumber,
  archetype,
  phase,
  week,
  data,
  sessionLog,
  scheduledAt,
  blockNumber,
  clientId,
  clientName,
  clientNumber,
  setLogs,
  deliveryMode,
  bestWeights,
  lastSessionData,
  pbDates,
  bands,
  initialSessionNote,
}: {
  sessionId: string;
  sessionNumber: number;
  archetype: string;
  phase: string;
  week: number;
  data: Session | null;
  sessionLog: SessionLog | null;
  scheduledAt: string | null;
  blockNumber: number | null;
  clientId: string | null;
  clientName: string;
  clientNumber: number | null;
  setLogs: SetLog[];
  deliveryMode: DeliveryMode;
  /** Client's best-ever weight_kg per exercise name — prefills a set's weight
   *  field when this session has no log for it yet. */
  bestWeights?: Record<string, number>;
  /** CR-EF-010 — last session's best set per exercise (for prefill). */
  lastSessionData?: Record<string, LastSessionPrefill>;
  /** CR-EF-014 — PB metadata per exercise (for header chip). */
  pbDates?: Record<string, PbMetadata>;
  /** CR-EF-014: active bands for the colour picker. */
  bands?: Band[];
  /** BUG-EF-107 — latest client_notes entry for this session, so the note
   *  sheet opens pre-populated when the trainer returns to the workout. */
  initialSessionNote?: string | null;
}) {
  const version = deliveryMode === "home_training" ? "home" : "studio";
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

        // CR-EF-010 + CR-EF-124: prescribed load takes precedence over last-session prefill.
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
            bandColour: log?.band_colour ?? prefillBandColour ?? "",
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

  const [pickSection, setPickSection] = useState<SectionKey | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(initialSessionNote ?? "");
  const [noteSaving, setNoteSaving] = useState(false);

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
    for (const entry of allSets) {
      total += entry.sets.length;
      done += entry.sets.filter((s) => s.status !== "pending").length;
    }
    const started = done > 0;
    const doneExCount = allSets.filter((entry) => entry.sets.every((s) => s.status !== "pending")).length;
    return { total, done, started, doneExCount, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [allSets]);

  // ── Bug fix #3: write started_at on first mount ────────────────
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
    })
      .then((res) => {
        if (!res.ok) {
          res.json().then((b) => b?.error).catch(() => null).then((msg) => {
            console.error("Failed to write started_at:", msg);
          });
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // ── Debounced exercise notes save (bug fix #1) ─────────────────
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
        })
          .then((res) => {
            if (!res.ok) {
              res.json().then((b) => b?.error).catch(() => null).then((msg) => {
                toast.error(msg || "Couldn't save exercise note");
              });
            }
          })
          .catch(() => {});
      }, 800);
    },
    [sessionId],
  );

  // ── Persist prescription changes (add-set / group / ungroup) ───
  // Structural edits (adding a set, grouping/ungrouping exercises) mutate the
  // relevant Exercise object in place (same object graph as dataRef.current,
  // since `sections` is a live reference into data.versions[version]), then
  // call this to write the whole session `data` blob back — otherwise the
  // change only lives in memory and silently reverts on the next page load,
  // even though any set_logs rows already saved against it stay in the DB.
  const persistPrescription = useCallback(() => {
    // CR-EF-121 — warn on superset set-count drift before persisting
    for (const sec of SECTION_DEFS) {
      const list = sections[sec.key] || [];
      if (list.length < 2) continue;
      const warnings = checkSupersetSetCounts(list);
      for (const w of warnings) {
        const detail = w.exercises.map((e) => `${e.name} (${e.sets})`).join(", ");
        toast.warning(
          `Superset ${w.label} in ${sec.label}: exercises have ${w.maxSets} rounds but some are set to fewer sets — later rounds will be incomplete. (${detail})`,
          { duration: 8000 },
        );
      }
    }

    const d = dataRef.current;
    if (!d) return;
    fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: d }),
    })
      .then((res) => {
        if (!res.ok) {
          res.json().then((b) => b?.error).catch(() => null).then((msg) => {
            toast.error(msg || "Failed to save — this change may not survive a reload.");
          });
        }
      })
      .catch(() => {
        toast.error("Failed to save — this change may not survive a reload.");
      });
  }, [sessionId]);

  // ── Rest alert audio (CR-EF-019) ────────────────────────────────
  // iOS PWAs block un-gestured audio, so the AudioContext is primed on the
  // user's "start rest" tap and the beep is generated in code (no asset, so it
  // works offline). navigator.vibrate is the silent-mode fallback.
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
    } catch {
      /* audio unsupported — vibrate fallback still applies */
    }
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
    } catch {
      /* ignore */
    }
    try {
      if ("vibrate" in navigator) navigator.vibrate([180, 90, 180]);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Rest timer interval ────────────────────────────────────────
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
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [restTimers]);

  // Fire the audible/vibrate alert the moment a countdown crosses zero
  // (CR-EF-019). alertedRef guarantees it fires once per countdown, not once
  // per remaining tick while the "over" state is shown.
  useEffect(() => {
    for (const [key, t] of Object.entries(restTimers)) {
      if (t.mode === "countdown" && t.elapsed >= t.seconds && !alertedRef.current.has(key)) {
        alertedRef.current.add(key);
        playRestAlert();
      }
    }
  }, [restTimers, playRestAlert]);

  // ── Set-log API ────────────────────────────────────────────────
  const saveSetLog = async (
    exerciseRef: string,
    setNumber: number,
    fieldValues: { reps: string; weight: string; duration: string },
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

    // Idempotency key minted once per logical write and reused across retries
    // (CR-EF-029). The live POST carries it so a retried create dedupes at the
    // DB; if the write instead falls back to the offline queue, the SAME key is
    // replayed, so a committed-but-unacked POST can't become a duplicate row.
    const clientOpId = reuseClientOpId ?? crypto.randomUUID();

    const method = existing ? "PATCH" : "POST";
    const body = existing
      ? { id: existing.id, reps: repsVal, weight_kg: weightVal, duration_seconds: durationVal, completed, is_warmup: isWarmup }
      : { exercise_ref: exerciseRef, set_number: setNumber, reps: repsVal, weight_kg: weightVal, duration_seconds: durationVal, completed, is_warmup: isWarmup, client_op_id: clientOpId };

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
        // Couldn't even park it locally (e.g. IndexedDB unavailable) — surface a
        // real failure rather than silently dropping the tap.
        return { kind: "failed" };
      }
      return { kind: "queued", clientOpId };
    };

    // Offline shortcut — don't even attempt a fetch if the browser already knows
    // the connection is down.
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
      // fetch() itself threw — network failure, not a server rejection. Queue it.
      return enqueueOffline();
    }

    if (!res.ok) {
      // The request DID reach the server and was rejected — a real server failure,
      // not an offline scenario. Never queue these.
      const message = await res.json().then((b) => b?.error).catch(() => null);
      return { kind: "failed", message };
    }

    const saved: SetLog & { is_new_pb?: boolean } = await res.json();
    setLogsMap[key] = saved;
    return { kind: "saved", log: saved };
  };

  const handleSetDone = async (uid: string, setIdx: number) => {
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

    const result = await saveSetLog(ref, setNumber, { reps, weight, duration }, newStatus === "done", set.isWarmup, state.displayUnit, set.clientOpId);
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
          savedId: result.log.id,
          isNewPb: result.log.is_new_pb === true,
          isWarmup: newSets[setIdx].isWarmup,
          pendingSync: false,
          clientOpId: undefined,
        };
      } else {
        // saved-but-queued: never a PB pill (client can't know cross-session history),
        // and no savedId yet — the row doesn't exist on the server.
        newSets[setIdx] = {
          status: newStatus,
          reps,
          weight,
          duration,
          isWarmup: newSets[setIdx].isWarmup,
          pendingSync: newStatus !== "pending",
          clientOpId: result.clientOpId,
        };
      }
      return { ...prev, [uid]: { ...st, sets: newSets } };
    });
  };

  const handleSetSkip = async (uid: string, setIdx: number) => {
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

    const result = await saveSetLog(ref, setNumber, { reps, weight, duration }, false, set.isWarmup, state.displayUnit, set.clientOpId);
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
    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setIdx] = { ...newSets[setIdx], [field]: value };
      return { ...prev, [uid]: { ...st, sets: newSets } };
    });
  };

  const handleAddSet = (uid: string) => {
    const ex = findExerciseByUid(uid);
    if (!ex) return;
    const timeBased = isTimeBased(ex.reps, ex.log_type);
    // Bump the prescribed count too (not just the local set list) — otherwise
    // this set, and any log saved against it, disappears from view on reload
    // even though the set_logs row itself is still there.
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
        isWarmup: false,
      });
      return { ...prev, [uid]: { ...st, sets: newSets } };
    });
    persistPrescription();
    toast(`Set ${exStates[uid]?.sets ? (exStates[uid].sets.length + 1) : 1} added to "${ex.exercise_name}".`);
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
    const ex = findExerciseByUid(uid);
    if (!ex) return;
    // Bands always log in lb — the unit is locked, not just defaulted.
    if (isBandEquipment(ex.equipment ?? [])) return;
    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newUnit: "kg" | "lb" = st.displayUnit === "kg" ? "lb" : "kg";
      return { ...prev, [uid]: { ...st, displayUnit: newUnit } };
    });
    toast(`"${ex.exercise_name}" now logs in ${exStates[uid]?.displayUnit === "kg" ? "lb" : "kg"} for this session only.`);
  };

  // ── Rest timer actions ─────────────────────────────────────────
  const handleRestOpen = (key: string, seconds: number) => {
    primeRestAudio();
    setRestTimers((prev) => ({
      ...prev,
      [key]: { mode: "countdown", elapsed: 0, seconds },
    }));
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

  // In-session rest-time override (CR-EF-020). Before the timer starts the
  // adjustment is remembered per-exercise (floored at 5s); while a countdown is
  // running it shifts the remaining time directly. Nothing is written back to
  // the prescription — this is for this session only.
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

  // ── Pick (superset grouping) ───────────────────────────────────
  const handlePickMode = (sectionKey: SectionKey) => {
    setPickSection((prev) => (prev === sectionKey ? null : sectionKey));
    setPicked({});
  };

  const handlePickToggle = (uid: string) => {
    setPicked((prev) => {
      if (prev[uid]) {
        const next = { ...prev };
        delete next[uid];
        return next;
      }
      return { ...prev, [uid]: true };
    });
  };

  const handlePickCancel = () => {
    setPickSection(null);
    setPicked({});
  };

  const handlePickGroup = () => {
    const pickedUids = Object.keys(picked);
    if (pickedUids.length < 2 || !pickSection) return;

    const sectionList = sections[pickSection] || [];
    const label = nextGroupLabel(sectionList);

    setExStates((prev) => {
      for (const uid of pickedUids) {
        const st = prev[uid];
        if (!st) continue;
        const ex = findExerciseByUid(uid);
        if (!ex) continue;
        ex.group_label = label;
      }
      return { ...prev };
    });

    setPickSection(null);
    setPicked({});
    persistPrescription();
    toast(`${pickedUids.length} exercises grouped as ${label}.`);
  };

  const handleUngroup = (groupLabel: string) => {
    const allExs: Exercise[] = [];
    for (const sec of SECTION_DEFS) {
      for (const ex of sections[sec.key] || []) {
        allExs.push(ex);
      }
    }
    for (const ex of allExs) {
      if (ex.group_label === groupLabel) {
        ex.group_label = undefined;
      }
    }
    toast(`Superset ${groupLabel} ungrouped — the exercises stay in place, performed one at a time.`);
    setExStates((prev) => ({ ...prev }));
    persistPrescription();
  };

  // ── Quick session note (CR-EF-079) ─────────────────────────────
  const handleSaveNote = async () => {
    const text = noteDraft.trim();
    if (!text || !clientId) {
      toast.error("Cannot save note — client is not loaded.");
      return;
    }
    setNoteSaving(true);
    try {
      const res = await fetch("/api/client-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, session_id: sessionId, note: text }),
      });
      if (!res.ok) throw new Error("Save failed");
      setNoteOpen(false);
      toast.success("Note saved");
    } catch {
      toast.error("Could not save note — try again.");
    } finally {
      setNoteSaving(false);
    }
  };

  // ── Complete ───────────────────────────────────────────────────
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
    // CR-EF-030: sync the in-memory refs to the now-completed state so a later
    // autosave (note edit, add-set) re-reads the completed session_log instead of
    // the stale pre-completion blob and silently reverts completed_at on the server.
    dataRef.current = { ...d, session_log: updatedLog, exercise_notes: savedNotesRef.current };
    sessionLogRef.current = updatedLog;
    setShowComplete(false);
    toast.success(`Session ${sessionNumber} marked complete.`);
  };

  // ── Uid → exercise / exercise_ref lookup ───────────────────────
  const uidToRefMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const sec of SECTION_DEFS) {
      (sections[sec.key] || []).forEach((ex, idx) => {
        if (ex.uid) {
          map.set(ex.uid, exerciseRefKey(version, sec.key, idx, ex.exercise_name));
        }
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

  // ── Offline queue replay ───────────────────────────────────────
  // Reconciles one replayed write back into the in-memory set state: queued →
  // synced. Full reconciliation from the server response so a set that was queued
  // before a reload (and so had no server row at init time) still lands correct.
  const markSetSynced = useCallback(
    (entry: PendingSetLogEntry, data: SetLog & { is_new_pb?: boolean }) => {
      setExStates((prev) => {
        let targetUid: string | null = null;
        for (const [uid, ref] of uidToRefMap) {
          if (ref === entry.exerciseRef) {
            targetUid = uid;
            break;
          }
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
      toast.success(
        `${synced} ${synced === 1 ? "set" : "sets"} synced${newPbs > 0 ? ` — ${newPbs} new PB` : ""}`,
      );
    }
  }, [markSetSynced]);

  // Drain once on mount (entries may persist in IndexedDB across a reload from a
  // prior offline period) and again whenever connectivity returns.
  useEffect(() => {
    // Sync initial online state — navigator.onLine may differ from the
    // server's hardcoded `false` (e.g. mobile reports offline briefly on
    // first load), so we correct it after hydration to avoid a flash.
    setOffline(!navigator.onLine);

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

  // ── Exercise-complete check ─────────────────────────────────────
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
    : progress.started
      ? "In progress"
      : "Not started";

  const topStatusClass = progress.doneExCount === allSets.length
    ? "done"
    : progress.started
      ? "progress"
      : "pending";

  const secIconEl = (color: "teal" | "rose" | "navy") => {
    const cls = color === "teal" ? "ic-teal" : color === "rose" ? "ic-rose" : "ic-navy";
    const icon = color === "teal" ? ICO.flame : color === "rose" ? ICO.lightning : ICO.moon;
    return <div className={`sec-h-ic ${cls}`}>{icon}</div>;
  };

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="top">
        <div className="top-row">
          <Link
            className="back-btn"
            href="/hub/m"
            aria-label="Back to today"
          >
            {ICO.back}
          </Link>
          <div className="top-id">
            <div className="top-client">{clientName}</div>
            <div className="top-meta">
              {sessionWorkoutName({ archetype, data, week, phase }, `Session ${sessionNumber}`)}
              {` · ${phase}`}
              {scheduledAt ? ` · Wk ${new Date(scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : week != null ? ` · Plan wk ${week}` : ""}
            </div>
          </div>
          <span className={`top-status ${topStatusClass}`}>{topStatusLabel}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="progress-row">
          <span className="progress-label">{progress.doneExCount} of {allSets.length} exercises logged</span>
          <span className="eta" title="A guide from the prescription — not a live countdown">
            {ICO.clock}~{durationMinutes} min · guide
          </span>
        </div>
      </header>

      {/* ── Offline / sync bar ──────────────────────────────────── */}
      {(offline || syncNotice) && (
        <div className="offline on" id="offlineBar" role="status">
          <span className="offline-ic">{ICO.rest}</span>
          <div>
            {syncNotice ? (
              <b>{syncNotice}</b>
            ) : (
              <>
                <b>Offline — sets saved on this phone</b>
                Keep logging. Everything is queued locally and syncs the moment the signal comes back. The desktop hub won&apos;t see these sets until then.
              </>
            )}
          </div>
          <button className="offline-act" onClick={() => void drainQueue()}>Retry</button>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="mcontent" style={{ paddingBottom: "calc(var(--tabbar-h) + 66px + 24px + env(safe-area-inset-bottom))" }}>
        <div className="note">
          <span className="note-b">i</span>
          <div>
            <b>The real-time session screen.</b> Replaces the old desktop-adjacent log.
            Fields are pre-filled from the prescription — tap <b>Done</b> to log exactly as prescribed, or edit first.
          </div>
        </div>

        <div id="sectionsRoot">
          {SECTION_DEFS.map((sec) => {
            const list = sections[sec.key] || [];
            const blocks = computeGroups(list);
            const isCollapsed = !!collapsed[sec.key];
            const inPick = pickSection === sec.key;
            const doneCount = list.filter((ex) => ex.uid && exComplete(ex.uid)).length;

            return (
              <div key={sec.key} className={`sec${isCollapsed ? " collapsed" : ""}`}>
                <button
                  type="button"
                  className="sec-h"
                  onClick={() => setCollapsed((p) => ({ ...p, [sec.key]: !p[sec.key] }))}
                  aria-expanded={!isCollapsed}
                >
                  {secIconEl(sec.color)}
                  <div>
                    <div className="sec-h-t">{sec.label}</div>
                    <div className="sec-h-s">{doneCount} of {list.length} logged</div>
                  </div>
                  <span className="sec-h-chev">{ICO.chev}</span>
                </button>

                {sec.key === "main_block" && (
                  <div className="sec-tools">
                    <button
                      type="button"
                      className={`tool-btn${inPick ? " on" : ""}`}
                      onClick={() => handlePickMode(sec.key)}
                      aria-pressed={inPick}
                    >
                      {ICO.link}
                      {inPick ? "Selecting" : "Group"}
                    </button>
                    <span className="tool-hint">
                      {inPick ? "Tick two or more, then confirm below." : "Combine exercises into a superset."}
                    </span>
                  </div>
                )}

                {!isCollapsed && (
                  <div className="sec-b">
                    {blocks.map((block) =>
                      block.type === "group" ? (
                        <SupersetBlock
                          key={`grp-${block.label}`}
                          block={block as { type: "group"; label?: string; items: Exercise[] }}
                          exStates={exStates}
                          inPick={inPick}
                          picked={picked}
                          restTimers={restTimers}
                          restOverrides={restOverrides}
                          onSetDone={handleSetDone}
                          onSetSkip={handleSetSkip}
                          onSetField={handleSetField}
                          onNoteToggle={handleNoteToggle}
                          onNoteInput={handleNoteInput}
                          onSwapUnit={handleSwapUnit}
                          onAddSet={handleAddSet}
                          onPickToggle={handlePickToggle}
                          onRestOpen={handleRestOpen}
                          onRestMode={handleRestMode}
                          onRestReset={handleRestReset}
                          onRestStop={handleRestStop}
                          onRestAdjust={handleRestAdjust}
                          onUngroup={handleUngroup}
                          exComplete={exComplete}
                        />
                      ) : (
                        <ExerciseCard
                          key={block.items[0].uid ?? block.items[0].exercise_name}
                          sessionId={sessionId}
                          exercise={block.items[0]}
                          state={exStates[block.items[0].uid ?? ""]}
                          restTimerKey={block.items[0].uid ?? ""}
                          restTimer={restTimers[block.items[0].uid ?? ""]}
                          restSeconds={parseRestSeconds(block.items[0].rest ?? "") ?? 60}
                          restOverride={restOverrides[block.items[0].uid ?? ""]}
                          inPick={inPick}
                          isPicked={!!(block.items[0].uid && picked[block.items[0].uid])}
                          onSetDone={handleSetDone}
                          onSetSkip={handleSetSkip}
                          onSetField={handleSetField}
                          onNoteToggle={handleNoteToggle}
                          onNoteInput={handleNoteInput}
                          onSwapUnit={handleSwapUnit}
                          onAddSet={handleAddSet}
                          onPickToggle={handlePickToggle}
                          onRestOpen={handleRestOpen}
                          onRestMode={handleRestMode}
                          onRestReset={handleRestReset}
                          onRestStop={handleRestStop}
                          onRestAdjust={handleRestAdjust}
                          isComplete={block.items[0].uid ? exComplete(block.items[0].uid) : false}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Session summary ──────────────────────────────────────── */}
        <div className="summary">
          <h2>Session summary</h2>
          <p>Logged once, at the end — covers how the whole session felt, not one exercise.</p>

          <div className="field-group">
            <span className="field-l">
              RPE <span className="field-hint">— rate of perceived exertion, 1 (very light) – 10 (maximal)</span>
            </span>
            <div className="rpe-row" role="radiogroup" aria-label="RPE">
              {Array.from({ length: 10 }, (_, i) => {
                const val = i + 1;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRpe(rpe === val ? null : val)}
                    className={`rpe-btn${rpe === val ? " on" : ""}`}
                    aria-pressed={rpe === val}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field-group">
            <span className="field-l">Fatigue level</span>
            <div className="fatigue-seg" role="radiogroup" aria-label="Fatigue level">
              {(["low", "moderate", "high"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFatigue(fatigue === f ? null : f)}
                  className={`fatigue-btn ${f}${fatigue === f ? " on" : ""}`}
                  aria-pressed={fatigue === f}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span className="field-l">Session notes</span>
            <div className="notes-row">
              <textarea
                id="sessionNotes"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="How did the session go overall — anything to flag for next time?"
              />
            </div>
          </div>
        </div>
      </main>

      {/* ── Pick bar ─────────────────────────────────────────────── */}
      <div className={`pick-bar${pickSection ? " on" : ""}`}>
        <div className="pick-count">
          {Object.keys(picked).length} selected
          <span>Pick two or more from the same section</span>
        </div>
        <button onClick={handlePickCancel}>Cancel</button>
        <button
          className="go"
          onClick={handlePickGroup}
          disabled={Object.keys(picked).length < 2}
        >
          Group as superset
        </button>
      </div>

      {/* ── Bottom action bar ─────────────────────────────────────── */}
      <div className="action-bar">
        <div className="action-inner">
          <Link
            className="btn btn-outline btn-icon"
            href={`/hub/m/train/${sessionId}/edit`}
            aria-label="Edit workout"
            title="Edit workout"
          >
            {ICO.edit}
          </Link>
          <button
            type="button"
            className={`btn btn-outline btn-icon${noteDraft.trim() ? " has-note" : ""}`}
            onClick={() => setNoteOpen(true)}
            aria-label="Add a note about this session"
            title="Add a note"
          >
            {ICO.note}
          </button>
          <span className="action-scope">{progress.doneExCount} of {allSets.length} exercises logged</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (rpe == null && fatigue == null) {
                toast("Tip: RPE and fatigue are still blank — you can still complete without them.");
              }
              setShowComplete(true);
            }}
            disabled={completing}
          >
            {ICO.check}
            Complete
          </button>
        </div>
      </div>

      {/* ── Quick note sheet ──────────────────────────────────────── */}
      {noteOpen && (
        <>
          <div className="sheet-overlay open" onClick={() => setNoteOpen(false)} />
          <div className="note-sheet" role="dialog" aria-modal="true" aria-labelledby="noteSheetTitle">
            <div className="sh-grab" />
            <div className="sh-h">
              <span className="sh-t" id="noteSheetTitle">
                Note — {data?.focus_label || (archetype ? `${archetype} session` : `Session ${sessionNumber}`)}
              </span>
              <button className="sh-close" onClick={() => setNoteOpen(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sh-s">
              For {clientName} · same notes list she sees in client mode
            </div>
            <div className="sh-note">
              <textarea
                placeholder="Add a note about this session…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                aria-label="Note text"
              />
              <div className="sh-note-foot">
                <button className="btn btn-primary" onClick={handleSaveNote} disabled={noteSaving || !noteDraft.trim()}>
                  Save note
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Complete overlay ──────────────────────────────────────── */}
      {showComplete && (
        <div className="overlay open" onClick={() => setShowComplete(false)}>
          <div className="complete-card" onClick={(e) => e.stopPropagation()}>
            <div className="complete-ic">{ICO.checkLg}</div>
            <h3>Mark this session complete?</h3>
            <p>
              {progress.doneExCount === allSets.length
                ? "Every exercise is logged. This saves the session and marks it complete."
                : `${allSets.length - progress.doneExCount} of ${allSets.length} exercises are still unlogged. You can complete anyway — unlogged sets save as not recorded.`}
            </p>
            <div className="complete-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleComplete()}
                disabled={completing}
                style={{ width: "100%" }}
              >
                Yes, complete session
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowComplete(false)}
                style={{ width: "100%" }}
              >
                Keep logging
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function Thumbnail({ exercise }: { exercise: Exercise }) {
  const imageUrl = exercise.media?.image_url;
  if (imageUrl) {
    return (
      <div className="ex-thumb has-img" aria-hidden="true">
        <img
          src={imageUrl}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
      </div>
    );
  }
  if (exercise.media?.video_url) {
    return (
      <div className="ex-thumb has-img" aria-hidden="true">
        {ICO.video}
      </div>
    );
  }
  return (
    <div className="ex-thumb no-img" aria-hidden="true">
      {ICO.img}
      <span className="thumb-cap">none</span>
    </div>
  );
}

function SetRow({
  exercise,
  set,
  setIdx,
  displayUnit,
  onSetDone,
  onSetSkip,
  onSetField,
  onSwapUnit,
}: {
  exercise: Exercise;
  set: SetState;
  setIdx: number;
  displayUnit: "kg" | "lb";
  onSetDone: (uid: string, setIdx: number) => void;
  onSetSkip: (uid: string, setIdx: number) => void;
  onSetField: (uid: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onSwapUnit: (uid: string) => void;
}) {
  const uid = exercise.uid ?? "";
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);
  const disabled = set.status === "skipped";
  const isBand = isBandEquipment(exercise.equipment ?? []);
  const targetLabel = timeBased
    ? `Target: ${exercise.reps}`
    : `Target: ${exercise.reps}${exercise.tempo && exercise.tempo !== "—" ? ` @ ${exercise.tempo}` : ""}${exercise.rest && exercise.rest !== "—" ? ` · ${exercise.rest} rest` : ""}`;

  const rowCls = [
    "set-row",
    set.status === "done" ? "is-done" : "",
    set.status === "skipped" ? "is-skipped" : "",
    set.isWarmup && set.status !== "done" && set.status !== "skipped" ? "is-warmup" : "",
    set.pendingSync ? "is-queued" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rowCls}>
      <div className="set-row-top">
        <span className="set-n">{setIdx + 1}</span>
        {set.isWarmup && <span className="wu-badge">Warm-up</span>}
        <span className="set-target">{targetLabel}</span>
        {set.status === "done" && set.isNewPb && (
          <span className="log-badge reps" style={{ marginLeft: "auto" }}>New PB</span>
        )}
        {set.pendingSync && (
          <span className="queued-badge" style={{ marginLeft: "auto" }}>queued — will sync</span>
        )}
      </div>
      <div className="set-row-body">
        {timeBased ? (
          <div className="set-field wide">
            <span className="set-field-l">Duration</span>
            <input
              className="set-input"
              type="text"
              inputMode="numeric"
              value={set.duration}
              onChange={(e) => onSetField(uid, setIdx, "duration", e.target.value)}
              placeholder={exercise.reps}
              disabled={disabled}
            />
          </div>
        ) : (
          <>
            <div className="set-field">
              <span className="set-field-l">Reps</span>
              <input
                className="set-input"
                type="number"
                inputMode="numeric"
                value={set.reps}
                onChange={(e) => onSetField(uid, setIdx, "reps", e.target.value)}
                placeholder={parsePrescribedReps(exercise.reps) != null ? String(parsePrescribedReps(exercise.reps)) : exercise.reps}
                disabled={disabled}
              />
            </div>
            <div className="set-field">
              <span className="set-field-l">
                Weight ({displayUnit})
                {isBand ? (
                  <span className="unit-lock" title="Band exercises always log in lb — unit is locked">
                    bands
                  </span>
                ) : (
                  <button
                    className="unit-swap"
                    onClick={() => onSwapUnit(uid)}
                    title="Correct the unit for this exercise"
                  >
                    switch
                  </button>
                )}
              </span>
              <input
                className="set-input"
                type="text"
                inputMode="decimal"
                value={set.weight}
                onChange={(e) => onSetField(uid, setIdx, "weight", e.target.value)}
                placeholder="BW"
                disabled={disabled}
              />
            </div>
          </>
        )}
        <div className="set-actions">
          <button
            type="button"
            className={`set-btn done-btn${set.status === "done" ? " on" : ""}`}
            onClick={() => onSetDone(uid, setIdx)}
            aria-pressed={set.status === "done"}
          >
            {ICO.check}Done
          </button>
          <button
            type="button"
            className={`set-btn skip-btn${set.status === "skipped" ? " on" : ""}`}
            onClick={() => onSetSkip(uid, setIdx)}
            aria-pressed={set.status === "skipped"}
          >
            {ICO.skip}Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function RestControl({
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
      <div className="rest">
        <div className="rest-start-row">
          <button
            className="rest-start"
            onClick={() => onRestOpen(timerKey, effective)}
          >
            {ICO.rest}Rest {effective}s
          </button>
          {onRestAdjust && (
            <div className="rest-stepper">
              <button type="button" onClick={() => onRestAdjust(timerKey, -15, restSeconds)} aria-label="Reduce rest by 15 seconds">−15</button>
              <button type="button" onClick={() => onRestAdjust(timerKey, 15, restSeconds)} aria-label="Add 15 seconds of rest">+15</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const remaining = timer.mode === "countdown" ? timer.seconds - timer.elapsed : timer.elapsed;
  const over = timer.mode === "countdown" && remaining < 0;
  const pct = timer.mode === "countdown"
    ? Math.max(0, Math.min(100, (1 - timer.elapsed / Math.max(1, timer.seconds)) * 100))
    : Math.min(100, (timer.elapsed / Math.max(1, timer.seconds)) * 100);

  return (
    <div className="rest">
      <div className="rest-panel">
        <div className="rest-modes" role="tablist" aria-label="Rest timer mode">
          <button
            className={`rest-mode${timer.mode === "countdown" ? " on" : ""}`}
            onClick={() => onRestMode(timerKey, "countdown")}
            role="tab"
            aria-selected={timer.mode === "countdown"}
          >
            Countdown
          </button>
          <button
            className={`rest-mode${timer.mode === "stopwatch" ? " on" : ""}`}
            onClick={() => onRestMode(timerKey, "stopwatch")}
            role="tab"
            aria-selected={timer.mode === "stopwatch"}
          >
            Stopwatch
          </button>
        </div>
        <div className="rest-clock">
          <div className={`rest-num${over ? " over" : ""}`} role="timer" aria-live="off">
            {mmss(remaining)}
          </div>
          <div className="rest-sub">
            {timer.mode === "countdown"
              ? (over ? `Over the prescribed ${timer.seconds}s rest` : `Counting down from ${timer.seconds}s — prescribed rest`)
              : "Counting up — no target"}
          </div>
        </div>
        <div className="rest-bar"><i style={{ width: `${pct}%` }} /></div>
        <div className="rest-acts">
          {onRestAdjust && timer.mode === "countdown" && (
            <>
              <button type="button" onClick={() => onRestAdjust(timerKey, 15, restSeconds)} aria-label="Add 15 seconds of rest">+15s</button>
              <button type="button" onClick={() => onRestAdjust(timerKey, -15, restSeconds)} aria-label="Reduce rest by 15 seconds">−15s</button>
            </>
          )}
          <button onClick={() => onRestReset(timerKey)}>Reset</button>
          <button className="stop" onClick={() => onRestStop(timerKey)}>Stop rest</button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({
  sessionId,
  exercise,
  state,
  restTimerKey,
  restTimer,
  restSeconds,
  restOverride,
  inPick,
  isPicked,
  onSetDone,
  onSetSkip,
  onSetField,
  onNoteToggle,
  onNoteInput,
  onSwapUnit,
  onAddSet,
  onPickToggle,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
  onRestAdjust,
  isComplete,
}: {
  sessionId: string;
  exercise: Exercise;
  state: ExState | undefined;
  restTimerKey: string;
  restTimer?: RestTimer;
  restSeconds: number;
  restOverride?: number;
  inPick: boolean;
  isPicked: boolean;
  onSetDone: (uid: string, setIdx: number) => void;
  onSetSkip: (uid: string, setIdx: number) => void;
  onSetField: (uid: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onNoteToggle: (uid: string) => void;
  onNoteInput: (uid: string, value: string) => void;
  onSwapUnit: (uid: string) => void;
  onAddSet: (uid: string) => void;
  onPickToggle: (uid: string) => void;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
  onRestAdjust: (key: string, delta: number, fallbackSeconds: number) => void;
  isComplete: boolean;
}) {
  const uid = exercise.uid ?? "";
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);
  const sets = state?.sets ?? [];
  const displayUnit = state?.displayUnit ?? "kg";
  const note = state?.note ?? "";
  const noteOpen = state?.noteOpen ?? false;
  const presc = formatPrescription(exercise);

  const hasVideo = !!(exercise.media?.video_url);

  const exCls = [
    "ex",
    isComplete ? "complete" : "",
    isPicked ? "picked" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={exCls}>
      <div className="ex-top">
        {inPick && (
          <button
            className="pick-box"
            onClick={() => onPickToggle(uid)}
            aria-pressed={isPicked}
            aria-label={`Select ${exercise.exercise_name}`}
          >
            {ICO.checkSm}
          </button>
        )}
        <Thumbnail exercise={exercise} />
        <div className="ex-name-wrap">
          <div className="ex-name-row">
            {isComplete && <span className="ex-complete-ic">{ICO.check}</span>}
            <span className="ex-name">{exercise.exercise_name}</span>
            <span className={`log-badge ${timeBased ? "time" : "reps"}`}>
              {timeBased ? <>{ICO.clock}Time</> : <>{ICO.reps}Reps &amp; weight</>}
            </span>
          </div>
          <div className="ex-presc">Prescribed <b>{presc}</b></div>
          {/* CR-EF-124: prescribed load chip — rose for prescribed values */}
          {exercise.load && (() => {
            const p = parseLoad(exercise.load);
            if (!p) return null;
            if (p.kind === "weight") return <div className="mt-1.5 inline-flex items-baseline gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums text-rose"><span className="text-[9px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>{p.value}<span className="text-[10px] font-bold text-rose/80">{p.unit}</span></div>;
            if (p.kind === "pair") return <div className="mt-1.5 inline-flex items-baseline gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums text-rose"><span className="text-[9px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>{p.multiplier} × {p.value}<span className="text-[10px] font-bold text-rose/80">{p.unit}</span></div>;
            if (p.kind === "token") return <div className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-rose"><span className="text-[9px] font-extrabold tracking-wider text-rose/80">Load</span>{p.label}{p.sub && <span className="text-[10px] font-semibold normal-case tracking-normal text-rose/70">{p.sub}</span>}</div>;
            if (p.kind === "band") return <div className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[11.5px] font-bold text-rose"><span className="text-[9px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>{p.colour} band</div>;
            return null;
          })()}
          {exercise.coaching_cue && <div className="ex-cue">{exercise.coaching_cue}</div>}
          {exercise.modification && <div className="ex-mod">{exercise.modification}</div>}
          {exercise.equipment && exercise.equipment.length > 0 && (
            <div className="ex-tags">
              {exercise.equipment.map((t) => (
                <span key={t} className="ex-tag">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="ex-acts">
          {hasVideo ? (
            <a
              className="icon-btn video"
              href={exercise.media!.video_url!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Play demo video for ${exercise.exercise_name}`}
            >
              {ICO.video}
            </a>
          ) : (
            <button
              className="icon-btn"
              disabled
              aria-label={`No demo video for ${exercise.exercise_name}`}
              title="No demo video on this exercise"
            >
              {ICO.video}
            </button>
          )}
          <button
            className={`icon-btn${note ? " has-note" : ""}`}
            onClick={() => onNoteToggle(uid)}
            aria-label={`Note on ${exercise.exercise_name}`}
          >
            {ICO.note}
          </button>
          <Link
            className="icon-btn"
            href={`/hub/m/train/${sessionId}/edit`}
            aria-label={`Edit ${exercise.exercise_name}`}
            title="Edit workout"
          >
            {ICO.edit}
          </Link>
        </div>
      </div>

      {noteOpen && (
        <div className="ex-note-row">
          <textarea
            placeholder="Quick note about this exercise…"
            value={note}
            onChange={(e) => onNoteInput(uid, e.target.value)}
          />
        </div>
      )}

      <div className="sets">
        {sets.map((set, sIdx) => (
          <SetRow
            key={sIdx}
            exercise={exercise}
            set={set}
            setIdx={sIdx}
            displayUnit={displayUnit}
            onSetDone={onSetDone}
            onSetSkip={onSetSkip}
            onSetField={onSetField}
            onSwapUnit={onSwapUnit}
          />
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        <button className="add-set" onClick={() => onAddSet(uid)}>
          {ICO.plus}Add set
        </button>
      </div>

      <RestControl
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

function SupersetBlock({
  block,
  exStates,
  inPick,
  picked,
  restTimers,
  restOverrides,
  onSetDone,
  onSetSkip,
  onSetField,
  onNoteToggle,
  onNoteInput,
  onSwapUnit,
  onAddSet,
  onPickToggle,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
  onRestAdjust,
  onUngroup,
  exComplete,
}: {
  block: { type: "group"; label?: string; items: Exercise[] };
  exStates: Record<string, ExState>;
  inPick: boolean;
  picked: Record<string, boolean>;
  restTimers: Record<string, RestTimer>;
  restOverrides: Record<string, number>;
  onSetDone: (uid: string, setIdx: number) => void;
  onSetSkip: (uid: string, setIdx: number) => void;
  onSetField: (uid: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onNoteToggle: (uid: string) => void;
  onNoteInput: (uid: string, value: string) => void;
  onSwapUnit: (uid: string) => void;
  onAddSet: (uid: string) => void;
  onPickToggle: (uid: string) => void;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
  onRestAdjust: (key: string, delta: number, fallbackSeconds: number) => void;
  onUngroup: (label: string) => void;
  exComplete: (uid: string) => boolean;
}) {
  const label = block.label ?? "?";
  const totalRounds = Math.max(...block.items.map((ex) => ex.sets || 1));

  return (
    <div className="grp-wrap">
      <div className="grp-h">
        <span className="grp-pill">Superset {label}</span>
        <span className="grp-note">{block.items.length} — logged round by round, one shared rest between rounds</span>
        <button className="grp-ungroup" onClick={() => onUngroup(label)}>
          {ICO.ungroup}Ungroup
        </button>
      </div>
      <div className="grp-legends">
        {block.items.map((ex) => {
          const uid = ex.uid ?? "";
          const st = exStates[uid];
          const complete = ex.uid ? exComplete(ex.uid) : false;
          const isPicked = !!picked[uid];
          const timeBased = isTimeBased(ex.reps, ex.log_type);
          const presc = formatPrescription(ex);
          const hasVideo = !!(ex.media?.video_url);
          const note = st?.note ?? "";
          const noteOpen = st?.noteOpen ?? false;

          return (
            <div key={uid} className={`grp-legend${isPicked ? " picked" : ""}`}>
              <div className="ex-top">
                {inPick && (
                  <button
                    className="pick-box"
                    onClick={() => onPickToggle(uid)}
                    aria-pressed={isPicked}
                    aria-label={`Select ${ex.exercise_name}`}
                  >
                    {ICO.checkSm}
                  </button>
                )}
                <Thumbnail exercise={ex} />
                <div className="ex-name-wrap">
                  <div className="ex-name-row">
                    {complete && <span className="ex-complete-ic">{ICO.check}</span>}
                    <span className="ex-name">{ex.exercise_name}</span>
                    <span className={`log-badge ${timeBased ? "time" : "reps"}`}>
                      {timeBased ? <>{ICO.clock}Time</> : <>{ICO.reps}Reps &amp; weight</>}
                    </span>
                  </div>
                  <div className="ex-presc">Prescribed <b>{presc}</b></div>
                  {/* CR-EF-124: load chip in superset legend */}
                  {ex.load && (() => {
                    const p = parseLoad(ex.load);
                    if (!p) return null;
                    if (p.kind === "weight") return <div className="mt-1 inline-flex items-baseline gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-rose"><span className="text-[9px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>{p.value}<span className="text-[10px] font-bold text-rose/80">{p.unit}</span></div>;
                    if (p.kind === "pair") return <div className="mt-1 inline-flex items-baseline gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-rose"><span className="text-[9px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>{p.multiplier} × {p.value}<span className="text-[10px] font-bold text-rose/80">{p.unit}</span></div>;
                    if (p.kind === "token") return <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose"><span className="text-[9px] font-extrabold tracking-wider text-rose/80">Load</span>{p.label}{p.sub && <span className="text-[10px] font-semibold normal-case tracking-normal text-rose/70">{p.sub}</span>}</div>;
                    if (p.kind === "band") return <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-rose/20 bg-rose/5 px-1.5 py-0.5 text-[11px] font-bold text-rose"><span className="text-[9px] font-extrabold uppercase tracking-wider text-rose/80">Load</span>{p.colour} band</div>;
                    return null;
                  })()}
                  {ex.coaching_cue && <div className="ex-cue">{ex.coaching_cue}</div>}
                  {ex.modification && <div className="ex-mod">{ex.modification}</div>}
                  {ex.equipment && ex.equipment.length > 0 && (
                    <div className="ex-tags">
                      {ex.equipment.map((t) => (
                        <span key={t} className="ex-tag">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ex-acts">
                  {hasVideo ? (
                    <a
                      className="icon-btn video"
                      href={ex.media?.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Play demo video for ${ex.exercise_name}`}
                    >
                      {ICO.video}
                    </a>
                  ) : (
                    <button
                      className="icon-btn"
                      disabled
                      aria-label={`No demo video for ${ex.exercise_name}`}
                      title="No demo video on this exercise"
                    >
                      {ICO.video}
                    </button>
                  )}
                  <button
                    className={`icon-btn${note ? " has-note" : ""}`}
                    onClick={() => onNoteToggle(uid)}
                    aria-label={`Note on ${ex.exercise_name}`}
                  >
                    {ICO.note}
                  </button>
                </div>
              </div>

              {noteOpen && (
                <div className="ex-note-row">
                  <textarea
                    placeholder="Quick note about this exercise…"
                    value={note}
                    onChange={(e) => onNoteInput(uid, e.target.value)}
                  />
                </div>
              )}

              <button className="add-set" onClick={() => onAddSet(uid)}>
                {ICO.plus}Add set to {ex.exercise_name}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grp-rounds">
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
              <div key={`${uid}-${roundIdx}`} className="round-ex">
                {/* CR-EF-124: exercise name + load on one line */}
                <div className="round-ex-name flex flex-wrap items-center gap-1">
                  {ex.exercise_name}
                  {ex.load && (() => {
                    const p = parseLoad(ex.load);
                    if (!p) return null;
                    if (p.kind === "weight") return <span className="inline-flex items-baseline gap-0.5 rounded-md border border-rose/20 bg-rose/5 px-1 py-px text-[10px] font-bold tabular-nums text-rose">{p.value}<span className="text-[9px] text-rose/80">{p.unit}</span></span>;
                    if (p.kind === "pair") return <span className="inline-flex items-baseline gap-0.5 rounded-md border border-rose/20 bg-rose/5 px-1 py-px text-[10px] font-bold tabular-nums text-rose">{p.multiplier}×{p.value}<span className="text-[9px] text-rose/80">{p.unit}</span></span>;
                    if (p.kind === "token") return <span className="inline-flex items-center rounded-md border border-rose/20 bg-rose/5 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-rose">{p.label}</span>;
                    if (p.kind === "band") return <span className="inline-flex items-center gap-0.5 rounded-md border border-rose/20 bg-rose/5 px-1 py-px text-[10px] font-bold text-rose">{p.colour}</span>;
                    return null;
                  })()}
                </div>
                <SetRow
                  exercise={ex}
                  set={set}
                  setIdx={roundIdx}
                  displayUnit={st?.displayUnit ?? "kg"}
                  onSetDone={onSetDone}
                  onSetSkip={onSetSkip}
                  onSetField={onSetField}
                  onSwapUnit={onSwapUnit}
                />
              </div>
            );
          });
          if (!anyPresent) return null;
          const roundKey = `grp:${label}:${roundIdx}`;
          return (
            <div key={roundIdx} className="grp-round">
              <div className="round-label">Round {roundIdx + 1} of {totalRounds}</div>
              {roundRows}
              <RestControl
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
    </div>
  );
}
