"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Session, SessionVersion, WorkoutTemplate } from "@/types";
import { blockDisplayName } from "@/lib/block-name";

const ICO = {
  back: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  exit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  chev: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  dumbbell: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5v11M17.5 6.5v11M3 10h1.5M3 14h1.5M19.5 10H21M19.5 14H21M9 10h6v4H9z" />
    </svg>
  ),
  tmpl: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
  block: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  plus: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3l14 9-14 9z" />
    </svg>
  ),
};

type Step = "source" | "template" | "block" | "scratch" | "preview";

interface ClientBlock {
  id: string;
  block_number: number;
  client_id: string;
  status: string;
  /** CR-EF-153 — Esther's own name for the block; blank falls back to its date span. */
  title?: string | null;
}

interface BlockWorkout {
  id: string;
  letter: string;
  name: string;
  emphasis: string;
  total: number;
}

interface SessionRow {
  id: string;
  block_id: string;
  data: Session;
  scheduled_at?: string | null;
  parent_session_id?: string | null;
}

interface PreviewData {
  name: string;
  exercises: { name: string; prescription: string }[];
  equipment: string[];
  source: "template" | "block";
  sourceId?: string;
  week?: number;
}

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function exercisePrescription(ex: { sets?: number; reps?: string }): string {
  const sets = ex.sets ?? 0;
  const reps = ex.reps || "";
  if (sets && reps) return `${sets} × ${reps}`;
  if (reps) return reps;
  return `${sets} sets`;
}

function collectPreview(version: SessionVersion): PreviewData["exercises"] {
  const all = [...(version.warm_up || []), ...(version.main_block || []), ...(version.cooldown || [])];
  return all.map((ex) => ({ name: ex.exercise_name, prescription: exercisePrescription(ex) }));
}

function collectEquipment(version: SessionVersion): string[] {
  const all = [...(version.warm_up || []), ...(version.main_block || []), ...(version.cooldown || [])];
  const set = new Set<string>();
  for (const ex of all) {
    for (const e of ex.equipment || []) {
      if (e) set.add(e);
    }
  }
  return Array.from(set).sort();
}

/**
 * Duration heuristic until real `estimated_minutes` fields exist:
 * ~4 minutes per exercise, which covers set-up, working sets and transitions
 * for a typical Esther session. Documented as an approximation.
 */
function estimateMinutes(exerciseCount: number): number {
  return Math.max(5, exerciseCount * 4);
}

export default function AddWorkoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientNumber = parseInt(params.id, 10);

  const initialStep: Step = (() => {
    const view = searchParams.get("view");
    if (view === "template" || view === "block" || view === "scratch") return view;
    return "source";
  })();

  const [step, setStep] = useState<Step>(initialStep);
  const [clientName, setClientName] = useState("");
  const [block, setBlock] = useState<ClientBlock | null>(null);
  const [blockLabel, setBlockLabel] = useState<string | null>(null);
  const [blockWorkouts, setBlockWorkouts] = useState<BlockWorkout[]>([]);
  const [week, setWeek] = useState(1);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateQuery, setTemplateQuery] = useState("");
  const [scratchName, setScratchName] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [targetDay, setTargetDay] = useState(toLocalISODate(new Date()));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientNumber) return;
    fetch(`/api/clients/${clientNumber}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (client) => {
        if (!client) return;
        setClientName(client.name || "");
        const blocks = (client._blocks ?? []) as ClientBlock[];
        const current = blocks.find((b) => b.status === "active") ?? blocks.find((b) => b.status === "approved") ?? blocks[0] ?? null;
        if (!current) return;
        setBlock(current);
        const sessionRes = await fetch(`/api/blocks/${current.id}/sessions`);
        const rows = sessionRes.ok ? ((await sessionRes.json()) as SessionRow[]) : [];
        // CR-EF-153 — single source of truth (lib/block-name.ts). Pot count
        // excludes supplementary sub-sessions, matching the desktop convention.
        setBlockLabel(
          blockDisplayName(
            current,
            rows,
            rows.filter((r) => !r.parent_session_id).length,
          ),
        );
        // `data.session_id` (inside the JSON blob) is a separate, unrelated
        // UUID minted at insert time -- sometimes even empty on older rows.
        // The real primary key every other route expects is the outer row's
        // `id`. Keep them paired rather than discarding the outer id here.
        const byArchetype = new Map<string, { id: string; data: Session }[]>();
        for (const r of rows) {
          const a = r.data.archetype ?? "?";
          const arr = byArchetype.get(a) ?? [];
          arr.push({ id: r.id, data: r.data });
          byArchetype.set(a, arr);
        }
        const out: BlockWorkout[] = [];
        const order = ["A", "B", "C", ...Array.from(byArchetype.keys()).filter((a) => !["A", "B", "C"].includes(a)).sort()];
        for (const a of order) {
          const list = byArchetype.get(a);
          if (!list) continue;
          out.push({
            id: list[0].id,
            letter: a,
            name: list[0].data.focus_label?.trim() || `Workout ${a}`,
            emphasis: list[0].data.focus_label?.trim() || "Session",
            total: list.length,
          });
        }
        setBlockWorkouts(out);
        const maxWeek = rows.reduce((m, r) => Math.max(m, r.data.week ?? 1), 1);
        setWeek(maxWeek);
      })
      .catch(() => {});
  }, [clientNumber]);

  useEffect(() => {
    if (step !== "template") return;
    fetch("/api/workout-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: WorkoutTemplate[]) => setTemplates(list))
      .catch(() => setTemplates([]));
  }, [step]);

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, templateQuery]);

  function previewFromTemplate(t: WorkoutTemplate) {
    const exercises = collectPreview(t.data);
    setPreview({
      name: t.name,
      exercises,
      equipment: collectEquipment(t.data),
      source: "template",
      sourceId: t.id,
    });
    setStep("preview");
  }

  async function previewFromBlock(id: string) {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) {
      toast.error("Could not load content");
      return;
    }
    const session = (await res.json()) as { id: string; data: Session };
    const data = session.data;
    const version = data.versions?.studio ?? data.versions?.home ?? { warm_up: [], main_block: [], cooldown: [] };
    const exercises = collectPreview(version);
    setPreview({
      name: data.focus_label?.trim() || `Workout ${data.archetype ?? ""}`.trim() || "Workout",
      exercises,
      equipment: collectEquipment(version),
      source: "block",
      sourceId: id,
    });
    setStep("preview");
  }

  async function createScratch() {
    if (!block) return;
    setBusy(true);
    try {
      const name = scratchName.trim() || "New template";
      // Unlike the template/block paths (which schedule to the chosen targetDay
      // via a follow-up PATCH), this create call had no scheduled_at at all —
      // the session existed but never appeared on the Today screen, which only
      // lists sessions with scheduled_at set. Default to today, matching the
      // rest of the flow's target-day default.
      const res = await fetch(`/api/blocks/${block.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, focus_label: name, scheduled_at: new Date(`${targetDay}T09:00:00`).toISOString() }),
      });
      const body = await res.json().catch(() => null) as { id?: string; error?: string } | null;
      if (!res.ok) throw new Error(body?.error || "Blank session failed");
      toast.success(`Created "${name}"`);
      router.push(`/hub/m/train/${body!.id}/edit`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create template");
      setBusy(false);
    }
  }

  async function confirmAdd(startNow = false) {
    if (!block || !preview) return;
    setBusy(true);
    try {
      let createdId: string | null = null;
      if (preview.source === "block" && preview.sourceId) {
        const res = await fetch(`/api/sessions/${preview.sourceId}/clone`, { method: "POST" });
        const body = await res.json().catch(() => null) as { id?: string; error?: string } | null;
        if (!res.ok) throw new Error(body?.error || "Clone failed");
        createdId = body!.id;
      } else if (preview.source === "template" && preview.sourceId) {
        const res = await fetch(`/api/blocks/${block.id}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template_id: preview.sourceId, week }),
        });
        const body = await res.json().catch(() => null) as { id?: string; error?: string } | null;
        if (!res.ok) throw new Error(body?.error || "Template add failed");
        createdId = body!.id;
      }

      // Place on the chosen day (or now if start now)
      const scheduledAt = startNow
        ? new Date().toISOString()
        : new Date(`${targetDay}T09:00:00`).toISOString();
      const patch = await fetch(`/api/sessions/${createdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: scheduledAt }),
      });
      if (!patch.ok) {
        const msg = await patch.json().then((b) => b?.error).catch(() => null);
        throw new Error(msg || "Scheduling failed");
      }

      toast.success(startNow ? `Started "${preview.name}"` : `Added "${preview.name}" to ${fmtDay(targetDay)}`);

      if (startNow) {
        router.push(`/hub/m/train/${createdId}`);
      } else {
        router.push(`/hub/m/clients/${clientNumber}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add workout");
      setBusy(false);
    }
  }

  const exerciseCount = preview?.exercises.length ?? 0;
  const duration = estimateMinutes(exerciseCount);

  return (
    <>
      <header className="mtop">
        <div className="mtop-row">
          <Link className="mtop-back" href={`/hub/m/clients/${clientNumber}`} aria-label="Back">
            {ICO.back}
          </Link>
          <div className="mtop-id">
            <div className="mtop-t">Add workout</div>
            <div className="mtop-s">{clientName || "…"}</div>
          </div>
        </div>
      </header>

      <div className="scope-bar">
        <span className="scope-av">{initialsFor(clientName || "?")}</span>
        <div className="scope-txt">
          <div className="scope-lbl">Adding for client</div>
          <div className="scope-name">{clientName || "…"}</div>
        </div>
        <Link className="scope-exit" href="/hub/m/clients">
          {ICO.exit}
          Exit
        </Link>
      </div>

      <main className="mcontent">
        {step === "source" && (
          <section className="pane on">
            <h1 className="step-title" style={{ margin: "0 0 2px" }}>
              Add workout
            </h1>
            <p className="step-sub" style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Pick where the workout comes from. You&apos;ll review it before it&apos;s added.
            </p>

            <button className="src" onClick={() => setStep("template")}>
              <span className="src-ic">{ICO.tmpl}</span>
              <span>
                <span className="src-t">From the template library</span>
                <span className="src-d">Reuse a saved template — search and assign to a day.</span>
              </span>
              <span className="src-chev">{ICO.chev}</span>
            </button>

            <button className="src" onClick={() => setStep("block")} disabled={blockWorkouts.length === 0}>
              <span className="src-ic">{ICO.block}</span>
              <span>
                <span className="src-t">From this client&apos;s block</span>
                <span className="src-d">
                  {block ? `Clone a workout from ${clientName ? `${clientName}'s ` : ""}${blockLabel ?? `Block ${block.block_number}`}.` : "No block available."}
                </span>
              </span>
              <span className="src-chev">{ICO.chev}</span>
            </button>

            <button className="src" onClick={() => setStep("scratch")}>
              <span className="src-ic">{ICO.plus}</span>
              <span>
                <span className="src-t">Build from scratch</span>
                <span className="src-d">Start an empty template — name it, then edit exercises.</span>
              </span>
              <span className="src-chev">{ICO.chev}</span>
            </button>
          </section>
        )}

        {step === "template" && (
          <section className="pane on">
            <h1 className="step-title" style={{ margin: "0 0 2px" }}>
              Template library
            </h1>
            <p className="step-sub" style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Search saved templates, then review before adding.
            </p>
            <div className="notes-search" style={{ marginBottom: 12 }}>
              <input
                type="search"
                placeholder="Search templates…"
                value={templateQuery}
                onChange={(e) => setTemplateQuery(e.target.value)}
              />
            </div>
            {filteredTemplates.length === 0 ? (
              <div className="t-empty">No templates match your search.</div>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  className="witem"
                  onClick={() => previewFromTemplate(t)}
                >
                  <span className="witem-av">
                    <em>{t.archetypes?.[0] || "T"}</em>
                  </span>
                  <span className="witem-b">
                    <span className="witem-t">{t.name}</span>
                    <span className="witem-m">{t.archetypes?.join(", ") || "Template"}</span>
                  </span>
                  <span className="witem-chev">{ICO.chev}</span>
                </button>
              ))
            )}
          </section>
        )}

        {step === "block" && (
          <section className="pane on">
            <h1 className="step-title" style={{ margin: "0 0 2px" }}>
              {block ? (blockLabel ?? `Block ${block.block_number}`) : "This client's block"}
            </h1>
            <p className="step-sub" style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Clone a workout from this client&apos;s current block.
            </p>
            <div className="wlist">
              {blockWorkouts.map((w) => (
                <button
                  key={w.id}
                  className="witem"
                  onClick={() => previewFromBlock(w.id)}
                >
                  <span className="witem-av">
                    <em>{w.letter}</em>
                  </span>
                  <span className="witem-b">
                    <span className="witem-t">{w.name}</span>
                    <span className="witem-m">
                      {w.emphasis} · {w.total} in block
                    </span>
                  </span>
                  <span className="witem-chev">{ICO.chev}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "scratch" && (
          <section className="pane on">
            <h1 className="step-title" style={{ margin: "0 0 2px" }}>
              Build from scratch
            </h1>
            <p className="step-sub" style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Name it, then add exercises in the editor.
            </p>
            <div className="bs-panel">
              <div className="bs-row">
                <input
                  className="bs-input"
                  placeholder="Template name, e.g. Home — band circuit"
                  value={scratchName}
                  onChange={(e) => setScratchName(e.target.value)}
                />
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={createScratch}
              disabled={busy || !block}
              style={{ width: "100%", marginTop: 12 }}
            >
              {busy ? "Creating…" : "Create template"}
            </button>
          </section>
        )}

        {step === "preview" && preview && (
          <section className="pane on">
            <h1 className="step-title" style={{ margin: "0 0 2px" }}>
              Review before adding
            </h1>
            <p className="step-sub" style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              {preview.name} will land on <b style={{ color: "var(--ink)" }}>{fmtDay(targetDay)}</b>.
            </p>

            <div className="preview-card">
              <div className="pc-h">
                <div className="pc-t">{preview.name}</div>
                <div className="pc-meta">
                  <span className="pc-chip">{ICO.clock}Est. {duration} min</span>
                  <span className="pc-chip">{ICO.dumbbell}{exerciseCount} exercises</span>
                  {preview.equipment.map((eq) => (
                    <span key={eq} className="pc-chip">{ICO.dumbbell}{eq}</span>
                  ))}
                </div>
              </div>
              <div className="pc-b">
                {preview.exercises.length === 0 ? (
                  <div className="ex-row">
                    <span className="ex-b">
                      <span className="ex-t">Empty workout</span>
                      <span className="ex-p">Add exercises after it&apos;s created.</span>
                    </span>
                  </div>
                ) : (
                  preview.exercises.map((ex, i) => (
                    <div key={i} className="ex-row">
                      <span className="ex-n">{i + 1}</span>
                      <span className="ex-b">
                        <span className="ex-t">{ex.name}</span>
                        <span className="ex-p">{ex.prescription}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bs-panel" style={{ marginBottom: 12 }}>
              <label className="field-l" style={{ display: "block", marginBottom: 8 }}>
                Target day
              </label>
              <input
                type="date"
                className="bs-input"
                value={targetDay}
                onChange={(e) => setTargetDay(e.target.value)}
              />
            </div>

            <div className="note" style={{ marginTop: 12 }}>
              <span className="note-b">i</span>
              <div>
                <b>Targets this day.</b> If the day already has a session, this sits alongside it — a two-session day is fine.
              </div>
            </div>
          </section>
        )}
      </main>

      {step === "preview" && preview && (
        <div className="confirmbar">
          <div className="confirm-row">
            <button className="btn btn-ghost" onClick={() => confirmAdd(true)} disabled={busy}>
              {ICO.play}
              Start now
            </button>
            <button className="btn btn-primary" onClick={() => confirmAdd(false)} disabled={busy}>
              Add to {fmtDay(targetDay)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
