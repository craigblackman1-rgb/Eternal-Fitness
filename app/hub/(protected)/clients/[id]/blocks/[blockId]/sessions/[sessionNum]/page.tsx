"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChevronLeft, IconChevronRight, IconVideo, IconCheck, IconCheckCircle, IconActivity, IconFileText, IconPencil, IconSearch, IconX, IconEdit3 } from "@/components/icons";
import { HubCardHeader } from "@/components/hub/HubCardHeader";
import { HubCard } from "@/components/hub/HubCard";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { DBSession, Exercise, SessionLog, SessionVersion, SetLog } from "@/types";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";
import { SwapExerciseDialog } from "../swap-exercise-dialog";
import { SessionEditor } from "./SessionEditor";

export default function SessionViewPage({
  params,
}: {
  params: { id: string; blockId: string; sessionNum: string };
}) {
  const [session, setSession] = useState<DBSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [coachingNotes, setCoachingNotes] = useState("");
  const [totalSessions, setTotalSessions] = useState(0);
  const [editingLog, setEditingLog] = useState(false);
  const [rpe, setRpe] = useState<string>("");
  const [fatigue, setFatigue] = useState<SessionLog["fatigue"]>(null);
  const [logNotes, setLogNotes] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  // Per-set quick logs, keyed by `${exercise_ref}::${set_number}`.
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>({});
  // Desk-planning session editor — locked to one version (studio/home) while active.
  const [editingVersion, setEditingVersion] = useState<"studio" | "home" | null>(null);
  const [activeTab, setActiveTab] = useState<"studio" | "home">("studio");

  const sessionNum = parseInt(params.sessionNum);

  useEffect(() => {
    async function load() {
      const [sessionRes, countRes] = await Promise.all([
        fetch(`/api/blocks/${params.blockId}/sessions?session_number=${sessionNum}`),
        fetch(`/api/blocks/${params.blockId}/sessions?count=true`),
      ]);
      if (sessionRes.ok) {
        const data = await sessionRes.json();
        setSession(data);
        setCoachingNotes(data?.data?.coaching_notes || "");
        const log: SessionLog | undefined = data?.data?.session_log;
        setRpe(log?.rpe != null ? String(log.rpe) : "");
        setFatigue(log?.fatigue ?? null);
        setLogNotes(log?.notes || "");
        if (data?.id) {
          const logsRes = await fetch(`/api/sessions/${data.id}/set-logs`);
          if (logsRes.ok) {
            const rows: SetLog[] = await logsRes.json();
            const map: Record<string, SetLog> = {};
            for (const row of rows) map[`${row.exercise_ref}::${row.set_number}`] = row;
            setSetLogs(map);
          }
        }
      }
      if (countRes.ok) {
        const { count } = await countRes.json();
        setTotalSessions(count || 0);
      }
      setLoading(false);
    }
    load();
  }, [params.blockId, sessionNum]);

  const saveNotes = async () => {
    if (!session) return;
    const updatedData = { ...session.data, coaching_notes: coachingNotes };
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatedData }),
    });
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Saved");
    setEditingNotes(false);
  };

  const currentLog: SessionLog | undefined = session?.data?.session_log;

  const saveLog = async (markComplete: boolean) => {
    if (!session) return;
    setSavingLog(true);
    const updatedLog: SessionLog = {
      completed_at: markComplete ? new Date().toISOString() : currentLog?.completed_at ?? null,
      rpe: rpe.trim() === "" ? null : Number(rpe),
      fatigue,
      notes: logNotes,
    };
    const updatedData = { ...session.data, session_log: updatedLog };
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatedData }),
    });
    setSavingLog(false);
    if (!res.ok) {
      toast.error("Failed to save session log");
      return;
    }
    setSession({ ...session, data: updatedData });
    toast.success(markComplete ? "Session marked complete" : "Session log saved");
    setEditingLog(false);
  };

  /** POST on first log of a set, PATCH on subsequent edits (already-logged ids are
   *  tracked in setLogs state). Returns true on success. */
  const saveSetLog = async (payload: {
    exercise_ref: string;
    set_number: number;
    reps: number | null;
    weight_kg: number | null;
    duration_seconds: number | null;
    completed: boolean;
  }): Promise<boolean> => {
    if (!session) return false;
    const key = `${payload.exercise_ref}::${payload.set_number}`;
    const existing = setLogs[key];
    const res = await fetch(`/api/sessions/${session.id}/set-logs`, {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(existing ? { id: existing.id, reps: payload.reps, weight_kg: payload.weight_kg, duration_seconds: payload.duration_seconds, completed: payload.completed } : payload),
    });
    if (!res.ok) {
      toast.error("Failed to save set");
      return false;
    }
    const saved: SetLog = await res.json();
    setSetLogs((prev) => ({ ...prev, [key]: saved }));
    return true;
  };

  /** Merges the edited version's sections back into session.data and persists — used by
   *  SessionEditor's "Save changes". Only the version being edited is touched. */
  const saveSessionEdit = async (version: "studio" | "home", updated: SessionVersion): Promise<boolean> => {
    if (!session) return false;
    const updatedData = {
      ...session.data,
      versions: { ...session.data.versions, [version]: updated },
    };
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatedData }),
    });
    if (!res.ok) return false;
    setSession({ ...session, data: updatedData });
    setEditingVersion(null);
    toast.success("Session saved");
    return true;
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!session) return <div className="p-8 text-center text-muted-foreground">Session not found</div>;

  const archetypeNames: Record<string, string> = {
    A: "Mobility & Movement Quality",
    B: "Strength & Stability",
    C: "Power & Conditioning",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}`} className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">Session {sessionNum}</h1>
            <Badge variant="outline" className="text-sm">{session.archetype}</Badge>
            <span className="text-sm capitalize text-muted-foreground">Week {session.week} · {session.phase}</span>
          </div>
          <p className="text-muted-foreground">{archetypeNames[session.archetype]}</p>
        </div>
        <div className="flex gap-2">
          {!editingVersion && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg gap-1.5"
              onClick={() => setEditingVersion(activeTab)}
            >
              <IconEdit3 className="h-4 w-4" />
              Edit session
            </Button>
          )}
          {sessionNum > 1 && (
            <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}/sessions/${sessionNum - 1}`}>
              <Button variant="outline" size="icon" className="rounded-lg"><IconChevronLeft className="h-4 w-4" /></Button>
            </Link>
          )}
          {sessionNum < totalSessions && (
            <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}/sessions/${sessionNum + 1}`}>
              <Button variant="outline" size="icon" className="rounded-lg"><IconChevronRight className="h-4 w-4" /></Button>
            </Link>
          )}
        </div>
      </div>

      {session.data?.client_intro && (
        <Card className="shadow-sm border-rose/20 bg-rose/5 rounded-2xl">
          <CardContent className="pt-4">
            <p className="text-sm italic text-muted-foreground">Client intro</p>
            <p className="mt-1">{session.data.client_intro}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex rounded-lg border border-[var(--color-muted-text)] bg-[var(--hub-canvas)] p-0.5 gap-0.5">
            {(["studio", "home"] as const).map((v) => {
              const active = v === activeTab;
              const disabled = editingVersion !== null && editingVersion !== v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => !editingVersion && setActiveTab(v)}
                  className={`flex min-h-[30px] flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-center text-sm font-semibold transition-colors ${
                    disabled ? "opacity-40 cursor-not-allowed" : ""
                  } ${
                    active
                      ? "bg-[var(--hub-sidebar-active)] text-rose shadow-sm"
                      : "text-[var(--color-body)] hover:text-foreground"
                  }`}
                >
                  {v === "studio" ? "Studio Version" : "Home Version"}
                </button>
              );
            })}
          </div>
          {editingVersion && (
            <p className="text-xs text-muted-foreground">
              Locked to {editingVersion === "studio" ? "Studio" : "Home"} while editing — the other version is independent and won&rsquo;t change.
            </p>
          )}
        </div>

        {(["studio", "home"] as const).map((version) =>
          activeTab === version ? (
            <div key={version} className="space-y-6">
              {editingVersion === version ? (
                <SessionEditor
                  version={version}
                  data={
                    session.data?.versions?.[version] || { warm_up: [], main_block: [], cooldown: [] }
                  }
                  onSaved={(updated) => saveSessionEdit(version, updated)}
                  onCancel={() => setEditingVersion(null)}
                />
              ) : (
                <>
                  <SessionSection
                    title="Warm-up"
                    exercises={session.data?.versions?.[version]?.warm_up || []}
                    versionKey={version}
                    sectionKey="warm_up"
                    session={session}
                    onUpdateSession={setSession}
                    setLogs={setLogs}
                    onSaveSetLog={saveSetLog}
                  />
                  <SessionSection
                    title="Main Block"
                    exercises={session.data?.versions?.[version]?.main_block || []}
                    versionKey={version}
                    sectionKey="main_block"
                    session={session}
                    onUpdateSession={setSession}
                    setLogs={setLogs}
                    onSaveSetLog={saveSetLog}
                  />
                  <SessionSection
                    title="Cool-down"
                    exercises={session.data?.versions?.[version]?.cooldown || []}
                    versionKey={version}
                    sectionKey="cooldown"
                    session={session}
                    onUpdateSession={setSession}
                    setLogs={setLogs}
                    onSaveSetLog={saveSetLog}
                  />
                </>
              )}
            </div>
          ) : null
        )}
      </div>

      <HubCard>
        <HubCardHeader
          icon={<IconActivity className="w-4 h-4" />}
          title="Session Log"
          color="teal"
          action={currentLog?.completed_at ? (
            <Badge className="bg-teal/15 text-teal border-teal/20 rounded-full gap-1">
              <IconCheckCircle className="w-3 h-3" />
              Completed {new Date(currentLog.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </Badge>
          ) : undefined}
        />
        <div className="space-y-3">
          {editingLog ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">RPE (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rpe}
                    onChange={(e) => setRpe(e.target.value)}
                    className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm"
                    placeholder="e.g. 7"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Fatigue</label>
                  <select
                    value={fatigue ?? ""}
                    onChange={(e) => setFatigue((e.target.value || null) as SessionLog["fatigue"])}
                    className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm bg-background"
                  >
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <Textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={3} placeholder="How the session went, adjustments made, anything for next time..." />
              <div className="flex gap-2">
                <Button onClick={() => saveLog(true)} disabled={savingLog} className="bg-rose hover:bg-rose/90 text-white gap-1.5 rounded-lg">
                  <IconCheckCircle className="w-4 h-4" />
                  Mark Complete & Save
                </Button>
                <Button variant="outline" onClick={() => saveLog(false)} disabled={savingLog} className="rounded-lg">Save Without Completing</Button>
                <Button variant="ghost" onClick={() => setEditingLog(false)} disabled={savingLog} className="rounded-lg">Cancel</Button>
              </div>
            </>
          ) : (
            <>
              {currentLog?.rpe != null || currentLog?.fatigue || currentLog?.notes ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  {currentLog.rpe != null && <span>RPE: <span className="font-medium text-foreground">{currentLog.rpe}/10</span></span>}
                  {currentLog.fatigue && <span className="capitalize">Fatigue: <span className="font-medium text-foreground">{currentLog.fatigue}</span></span>}
                  {currentLog.notes && <p className="w-full text-muted-foreground whitespace-pre-wrap">{currentLog.notes}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not logged yet.</p>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditingLog(true)} className="rounded-lg">
                {currentLog?.completed_at ? "Edit Log" : "Log This Session"}
              </Button>
            </>
          )}
        </div>
      </HubCard>

      <HubCard>
        <HubCardHeader
          icon={<IconFileText className="w-4 h-4" />}
          title="Coaching Notes"
        />
        <div className="space-y-3">
          {editingNotes ? (
            <>
              <Textarea value={coachingNotes} onChange={(e) => setCoachingNotes(e.target.value)} rows={4} />
              <div className="flex gap-2">
                <Button onClick={saveNotes} className="rounded-lg">Save</Button>
                <Button variant="outline" onClick={() => setEditingNotes(false)} className="rounded-lg">Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap">{coachingNotes || "No notes yet"}</p>
              <Button variant="outline" size="sm" onClick={() => setEditingNotes(true)} className="rounded-lg">Edit Notes</Button>
            </>
          )}
        </div>
      </HubCard>
    </div>
  );
}

interface ExerciseGroup {
  label: string;
  exercises: { exercise: Exercise; index: number }[];
}

/** Groups a list of exercises into consecutive runs by group_label, keeping original array indices.
 * Ungrouped exercises fall under "Main Block". If every exercise is ungrouped, returns a single
 * group with an empty label so the caller can skip rendering section headers for legacy data. */
function groupExercisesWithIndex(exercises: Exercise[]): ExerciseGroup[] {
  const allUngrouped = exercises.every((ex) => !ex.group_label);
  if (allUngrouped) {
    return [{ label: "", exercises: exercises.map((exercise, index) => ({ exercise, index })) }];
  }
  const groups: ExerciseGroup[] = [];
  exercises.forEach((exercise, index) => {
    const label = exercise.group_label || "Main Block";
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.exercises.push({ exercise, index });
    } else {
      groups.push({ label, exercises: [{ exercise, index }] });
    }
  });
  return groups;
}

function isSuperset(label: string): boolean {
  return label.toLowerCase().startsWith("superset");
}

interface SetLogSavePayload {
  exercise_ref: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  completed: boolean;
}

function SessionSection({
  title,
  exercises,
  versionKey,
  sectionKey,
  session,
  onUpdateSession,
  setLogs,
  onSaveSetLog,
}: {
  title: string;
  exercises: Exercise[];
  versionKey: string;
  sectionKey: string;
  session: DBSession;
  onUpdateSession: (s: DBSession) => void;
  setLogs: Record<string, SetLog>;
  onSaveSetLog: (payload: SetLogSavePayload) => Promise<boolean>;
}) {
  const [editingUrl, setEditingUrl] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [swapping, setSwapping] = useState<number | null>(null);
  const [loggingOpen, setLoggingOpen] = useState<number | null>(null);

  if (exercises.length === 0) {
    return (
      <Card className="shadow-sm bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)]">
        <CardContent className="flex items-center justify-between py-4">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">No exercises in this section.</p>
        </CardContent>
      </Card>
    );
  }

  const updateExerciseMedia = async (idx: number, videoUrl: string) => {
    const updatedData = { ...session.data };
    const exercise = (updatedData.versions as any)[versionKey][sectionKey][idx] as Exercise;
    exercise.media = { ...exercise.media, video_url: videoUrl };
    (updatedData.versions as any)[versionKey][sectionKey][idx] = exercise;

    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatedData }),
    });

    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }

    onUpdateSession({ ...session, data: updatedData });
    toast.success("Video saved");
    setEditingUrl(null);
    setUrlInput("");
  };

  const searchYoutube = (name: string) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise")}`;
    window.open(url, "_blank");
  };

  const handleSwapExercise = async (idx: number, selected: ExerciseEntry) => {
    const updatedData = { ...session.data };
    const exercise = (updatedData.versions as any)[versionKey][sectionKey][idx] as Exercise;
    exercise.exercise_name = selected.name;
    exercise.coaching_cue = selected.coaching_cue;
    exercise.modification = selected.default_mod;
    exercise.equipment = selected.equipment;
    if (selected.image_url || selected.video_url) {
      exercise.media = {
        ...exercise.media,
        ...(selected.image_url ? { image_url: selected.image_url } : {}),
        ...(selected.video_url ? { video_url: selected.video_url } : {}),
      };
    }
    (updatedData.versions as any)[versionKey][sectionKey][idx] = exercise;

    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatedData }),
    });

    if (!res.ok) {
      toast.error("Failed to swap exercise");
      return;
    }

    onUpdateSession({ ...session, data: updatedData });
    toast.success(`Swapped to ${selected.name}`);
  };

  return (
    <Card className="bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)] shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="text-xs text-muted-foreground">
          {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--hub-hover)]">
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Exercise</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sets</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Reps</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tempo</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Rest</th>
                <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {(sectionKey === "main_block"
                ? groupExercisesWithIndex(exercises)
                : [{ label: "", exercises: exercises.map((exercise, index) => ({ exercise, index })) }]
              ).map((group, gi) => (
                <Fragment key={`group-${gi}`}>
                  {group.label && (
                    <tr>
                      <td
                        colSpan={6}
                        className="bg-rose/5 text-rose text-xs font-semibold uppercase tracking-wide px-4 py-1.5"
                      >
                        {group.label}
                        {isSuperset(group.label) && group.exercises.length > 1 && (
                          <span className="normal-case font-normal text-muted-foreground">
                            {" "}
                            — perform together, rest after the pair
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                  {group.exercises.map(({ exercise: ex, index: i }) => {
                const hasDetail = Boolean(ex.coaching_cue || ex.modification);
                const superset = group.label ? isSuperset(group.label) : false;
                const exerciseRef = `${versionKey}:${sectionKey}:${i}:${ex.exercise_name}`;
                const totalSets = Math.max(1, ex.sets || 1);
                let loggedCount = 0;
                for (let s = 1; s <= totalSets; s++) {
                  if (setLogs[`${exerciseRef}::${s}`]) loggedCount++;
                }
                return (
                  <Fragment key={i}>
                    <tr className={hasDetail || editingUrl === i || loggingOpen === i ? "" : "border-b border-[var(--hub-border)]"}>
                      <td className={`px-4 py-2 align-top${superset ? " border-l-2 border-rose/30" : ""}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{ex.exercise_name}</p>
                          <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            isTimeBasedReps(ex.reps, ex.log_type)
                              ? "border-teal/20 bg-teal/10 text-teal"
                              : "border-rose/20 bg-rose/5 text-rose"
                          }`}>
                            {isTimeBasedReps(ex.reps, ex.log_type) ? "Time" : "Reps & wt"}
                          </span>
                        </div>
                        {ex.equipment?.length > 0 && (
                          <p className="text-[11px] text-muted-foreground">{ex.equipment.join(", ")}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 align-top text-sm tabular-nums whitespace-nowrap">{ex.sets ?? "—"}</td>
                      <td className="px-4 py-2 align-top text-sm tabular-nums whitespace-nowrap">{ex.reps ?? "—"}</td>
                      <td className="px-4 py-2 align-top text-sm tabular-nums whitespace-nowrap">{ex.tempo || "—"}</td>
                      <td className="px-4 py-2 align-top text-sm tabular-nums whitespace-nowrap">{ex.rest || "—"}</td>
                      <td className="px-4 py-2 align-top">
                        <div className="flex items-center justify-end gap-1">
                          {ex.media?.video_url ? (
                            <>
                              <a
                                href={ex.media.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Watch video"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rose hover:bg-[var(--hub-hover)]"
                              >
                                <IconVideo className="h-3.5 w-3.5" />
                              </a>
                              <button
                                title="Change video"
                                onClick={() => {
                                  setEditingUrl(editingUrl === i ? null : i);
                                  setUrlInput(ex.media?.video_url || "");
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
                              >
                                <IconPencil className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              title="Add video"
                              onClick={() => {
                                setEditingUrl(editingUrl === i ? null : i);
                                setUrlInput("");
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rose hover:bg-[var(--hub-hover)]"
                            >
                              <IconVideo className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            title="Search YouTube"
                            onClick={() => searchYoutube(ex.exercise_name)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
                          >
                            <IconSearch className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Swap exercise"
                            onClick={() => setSwapping(swapping === i ? null : i)}
                            className="inline-flex h-7 items-center justify-center rounded-lg px-2 text-xs font-medium text-rose hover:bg-[var(--hub-hover)]"
                          >
                            Swap
                          </button>
                          <button
                            title="Log sets"
                            onClick={() => setLoggingOpen(loggingOpen === i ? null : i)}
                            className={`inline-flex h-7 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium hover:bg-[var(--hub-hover)] ${
                              loggedCount > 0 ? "text-teal" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {loggedCount > 0 && <IconCheckCircle className="h-3 w-3" />}
                            Log{loggedCount > 0 ? ` ${loggedCount}/${totalSets}` : ""}
                          </button>
                        </div>
                        {swapping === i && (
                          <SwapExerciseDialog
                            open={swapping === i}
                            onOpenChange={(open) => { if (!open) setSwapping(null); }}
                            onSelect={(selected) => handleSwapExercise(i, selected)}
                          />
                        )}
                      </td>
                    </tr>
                    {hasDetail && (
                      <tr key={`detail-${i}`} className={editingUrl === i ? "" : "border-b border-[var(--hub-border)]"}>
                        <td colSpan={6} className="px-4 pb-2 text-xs">
                          <span className="text-muted-foreground">
                            {ex.coaching_cue && <span className="italic">Cue: {ex.coaching_cue}</span>}
                            {ex.coaching_cue && ex.modification && " · "}
                            {ex.modification && (
                              <span className="text-[var(--status-warning)]">Mod: {ex.modification}</span>
                            )}
                          </span>
                        </td>
                      </tr>
                    )}
                    {editingUrl === i && (
                      <tr key={`edit-${i}`} className="border-b border-[var(--hub-border)]">
                        <td colSpan={6} className="px-4 pb-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              placeholder="YouTube or video URL..."
                              className="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs"
                              onKeyDown={(e) => e.key === "Enter" && updateExerciseMedia(i, urlInput.trim())}
                            />
                            <button
                              onClick={() => updateExerciseMedia(i, urlInput.trim())}
                              className="rounded-md bg-rose px-2 py-1 text-xs text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingUrl(null); setUrlInput(""); }}
                              className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {loggingOpen === i && (
                      <tr key={`log-${i}`} className="border-b border-[var(--hub-border)]">
                        <td colSpan={6} className="px-4 pb-3">
                          <ExerciseSetLogger
                            exercise={ex}
                            exerciseRef={exerciseRef}
                            setLogs={setLogs}
                            onSave={onSaveSetLog}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** True when the prescription is time-based rather than rep-based — checks the
 * explicit log_type field first; falls back to a regex heuristic on the reps string
 * for legacy sessions that predate the field (e.g. "30s", "45 sec each side", "1 min"). */
function isTimeBasedReps(reps: string, logType?: "reps" | "time"): boolean {
  if (logType === "time") return true;
  if (logType === "reps") return false;
  return /\d\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i.test(reps || "");
}

function parsePrescribedSeconds(reps: string): number | null {
  const m = (reps || "").match(/(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return /^m/i.test(m[2]) ? n * 60 : n;
}

/** First number in the prescription's reps string ("8-10" → 8, "AMRAP" → null). */
function parsePrescribedReps(reps: string): number | null {
  const m = (reps || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** Per-set quick-log control — one row per prescribed set, sized for one-handed use
 * on a phone mid-session. Tap ✓ with the inputs empty to log the set exactly as
 * prescribed; type first to log what actually happened. ✗ logs the set as skipped.
 * Already-logged sets stay editable — change a value and tap ✓ (or ✗) again. */
function ExerciseSetLogger({
  exercise,
  exerciseRef,
  setLogs,
  onSave,
}: {
  exercise: Exercise;
  exerciseRef: string;
  setLogs: Record<string, SetLog>;
  onSave: (payload: SetLogSavePayload) => Promise<boolean>;
}) {
  const totalSets = Math.max(1, exercise.sets || 1);
  const timeBased = isTimeBasedReps(exercise.reps, exercise.log_type);
  const prescribedSeconds = parsePrescribedSeconds(exercise.reps);
  const prescribedReps = parsePrescribedReps(exercise.reps);

  const [drafts, setDrafts] = useState<Record<number, { main: string; weight: string }>>(() => {
    const init: Record<number, { main: string; weight: string }> = {};
    for (let s = 1; s <= totalSets; s++) {
      const log = setLogs[`${exerciseRef}::${s}`];
      init[s] = {
        main: log
          ? timeBased
            ? log.duration_seconds != null ? String(log.duration_seconds) : ""
            : log.reps != null ? String(log.reps) : ""
          : "",
        weight: log?.weight_kg != null ? String(log.weight_kg) : "",
      };
    }
    return init;
  });
  const [savingSet, setSavingSet] = useState<number | null>(null);

  const save = async (setNumber: number, completed: boolean) => {
    const draft = drafts[setNumber] ?? { main: "", weight: "" };
    const mainVal = draft.main.trim() === "" ? null : Number(draft.main);
    const weightVal = draft.weight.trim() === "" ? null : Number(draft.weight);
    // Empty main input on a done set falls back to the prescription — one tap logs "as prescribed".
    const reps = timeBased ? null : mainVal ?? (completed ? prescribedReps : null);
    const duration = timeBased ? mainVal ?? (completed ? prescribedSeconds : null) : null;
    setSavingSet(setNumber);
    await onSave({
      exercise_ref: exerciseRef,
      set_number: setNumber,
      reps: reps != null && Number.isFinite(reps) ? Math.round(reps) : null,
      weight_kg: weightVal != null && Number.isFinite(weightVal) ? weightVal : null,
      duration_seconds: duration != null && Number.isFinite(duration) ? Math.round(duration) : null,
      completed,
    });
    setSavingSet(null);
  };

  return (
    <div className="rounded-xl bg-[var(--hub-hover)] p-3 space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Log sets · prescribed {exercise.sets ?? 1} × {exercise.reps || "—"}
      </p>
      {Array.from({ length: totalSets }, (_, idx) => idx + 1).map((setNumber) => {
        const log = setLogs[`${exerciseRef}::${setNumber}`];
        const draft = drafts[setNumber] ?? { main: "", weight: "" };
        const saving = savingSet === setNumber;
        return (
          <div key={setNumber} className="flex flex-wrap items-center gap-2">
            <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">Set {setNumber}</span>
            <input
              type="text"
              inputMode="numeric"
              value={draft.main}
              onChange={(e) => setDrafts((p) => ({ ...p, [setNumber]: { ...draft, main: e.target.value } }))}
              placeholder={timeBased ? (prescribedSeconds != null ? `${prescribedSeconds}s` : exercise.reps || "secs") : exercise.reps || "reps"}
              aria-label={timeBased ? `Set ${setNumber} duration in seconds` : `Set ${setNumber} reps`}
              className="h-11 w-20 min-w-0 rounded-lg border border-border/60 bg-background px-2 text-center text-sm tabular-nums"
            />
            <input
              type="text"
              inputMode="decimal"
              value={draft.weight}
              onChange={(e) => setDrafts((p) => ({ ...p, [setNumber]: { ...draft, weight: e.target.value } }))}
              placeholder="kg"
              aria-label={`Set ${setNumber} weight in kg (leave blank if not applicable)`}
              className="h-11 w-20 min-w-0 rounded-lg border border-border/60 bg-background px-2 text-center text-sm tabular-nums"
            />
            <button
              title="Done"
              disabled={saving}
              onClick={() => save(setNumber, true)}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                log && log.completed
                  ? "border-teal/30 bg-teal/15 text-teal"
                  : "border-border/60 bg-background text-muted-foreground hover:border-teal/40 hover:text-teal"
              }`}
            >
              <IconCheck className="h-5 w-5" />
            </button>
            <button
              title="Skip"
              disabled={saving}
              onClick={() => save(setNumber, false)}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                log && !log.completed
                  ? "border-rose/30 bg-rose/10 text-rose"
                  : "border-border/60 bg-background text-muted-foreground hover:border-rose/40 hover:text-rose"
              }`}
            >
              <IconX className="h-5 w-5" />
            </button>
            <span className="text-[11px] text-muted-foreground">
              {log ? (log.completed ? "Done" : "Skipped") : ""}
            </span>
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground">
        Tap ✓ with the boxes empty to log as prescribed. Weight is optional — leave blank for bodyweight moves.
      </p>
    </div>
  );
}
