"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RichTextEditor } from "@/components/hub/RichTextEditor";
import { toast } from "sonner";
import type { SessionVersion, Exercise } from "@/types";

/* ── Types ───────────────────────────────────────────────────────────── */

type View =
  | "guard"
  | "chooser"
  | "qa"
  | "qa-generating"
  | "templates"
  | "paste"
  | "paste-review"
  | "preview"
  | "done";

interface ClientContext {
  client: {
    id: string;
    name: string;
    clientNumber: number;
    deliveryMode: string | null;
    equipment: string[] | null;
    packageType: string | null;
    profile: Record<string, unknown>;
  };
  equipmentGuard: boolean;
  activeBlock: { id: string; blockNumber: number } | null;
  sessionCount: number;
  nextScheduledSession: { dayOfWeek: string; date: string } | null;
  lastScheduledSession: { dayOfWeek: string; date: string } | null;
  matchedTemplates: TemplateSummary[];
  excludedTemplates: ExcludedTemplate[];
  equipmentNames: string[];
  equipmentCatalog: { name: string; homeEquivalent?: string }[];
}

interface TemplateSummary {
  id: string;
  name: string;
  archetypes: string[];
  equipment: string[];
  muscleGroups: string[];
  movementType: string[];
  position: string[];
  estimatedMinutes: number;
}

interface ExcludedTemplate {
  id: string;
  name: string;
  reason: string;
}

interface PreviewData {
  name: string;
  exercises: { name: string; prescription: string }[];
  equipment: string[];
  source: "template" | "paste" | "qa";
  sourceId?: string;
  workoutData?: SessionVersion;
}

interface StructuredDraft {
  name: string;
  data: SessionVersion;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function exercisePrescription(ex: Exercise): string {
  const sets = ex.sets ?? 0;
  const reps = ex.reps || "";
  if (sets && reps) return `${sets} × ${reps}`;
  if (reps) return reps;
  return `${sets} sets`;
}

function collectExercises(version: SessionVersion): PreviewData["exercises"] {
  const all = [...(version.warm_up || []), ...(version.main_block || []), ...(version.cooldown || [])];
  return all.map((ex) => ({ name: ex.exercise_name, prescription: exercisePrescription(ex) }));
}

function collectEquipment(version: SessionVersion): string[] {
  const all = [...(version.warm_up || []), ...(version.main_block || []), ...(version.cooldown || [])];
  const set = new Set<string>();
  for (const ex of all) {
    for (const e of ex.equipment ?? []) {
      if (e) set.add(e);
    }
  }
  return Array.from(set).sort();
}

function estimateMinutes(exerciseCount: number): number {
  return Math.max(5, exerciseCount * 4);
}

function parsePrescription(text: string): { sets?: number; reps?: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  /* "3 x 12" / "3 × 12 reps" / "3 x 30 sec" */
  const multMatch = trimmed.match(/(\d+)\s*[x×]\s*(.+)/i);
  if (multMatch) {
    return { sets: parseInt(multMatch[1], 10), reps: multMatch[2].trim() };
  }

  /* "3 sets of 12" / "3 sets of 12 reps" / "3 sets of 30 sec" */
  const setsOfMatch = trimmed.match(/(\d+)\s+sets?\s+of\s+(.+)/i);
  if (setsOfMatch) {
    return { sets: parseInt(setsOfMatch[1], 10), reps: setsOfMatch[2].trim() };
  }

  /* "12 reps" / "10 slow reps" — reps only */
  const repsOnlyMatch = trimmed.match(/^(\d+(?:\s+\w+)*\s+reps?)$/i);
  if (repsOnlyMatch) {
    return { reps: trimmed };
  }

  /* "3 sets" — sets only, no reps */
  const setsOnlyMatch = trimmed.match(/(\d+)\s+sets?$/i);
  if (setsOnlyMatch) {
    return { sets: parseInt(setsOnlyMatch[1], 10), reps: "" };
  }

  /* Time-based: "30 sec" / "45 seconds" / "2 min" / "90s" */
  const timeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:sec(?:ond)?s?|min(?:ute)?s?|s|m)$/i);
  if (timeMatch) {
    return { reps: trimmed };
  }

  return null;
}

function formatDeliveryMode(mode: string | null): string {
  if (!mode) return "—";
  return mode === "studio_1to1" ? "Studio 1:1" : mode === "home_training" ? "Home training" : mode;
}

function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.innerText || div.textContent || "").replace(/\u00a0/g, " ").trim();
}

/* ── Icons (inline SVGs matching the mockup) ─────────────────────────── */

const IC = {
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  sparkle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>,
  doc: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15l2 2 4-4" /></svg>,
  paste: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z" /><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><path d="M9 12h6M9 16h6" /></svg>,
  warning: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>,
  checkCircle: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>,
  clock: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  dumbbell: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 10h1.5M3 14h1.5M19.5 10H21M19.5 14H21M9 10h6v4H9z" /></svg>,
  chevDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>,
};

/* ── Stepper ─────────────────────────────────────────────────────────── */

function Stepper({ steps, current }: { steps: { n: number; label: string }[]; current: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      {steps.map((s, i) => (
        <Fragment key={s.n}>
          {i > 0 && <span className="w-6 h-px bg-[var(--hub-border)]" />}
          <div className={`inline-flex items-center gap-2 text-[13px] font-semibold ${current >= s.n ? "text-[var(--color-ink)]" : "text-muted-foreground"}`}>
            <span
              className={`w-[26px] h-[26px] rounded-full border grid place-items-center text-xs font-bold shrink-0 ${
                current === s.n
                  ? "bg-rose border-rose text-white"
                  : current > s.n
                    ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-teal"
                    : "border-[var(--hub-field-border)] bg-[var(--hub-card)] text-muted-foreground"
              }`}
            >
              {current > s.n ? IC.check : s.n}
            </span>
            {s.label}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/* ── Equipment chip ──────────────────────────────────────────────────── */

function EqChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold bg-[var(--hub-hover)] border border-[var(--hub-border)] text-[var(--color-body)]">
      {IC.dumbbell} {name}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* ── Main component ──────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════ */

interface AddWorkoutProps {
  clientNumber: number;
  clientName: string;
  deliveryMode: string | null;
  equipment: string[] | null;
}

export function AddWorkoutClient({
  clientNumber,
  clientName,
  deliveryMode,
  equipment,
}: AddWorkoutProps) {
  const searchParams = useSearchParams();
  const preselectedView = searchParams.get("view");
  const [view, setView] = useState<View>(equipment === null || deliveryMode === null ? "guard" : "chooser");
  const [ctx, setCtx] = useState<ClientContext | null>(null);
  const [ctxError, setCtxError] = useState(false);

  /* Q&A state */
  const [qaFocus, setQaFocus] = useState("Full body strength");
  const [qaEffort, setQaEffort] = useState("Building up gently");
  const [qaNotes, setQaNotes] = useState("");

  /* Paste state */
  const [pasteHtml, setPasteHtml] = useState("");
  const [structuring, setStructuring] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [reviewName, setReviewName] = useState("");
  const [reviewData, setReviewData] = useState<SessionVersion | null>(null);

  /* Preview state */
  const [preview, setPreview] = useState<PreviewData | null>(null);

  /* Completion state */
  const [completedName, setCompletedName] = useState("");
  const [completedLabel, setCompletedLabel] = useState("");

  /* Edit-before-add loading state */
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  /* Per-exercise prescription edits on the Review & edit step */
  const [reviewEdits, setReviewEdits] = useState<Record<string, string>>({});
  const [reviewParseErrors, setReviewParseErrors] = useState<Record<string, string>>({});

  /* Busy state */
  const [busy, setBusy] = useState(false);

  /* Fetch context on mount */
  useEffect(() => {
    fetch(`/api/clients/${clientNumber}/add-workout`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ClientContext | null) => {
        if (data) {
          setCtx(data);
          setCtxError(false);
          if (data.equipmentGuard) {
            setView("guard");
          } else if (preselectedView && ["qa", "templates", "paste"].includes(preselectedView)) {
            setView(preselectedView as View);
          }
        } else {
          setCtxError(true);
        }
      })
      .catch(() => setCtxError(true));
  }, [clientNumber, preselectedView]);

  /* ── Navigation helpers ─────────────────────────────────────────────── */

  function goTo(v: View) {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Q&A: generate via AI ──────────────────────────────────────────── */

  async function generateFromQA() {
    goTo("qa-generating");
    try {
      const res = await fetch(`/api/clients/${clientNumber}/add-workout/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus: qaFocus, effort: qaEffort, notes: qaNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const exs = collectExercises(data.data);
      setPreview({
        name: data.name,
        exercises: exs,
        equipment: collectEquipment(data.data),
        source: "qa",
        workoutData: data.data,
      });
      goTo("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
      goTo("qa");
    }
  }

  /* ── Templates: preview ─────────────────────────────────────────────── */

  function previewTemplate(t: TemplateSummary) {
    /* Fetch the full template data for preview */
    fetch("/api/workout-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string; data: SessionVersion }[]) => {
        const full = list.find((tpl) => tpl.id === t.id);
        if (full) {
          const exs = collectExercises(full.data);
          setPreview({
            name: full.name,
            exercises: exs,
            equipment: collectEquipment(full.data),
            source: "template",
            sourceId: full.id,
            workoutData: full.data,
          });
          goTo("preview");
        }
      })
      .catch(() => toast.error("Could not load template details"));
  }

  /* ── Paste: structure via AI ────────────────────────────────────────── */

  async function structurePaste() {
    const text = htmlToPlainText(pasteHtml);
    if (!text) { toast.error("Paste some workout text first."); return; }
    setStructuring(true);
    setStructureError(null);
    try {
      const res = await fetch("/api/workout-templates/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Structuring failed");
      setReviewName(data.name || "");
      setReviewData(data.data);
      setReviewEdits({});
      goTo("paste-review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setStructureError(msg);
      toast.error(msg);
    } finally {
      setStructuring(false);
    }
  }

  /* ── Paste review → preview ─────────────────────────────────────────── */

  function previewFromPasteReview() {
    if (!reviewData) return;

    /* Validate all edited prescriptions before proceeding */
    const errors: Record<string, string> = {};
    for (const [key, editedText] of Object.entries(reviewEdits)) {
      if (!editedText.trim()) {
        errors[key] = "Prescription can't be empty";
        continue;
      }
      const parsed = parsePrescription(editedText);
      if (!parsed) {
        errors[key] = `Can't read "${editedText}" — try a format like 3 × 12, 3 sets of 12, or 30 sec`;
      }
    }
    if (Object.keys(errors).length > 0) {
      setReviewParseErrors(errors);
      return;
    }
    setReviewParseErrors({});

    const hasEdits = Object.keys(reviewEdits).length > 0;
    let dataForPreview = reviewData;
    if (hasEdits) {
      dataForPreview = {
        warm_up: [...reviewData.warm_up],
        main_block: [...reviewData.main_block],
        cooldown: [...reviewData.cooldown],
      };
      (["warm_up", "main_block", "cooldown"] as const).forEach((section) => {
        (reviewData[section] ?? []).forEach((ex, i) => {
          const key = `${section}:${i}`;
          const editedText = reviewEdits[key];
          if (editedText === undefined) return;
          const parsed = parsePrescription(editedText);
          if (!parsed) return;
          const patched = { ...ex };
          if (parsed.sets !== undefined) patched.sets = parsed.sets;
          if (parsed.reps !== undefined) patched.reps = parsed.reps;
          dataForPreview[section] = [...dataForPreview[section]];
          dataForPreview[section][i] = patched;
        });
      });
    }

    const exs = collectExercises(dataForPreview);
    setPreview({
      name: reviewName || "Pasted workout",
      exercises: exs,
      equipment: collectEquipment(dataForPreview),
      source: "paste",
      workoutData: dataForPreview,
    });
    goTo("preview");
  }

  /* ── Confirm: write to DB ──────────────────────────────────────────── */

  function editBeforeAdd() {
    if (!preview) return;
    if (preview.source === "paste") {
      setReviewEdits({});
      goTo("paste");
    } else if (preview.workoutData) {
      setReviewName(preview.name);
      setReviewData(preview.workoutData);
      setReviewEdits({});
      goTo("paste-review");
    } else if (preview.source === "template" && preview.sourceId) {
      setEditingTemplateId(preview.sourceId);
      fetch("/api/workout-templates")
        .then((r) => (r.ok ? r.json() : []))
        .then((list: { id: string; name: string; data: SessionVersion }[]) => {
          const full = list.find((tpl) => tpl.id === preview!.sourceId);
          if (full) {
            setReviewName(full.name);
            setReviewData(full.data);
            setReviewEdits({});
            goTo("paste-review");
          } else {
            toast.error("Could not load template for editing");
          }
        })
        .catch(() => toast.error("Could not load template for editing"))
        .finally(() => setEditingTemplateId(null));
    }
  }

  async function confirmAdd() {
    if (!preview) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        source: preview.source,
        name: preview.name,
      };
      if (preview.workoutData) {
        body.workout_data = preview.workoutData;
      } else if (preview.source === "template" && preview.sourceId) {
        body.template_id = preview.sourceId;
      }

      const res = await fetch(`/api/clients/${clientNumber}/add-workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add workout");

      setCompletedName(preview.name);
      setCompletedLabel(data.nextSessionLabel ?? "first in the programme");
      goTo("done");
      toast.success(`Added "${preview.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add workout");
    } finally {
      setBusy(false);
    }
  }

  /* ── Delivery mode + equipment display ──────────────────────────────── */

  const deliveryLabel = formatDeliveryMode(ctx?.client.deliveryMode ?? deliveryMode);
  const equipmentDisplay = ctx?.equipmentNames ?? equipment ?? [];

  /* ════════════════════════════════════════════════════════════════════ */
  /* ── RENDER ─────────────────────────────────────────────────────────── */
  /* ════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-5 max-w-[900px]">
      {/* Back link */}
      <Link
        href={`/hub/clients/${clientNumber}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-2 py-1 hover:bg-[var(--hub-hover)] transition-colors w-fit"
      >
        {IC.back} {clientName}
      </Link>

      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Add a workout</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This becomes part of {clientName}&rsquo;s programme automatically — there&rsquo;s nothing separate to set up first.
        </p>
      </div>

      {/* ── CONTEXT FETCH ERROR ──────────────────────────────────────── */}
      {ctxError && !ctx && view !== "guard" && (
        <div className="rounded-[16px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 text-[13px]">
          <p className="font-bold text-[var(--status-danger)]">Could not load client data</p>
          <p className="text-[var(--color-body)] mt-1">The connection dropped while fetching equipment and template data. Try reloading the page.</p>
        </div>
      )}

      {/* ── GUARD: equipment is NULL ──────────────────────────────────── */}
      {view === "guard" && (
        <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center text-center gap-1 py-10 px-6">
            <span className="w-12 h-12 rounded-full bg-[var(--s-warning-bg)] text-[var(--s-warning-tx)] grid place-items-center mb-2">
              {IC.warning}
            </span>
            <p className="text-base font-bold text-[var(--color-ink)]">We need to know what {clientName}&rsquo;s got first</p>
            <p className="text-[13px] text-muted-foreground max-w-[42ch] mt-0.5">
              Nobody&rsquo;s told us what equipment {clientName} has, or where they train, so we can&rsquo;t safely build or filter workouts for them yet. It only takes a minute to set up.
            </p>
            <Link
              href={`/hub/clients/${clientNumber}/edit`}
              className="mt-3.5 inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-rose hover:bg-rose/90 text-white text-[13px] font-semibold transition-colors"
            >
              Set up equipment
            </Link>
          </div>
        </div>
      )}

      {/* ── Equipment context banner (persistent across all non-guard views) ── */}
      {view !== "guard" && view !== "done" && (
        <div className="flex items-start gap-3 p-3.5 rounded-[16px] bg-[var(--hub-card)] border border-[var(--hub-border)]">
          <span className="w-8 h-8 rounded-lg bg-[var(--status-success-bg)] text-[var(--status-success)] grid place-items-center shrink-0">
            {IC.check}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[var(--color-ink)]">
              {deliveryLabel} {equipmentDisplay.length > 0 && <>· {equipmentDisplay.join(", ")}</>}
            </p>
            {equipmentDisplay.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {equipmentDisplay.map((eq) => <EqChip key={eq} name={eq} />)}
              </div>
            )}
            {equipmentDisplay.length === 0 && (
              <p className="text-[11.5px] text-muted-foreground mt-1.5">Bodyweight only — no equipment on file.</p>
            )}
            {deliveryLabel === "Home training" && ctx?.equipmentCatalog && equipmentDisplay.length > 0 && (() => {
              const notes = ctx.equipmentCatalog
                .filter((cat) => equipmentDisplay.some((e) => e.toLowerCase() === cat.name.toLowerCase()) && cat.homeEquivalent)
                .map((cat) => cat.homeEquivalent!);
              if (notes.length === 0) return null;
              return (
                <p className="text-[11.5px] text-muted-foreground mt-1.5">{notes.join("; ")}.</p>
              );
            })()}
          </div>
          <Link
            href={`/hub/clients/${clientNumber}/edit`}
            className="shrink-0 inline-flex items-center h-[30px] px-2.5 rounded-md border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] text-[12.5px] font-semibold transition-colors"
          >
            {IC.edit} <span className="ml-1">Not right? Edit</span>
          </Link>
        </div>
      )}

      {/* ── ROUTE CHOOSER ─────────────────────────────────────────────── */}
      {view === "chooser" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => goTo("qa")}
            className="flex flex-col items-start gap-2.5 text-left p-5 bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm cursor-pointer font-[inherit] transition-all hover:border-rose hover:shadow-[0_4px_14px_rgba(193,131,159,.14)] focus-visible:outline-2 focus-visible:outline-rose focus-visible:outline-offset-2"
          >
            <span className="w-10 h-10 rounded-lg bg-[var(--s-primary-bg)] text-[var(--s-primary-tx)] grid place-items-center shrink-0">{IC.sparkle}</span>
            <span className="text-[15px] font-bold text-[var(--color-ink)]">Answer a few questions</span>
            <span className="text-[12.5px] text-muted-foreground leading-[1.55]">Answer a handful of quick questions and let it build {clientName}&rsquo;s next workout for you.</span>
            <span className="mt-auto pt-2 text-[11.5px] font-bold text-rose uppercase tracking-[.04em]">Fastest · ~30 seconds</span>
          </button>
          <button
            onClick={() => goTo("templates")}
            className="flex flex-col items-start gap-2.5 text-left p-5 bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm cursor-pointer font-[inherit] transition-all hover:border-rose hover:shadow-[0_4px_14px_rgba(193,131,159,.14)] focus-visible:outline-2 focus-visible:outline-rose focus-visible:outline-offset-2"
          >
            <span className="w-10 h-10 rounded-lg bg-[var(--s-primary-bg)] text-[var(--s-primary-tx)] grid place-items-center shrink-0">{IC.doc}</span>
            <span className="text-[15px] font-bold text-[var(--color-ink)]">Pick from a template</span>
            <span className="text-[12.5px] text-muted-foreground leading-[1.55]">Choose from your saved templates — filtered to what {clientName}&rsquo;s got and where they train.</span>
            <span className="mt-auto pt-2 text-[11.5px] font-bold text-rose uppercase tracking-[.04em]">{ctx ? `${ctx.matchedTemplates.length} templates match` : ctxError ? "Couldn't load templates" : "Loading…"}</span>
          </button>
          <button
            onClick={() => goTo("paste")}
            className="flex flex-col items-start gap-2.5 text-left p-5 bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm cursor-pointer font-[inherit] transition-all hover:border-rose hover:shadow-[0_4px_14px_rgba(193,131,159,.14)] focus-visible:outline-2 focus-visible:outline-rose focus-visible:outline-offset-2"
          >
            <span className="w-10 h-10 rounded-lg bg-[var(--s-primary-bg)] text-[var(--s-primary-tx)] grid place-items-center shrink-0">{IC.paste}</span>
            <span className="text-[15px] font-bold text-[var(--color-ink)]">Paste in a workout</span>
            <span className="text-[12.5px] text-muted-foreground leading-[1.55]">Already written something up elsewhere? Paste it in and review it before it&rsquo;s added.</span>
            <span className="mt-auto pt-2 text-[11.5px] font-bold text-rose uppercase tracking-[.04em]">From email, notes or chat</span>
          </button>
        </div>
      )}

      {/* ── Q&A: questions ────────────────────────────────────────────── */}
      {view === "qa" && (
        <>
          <Stepper steps={[{ n: 1, label: "Questions" }, { n: 2, label: "Building" }, { n: 3, label: "Preview" }]} current={1} />
          <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground mb-1.5">What should this workout focus on?</label>
                <select
                  value={qaFocus}
                  onChange={(e) => setQaFocus(e.target.value)}
                  className="w-full h-10 border border-[var(--hub-field-border)] rounded-lg px-3 text-[13.5px] font-[inherit] bg-[var(--hub-card)] text-[var(--color-ink)] focus:outline-none focus:border-rose focus:shadow-[0_0_0_3px_rgba(193,131,159,.28)]"
                >
                  <option>Full body strength</option>
                  <option>Mobility &amp; balance</option>
                  <option>Cardio &amp; conditioning</option>
                  <option>Recovery — gentle, flare-day</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground mb-1.5">How hard should it feel?</label>
                <div className="flex gap-2 flex-wrap">
                  {["Building up gently", "Standard effort", "Push a bit harder"].map((opt) => (
                    <label key={opt} className="relative">
                      <input
                        type="radio"
                        name="qaEffort"
                        value={opt}
                        checked={qaEffort === opt}
                        onChange={() => setQaEffort(opt)}
                        className="absolute inset-0 opacity-0 cursor-pointer margin-0"
                      />
                      <span className={`inline-flex items-center h-9 px-3.5 rounded-lg border text-[13px] font-semibold transition-colors ${
                        qaEffort === opt
                          ? "bg-[var(--s-primary-bg)] border-rose text-[var(--s-primary-tx)]"
                          : "border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[var(--color-body)]"
                      }`}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground mb-1.5">Anything to watch for this time?</label>
                <textarea
                  value={qaNotes}
                  onChange={(e) => setQaNotes(e.target.value)}
                  placeholder={`e.g. keep pressing seated, avoid overhead work`}
                  className="w-full min-h-[74px] border border-[var(--hub-field-border)] rounded-lg p-2.5 text-[13.5px] font-[inherit] bg-[var(--hub-card)] text-[var(--color-ink)] resize-y focus:outline-none focus:border-rose focus:shadow-[0_0_0_3px_rgba(193,131,159,.28)]"
                />
                {ctx?.client.profile && (
                  (() => {
                    const profile = ctx.client.profile as Record<string, unknown>;
                    const health = (profile.health ?? {}) as Record<string, unknown>;
                    const watchFor = (profile.notes as Record<string, unknown> | undefined)?.watch_for;
                    const contraindications = Array.isArray(health.contraindications)
                      ? (health.contraindications as string[])
                      : [];
                    const items: string[] = [];
                    if (watchFor && typeof watchFor === "string") items.push(watchFor);
                    for (const c of contraindications) {
                      if (typeof c === "string" && c) items.push(c);
                    }
                    if (items.length === 0) return null;
                    return (
                      <p className="text-[11.5px] text-muted-foreground mt-1.5">
                        <b className="text-[var(--s-warning-tx)] font-bold">Known restriction{items.length > 1 ? "s" : ""} on file:</b>{" "}
                        {items.join("; ")} — carried into the build automatically.
                      </p>
                    );
                  })()
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)] flex-wrap">
              <button onClick={() => goTo("chooser")} className="inline-flex items-center h-9 px-3.5 rounded-lg border border-transparent text-[13px] font-medium text-[var(--color-body)] hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors">
                Back
              </button>
              <span className="ml-auto" />
              <button
                onClick={generateFromQA}
                className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-rose border border-rose text-white text-[13px] font-semibold hover:bg-[color-mix(in_oklch,rgba(193,131,159,1)_82%,rgba(19,19,19,1))] transition-colors"
              >
                Build this workout
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Q&A: generating ───────────────────────────────────────────── */}
      {view === "qa-generating" && (
        <>
          <Stepper steps={[{ n: 1, label: "Questions" }, { n: 2, label: "Building" }, { n: 3, label: "Preview" }]} current={2} />
          <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden" aria-busy="true">
            <div className="p-4">
              <p className="text-[13px] font-bold text-[var(--color-ink)] mb-1">Building {clientName}&rsquo;s workout…</p>
              <p className="text-[12px] text-muted-foreground mb-4">Checking their equipment and known restrictions as it goes.</p>
              <div className="space-y-2">
                <div className="h-3 w-[60%] rounded bg-gradient-to-r from-[var(--hub-hover)] via-[#EEF0F3] to-[var(--hub-hover)] bg-[length:400%_100%] animate-[sk_1.4s_ease-in-out_infinite]" />
                <div className="h-5 w-[88px] rounded-full bg-gradient-to-r from-[var(--hub-hover)] via-[#EEF0F3] to-[var(--hub-hover)] bg-[length:400%_100%] animate-[sk_1.4s_ease-in-out_infinite]" />
                <div className="h-3 w-[90%] rounded bg-gradient-to-r from-[var(--hub-hover)] via-[#EEF0F3] to-[var(--hub-hover)] bg-[length:400%_100%] animate-[sk_1.4s_ease-in-out_infinite]" />
                <div className="h-3 w-[90%] rounded bg-gradient-to-r from-[var(--hub-hover)] via-[#EEF0F3] to-[var(--hub-hover)] bg-[length:400%_100%] animate-[sk_1.4s_ease-in-out_infinite]" />
                <div className="h-3 w-[40%] rounded bg-gradient-to-r from-[var(--hub-hover)] via-[#EEF0F3] to-[var(--hub-hover)] bg-[length:400%_100%] animate-[sk_1.4s_ease-in-out_infinite]" />
                <div className="h-3 w-[90%] rounded bg-gradient-to-r from-[var(--hub-hover)] via-[#EEF0F3] to-[var(--hub-hover)] bg-[length:400%_100%] animate-[sk_1.4s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TEMPLATES: filtered list ──────────────────────────────────── */}
      {view === "templates" && (
        <>
          <Stepper steps={[{ n: 1, label: "Templates" }, { n: 2, label: "Preview" }]} current={1} />
          <div className="flex gap-3 border border-[var(--s-primary-bd)] rounded-[16px] p-3.5 text-[12.5px] leading-[1.6] bg-[var(--s-primary-bg)] text-[var(--color-ink)]">
            <span className="w-6 h-6 rounded-full bg-rose text-white grid place-items-center text-xs font-extrabold shrink-0 mt-px">i</span>
            <div>
              <b>Showing templates that match {clientName}&rsquo;s equipment.</b>{" "}
              {deliveryLabel} {equipmentDisplay.length > 0 && <>· {equipmentDisplay.join(", ")}</>}.{" "}
              Anything needing kit they don&rsquo;t have is left out below, with the reason — never hidden without explanation.
            </div>
          </div>
          <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
            <div className="p-4 space-y-2">
              {(ctx?.matchedTemplates ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-bold text-[var(--color-ink)]">No templates match</p>
                  <p className="text-[13px] text-muted-foreground mt-1">No saved templates match {clientName}&rsquo;s equipment and training format.</p>
                </div>
              ) : (
                (ctx?.matchedTemplates ?? []).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => previewTemplate(t)}
                    className="flex items-center gap-3 w-full p-3.5 border border-[var(--hub-border)] rounded-[10px] bg-[var(--hub-card)] text-left font-[inherit] hover:border-rose transition-colors"
                  >
                    <span className="w-[34px] h-[34px] rounded-lg bg-[var(--hub-hover)] text-muted-foreground grid place-items-center shrink-0">
                      {IC.doc}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-[13.5px] font-bold text-[var(--color-ink)] block">{t.name}</span>
                      <span className="text-xs text-muted-foreground mt-0.5 block">
                        {formatDeliveryMode(deliveryMode)} · {t.equipment.length > 0 ? t.equipment.join(", ") : "Bodyweight"} · est. {t.estimatedMinutes} min
                      </span>
                    </span>
                    <span className="inline-flex items-center h-[30px] px-2.5 rounded-md border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] text-[12.5px] font-semibold transition-colors shrink-0">
                      Preview
                    </span>
                  </button>
                ))
              )}
            </div>
            {/* Excluded templates accordion */}
            {(ctx?.excludedTemplates ?? []).length > 0 && (
              <div className="px-4 pb-3 border-t border-[var(--hub-border)]">
                <details className="rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] overflow-hidden mt-0">
                  <summary className="flex items-center gap-2.5 min-h-[48px] px-3.5 cursor-pointer list-none text-[13px] font-semibold text-[var(--color-ink)] hover:bg-[var(--hub-hover)] transition-colors">
                    <svg className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-150 group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    <span className="flex-1">{ctx.excludedTemplates.length} template{ctx.excludedTemplates.length === 1 ? "" : "s"} excluded — see why</span>
                    <span className="inline-flex items-center h-[22px] px-2 rounded-full text-[11.5px] font-bold bg-[var(--status-neutral-bg)] border border-[var(--status-neutral-border)] text-[var(--color-body)]">{ctx.excludedTemplates.length}</span>
                  </summary>
                  <div className="px-3.5 pb-3.5 pt-1 text-[12.5px]">
                    {ctx.excludedTemplates.map((e, i) => (
                      <div key={e.id} className={`flex items-baseline gap-2 py-2 ${i > 0 ? "border-t border-dashed border-[var(--hub-border)]" : ""}`}>
                        <span className="font-bold text-[var(--color-ink)] shrink-0">{e.name}</span>
                        <span className="text-muted-foreground">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
          <div>
            <button onClick={() => goTo("chooser")} className="inline-flex items-center h-9 px-3.5 rounded-lg border border-transparent text-[13px] font-medium text-[var(--color-body)] hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors">
              Back
            </button>
          </div>
        </>
      )}

      {/* ── PASTE: step 1 — paste text ────────────────────────────────── */}
      {view === "paste" && (
        <>
          <Stepper steps={[{ n: 1, label: "Paste" }, { n: 2, label: "Review & edit" }, { n: 3, label: "Preview" }]} current={1} />
          <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
              <span className="text-[11px] text-muted-foreground font-mono">Paste from email, chat or notes — formatting is kept</span>
            </div>
            <div className="p-4">
              <RichTextEditor
                value={pasteHtml}
                onChange={setPasteHtml}
                placeholder={"Home band circuit — texted over Sunday\n\nHere's the one we talked about for the days she can't get to weights.\n\nBand pull-apart, 3 sets of 12\nSeated band row, 3 x 12\nSit to stand, 3 sets of 10, slow down\nWall press, 2 sets of 10\n\nKeep it seated where she can — no overhead pressing."}
                minHeight={200}
              />
              {structureError && (
                <p className="text-sm text-[var(--status-danger)] mt-2">{structureError}</p>
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)] flex-wrap">
              <span className="text-[11px] text-muted-foreground font-mono">{pasteHtml ? `${htmlToPlainText(pasteHtml).split("\n").filter((l) => l.trim()).length} lines detected` : "Paste text above"}</span>
              <span className="ml-auto" />
              <button onClick={() => goTo("chooser")} className="inline-flex items-center h-9 px-3.5 rounded-lg border border-transparent text-[13px] font-medium text-[var(--color-body)] hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors">
                Back
              </button>
              <button
                onClick={structurePaste}
                disabled={structuring || !pasteHtml.trim()}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-rose border border-rose text-white text-[13px] font-semibold hover:bg-[color-mix(in_oklch,rgba(193,131,159,1)_82%,rgba(19,19,19,1))] transition-colors disabled:opacity-50"
              >
                {IC.sparkle}
                {structuring ? "Structuring…" : "Structure it"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── PASTE: step 2 — review & edit ─────────────────────────────── */}
      {view === "paste-review" && reviewData && (
        <>
          <Stepper steps={[{ n: 1, label: "Paste" }, { n: 2, label: "Review & edit" }, { n: 3, label: "Preview" }]} current={2} />
          <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--hub-border)]">
              <span className="w-8 h-8 rounded-lg bg-[var(--status-success-bg)] text-[var(--status-success)] grid place-items-center shrink-0">{IC.check}</span>
              <div>
                <p className="text-[13.5px] font-bold text-[var(--color-ink)]">Structured from your paste</p>
                <p className="text-xs text-muted-foreground">Review and correct before it&rsquo;s added — nothing is saved yet.</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground mb-1.5">Workout name</label>
                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full max-w-[360px] h-[38px] border border-[var(--hub-field-border)] rounded-lg px-3 text-[13.5px] font-[inherit] focus:outline-none focus:border-rose focus:shadow-[0_0_0_3px_rgba(193,131,159,.28)]"
                />
              </div>
              {(["warm_up", "main_block", "cooldown"] as const).map((section) => {
                const exercises = reviewData[section] ?? [];
                if (exercises.length === 0) return null;
                const sectionLabel = section === "warm_up" ? "Warm-up" : section === "main_block" ? "Main set" : "Cool down";
                return (
                  <div key={section}>
                    <h4 className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground mb-1.5">{sectionLabel}</h4>
                    <div className="space-y-1.5">
                      {exercises.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-[13px] py-2 px-2.5 border border-[var(--hub-border)] rounded-[10px]">
                          <span className="text-muted-foreground font-variant-numeric:tabular-nums w-4 shrink-0 text-[12px] font-extrabold">{i + 1}</span>
                          <span className="text-[var(--color-ink)] font-semibold flex-1 min-w-0">{ex.exercise_name}</span>
                           <div className="shrink-0 flex flex-col gap-0.5">
                            <input
                              type="text"
                              value={reviewEdits[`${section}:${i}`] ?? exercisePrescription(ex)}
                              onChange={(e) => {
                                setReviewEdits((prev) => ({ ...prev, [`${section}:${i}`]: e.target.value }));
                                if (reviewParseErrors[`${section}:${i}`]) {
                                  setReviewParseErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[`${section}:${i}`];
                                    return next;
                                  });
                                }
                              }}
                              className={`w-[130px] h-[30px] border rounded-md px-2 text-[12.5px] font-[inherit] bg-[var(--hub-card)] text-[var(--color-ink)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(193,131,159,.28)] shrink-0 ${reviewParseErrors[`${section}:${i}`] ? "border-[var(--status-danger)] focus:border-[var(--status-danger)]" : "border-[var(--hub-field-border)] focus:border-rose"}`}
                            />
                            {reviewParseErrors[`${section}:${i}`] && (
                              <p className="text-[10.5px] text-[var(--status-danger)] leading-tight max-w-[140px] text-right">{reviewParseErrors[`${section}:${i}`]}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)] flex-wrap">
              <button onClick={() => goTo(preview ? "paste" : "chooser")} className="inline-flex items-center h-9 px-3.5 rounded-lg border border-transparent text-[13px] font-medium text-[var(--color-body)] hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors">
                {preview ? "Back to paste" : "Back"}
              </button>
              <span className="ml-auto" />
              <button
                onClick={previewFromPasteReview}
                className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-rose border border-rose text-white text-[13px] font-semibold hover:bg-[color-mix(in_oklch,rgba(193,131,159,1)_82%,rgba(19,19,19,1))] transition-colors"
              >
                Continue to preview
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── PREVIEW: shared by all three routes ───────────────────────── */}
      {view === "preview" && preview && (
        <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--hub-border)]">
            <span className="w-8 h-8 rounded-lg bg-[var(--status-success-bg)] text-[var(--status-success)] grid place-items-center shrink-0">{IC.check}</span>
            <div>
              <p className="text-base font-extrabold text-[var(--color-ink)] tracking-tight">{preview.name}</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                This becomes {clientName}&rsquo;s {ctx?.sessionCount === 0 ? "first workout in the programme" : `workout — appended to the end of the programme`}. Nothing has been saved yet.
              </p>
            </div>
          </div>
          {/* Equipment + duration chips */}
          <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1">
            <EqChip name={`${estimateMinutes(preview.exercises.length)} min est.`} />
            {preview.equipment.map((eq) => <EqChip key={eq} name={eq} />)}
          </div>
          {/* Exercise list */}
          <div className="px-4 pb-4">
            {preview.exercises.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-4">Empty workout — add exercises after it&rsquo;s created.</p>
            ) : (
              preview.exercises.map((ex, i) => (
                <div key={i} className={`flex items-center gap-2.5 py-2.5 ${i > 0 ? "border-t border-dashed border-[var(--hub-border)]" : ""}`}>
                  <span className="shrink-0 text-xs font-extrabold text-muted-foreground w-[18px]">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="text-[13.5px] font-bold text-[var(--color-ink)] block">{ex.name}</span>
                    <span className="text-xs text-muted-foreground block mt-px">{ex.prescription}</span>
                  </span>
                </div>
              ))
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)] flex-wrap">
            <button onClick={() => goTo("chooser")} className="inline-flex items-center h-9 px-3.5 rounded-lg border border-transparent text-[13px] font-medium text-[var(--color-body)] hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors">
              Start again
            </button>
            <span className="ml-auto" />
            <button onClick={editBeforeAdd} disabled={!!editingTemplateId} className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] text-[13px] font-semibold transition-colors disabled:opacity-50">
              {IC.edit} {editingTemplateId ? "Loading…" : "Edit before adding"}
            </button>
            <button
              onClick={confirmAdd}
              disabled={busy}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-rose border border-rose text-white text-[13px] font-semibold hover:bg-[color-mix(in_oklch,rgba(193,131,159,1)_82%,rgba(19,19,19,1))] transition-colors disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add this workout"}
            </button>
          </div>
        </div>
      )}

      {/* ── DONE: post-create confirmation ────────────────────────────── */}
      {view === "done" && (
        <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
          <div className="text-center py-12 px-8">
            <div className="w-[60px] h-[60px] rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] grid place-items-center mx-auto mb-4">
              {IC.checkCircle}
            </div>
            <h2 className="text-lg font-extrabold text-[var(--color-ink)] mb-1.5">Added to {clientName}&rsquo;s programme</h2>
            <p className="text-sm text-[var(--color-body)] max-w-[46ch] mx-auto mb-5">
              &ldquo;{completedName}&rdquo; is now {completedLabel}. No other setup was needed.
            </p>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  setPreview(null);
                  setPasteHtml("");
                  setReviewName("");
                  setReviewData(null);
                  setReviewEdits({});
                  goTo("chooser");
                }}
                className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] text-[13px] font-semibold transition-colors"
              >
                Add another workout
              </button>
              <Link
                href={`/hub/clients/${clientNumber}`}
                className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-rose hover:bg-rose/90 text-white text-[13px] font-semibold transition-colors"
              >
                Back to {clientName}&rsquo;s profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
