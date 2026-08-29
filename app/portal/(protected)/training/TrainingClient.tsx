"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { SetLog } from "@/types";
import type { PortalExercise, PortalSessionPlan, PortalTrainingPlan } from "@/lib/portal-data";
import { IconCheck, IconCheckCircle, IconVideo, IconX } from "@/components/icons";
import { isTimeBased, parsePrescribedSeconds, parsePrescribedReps } from "@/lib/prescription";
import { defaultUnitForEquipment, toKg, fromKg } from "@/lib/units";

/** exercise_ref convention (matches Lane A's migration): <version>:<section>:<index>:<name>.
 * The portal always logs against the HOME version of the plan. */
function exerciseRefFor(sectionKey: string, index: number, name: string): string {
  return `home:${sectionKey}:${index}:${name}`;
}

function logKey(sessionId: string, exerciseRef: string, setNumber: number): string {
  return `${sessionId}::${exerciseRef}::${setNumber}`;
}

interface SetLogSavePayload {
  exercise_ref: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  completed: boolean;
}

export default function TrainingClient({
  plan,
  initialLogs,
  bestWeights,
}: {
  plan: PortalTrainingPlan;
  initialLogs: SetLog[];
  /** Client's best-ever weight_kg per exercise name — prefills a set's weight
   *  field when this session has no log for it yet. */
  bestWeights?: Record<string, number>;
}) {
  const [logs, setLogs] = useState<Record<string, SetLog>>(() => {
    const map: Record<string, SetLog> = {};
    for (const row of initialLogs) {
      map[logKey(row.session_id, row.exercise_ref, row.set_number)] = row;
    }
    return map;
  });

  // Default to the first session with nothing logged yet (and not marked
  // complete); fall back to the last session in the block.
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const loggedSessionIds = new Set(initialLogs.map((l) => l.session_id));
    const idx = plan.sessions.findIndex(
      (s) => !s.completed_at && !loggedSessionIds.has(s.id),
    );
    return idx >= 0 ? idx : plan.sessions.length - 1;
  });

  const session = plan.sessions[selectedIdx];

  const sessionHasLogs = useMemo(() => {
    const ids = new Set<string>();
    for (const row of Object.values(logs)) ids.add(row.session_id);
    return ids;
  }, [logs]);

  // Idempotency keys for in-flight creates, keyed by the same log key. A retried
  // POST (network dropped after the server committed but before the ack came back)
  // reuses the same client_op_id so the API dedupes instead of double-logging
  // (CR-EF-029). Cleared once a row exists — subsequent taps are PATCHes.
  const opIdByKey = useRef<Record<string, string>>({});

  const saveSetLog = async (
    sessionId: string,
    payload: SetLogSavePayload,
  ): Promise<{ ok: boolean; isNewPb: boolean }> => {
    const key = logKey(sessionId, payload.exercise_ref, payload.set_number);
    const existing = logs[key];
    const body: Record<string, unknown> = existing
      ? {
          id: existing.id,
          reps: payload.reps,
          weight_kg: payload.weight_kg,
          duration_seconds: payload.duration_seconds,
          completed: payload.completed,
        }
      : (() => {
          const clientOpId = opIdByKey.current[key] ?? crypto.randomUUID();
          opIdByKey.current[key] = clientOpId;
          return { ...payload, client_op_id: clientOpId };
        })();
    const res = await fetch(`/api/portal/sessions/${sessionId}/set-logs`, {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("That didn't save — check your connection and try again.");
      return { ok: false, isNewPb: false };
    }
    const saved: SetLog & { is_new_pb?: boolean } = await res.json();
    setLogs((prev) => ({ ...prev, [key]: saved }));
    delete opIdByKey.current[key];
    return { ok: true, isNewPb: saved.is_new_pb === true };
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Your training</h1>
        <p className="mt-1 text-muted-foreground">
          Block {plan.block.block_number} — pick a session, follow the plan, and log
          each set as you go.
        </p>
      </section>

      {/* Session picker — horizontal scroll on phones */}
      <nav aria-label="Sessions in this block" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 pb-1">
          {plan.sessions.map((s, i) => {
            const active = i === selectedIdx;
            const done = Boolean(s.completed_at) || sessionHasLogs.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setSelectedIdx(i)}
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-transparent bg-[var(--status-primary)] text-white"
                    : "border-input bg-white text-foreground hover:bg-accent"
                }`}
              >
                {done && <IconCheckCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                Session {s.session_number}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Selected session */}
      <section aria-label={`Session ${session.session_number}`} className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold">Session {session.session_number}</h2>
            <span className="text-sm capitalize text-muted-foreground">
              Week {session.week}
              {session.focus_label ? ` · ${session.focus_label}` : ""}
            </span>
          </div>
          {session.client_intro && (
            <p className="mt-2 text-sm text-muted-foreground">{session.client_intro}</p>
          )}
        </div>

        <SessionSection
          title="Warm-up"
          sectionKey="warm_up"
          exercises={session.warm_up}
          session={session}
          logs={logs}
          bestWeights={bestWeights}
          onSave={saveSetLog}
        />
        <SessionSection
          title="Main block"
          sectionKey="main_block"
          exercises={session.main_block}
          session={session}
          logs={logs}
          bestWeights={bestWeights}
          onSave={saveSetLog}
        />
        <SessionSection
          title="Cool-down"
          sectionKey="cooldown"
          exercises={session.cooldown}
          session={session}
          logs={logs}
          bestWeights={bestWeights}
          onSave={saveSetLog}
        />
      </section>
    </div>
  );
}

function SessionSection({
  title,
  sectionKey,
  exercises,
  session,
  logs,
  bestWeights,
  onSave,
}: {
  title: string;
  sectionKey: string;
  exercises: PortalExercise[];
  session: PortalSessionPlan;
  logs: Record<string, SetLog>;
  bestWeights?: Record<string, number>;
  onSave: (sessionId: string, payload: SetLogSavePayload) => Promise<{ ok: boolean; isNewPb: boolean }>;
}) {
  if (exercises.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={`${sectionKey}-${i}`}
            exercise={ex}
            exerciseRef={exerciseRefFor(sectionKey, i, ex.exercise_name)}
            session={session}
            logs={logs}
            bestWeights={bestWeights}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  exerciseRef,
  session,
  logs,
  bestWeights,
  onSave,
}: {
  exercise: PortalExercise;
  exerciseRef: string;
  session: PortalSessionPlan;
  logs: Record<string, SetLog>;
  bestWeights?: Record<string, number>;
  onSave: (sessionId: string, payload: SetLogSavePayload) => Promise<{ ok: boolean; isNewPb: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const totalSets = Math.max(1, exercise.sets || 1);

  let loggedCount = 0;
  for (let s = 1; s <= totalSets; s++) {
    if (logs[logKey(session.id, exerciseRef, s)]) loggedCount++;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {exercise.image_url && (
            <img
              src={exercise.image_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            {exercise.group_label && (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--status-primary)]">
                {exercise.group_label}
              </p>
            )}
            <p className="font-medium">{exercise.exercise_name}</p>
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
            {exercise.sets ?? 1} × {exercise.reps || "—"}
            {exercise.tempo ? ` · Tempo ${exercise.tempo}` : ""}
            {exercise.rest ? ` · Rest ${exercise.rest}` : ""}
          </p>
          {exercise.equipment.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {exercise.equipment.join(", ")}
            </p>
          )}
          </div>
        </div>
        {exercise.video_url && (
          <a
            href={exercise.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-input px-3.5 text-sm font-medium text-[var(--status-primary)] hover:bg-accent"
          >
            <IconVideo className="h-4 w-4" aria-hidden="true" />
            Video
          </a>
        )}
      </div>

      {exercise.coaching_cue && (
        <p className="mt-2 text-sm italic text-muted-foreground">{exercise.coaching_cue}</p>
      )}
      {exercise.modification && (
        <p className="mt-1 text-sm text-[var(--status-warning)]">
          Easier option: {exercise.modification}
        </p>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
          loggedCount > 0
            ? "border-teal/30 bg-teal/10 text-teal"
            : "border-input bg-white text-foreground hover:bg-accent"
        }`}
      >
        {loggedCount > 0 && <IconCheckCircle className="h-3.5 w-3.5" aria-hidden="true" />}
        {open ? "Hide logging" : `Log sets${loggedCount > 0 ? ` · ${loggedCount}/${totalSets}` : ""}`}
      </button>

      {open && (
        <div className="mt-3">
          <ExerciseSetLogger
            exercise={exercise}
            exerciseRef={exerciseRef}
            session={session}
            logs={logs}
            bestWeights={bestWeights}
            onSave={onSave}
          />
        </div>
      )}
    </div>
  );
}

/** Per-set quick-log rows — same interaction as the studio quick-log: tap ✓ with
 * the boxes empty to log the set exactly as prescribed, type first to log what
 * actually happened, ✗ logs the set as skipped. Logged sets stay editable. */
function ExerciseSetLogger({
  exercise,
  exerciseRef,
  session,
  logs,
  bestWeights,
  onSave,
}: {
  exercise: PortalExercise;
  exerciseRef: string;
  session: PortalSessionPlan;
  logs: Record<string, SetLog>;
  bestWeights?: Record<string, number>;
  onSave: (sessionId: string, payload: SetLogSavePayload) => Promise<{ ok: boolean; isNewPb: boolean }>;
}) {
  const totalSets = Math.max(1, exercise.sets || 1);
  const timeBased = isTimeBased(exercise.reps, exercise.log_type);
  const prescribedSeconds = parsePrescribedSeconds(exercise.reps);
  const prescribedReps = parsePrescribedReps(exercise.reps);
  const carriedWeight = bestWeights?.[exercise.exercise_name];
  const displayUnit = defaultUnitForEquipment(exercise.equipment);

  const [drafts, setDrafts] = useState<Record<number, { main: string; weight: string }>>(() => {
    const init: Record<number, { main: string; weight: string }> = {};
    for (let s = 1; s <= totalSets; s++) {
      const log = logs[logKey(session.id, exerciseRef, s)];
      init[s] = {
        main: log
          ? timeBased
            ? log.duration_seconds != null ? String(log.duration_seconds) : ""
            : log.reps != null ? String(log.reps) : ""
          : "",
        weight: log?.weight_kg != null
          ? String(fromKg(log.weight_kg, displayUnit))
          : carriedWeight != null ? String(fromKg(carriedWeight, displayUnit)) : "",
      };
    }
    return init;
  });
  const [savingSet, setSavingSet] = useState<number | null>(null);
  const [pbSets, setPbSets] = useState<Set<number>>(new Set());

  const save = async (setNumber: number, completed: boolean) => {
    const draft = drafts[setNumber] ?? { main: "", weight: "" };
    const mainVal = draft.main.trim() === "" ? null : Number(draft.main);
    const weightVal = draft.weight.trim() === "" ? null : toKg(Number(draft.weight), displayUnit);
    // Empty main input on a done set falls back to the prescription — one tap logs "as prescribed".
    const reps = timeBased ? null : mainVal ?? (completed ? prescribedReps : null);
    const duration = timeBased ? mainVal ?? (completed ? prescribedSeconds : null) : null;
    setSavingSet(setNumber);
    const result = await onSave(session.id, {
      exercise_ref: exerciseRef,
      set_number: setNumber,
      reps: reps != null && Number.isFinite(reps) ? Math.round(reps) : null,
      weight_kg: weightVal != null && Number.isFinite(weightVal) ? weightVal : null,
      duration_seconds: duration != null && Number.isFinite(duration) ? Math.round(duration) : null,
      completed,
    });
    setSavingSet(null);
    if (result.isNewPb) {
      setPbSets((prev) => new Set(prev).add(setNumber));
    }
  };

  return (
    <div className="space-y-2 rounded-xl bg-accent/50 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Prescribed {exercise.sets ?? 1} × {exercise.reps || "—"}
      </p>
      {Array.from({ length: totalSets }, (_, idx) => idx + 1).map((setNumber) => {
        const log = logs[logKey(session.id, exerciseRef, setNumber)];
        const draft = drafts[setNumber] ?? { main: "", weight: "" };
        const saving = savingSet === setNumber;
        return (
          <div key={setNumber} className="flex flex-wrap items-center gap-2">
            <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
              Set {setNumber}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={draft.main}
              onChange={(e) =>
                setDrafts((p) => ({ ...p, [setNumber]: { ...draft, main: e.target.value } }))
              }
              placeholder={
                timeBased
                  ? prescribedSeconds != null ? `${prescribedSeconds}s` : exercise.reps || "secs"
                  : exercise.reps || "reps"
              }
              aria-label={
                timeBased ? `Set ${setNumber} duration in seconds` : `Set ${setNumber} reps`
              }
              className="h-11 w-20 min-w-0 rounded-lg border border-border/60 bg-white px-2 text-center text-sm tabular-nums"
            />
            <input
              type="text"
              inputMode="decimal"
              value={draft.weight}
              onChange={(e) =>
                setDrafts((p) => ({ ...p, [setNumber]: { ...draft, weight: e.target.value } }))
              }
              placeholder={displayUnit}
              aria-label={`Set ${setNumber} weight in ${displayUnit} (leave blank if not applicable)`}
              className="h-11 w-20 min-w-0 rounded-lg border border-border/60 bg-white px-2 text-center text-sm tabular-nums"
            />
            <button
              title="Done"
              disabled={saving}
              onClick={() => save(setNumber, true)}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                log && log.completed
                  ? "border-teal/30 bg-teal/15 text-teal"
                  : "border-border/60 bg-white text-muted-foreground hover:border-teal/40 hover:text-teal"
              }`}
            >
              <IconCheck className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Log set {setNumber} as done</span>
            </button>
            <button
              title="Skip"
              disabled={saving}
              onClick={() => save(setNumber, false)}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                log && !log.completed
                  ? "border-rose/30 bg-rose/10 text-rose"
                  : "border-border/60 bg-white text-muted-foreground hover:border-rose/40 hover:text-rose"
              }`}
            >
              <IconX className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Log set {setNumber} as skipped</span>
            </button>
            <span className="text-[11px] text-muted-foreground" aria-live="polite">
              {log ? (log.completed ? "Done" : "Skipped") : ""}
            </span>
            {pbSets.has(setNumber) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                New PB
              </span>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground">
        Tap ✓ with the boxes empty to log the set as written. Weight is optional — leave
        it blank for bodyweight moves.
      </p>
    </div>
  );
}
