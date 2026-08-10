"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Session, SessionLog, SetLog, Exercise, DeliveryMode } from "@/types";
import { computeGroups, nextGroupLabel } from "@/lib/exercise-groups";
import { isTimeBased, parsePrescribedSeconds, parsePrescribedReps, parseRestSeconds, formatPrescription } from "@/lib/prescription";
import { sessionDurationMinutes } from "@/lib/scheduling";
import { defaultUnitForEquipment } from "@/lib/units";

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
}

interface ExState {
  uid: string;
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
  clientName,
  setLogs,
  deliveryMode,
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
  clientName: string;
  clientNumber: number | null;
  setLogs: SetLog[];
  deliveryMode: DeliveryMode;
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
        for (let s = 1; s <= totalSets; s++) {
          const log = setLogsMap[`${ref}::${s}`];
          sets.push({
            status: log ? (log.completed ? "done" : "skipped") : "pending",
            reps: log?.reps != null ? String(log.reps) : "",
            weight: log?.weight_kg != null ? String(log.weight_kg) : "",
            duration: log?.duration_seconds != null ? String(log.duration_seconds) : "",
            savedId: log?.id,
            isNewPb: log ? !!(log as SetLog & { is_new_pb?: boolean }).is_new_pb : undefined,
            isWarmup: s <= warmupCount,
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
        };
      });
      return map;
    },
    [version, setLogsMap, data],
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

  const [pickSection, setPickSection] = useState<SectionKey | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    }).catch(() => {});
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
        }).catch(() => {});
      }, 800);
    },
    [sessionId],
  );

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

  // ── Set-log API ────────────────────────────────────────────────
  const saveSetLog = async (
    exerciseRef: string,
    setNumber: number,
    fieldValues: { reps: string; weight: string; duration: string },
    completed: boolean,
  ): Promise<(SetLog & { is_new_pb?: boolean }) | null> => {
    const key = `${exerciseRef}::${setNumber}`;
    const existing = setLogsMap[key];
    const repsVal = fieldValues.reps.trim() === "" ? null : Number(fieldValues.reps);
    const weightVal = fieldValues.weight.trim() === "" ? null : Number(fieldValues.weight);
    const durationVal = fieldValues.duration.trim() === "" ? null : Number(fieldValues.duration);

    const res = await fetch(`/api/sessions/${sessionId}/set-logs`, {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        existing
          ? { id: existing.id, reps: repsVal, weight_kg: weightVal, duration_seconds: durationVal, completed }
          : { exercise_ref: exerciseRef, set_number: setNumber, reps: repsVal, weight_kg: weightVal, duration_seconds: durationVal, completed },
      ),
    });
    if (!res.ok) return null;
    const saved: SetLog & { is_new_pb?: boolean } = await res.json();
    setLogsMap[key] = saved;
    return saved;
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

    const saved = await saveSetLog(ref, setNumber, { reps, weight, duration }, newStatus === "done");
    if (!saved) {
      toast.error("Failed to save set");
      return;
    }

    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setIdx] = {
        status: newStatus,
        reps,
        weight,
        duration,
        savedId: saved.id,
        isNewPb: saved.is_new_pb === true,
        isWarmup: newSets[setIdx].isWarmup,
      };
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

    const saved = await saveSetLog(ref, setNumber, { reps, weight, duration }, false);
    if (!saved) {
      toast.error("Failed to save set");
      return;
    }

    setExStates((prev) => {
      const st = prev[uid];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setIdx] = { ...newSets[setIdx], status: newStatus, savedId: saved.id };
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
  };

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
      toast.error("Failed to mark session complete");
      return;
    }
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
              Session {sessionNumber}
              {blockNumber != null ? ` · Block ${blockNumber}` : ""}
              {archetype ? ` · ${archetype}` : ""} · {phase} · Week {week}
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

      {/* ── Offline bar (structure ready, offline lane fills it) ── */}
      <div className="offline" id="offlineBar">
        <span className="offline-ic">{ICO.rest}</span>
        <div>
          <b>Offline — sets saved on this phone</b>
          Keep logging. Everything is queued locally and syncs the moment the signal comes back. The desktop hub won&apos;t see these sets until then.
        </div>
        <button className="offline-act" onClick={() => {}}>Retry</button>
      </div>

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
                          onUngroup={handleUngroup}
                          exComplete={exComplete}
                        />
                      ) : (
                        <ExerciseCard
                          key={block.items[0].uid ?? block.items[0].exercise_name}
                          exercise={block.items[0]}
                          state={exStates[block.items[0].uid ?? ""]}
                          restTimerKey={block.items[0].uid ?? ""}
                          restTimer={restTimers[block.items[0].uid ?? ""]}
                          restSeconds={parseRestSeconds(block.items[0].rest ?? "") ?? 60}
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
                onClick={handleComplete}
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
  const hasMedia = !!(exercise.media?.image_url || exercise.media?.video_url);
  if (hasMedia) {
    return (
      <div className="ex-thumb has-img" aria-hidden="true">
        {ICO.img}
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
  const targetLabel = timeBased
    ? `Target: ${exercise.reps}`
    : `Target: ${exercise.reps}${exercise.tempo && exercise.tempo !== "—" ? ` @ ${exercise.tempo}` : ""}${exercise.rest && exercise.rest !== "—" ? ` · ${exercise.rest} rest` : ""}`;

  const rowCls = [
    "set-row",
    set.status === "done" ? "is-done" : "",
    set.status === "skipped" ? "is-skipped" : "",
    set.isWarmup && set.status !== "done" && set.status !== "skipped" ? "is-warmup" : "",
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
                <button
                  className="unit-swap"
                  onClick={() => onSwapUnit(uid)}
                  title="Correct the unit for this exercise"
                >
                  switch
                </button>
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
      <div className="rest">
        <button
          className="rest-start"
          onClick={() => onRestOpen(timerKey, restSeconds)}
        >
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
          <button onClick={() => onRestReset(timerKey)}>Reset</button>
          <button className="stop" onClick={() => onRestStop(timerKey)}>Stop rest</button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  state,
  restTimerKey,
  restTimer,
  restSeconds,
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
  isComplete,
}: {
  exercise: Exercise;
  state: ExState | undefined;
  restTimerKey: string;
  restTimer?: RestTimer;
  restSeconds: number;
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
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toast(`Opens the demo video for "${exercise.exercise_name}" (exercises.video_url).`);
              }}
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
        timer={restTimer}
        onRestOpen={onRestOpen}
        onRestMode={onRestMode}
        onRestReset={onRestReset}
        onRestStop={onRestStop}
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
  onUngroup,
  exComplete,
}: {
  block: { type: "group"; label?: string; items: Exercise[] };
  exStates: Record<string, ExState>;
  inPick: boolean;
  picked: Record<string, boolean>;
  restTimers: Record<string, RestTimer>;
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
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toast(`Opens the demo video for "${ex.exercise_name}" (exercises.video_url).`);
                      }}
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
                <div className="round-ex-name">{ex.exercise_name}</div>
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
  );
}
