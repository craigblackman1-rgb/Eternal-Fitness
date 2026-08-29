"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Session, SessionLog, SetLog, Exercise } from "@/types";
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
import {
  enqueue,
  getAllPending,
  remove,
  type PendingSetLogEntry,
} from "@/lib/hub/offline-set-log-queue";
import { useSpeechNotes } from "@/components/hub/useSpeechNotes";

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
  savedId?: string;
  isNewPb?: boolean;
  isWarmup: boolean;
  pendingSync?: boolean;
  clientOpId?: string;
}

interface ExState {
  uid: string;
  ref: string;
  sets: SetState[];
  note: string;
  noteOpen: boolean;
  displayUnit: "kg" | "lb";
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

// ── Icons (inline SVG, matching the desktop hub idiom) ──────────
const ICO = {
  check: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>),
  checkLg: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>),
  skip: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>),
  chev: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>),
  clock: (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>),
  reps: (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6v12M17.5 6v12M2 10h2M2 14h2M20 10h2M20 14h2M8.5 10h7v4h-7z" /></svg>),
  rest: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9 2h6" /></svg>),
  mic: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></svg>),
  note: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>),
  star: (<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.5L12 16.9 6.1 20.6l1.3-6.5L2.5 9.5l6.6-.8z" /></svg>),
  cloud: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 12.5 4.5 4.5 0 0 1 17.5 19Z" /><path d="m9 15 2 2 4-4" /></svg>),
  cloudOff: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a5 5 0 0 1-2-9.6" /><path d="M15.7 10a6 6 0 0 1 6.2 2.5A4.5 4.5 0 0 1 17.5 19" /><path d="M2 2l20 20" /></svg>),
  play: (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>),
  pause: (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>),
  reset: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>),
  flame: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>),
  lightning: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>),
  moon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>),
};

// ── Main Component ───────────────────────────────────────────────
export function SessionWorkoutLog({
  sessionId,
  sessionNumber,
  version,
  data,
  sessionLog,
  setLogs,
  bestWeights,
  onSessionLogChange,
}: {
  sessionId: string;
  sessionNumber: number;
  version: "studio" | "home";
  data: Session | null;
  sessionLog: SessionLog | null;
  setLogs: SetLog[];
  /** Client's best-ever weight_kg per exercise name — prefills a set's weight
   *  field when this session has no log for it yet. */
  bestWeights?: Record<string, number>;
  onSessionLogChange: (log: SessionLog) => void;
}) {
  const sections = data?.versions?.[version] ?? { warm_up: [], main_block: [], cooldown: [] };

  const setLogsMap = useMemo(() => {
    const map: Record<string, SetLog> = {};
    for (const sl of setLogs) {
      map[`${sl.exercise_ref}::${sl.set_number}`] = sl;
    }
    return map;
  }, [setLogs]);

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
        const carriedWeight = bestWeights?.[ex.exercise_name];
        const unit = ex.weight_unit ?? defaultUnitForEquipment(ex.equipment ?? []);
        for (let s = 1; s <= totalSets; s++) {
          const log = setLogsMap[`${ref}::${s}`];
          sets.push({
            status: log ? (log.completed ? "done" : "skipped") : "pending",
            reps: log?.reps != null ? String(log.reps) : "",
            weight: log?.weight_kg != null
              ? displayWeight(log.weight_kg, unit)
              : carriedWeight != null ? displayWeight(carriedWeight, unit) : "",
            duration: log?.duration_seconds != null ? String(log.duration_seconds) : "",
            savedId: log?.id,
            isNewPb: log ? !!(log as SetLog & { is_new_pb?: boolean }).is_new_pb : undefined,
            isWarmup: log ? (log.is_warmup ?? s <= warmupCount) : s <= warmupCount,
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
        };
      });
      return map;
    },
    [version, setLogsMap, data, bestWeights],
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

  const [offline, setOffline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const speech = useSpeechNotes();
  const [voiceTarget, setVoiceTarget] = useState<"session" | string | null>(null);

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

  // ── started_at write on first mount (matches mobile) ──────────
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

  // ── Debounced exercise-notes save (matches mobile) ─────────────
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

  // ── Rest timer + session timer tick ────────────────────────────
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

  // ── Set-log API (offline queue, idempotent) ────────────────────
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

    if (set.status === "done") {
      newStatus = "pending";
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

    const result = await saveSetLog(ref, setNumber, { reps, weight, duration }, newStatus === "done", set.isWarmup, state.displayUnit, set.clientOpId);
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
          isWarmup: newSets[setIdx].isWarmup,
          pendingSync: newStatus !== "pending",
          clientOpId: result.clientOpId,
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

    const result = await saveSetLog(ref, setNumber, { reps, weight, duration }, false, set.isWarmup, state.displayUnit, set.clientOpId);
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

  const handleSetField = (ref: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => {
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
      newSets[setIdx] = { ...newSets[setIdx], isWarmup: !newSets[setIdx].isWarmup };
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

  const handleSwapUnit = (ref: string, exercise: Exercise) => {
    if (isBandEquipment(exercise.equipment ?? [])) return;
    setExStates((prev) => {
      const st = prev[ref];
      if (!st) return prev;
      const newUnit: "kg" | "lb" = st.displayUnit === "kg" ? "lb" : "kg";
      return { ...prev, [ref]: { ...st, displayUnit: newUnit } };
    });
  };

  const toggleVoice = (target: "session" | string) => {
    if (speech.listening && voiceTarget === target) {
      speech.stop();
      setVoiceTarget(null);
      return;
    }
    if (speech.listening) speech.stop();
    const uid = target === "session" ? null : exStates[target]?.uid ?? null;
    const started = speech.start((transcript) => {
      if (!uid) {
        setSessionNotes((p) => (p ? p + " " + transcript : transcript));
      } else {
        savedNotesRef.current[uid] = (savedNotesRef.current[uid] || "") + (savedNotesRef.current[uid] ? " " : "") + transcript;
        setExStates((prev) => {
          const st = prev[target];
          if (!st) return prev;
          return { ...prev, [target]: { ...st, note: savedNotesRef.current[uid], noteOpen: true } };
        });
        persistExerciseNotes(savedNotesRef.current);
      }
    });
    if (!started) {
      toast.error("Voice dictation isn't available in this browser.");
      return;
    }
    setVoiceTarget(target);
  };

  // ── Rest timer actions ─────────────────────────────────────────
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

  // ── Session timer actions ──────────────────────────────────────
  const toggleSessionTimer = () => setSessionTimer((prev) => ({ ...prev, running: !prev.running }));
  const resetSessionTimer = () => setSessionTimer({ running: false, elapsed: 0 });

  // ── Offline queue replay ───────────────────────────────────────
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

  // ── Complete ───────────────────────────────────────────────────
  const handleComplete = async () => {
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
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          ...d,
          session_log: updatedLog,
          exercise_notes: savedNotesRef.current,
        },
      }),
    });
    setCompleting(false);
    if (!res.ok) {
      const msg = await res.json().then((b) => b?.error).catch(() => null);
      toast.error(msg || "Failed to mark session complete");
      return;
    }
    setShowComplete(false);
    onSessionLogChange(updatedLog);
    toast.success(`Session ${sessionNumber} marked complete.`);
  };

  const secIconEl = (color: "teal" | "rose" | "navy") => {
    const cls = color === "teal" ? "bg-teal/10 text-teal" : color === "rose" ? "bg-rose/10 text-rose" : "bg-[var(--hub-sidebar)]/10 text-[var(--hub-sidebar)]";
    const icon = color === "teal" ? ICO.flame : color === "rose" ? ICO.lightning : ICO.moon;
    return <div className={`grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg ${cls}`}>{icon}</div>;
  };

  return (
    <div className="space-y-4">
      {/* ── Progress bar + session stopwatch ────────────────────── */}
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

      {/* ── Offline / sync banner ────────────────────────────────── */}
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

      {/* ── Section cards ────────────────────────────────────────── */}
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

        return (
          <div key={sec.key} className="overflow-hidden rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm">
            <button
              type="button"
              onClick={() => setCollapsed((p) => ({ ...p, [sec.key]: !p[sec.key] }))}
              className="flex w-full items-center gap-2.5 border-b border-[var(--hub-border)] px-4 py-3.5 text-left"
            >
              {secIconEl(sec.color)}
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
                            voiceTarget={voiceTarget}
                            onSetDone={handleSetDone}
                            onSetSkip={handleSetSkip}
                            onSetField={handleSetField}
                            onWarmupToggle={handleWarmupToggle}
                            onNoteToggle={handleNoteToggle}
                            onNoteInput={handleNoteInput}
                            onSwapUnit={handleSwapUnit}
                            onVoice={toggleVoice}
                            onRestOpen={handleRestOpen}
                            onRestMode={handleRestMode}
                            onRestReset={handleRestReset}
                            onRestStop={handleRestStop}
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
                          voiceTarget={voiceTarget}
                          onSetDone={handleSetDone}
                          onSetSkip={handleSetSkip}
                          onSetField={handleSetField}
                          onWarmupToggle={handleWarmupToggle}
                          onNoteToggle={handleNoteToggle}
                          onNoteInput={handleNoteInput}
                          onSwapUnit={handleSwapUnit}
                          onVoice={toggleVoice}
                          onRestOpen={handleRestOpen}
                          onRestMode={handleRestMode}
                          onRestReset={handleRestReset}
                          onRestStop={handleRestStop}
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

      {/* ── Session summary ──────────────────────────────────────── */}
      <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-4 shadow-sm">
        <h2 className="text-[15px] font-extrabold text-foreground">Session summary</h2>
        <p className="mb-4 mt-0.5 text-[12.5px] text-muted-foreground">Logged once, at the end — covers how the whole session felt, not one exercise.</p>

        <div className="mb-4">
          <span className="mb-2 block text-xs font-bold text-foreground">
            RPE <span className="font-normal text-muted-foreground">— rate of perceived exertion, 1 (very light) – 10 (maximal)</span>
          </span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="RPE">
            {Array.from({ length: 10 }, (_, i) => {
              const val = i + 1;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRpe(rpe === val ? null : val)}
                  className={`h-10 w-10 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[13.5px] font-bold tabular-nums text-foreground hover:border-[var(--hub-field-hover)] ${rpe === val ? "border-rose bg-rose text-white" : ""}`}
                  aria-pressed={rpe === val}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <span className="mb-2 block text-xs font-bold text-foreground">Fatigue level</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Fatigue level">
            {(["low", "moderate", "high"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFatigue(fatigue === f ? null : f)}
                className={`h-10 min-w-[100px] flex-1 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[13px] font-bold capitalize text-foreground ${
                  fatigue === f
                    ? f === "low"
                      ? "border-teal bg-[var(--status-success-bg)] text-teal"
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

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">Session notes</span>
            {speech.speechSupported && (
              <button
                type="button"
                onClick={() => toggleVoice("session")}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold transition-colors ${
                  voiceTarget === "session" && speech.listening
                    ? "border-rose bg-rose text-white"
                    : "border-[var(--hub-field-border)] bg-[var(--hub-card)] text-muted-foreground hover:border-rose/30 hover:text-rose"
                }`}
                aria-label={voiceTarget === "session" && speech.listening ? "Stop recording" : "Record voice note"}
              >
                {ICO.mic}
                {voiceTarget === "session" && speech.listening ? "Listening…" : "Speak"}
              </button>
            )}
          </div>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="How did the session go overall — anything to flag for next time?"
            className="min-h-[76px] w-full resize-y rounded-[10px] border border-[var(--hub-field-border)] bg-[var(--hub-card)] p-2.5 text-[13.5px] text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30"
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-[var(--hub-border)] pt-4">
          <span className="mr-auto text-[12.5px] text-muted-foreground">
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
            className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-[10px] bg-rose px-[18px] text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ICO.checkLg}
            Mark session complete
          </button>
        </div>
      </div>

      {/* ── Complete overlay ─────────────────────────────────────── */}
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
              <button type="button" onClick={handleComplete} disabled={completing} className="inline-flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[10px] bg-rose px-[18px] text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                Yes, complete session
              </button>
              <button type="button" onClick={() => setShowComplete(false)} className="inline-flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] px-[18px] text-sm font-bold text-foreground hover:bg-[var(--hub-hover)]">
                Keep logging
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SetRow({
  exercise,
  exerciseRef,
  set,
  setIdx,
  displayUnit,
  onSetDone,
  onSetSkip,
  onSetField,
  onWarmupToggle,
  onSwapUnit,
}: {
  exercise: Exercise;
  exerciseRef: string;
  set: SetState;
  setIdx: number;
  displayUnit: "kg" | "lb";
  onSetDone: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetSkip: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetField: (ref: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onWarmupToggle: (ref: string, setIdx: number) => void;
  onSwapUnit: (ref: string, exercise: Exercise) => void;
}) {
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);
  const disabled = set.status === "skipped";
  const isBand = isBandEquipment(exercise.equipment ?? []);
  const targetLabel = timeBased
    ? `Target: ${exercise.reps}`
    : `Target: ${exercise.reps}${exercise.tempo && exercise.tempo !== "—" ? ` @ tempo ${exercise.tempo}` : ""}${exercise.rest && exercise.rest !== "—" ? ` · ${exercise.rest} rest` : ""}`;

  return (
    <div className={`rounded-[11px] border p-2.5 transition-colors ${
      set.status === "done"
        ? "border-teal/20 bg-teal/10"
        : set.status === "skipped"
          ? "border-dashed bg-transparent opacity-70"
          : "border-[var(--hub-border)] bg-[var(--hub-hover)]"
    }`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full border border-[var(--hub-border)] bg-[var(--hub-card)] text-[11px] font-extrabold text-foreground">{setIdx + 1}</span>
        <span className="min-w-0 flex-1 text-xs text-muted-foreground">{targetLabel}</span>
        <button
          type="button"
          onClick={() => onWarmupToggle(exerciseRef, setIdx)}
          aria-pressed={set.isWarmup}
          title="Warm-up set — excluded from personal bests"
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            set.isWarmup ? "border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-foreground"
          }`}
        >
          Warm-up
        </button>
        {set.status === "done" && set.isNewPb && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-[var(--status-warning-text)]">
            {ICO.star}PB
          </span>
        )}
        {set.pendingSync && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--status-warning-text)]" title="Saved on this device — will sync when the connection is back">
            {ICO.cloudOff}Queued
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {timeBased ? (
          <div className="flex w-[120px] flex-col gap-[3px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</span>
            <input
              type="text"
              inputMode="numeric"
              value={set.duration}
              onChange={(e) => onSetField(exerciseRef, setIdx, "duration", e.target.value)}
              placeholder={exercise.reps}
              disabled={disabled}
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
                onChange={(e) => onSetField(exerciseRef, setIdx, "reps", e.target.value)}
                placeholder={parsePrescribedReps(exercise.reps) != null ? String(parsePrescribedReps(exercise.reps)) : exercise.reps}
                disabled={disabled}
                className="h-[36px] w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm font-semibold tabular-nums text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
              />
            </div>
            <div className="flex w-[120px] flex-col gap-[3px]">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Weight ({displayUnit})
                {isBand ? (
                  <span className="font-bold normal-case tracking-normal text-muted-foreground" title="Band exercises always log in lb — unit is locked">bands</span>
                ) : (
                  <button type="button" onClick={() => onSwapUnit(exerciseRef, exercise)} className="font-bold normal-case tracking-normal text-teal underline" title="Correct the unit for this exercise">switch</button>
                )}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={set.weight}
                onChange={(e) => onSetField(exerciseRef, setIdx, "weight", e.target.value)}
                placeholder="BW"
                disabled={disabled}
                className="h-[36px] w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm font-semibold tabular-nums text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
              />
            </div>
          </>
        )}
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => onSetDone(exerciseRef, setIdx, exercise)}
            className={`inline-flex h-[36px] items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-bold ${
              set.status === "done" ? "border-teal bg-teal text-white" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
            }`}
          >
            {ICO.check}Done
          </button>
          <button
            type="button"
            onClick={() => onSetSkip(exerciseRef, setIdx, exercise)}
            className={`inline-flex h-[36px] items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-bold ${
              set.status === "skipped" ? "border-[var(--status-danger)] bg-[var(--status-danger)] text-white" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"
            }`}
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
        <button type="button" onClick={() => onRestOpen(timerKey, restSeconds)} className="inline-flex h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-teal/20 bg-teal/10 text-[13px] font-bold text-teal hover:bg-teal/15">
          {ICO.rest}Rest {restSeconds}s
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
  voiceTarget,
  onSetDone,
  onSetSkip,
  onSetField,
  onWarmupToggle,
  onNoteToggle,
  onNoteInput,
  onSwapUnit,
  onVoice,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
}: {
  exercise: Exercise;
  state: ExState | undefined;
  refKey: string;
  restTimerKey: string;
  restTimer?: RestTimer;
  restSeconds: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  voiceTarget: "session" | string | null;
  onSetDone: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetSkip: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetField: (ref: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onWarmupToggle: (ref: string, setIdx: number) => void;
  onNoteToggle: (ref: string) => void;
  onNoteInput: (ref: string, value: string) => void;
  onSwapUnit: (ref: string, exercise: Exercise) => void;
  onVoice: (target: "session" | string) => void;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
}) {
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);
  const sets = state?.sets ?? [];
  const displayUnit = state?.displayUnit ?? "kg";
  const note = state?.note ?? "";
  const noteOpen = state?.noteOpen ?? false;
  const exComplete = sets.length > 0 && sets.every((s) => s.status !== "pending");
  const doneSets = sets.filter((s) => s.status !== "pending").length;

  return (
    <div className={`rounded-[13px] border bg-[var(--hub-card)] p-3 ${exComplete ? "border-teal/20" : "border-[var(--hub-border)]"}`}>
      <button type="button" onClick={onToggleCollapse} className="flex w-full items-center gap-2 text-left" aria-expanded={!collapsed}>
        <span className={`grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full border text-[11px] font-bold tabular-nums ${exComplete ? "border-teal/20 bg-teal/10 text-teal" : "border-[var(--hub-border)] bg-[var(--hub-hover)] text-muted-foreground"}`}>
          {exComplete ? ICO.check : sets.length}
        </span>
        <span className="text-[15px] font-bold text-foreground">{exercise.exercise_name}</span>
        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${timeBased ? "border-teal/20 bg-teal/10 text-teal" : "border-rose/20 bg-rose/5 text-rose"}`}>
          {timeBased ? <>{ICO.clock}Time</> : <>{ICO.reps}Reps &amp; wt</>}
        </span>
        <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">{exComplete ? "Done" : `${doneSets}/${sets.length} logged`}</span>
        <span className={`text-muted-foreground transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}>{ICO.chev}</span>
      </button>

      {!collapsed && (
        <div className="mt-3 flex flex-col gap-2.5 border-t border-dashed border-[var(--hub-border)] pt-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {exercise.coaching_cue && <p className="text-[12.5px] text-muted-foreground">{exercise.coaching_cue}</p>}
              {exercise.modification && (
                <span className="mt-1 inline-flex rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--status-warning-text)]">{exercise.modification}</span>
              )}
              {exercise.equipment && exercise.equipment.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {exercise.equipment.map((t) => (
                    <span key={t} className="rounded-full border border-[var(--hub-border)] bg-[var(--hub-hover)] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
              <p className="mt-2 border-t border-dashed border-[var(--hub-border)] pt-2 text-[12.5px] text-muted-foreground">
                <b className="font-bold text-foreground">Prescribed:</b> {formatPrescription(exercise)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onVoice(refKey)}
                className={`grid h-8 w-8 place-items-center rounded-lg border ${voiceTarget === refKey ? "border-rose bg-rose text-white" : note ? "border-rose/20 bg-rose/5 text-rose" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"}`}
                aria-label="Voice note"
                title="Voice note"
              >
                {ICO.mic}
              </button>
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
              className="min-h-[56px] w-full resize-y rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] p-2 text-[13px] text-foreground focus:border-rose focus:outline-none focus:ring-[3px] focus:ring-rose/30"
            />
          )}

          <div className="flex flex-col gap-2">
            {sets.map((set, sIdx) => (
              <SetRow
                key={sIdx}
                exercise={exercise}
                exerciseRef={refKey}
                set={set}
                setIdx={sIdx}
                displayUnit={displayUnit}
                onSetDone={onSetDone}
                onSetSkip={onSetSkip}
                onSetField={onSetField}
                onWarmupToggle={onWarmupToggle}
                onSwapUnit={onSwapUnit}
              />
            ))}
          </div>

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
  voiceTarget,
  onSetDone,
  onSetSkip,
  onSetField,
  onWarmupToggle,
  onNoteToggle,
  onNoteInput,
  onSwapUnit,
  onVoice,
  onRestOpen,
  onRestMode,
  onRestReset,
  onRestStop,
}: {
  block: { type: "group"; label?: string; items: Exercise[]; indices: number[] };
  refs: string[];
  exStates: Record<string, ExState>;
  restTimers: Record<string, RestTimer>;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  voiceTarget: "session" | string | null;
  onSetDone: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetSkip: (ref: string, setIdx: number, exercise: Exercise) => void;
  onSetField: (ref: string, setIdx: number, field: "reps" | "weight" | "duration", value: string) => void;
  onWarmupToggle: (ref: string, setIdx: number) => void;
  onNoteToggle: (ref: string) => void;
  onNoteInput: (ref: string, value: string) => void;
  onSwapUnit: (ref: string, exercise: Exercise) => void;
  onVoice: (target: "session" | string) => void;
  onRestOpen: (key: string, seconds: number) => void;
  onRestMode: (key: string, mode: "countdown" | "stopwatch") => void;
  onRestReset: (key: string) => void;
  onRestStop: (key: string) => void;
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
          {/* Legends — one identity row per exercise */}
          <div className="flex flex-col gap-2">
            {block.items.map((ex, i) => {
              const ref = refs[i];
              const st = exStates[ref];
              const timeBased = isTimeBased(ex.reps, ex.log_type);
              const note = st?.note ?? "";
              const noteOpen = st?.noteOpen ?? false;
              return (
                <div key={`leg-${ref}`} className="rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-foreground">{ex.exercise_name}</span>
                    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${timeBased ? "border-teal/20 bg-teal/10 text-teal" : "border-rose/20 bg-rose/5 text-rose"}`}>
                      {timeBased ? <>{ICO.clock}Time</> : <>{ICO.reps}Reps &amp; wt</>}
                    </span>
                    <div className="ml-auto flex shrink-0 gap-1">
                      <button type="button" onClick={() => onVoice(ref)} className={`grid h-7 w-7 place-items-center rounded-md border ${voiceTarget === ref ? "border-rose bg-rose text-white" : note ? "border-rose/20 bg-rose/5 text-rose" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)]"}`} aria-label="Voice note" title="Voice note">{ICO.mic}</button>
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

          {/* Rounds — one set from every exercise, interleaved */}
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
                rows.push(
                  <div key={`${ref}-${roundIdx}`}>
                    <div className="mb-1.5 px-0.5 text-[12.5px] font-bold text-foreground">{ex.exercise_name}</div>
                    <SetRow
                      exercise={ex}
                      exerciseRef={ref}
                      set={set}
                      setIdx={roundIdx}
                      displayUnit={st?.displayUnit ?? "kg"}
                      onSetDone={onSetDone}
                      onSetSkip={onSetSkip}
                      onSetField={onSetField}
                      onWarmupToggle={onWarmupToggle}
                      onSwapUnit={onSwapUnit}
                    />
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
