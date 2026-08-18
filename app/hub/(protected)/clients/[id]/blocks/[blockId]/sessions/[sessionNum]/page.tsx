"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChevronLeft, IconChevronRight, IconCheckCircle, IconActivity, IconFileText, IconEdit3, IconCopy, IconClock } from "@/components/icons";
import { HubCardHeader } from "@/components/hub/HubCardHeader";
import { HubCard } from "@/components/hub/HubCard";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { DBSession, SessionLog, SessionVersion, SetLog } from "@/types";
import { SessionEditor } from "./SessionEditor";
import { SessionWorkoutLog } from "./SessionWorkoutLog";
import { sessionDurationMinutes } from "@/lib/scheduling";

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
  // Per-set logs keyed by `${exercise_ref}::${set_number}` — initial data for the logger.
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>({});
  // Client's best-ever weight per exercise (from personal_records) — prefills a set's
  // weight field when this session has no log for it yet, so weight carries forward.
  const [bestWeights, setBestWeights] = useState<Record<string, number>>({});
  // Consolidated screen mode — "log" is the quick logger, "edit" is the prescription editor.
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"log" | "edit">("log");
  const [activeTab, setActiveTab] = useState<"studio" | "home">("studio");
  const [modeInitDone, setModeInitDone] = useState(false);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const sessionNum = parseInt(params.sessionNum);

  useEffect(() => {
    async function load() {
      const [sessionRes, countRes, bestWeightsRes] = await Promise.all([
        fetch(`/api/blocks/${params.blockId}/sessions?session_number=${sessionNum}`),
        fetch(`/api/blocks/${params.blockId}/sessions?count=true`),
        fetch(`/api/clients/${params.id}/best-weights`),
      ]);
      if (bestWeightsRes.ok) {
        setBestWeights(await bestWeightsRes.json());
      }
      if (sessionRes.ok) {
        const data = await sessionRes.json();
        setSession(data);
        setCoachingNotes(data?.data?.coaching_notes || "");
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
  }, [params.id, params.blockId, sessionNum]);

  // Legacy entry points land here with ?edit=1 (block overview's "Edit session") or
  // ?mode=edit (the retired /hub/log redirect) — both open straight into the editor.
  useEffect(() => {
    if (modeInitDone || !session) return;
    const editParam = searchParams.get("edit");
    const modeParam = searchParams.get("mode");
    if (editParam === "1" || modeParam === "edit") {
      setMode("edit");
    }
    setModeInitDone(true);
  }, [searchParams, modeInitDone, session]);

  // Browser tab title mirrors the header name (CR-EF-034) — "Workout A", not
  // "Session 3".
  useEffect(() => {
    if (!session) return;
    document.title = session.data?.focus_label || `Session ${sessionNum}`;
  }, [session, sessionNum]);

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
  const completedAt: string | null = currentLog?.completed_at ?? null;
  const startedAt: string | null = currentLog?.started_at ?? null;

  const handleSessionLogChange = (log: SessionLog) => {
    setSession((prev) => (prev ? { ...prev, data: { ...prev.data, session_log: log } } : prev));
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
    setMode("log");
    toast.success("Session saved");
    return true;
  };

  const setLogsArray = useMemo(() => Object.values(setLogs), [setLogs]);

  const handleSaveAsTemplate = async () => {
    if (!session || !templateName.trim()) return;
    setSavingTemplate(true);
    const versionData = session.data?.versions?.[activeTab];
    if (!versionData) { setSavingTemplate(false); return; }
    const res = await fetch("/api/workout-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateName.trim(),
        data: versionData,
        source_client_id: params.id,
        source_session_id: session.id,
      }),
    });
    setSavingTemplate(false);
    if (!res.ok) {
      toast.error("Failed to save template");
      return;
    }
    toast.success(`Template "${templateName.trim()}" saved`);
    setTemplateName("");
    setShowTemplateSave(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!session) return <div className="p-8 text-center text-muted-foreground">Session not found</div>;

  const archetypeNames: Record<string, string> = {
    A: "Mobility & Movement Quality",
    B: "Strength & Stability",
    C: "Power & Conditioning",
  };

  const durationMinutes = session.data?.estimated_minutes ?? sessionDurationMinutes(session.data?.time_tier);
  // Session is named by its focus_label, never a bare "Session N" (CR-EF-034) —
  // matching the block page and the consolidated mockup header.
  const focusLabel = session.data?.focus_label || `Session ${sessionNum}`;
  const statusBadge = completedAt ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-teal/20 bg-teal/10 px-2.5 py-0.5 text-xs font-semibold text-teal">
      <IconCheckCircle className="h-3 w-3" />
      Completed {new Date(completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
    </span>
  ) : startedAt ? (
    <span className="inline-flex items-center rounded-full border border-rose/20 bg-rose/5 px-2.5 py-0.5 text-xs font-semibold text-rose">
      In progress
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--status-neutral)]">
      Not started
    </span>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}`} className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">{focusLabel}</h1>
              <Badge variant="outline" className="text-sm">{session.archetype}</Badge>
              <span className="text-sm capitalize text-muted-foreground">Week {session.week} · {session.phase}</span>
              {statusBadge}
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[var(--hub-border)] bg-[var(--hub-hover)] px-2.5 py-0.5 text-[11.5px] font-semibold text-muted-foreground"
                title="A guide from the prescription — not a live countdown"
              >
                <IconClock className="h-3.5 w-3.5" />
                ~{durationMinutes} min · guide
              </span>
            </div>
            <p className="text-muted-foreground">{archetypeNames[session.archetype]} · Session {sessionNum}</p>
          </div>
          <div className="flex gap-2">
            {showTemplateSave ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name..."
                  className="h-9 w-48 rounded-lg border border-[var(--hub-field-border)] hover:border-[var(--hub-field-border-hover)] focus:border-rose focus:ring-2 focus:ring-rose/20 bg-[var(--hub-card)] px-3 text-sm outline-none transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
                  autoFocus
                />
                <Button
                  size="sm"
                  className="rounded-lg gap-1.5 bg-teal hover:bg-teal/90 text-white"
                  onClick={handleSaveAsTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                >
                  <IconCopy className="h-4 w-4" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => { setShowTemplateSave(false); setTemplateName(""); }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1.5"
                onClick={() => setShowTemplateSave(true)}
              >
                <IconCopy className="h-4 w-4" />
                Save as template
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
      </div>

      {session.data?.client_intro && (
        <Card className="shadow-sm border-rose/20 bg-rose/5 rounded-2xl">
          <CardContent className="pt-4">
            <p className="text-sm italic text-muted-foreground">Client intro</p>
            <p className="mt-1">{session.data.client_intro}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Mode segmented control ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-0.5 rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-1 shadow-sm" role="tablist" aria-label="Session mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "log"}
            onClick={() => setMode("log")}
            className={`inline-flex items-center gap-1.5 rounded-[7px] px-4 py-1.5 text-[13px] font-semibold transition-colors ${mode === "log" ? "bg-[var(--hub-sidebar-active)] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <IconActivity className="h-3.5 w-3.5" />
            Log session
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "edit"}
            onClick={() => setMode("edit")}
            className={`inline-flex items-center gap-1.5 rounded-[7px] px-4 py-1.5 text-[13px] font-semibold transition-colors ${mode === "edit" ? "bg-[var(--hub-sidebar-active)] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <IconEdit3 className="h-3.5 w-3.5" />
            Edit prescription
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {mode === "log" ? "Log what happened, or edit the prescription — both live here now." : "Editing the prescription — saves to this session only."}
        </span>
      </div>

      {/* ── Studio / Home version tabs ──────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex rounded-lg border border-[var(--color-muted-text)] bg-[var(--hub-canvas)] p-0.5 gap-0.5">
            {(["studio", "home"] as const).map((v) => {
              const active = v === activeTab;
              const disabled = mode === "edit" && v !== activeTab;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => setActiveTab(v)}
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
          {mode === "edit" && (
            <p className="text-xs text-muted-foreground">
              Locked to {activeTab === "studio" ? "Studio" : "Home"} while editing — the other version is independent and won&rsquo;t change.
            </p>
          )}
        </div>

        {mode === "edit" ? (
          <SessionEditor
            version={activeTab}
            data={session.data?.versions?.[activeTab] || { warm_up: [], main_block: [], cooldown: [] }}
            clientId={params.id}
            sessionId={session.id}
            onSaved={(updated) => saveSessionEdit(activeTab, updated)}
            onCancel={() => setMode("log")}
          />
        ) : (
          <SessionWorkoutLog
            sessionId={session.id}
            sessionNumber={sessionNum}
            version={activeTab}
            data={session.data}
            sessionLog={currentLog ?? null}
            setLogs={setLogsArray}
            bestWeights={bestWeights}
            onSessionLogChange={handleSessionLogChange}
          />
        )}
      </div>

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
