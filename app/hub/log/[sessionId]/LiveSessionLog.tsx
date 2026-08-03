"use client";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Session, SessionLog, SetLog, Exercise } from "@/types";
import { IconChevronLeft } from "@/components/icons";

type SectionKey = "warm_up" | "main_block" | "cooldown";

const SECTION_DEFS: { key: SectionKey; label: string; color: string }[] = [
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
}

interface ExState {
  sets: SetState[];
  note: string;
  noteOpen: boolean;
}

interface GroupBlock {
  type: "group";
  label: string;
  items: Exercise[];
}

interface SingleBlock {
  type: "single";
  ex: Exercise;
}

type Block = GroupBlock | SingleBlock;

function computeBlocks(exercises: Exercise[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < exercises.length) {
    const e = exercises[i];
    if (e.group_label) {
      const items = [e];
      let j = i + 1;
      while (j < exercises.length && exercises[j].group_label === e.group_label) {
        items.push(exercises[j]);
        j++;
      }
      if (items.length > 1) {
        blocks.push({ type: "group", label: e.group_label, items });
      } else {
        blocks.push({ type: "single", ex: e });
      }
      i = j;
    } else {
      blocks.push({ type: "single", ex: e });
      i++;
    }
  }
  return blocks;
}

function isTimeBased(reps: string, logType?: "reps" | "time"): boolean {
  if (logType === "time") return true;
  if (logType === "reps") return false;
  return /\d\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i.test(reps || "");
}

function parseLeadingNumber(str: string): number | null {
  const m = /^(\d+)/.exec(String(str).trim());
  return m ? parseInt(m[1], 10) : null;
}

function parsePrescribedSeconds(reps: string): number | null {
  const m = (reps || "").match(/(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return /^m/i.test(m[2]) ? n * 60 : n;
}

function parsePrescribedReps(reps: string): number | null {
  const m = (reps || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function exerciseRefKey(version: string, section: SectionKey, index: number, name: string): string {
  return `${version}:${section}:${index}:${name}`;
}

export function LiveSessionLog({
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
  clientNumber,
  setLogs,
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
}) {
  const version = "studio";
  const sections = data?.versions?.[version] ?? { warm_up: [], main_block: [], cooldown: [] };

  const setLogsMap = useMemo(() => {
    const map: Record<string, SetLog> = {};
    for (const sl of setLogs) {
      map[`${sl.exercise_ref}::${sl.set_number}`] = sl;
    }
    return map;
  }, [setLogs]);

  const initExStates = (exercises: Exercise[], sectionKey: SectionKey): Record<string, ExState> => {
    const map: Record<string, ExState> = {};
    exercises.forEach((ex, idx) => {
      const ref = exerciseRefKey(version, sectionKey, idx, ex.exercise_name);
      const timeBased = isTimeBased(ex.reps, ex.log_type);
      const totalSets = Math.max(1, ex.sets || 1);
      const sets: SetState[] = [];
      for (let s = 1; s <= totalSets; s++) {
        const log = setLogsMap[`${ref}::${s}`];
        sets.push({
          status: log ? (log.completed ? "done" : "skipped") : "pending",
          reps: log?.reps != null ? String(log.reps) : "",
          weight: log?.weight_kg != null ? String(log.weight_kg) : "",
          duration: log?.duration_seconds != null ? String(log.duration_seconds) : "",
          savedId: log?.id,
        });
      }
      map[ref] = { sets, note: "", noteOpen: false };
    });
    return map;
  };

  const [exStates, setExStates] = useState<Record<string, ExState>>(() => {
    const all: Record<string, ExState> = {};
    for (const sec of SECTION_DEFS) {
      Object.assign(all, initExStates(sections[sec.key] || [], sec.key));
    }
    return all;
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [rpe, setRpe] = useState<SessionLog["rpe"]>(sessionLog?.rpe ?? null);
  const [fatigue, setFatigue] = useState<SessionLog["fatigue"]>(sessionLog?.fatigue ?? null);
  const [notes, setNotes] = useState(sessionLog?.notes ?? "");
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    const ctor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (typeof ctor !== "function") return null;
    const r = new (ctor as new () => SpeechRecognition)();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-GB";
    r.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setNotes((prev) => (prev ? prev + " " + t : t));
        }
      }
    };
    r.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    r.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = r;
    return r;
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      recognitionRef.current = null;
    } else {
      const r = initRecognition();
      if (!r) return;
      r.start();
      setListening(true);
    }
  }, [listening, initRecognition]);

  const allExerciseRefs = useMemo(() => {
    const refs: string[] = [];
    for (const sec of SECTION_DEFS) {
      (sections[sec.key] || []).forEach((ex, idx) => {
        refs.push(exerciseRefKey(version, sec.key, idx, ex.exercise_name));
      });
    }
    return refs;
  }, [sections]);

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

  const saveSetLog = async (
    exerciseRef: string,
    setNumber: number,
    fieldValues: { reps: string; weight: string; duration: string },
    completed: boolean,
  ): Promise<(SetLog & { is_new_pb?: boolean }) | null> => {
    const key = `${exerciseRef}::${setNumber}`;
    const existing = setLogsMap[key];
    const timeBased = fieldValues.duration !== undefined;
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

  const handleSetDone = async (exerciseRef: string, setNumber: number, exercise: Exercise) => {
    const state = exStates[exerciseRef];
    if (!state) return;
    const set = state.sets[setNumber - 1];
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

    const saved = await saveSetLog(exerciseRef, setNumber, { reps, weight, duration }, newStatus === "done");
    if (!saved) {
      toast.error("Failed to save set");
      return;
    }

    setExStates((prev) => {
      const st = prev[exerciseRef];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setNumber - 1] = {
        status: newStatus,
        reps,
        weight,
        duration,
        savedId: saved.id,
        isNewPb: saved.is_new_pb === true,
      };
      return { ...prev, [exerciseRef]: { ...st, sets: newSets } };
    });
  };

  const handleSetSkip = async (exerciseRef: string, setNumber: number, exercise: Exercise) => {
    const state = exStates[exerciseRef];
    if (!state) return;
    const set = state.sets[setNumber - 1];
    const newStatus = set.status === "skipped" ? "pending" : "skipped";
    const timeBased = isTimeBased(exercise.reps, exercise.log_type);

    const reps = timeBased ? "" : (set.reps || "");
    const weight = timeBased ? "" : (set.weight || "");
    const duration = timeBased ? (set.duration || "") : "";

    const saved = await saveSetLog(exerciseRef, setNumber, { reps, weight, duration }, false);
    if (!saved) {
      toast.error("Failed to save set");
      return;
    }

    setExStates((prev) => {
      const st = prev[exerciseRef];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setNumber - 1] = {
        ...newSets[setNumber - 1],
        status: newStatus,
        savedId: saved.id,
      };
      return { ...prev, [exerciseRef]: { ...st, sets: newSets } };
    });
  };

  const handleSetField = (exerciseRef: string, setNumber: number, field: "reps" | "weight" | "duration", value: string) => {
    setExStates((prev) => {
      const st = prev[exerciseRef];
      if (!st) return prev;
      const newSets = [...st.sets];
      newSets[setNumber - 1] = { ...newSets[setNumber - 1], [field]: value };
      return { ...prev, [exerciseRef]: { ...st, sets: newSets } };
    });
  };

  const handleNoteToggle = (exerciseRef: string) => {
    setExStates((prev) => {
      const st = prev[exerciseRef];
      if (!st) return prev;
      return { ...prev, [exerciseRef]: { ...st, noteOpen: !st.noteOpen } };
    });
  };

  const handleNoteInput = (exerciseRef: string, value: string) => {
    setExStates((prev) => {
      const st = prev[exerciseRef];
      if (!st) return prev;
      return { ...prev, [exerciseRef]: { ...st, note: value } };
    });
  };

  const handleComplete = async () => {
    setCompleting(true);
    const updatedLog: SessionLog = {
      completed_at: new Date().toISOString(),
      rpe,
      fatigue,
      notes,
    };
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ...data, session_log: updatedLog } }),
    });
    setCompleting(false);
    if (!res.ok) {
      toast.error("Failed to mark session complete");
      return;
    }
    setShowComplete(false);
    toast.success(`Session ${sessionNumber} marked complete.`);
  };

  const sessionDate = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-[var(--hub-canvas)] font-sans antialiased pb-[88px]" style={{ paddingBottom: "max(88px, env(safe-area-inset-bottom))" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-[10px] border-b border-[var(--hub-border)] px-4 py-2.5" style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2.5">
          <Link
            href="/hub/schedule"
            className="flex-shrink-0 w-[44px] h-[44px] rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] text-foreground grid place-items-center hover:bg-[var(--hub-hover)]"
          >
            <IconChevronLeft className="h-[17px] w-[17px]" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-base font-extrabold text-foreground truncate">{clientName}</div>
            <div className="text-[12.5px] text-muted-foreground mt-px truncate">
              Session {sessionNumber}{blockNumber != null ? ` · Block ${blockNumber}` : ""}{sessionDate ? ` · ${sessionDate}` : ""}{` · ${archetype} · Week ${week} · ${phase}`}
            </div>
          </div>
          <StatusPill doneCount={progress.doneExCount} total={allExerciseRefs.length} started={progress.started} />
        </div>
        <div className="h-1 bg-[var(--hub-border)] rounded-full mt-2.5 overflow-hidden">
          <div className="h-full bg-rose rounded-full transition-[width] duration-250" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="text-[11.5px] text-muted-foreground mt-1.5">
          {progress.doneExCount} of {allExerciseRefs.length} exercises logged
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4" style={{ paddingBottom: "132px" }}>
        <div className="flex gap-2.5 rounded-xl p-3 text-[12.5px] leading-relaxed mb-4 bg-rose/5 border border-rose/20">
          <span className="w-5 h-5 rounded-full bg-rose text-white grid place-items-center text-[11px] font-extrabold flex-shrink-0 mt-px">i</span>
          <div>
            <b className="text-foreground">Live logging surface.</b> Pre-filled fields match the prescription — tap <b>Done</b> unchanged to log exactly as prescribed, or edit first then tap Done. The <b className="whitespace-nowrap">Mark session complete</b> bar at the bottom saves everything.
          </div>
        </div>

        {SECTION_DEFS.map((sec) => {
          const list = sections[sec.key] || [];
          const blocks = computeBlocks(list);
          const isCollapsed = !!collapsed[sec.key];
          const doneCount = list.filter((_, idx) => {
            const ref = exerciseRefKey(version, sec.key, idx, list[idx].exercise_name);
            const st = exStates[ref];
            return st && st.sets.every((s) => s.status !== "pending");
          }).length;

          const icnBg = sec.color === "teal" ? "bg-teal/10 text-teal" : sec.color === "rose" ? "bg-rose/5 text-rose" : "bg-[var(--hub-sidebar)]/10 text-[var(--hub-sidebar)]";

          return (
            <div key={sec.key} className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-2xl shadow-sm mb-3.5 overflow-hidden">
              <button
                type="button"
                className="flex items-center gap-2.5 px-4 py-3.5 bg-transparent w-full text-left font-inherit cursor-pointer"
                onClick={() => setCollapsed((p) => ({ ...p, [sec.key]: !p[sec.key] }))}
              >
                <span className={`w-[30px] h-[30px] rounded-lg grid place-items-center flex-shrink-0 ${icnBg}`}>
                  {sec.color === "teal" ? <FlameIcon /> : sec.color === "rose" ? <LightningIcon /> : <MoonIcon />}
                </span>
                <div>
                  <div className="text-[14.5px] font-extrabold text-foreground">{sec.label}</div>
                  <div className="text-xs text-muted-foreground">{doneCount} of {list.length} logged</div>
                </div>
                <span className={`ml-auto text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}>
                  <ChevronDownIcon />
                </span>
              </button>
              {!isCollapsed && (
                <div className="border-t border-[var(--hub-border)] p-3 flex flex-col gap-2.5">
                  {blocks.map((block) =>
                    block.type === "group" ? (
                      <div key={block.label} className="border-[1.5px] border-rose/20 bg-rose/5 rounded-[14px] p-2">
                        <div className="flex items-center gap-2 px-1 pb-2">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose bg-white/60 border border-rose/20 rounded-full px-2 py-0.5">
                            Superset {block.label}
                          </span>
                          <span className="text-[11px] text-rose">{block.items.length} exercises performed together</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {block.items.map((ex, i) => (
                            <ExerciseCard
                              key={i}
                              exercise={ex}
                              state={exStates[exerciseRefKey(version, sec.key, list.indexOf(ex), ex.exercise_name)]}
                              exerciseRef={exerciseRefKey(version, sec.key, list.indexOf(ex), ex.exercise_name)}
                              onSetDone={handleSetDone}
                              onSetSkip={handleSetSkip}
                              onSetField={handleSetField}
                              onNoteToggle={handleNoteToggle}
                              onNoteInput={handleNoteInput}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <ExerciseCard
                        key={block.ex.exercise_name}
                        exercise={block.ex}
                        state={exStates[exerciseRefKey(version, sec.key, list.indexOf(block.ex), block.ex.exercise_name)]}
                        exerciseRef={exerciseRefKey(version, sec.key, list.indexOf(block.ex), block.ex.exercise_name)}
                        onSetDone={handleSetDone}
                        onSetSkip={handleSetSkip}
                        onSetField={handleSetField}
                        onNoteToggle={handleNoteToggle}
                        onNoteInput={handleNoteInput}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Session summary */}
        <div className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-2xl shadow-sm p-4">
          <h2 className="text-[15px] font-extrabold text-foreground mb-0">Session summary</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 mb-4">Logged once, at the end — covers how the whole session felt, not one exercise.</p>

          <div className="mb-[18px]">
            <span className="text-xs font-bold text-foreground mb-2 block">RPE <span className="font-normal text-muted-foreground">— rate of perceived exertion, 1 (very light) – 10 (maximal)</span></span>
            <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="RPE">
              {Array.from({ length: 10 }, (_, i) => {
                const val = i + 1;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRpe(rpe === val ? null : val)}
                    className={`w-[44px] h-[44px] rounded-[10px] border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground text-[14px] font-bold cursor-pointer ${
                      rpe === val ? "bg-rose border-rose text-white" : ""
                    }`}
                    aria-pressed={rpe === val}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-[18px]">
            <span className="text-xs font-bold text-foreground mb-2 block">Fatigue level</span>
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Fatigue">
              {(["low", "moderate", "high"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFatigue(fatigue === f ? null : f)}
                  className={`flex-1 min-w-[96px] h-[44px] rounded-[10px] border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground text-[13px] font-bold cursor-pointer capitalize ${
                    fatigue === f
                      ? f === "low"
                        ? "bg-teal/10 border-teal text-teal"
                        : f === "moderate"
                          ? "bg-[var(--status-warning-bg)] border-[var(--status-warning-text)] text-[var(--status-warning-text)]"
                          : "bg-[var(--status-danger-bg)] border-[var(--status-danger)] text-[var(--status-danger)]"
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
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-foreground">Session notes</span>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`inline-flex items-center gap-1 rounded-[7px] border px-2 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                    listening
                      ? "bg-rose text-white border-rose animate-pulse"
                      : "border-[var(--hub-field-border)] bg-[var(--hub-card)] text-muted-foreground hover:border-rose/30 hover:text-rose"
                  }`}
                  aria-label={listening ? "Stop recording" : "Record voice note"}
                >
                  <MicIcon active={listening} />
                  {listening ? "Listening…" : "Speak"}
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the session go overall — anything to flag for next time?"
              className="w-full min-h-[84px] resize-y border border-[var(--hub-field-border)] rounded-[10px] p-2.5 text-[13.5px] font-inherit bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
            />
          </div>
        </div>
      </main>

      {/* Bottom bar */}
      <div className="fixed left-0 right-0 bottom-0 z-40 bg-white/95 backdrop-blur-[10px] border-t border-[var(--hub-border)] shadow-[0_-8px_24px_rgba(16,24,40,.08)] px-4 py-2.5" style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
        <div className="max-w-[640px] mx-auto flex items-center gap-2.5">
          <span className="text-[11.5px] text-muted-foreground flex-1 min-w-0">{progress.doneExCount} of {allExerciseRefs.length} exercises logged</span>
          <button
            type="button"
            onClick={() => {
              if (rpe == null && fatigue == null) {
                toast("Tip: RPE and fatigue are still blank — you can still complete without them.", { description: "" });
              }
              setShowComplete(true);
            }}
            disabled={completing}
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] px-[18px] h-[46px] text-sm font-bold bg-rose text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <CheckIcon />
            Mark session complete
          </button>
        </div>
      </div>

      {/* Complete overlay */}
      {showComplete && (
        <div className="fixed inset-0 z-60 bg-[var(--hub-sidebar)]/50 backdrop-blur-[2px] grid place-items-center p-5" onClick={() => setShowComplete(false)}>
          <div
            className="w-full max-w-[380px] bg-[var(--hub-card)] rounded-[20px] p-7 text-center shadow-[0_24px_64px_rgba(16,24,40,.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-teal/10 text-teal grid place-items-center mx-auto mb-4">
              <CheckIconLarge />
            </div>
            <h3 className="text-lg font-extrabold text-foreground mb-1.5">Mark this session complete?</h3>
            <p className="text-[13.5px] text-muted-foreground mb-5">
              {progress.doneExCount === allExerciseRefs.length
                ? "Every exercise is logged. This saves the session and marks it complete."
                : `${allExerciseRefs.length - progress.doneExCount} of ${allExerciseRefs.length} exercises are still unlogged. You can complete anyway — unlogged sets are saved as not recorded.`}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleComplete}
                disabled={completing}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-[10px] px-[18px] h-[46px] text-sm font-bold bg-rose text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Yes, complete session
              </button>
              <button
                type="button"
                onClick={() => setShowComplete(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-[10px] px-[18px] h-[46px] text-sm font-bold border border-[var(--hub-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)]"
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

function StatusPill({ doneCount, total, started }: { doneCount: number; total: number; started: boolean }) {
  const done = doneCount === total;
  const cls = done
    ? "bg-teal/10 text-teal border-teal/20"
    : started
      ? "bg-rose/5 text-rose border-rose/20"
      : "bg-[var(--hub-hover)] text-muted-foreground border-[var(--hub-border)]";
  const label = done ? "All logged" : started ? "In progress" : "Not started";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-bold flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function ExerciseCard({
  exercise,
  state,
  exerciseRef,
  onSetDone,
  onSetSkip,
  onSetField,
  onNoteToggle,
  onNoteInput,
}: {
  exercise: Exercise;
  state: ExState | undefined;
  exerciseRef: string;
  onSetDone: (ref: string, setNum: number, ex: Exercise) => void;
  onSetSkip: (ref: string, setNum: number, ex: Exercise) => void;
  onSetField: (ref: string, setNum: number, field: "reps" | "weight" | "duration", value: string) => void;
  onNoteToggle: (ref: string) => void;
  onNoteInput: (ref: string, value: string) => void;
}) {
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);
  const totalSets = Math.max(1, exercise.sets || 1);
  const sets = state?.sets ?? [];
  const exComplete = sets.every((s) => s.status !== "pending");
  const note = state?.note ?? "";
  const noteOpen = state?.noteOpen ?? false;

  return (
    <div className={`bg-[var(--hub-card)] border rounded-[13px] p-3 ${exComplete ? "border-teal/20 bg-gradient-to-b from-teal/10 to-[var(--hub-card)] to-[60px]" : "border-[var(--hub-border)]"}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {exComplete && <span className="text-teal flex-shrink-0"><CheckIconSm /></span>}
            <span className="text-[15px] font-bold text-foreground">{exercise.exercise_name}</span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
              timeBased ? "border-teal/20 bg-teal/10 text-teal" : "border-rose/20 bg-rose/5 text-rose"
            }`}>
              {timeBased ? "Time" : "Reps & wt"}
            </span>
          </div>
          {exercise.coaching_cue && <p className="text-[12.5px] text-muted-foreground mt-1">{exercise.coaching_cue}</p>}
          {exercise.modification && (
            <span className="inline-flex mt-1.5 text-[11px] font-semibold text-[var(--status-warning-text)] bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] rounded-md px-1.5 py-0.5">
              {exercise.modification}
            </span>
          )}
          {exercise.equipment && exercise.equipment.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {exercise.equipment.map((t) => (
                <span key={t} className="text-[11px] font-semibold text-muted-foreground bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded-full px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
          <p className="text-[12.5px] text-muted-foreground mt-2 pt-2 border-t border-dashed border-[var(--hub-border)]">
            <b className="text-foreground font-bold">Prescribed:</b> {exercise.sets ?? 1} × {exercise.reps || "—"}
            {exercise.tempo && exercise.tempo !== "—" ? ` @ tempo ${exercise.tempo}` : ""}
            {exercise.rest && exercise.rest !== "—" ? ` · ${exercise.rest} rest` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNoteToggle(exerciseRef)}
          className={`flex-shrink-0 w-[44px] h-[44px] rounded-[9px] border grid place-items-center cursor-pointer ${
            note ? "border-rose/20 bg-rose/5 text-rose" : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
          }`}
          aria-label="Add note"
        >
          <NoteIcon />
        </button>
      </div>

      {noteOpen && (
        <div className="mt-2.5">
          <textarea
            value={note}
            onChange={(e) => onNoteInput(exerciseRef, e.target.value)}
            placeholder="Quick note about this exercise…"
            className="w-full min-h-[56px] resize-y border border-[var(--hub-field-border)] rounded-[9px] p-2 text-[13px] font-inherit bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
          />
        </div>
      )}

      <div className="mt-2.5 flex flex-col gap-2">
        {Array.from({ length: totalSets }, (_, idx) => {
          const setNum = idx + 1;
          const setStatus = sets[idx]?.status ?? "pending";
          const reps = sets[idx]?.reps ?? "";
          const weight = sets[idx]?.weight ?? "";
          const duration = sets[idx]?.duration ?? "";
          const targetLabel = timeBased
            ? `Target: ${exercise.reps}`
            : `Target: ${exercise.reps}${exercise.tempo && exercise.tempo !== "—" ? ` @ tempo ${exercise.tempo}` : ""}${exercise.rest && exercise.rest !== "—" ? ` · ${exercise.rest} rest` : ""}`;

          return (
            <div
              key={setNum}
              className={`border rounded-[11px] p-2.5 transition-colors ${
                setStatus === "done"
                  ? "bg-teal/10 border-teal/20"
                  : setStatus === "skipped"
                    ? "bg-transparent border-dashed opacity-65"
                    : "bg-[var(--hub-hover)] border-[var(--hub-border)]"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-extrabold text-foreground bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-full w-[22px] h-[22px] grid place-items-center flex-shrink-0">
                  {setNum}
                </span>
                <span className="text-xs text-muted-foreground">{targetLabel}</span>
                {setStatus === "done" && sets[idx]?.isNewPb && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider flex-shrink-0 ml-auto">
                    New PB
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                {timeBased ? (
                  <div className="flex flex-col gap-[3px] w-[108px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={duration}
                      onChange={(e) => onSetField(exerciseRef, setNum, "duration", e.target.value)}
                      placeholder={exercise.reps}
                      disabled={setStatus === "skipped"}
                      className="w-full h-[44px] border border-[var(--hub-field-border)] rounded-[9px] px-2.5 text-[15px] font-semibold bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-[3px] w-[76px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reps</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={reps}
                        onChange={(e) => onSetField(exerciseRef, setNum, "reps", e.target.value)}
                        placeholder={parsePrescribedReps(exercise.reps) != null ? String(parsePrescribedReps(exercise.reps)) : exercise.reps}
                        disabled={setStatus === "skipped"}
                        className="w-full h-[44px] border border-[var(--hub-field-border)] rounded-[9px] px-2.5 text-[15px] font-semibold bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
                      />
                    </div>
                    <div className="flex flex-col gap-[3px] w-[76px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Weight</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={weight}
                        onChange={(e) => onSetField(exerciseRef, setNum, "weight", e.target.value)}
                        placeholder="BW"
                        disabled={setStatus === "skipped"}
                        className="w-full h-[44px] border border-[var(--hub-field-border)] rounded-[9px] px-2.5 text-[15px] font-semibold bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 disabled:opacity-55"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => onSetDone(exerciseRef, setNum, exercise)}
                    className={`h-[44px] min-w-[44px] px-3.5 rounded-[9px] border text-[12.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                      setStatus === "done"
                        ? "bg-teal border-teal text-white"
                        : "bg-[var(--hub-card)] border-[var(--hub-border)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                    }`}
                  >
                    <CheckIconSm />
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetSkip(exerciseRef, setNum, exercise)}
                    className={`h-[44px] min-w-[44px] px-3.5 rounded-[9px] border text-[12.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                      setStatus === "skipped"
                        ? "bg-[var(--status-danger)] border-[var(--status-danger)] text-white"
                        : "bg-[var(--hub-card)] border-[var(--hub-border)] text-muted-foreground hover:bg-[var(--hub-hover)]"
                    }`}
                  >
                    <SkipIcon />
                    Skip
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CheckIconSm() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CheckIconLarge() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a2.5 2.5 0 0 0-2.5 2.5v7a2.5 2.5 0 0 0 5 0v-7A2.5 2.5 0 0 0 12 2z" />
      <path d="M18 10a6 6 0 0 1-12 0" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <line x1="8" x2="16" y1="22" y2="22" />
    </svg>
  );
}
