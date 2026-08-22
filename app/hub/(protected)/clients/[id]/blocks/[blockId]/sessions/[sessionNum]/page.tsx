"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconChevronLeft, IconChevronRight, IconCheckCircle, IconActivity, IconFileText, IconEdit3, IconCopy, IconClock } from "@/components/icons";
import { HubCardHeader } from "@/components/hub/HubCardHeader";
import { HubCard } from "@/components/hub/HubCard";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import { deriveSessionStatus } from "@/lib/session-status";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { DBSession, SessionLog, SessionVersion, SetLog } from "@/types";
import { SessionEditor } from "./SessionEditor";
import { SessionWorkoutLog } from "./SessionWorkoutLog";
import { estimateSessionSeconds, formatDurationEstimate } from "@/lib/prescription";

// Minimal shape of the client record this header needs — the GET /api/clients/[id]
// response returns the full client, but only these fields feed the subtitle line.
type ClientHeader = {
  name?: string | null;
  profile?: { health?: { conditions?: string[] } } | null;
  session_duration?: number | null;
};

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
  // Client record for the header subtitle (name / condition / session duration) —
  // this page previously never fetched the client at all (CR-EF-062).
  const [client, setClient] = useState<ClientHeader | null>(null);
  // Consolidated screen mode — "log" is the quick logger, "edit" is the prescription editor.
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"log" | "edit">("log");
  const [activeTab, setActiveTab] = useState<"studio" | "home">("studio");
  const [modeInitDone, setModeInitDone] = useState(false);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const sessionNum = parseInt(params.sessionNum);

  useEffect(() => {
    async function load() {
      const [sessionRes, countRes, bestWeightsRes, clientRes] = await Promise.all([
        fetch(`/api/blocks/${params.blockId}/sessions?session_number=${sessionNum}`),
        fetch(`/api/blocks/${params.blockId}/sessions?count=true`),
        fetch(`/api/clients/${params.id}/best-weights`),
        fetch(`/api/clients/${params.id}`),
      ]);
      if (clientRes.ok) {
        setClient(await clientRes.json());
      }
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
  }, [params.id, params.blockId, sessionNum, refreshKey]);

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

  // Derived live estimate of the session duration (CR-EF-037 — Lane C): per-set
  // work time plus rest, computed from the prescription on every render so edits
  // to sets/reps/tempo/rest move the figure live. Coaching, setup and changeover
  // are deliberately excluded, so it reads under the booked slot.
  const estSeconds = useMemo(
    () =>
      estimateSessionSeconds(
        session?.data?.versions?.[activeTab] ?? { warm_up: [], main_block: [], cooldown: [] },
      ),
    [session?.data?.versions, activeTab],
  );

  const handleReopen = async () => {
    if (!session) return;
    setReopening(true);
    const res = await fetch(`/api/sessions/${session.id}/reopen`, { method: "POST" });
    setReopening(false);
    if (!res.ok) {
      toast.error("Failed to reopen session");
      return;
    }
    setShowReopen(false);
    setRefreshKey((k) => k + 1);
    toast.success("Session reopened — changes are audited from here.");
  };

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

  // Session is named by its focus_label, never a bare "Session N" (CR-EF-034) —
  // matching the block page and the consolidated mockup header.
  const focusLabel = session.data?.focus_label || `Session ${sessionNum}`;
  // First-class `status` column is the source of truth; derive defensively only
  // as a fallback for legacy rows created before the Phase 1 backfill.
  const status = deriveSessionStatus({
    status: session.status,
    cancelled_at: session.cancelled_at,
    completed_at: session.completed_at,
    scheduled_at: session.scheduled_at,
    session_log: session.data?.session_log,
  });

  // Header subtitle — client name · condition · date · duration slot (CR-EF-062).
  // Null-handling mirrors the block page: condition is `conditions?.[0]` and may be
  // absent for clients with no declared condition; scheduled_at may be null for
  // unscheduled sessions, in which case the date segment is omitted entirely.
  const clientName = client?.name || "Client";
  const clientCondition = client?.profile?.health?.conditions?.[0] ?? null;
  const sessionSlotMinutes = client?.session_duration ?? 60;
  // Flag when the derived estimate already runs past the booked slot, so the chip
  // reads as an amber warning instead of a neutral figure.
  const overSlot = estSeconds > sessionSlotMinutes * 60;
  const dateLabel = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
          Back to Block
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">{focusLabel}</h1>
              <SessionStatusPill status={status} />
            </div>
            <p className="text-muted-foreground">
              {clientName}
              {clientCondition ? ` · ${clientCondition}` : ""}
              {dateLabel ? ` · ${dateLabel}` : ""}
              {` · ${sessionSlotMinutes} min slot`}
              {totalSessions > 0 ? ` · Session ${sessionNum} of ${totalSessions}` : ""}{" "}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${
                  overSlot
                    ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                    : "border-[var(--hub-border)] bg-[var(--hub-hover)] text-muted-foreground"
                }`}
                title={`Estimated from the prescription — work time plus rest. Excludes coaching, setup and changeover${
                  overSlot ? `, and already runs past the ${sessionSlotMinutes}-minute slot` : ""
                }.`}
              >
                <IconClock className="h-3.5 w-3.5" />
                Est. {formatDurationEstimate(estSeconds)}
              </span>
            </p>
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

      {session.status === "completed" && (
        <div className="flex items-start gap-3 rounded-[12px] border border-teal/20 bg-teal/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
          <span className="mt-0.5 flex-shrink-0 text-teal"><IconCheckCircle className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <b>Session completed — read-only</b>
            <br />
            Logged sets, prescription and summary are locked so a finished workout can&rsquo;t be re-logged by accident. Reopening is the only way to change anything, and it&rsquo;s audited.
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 rounded-lg" onClick={() => setShowReopen(true)}>
            Reopen session
          </Button>
        </div>
      )}

      {session.data?.client_intro && (
        <Card className="shadow-sm border-rose/20 bg-rose/5 rounded-[16px]">
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

      {showReopen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--hub-sidebar)]/50 p-5 backdrop-blur-[2px]" onClick={() => setShowReopen(false)}>
          <div className="w-full max-w-[400px] rounded-[20px] bg-[var(--hub-card)] p-7 shadow-[0_24px_64px_rgba(16,24,40,.24)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-rose/10 text-rose">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h3 className="mb-1.5 text-lg font-extrabold text-foreground">Reopen this session?</h3>
            <p className="mb-5 text-[13.5px] text-muted-foreground">
              This lets the logged data and the prescription be changed again.
            </p>
            <p className="mb-5 text-[13.5px] text-muted-foreground">
              Reopening is recorded and audited, so it stays clear that a finished session was changed after completion.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setShowReopen(false)} className="inline-flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] px-[18px] text-sm font-bold text-foreground hover:bg-[var(--hub-hover)]">
                Keep it read-only
              </button>
              <button type="button" onClick={handleReopen} disabled={reopening} className="inline-flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[10px] px-[18px] text-sm font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] disabled:cursor-not-allowed disabled:opacity-50">
                Reopen session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
