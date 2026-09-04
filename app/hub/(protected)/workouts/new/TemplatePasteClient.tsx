"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader } from "@/components/hub";
import { RichTextEditor } from "@/components/hub/RichTextEditor";
import { TemplateEditorClient, type TemplateEditorHandle } from "../[id]/TemplateEditorClient";
import { TemplateAssignDialog, useAssignableClients } from "../assign-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  IconChevronLeft,
  IconSparkles,
  IconZap,
  IconLoader2,
  IconCheckCircle,
  IconArrowLeft,
  IconAlertTriangle,
  IconSave,
  IconCheck,
} from "@/components/icons";
import { toast } from "sonner";
import type { SessionVersion, WorkoutTemplate } from "@/types";

interface StructuredDraft {
  name: string;
  data: SessionVersion;
}

const blankDraft: StructuredDraft = {
  name: "",
  data: { warm_up: [], main_block: [], cooldown: [] },
};

/** Strip pasted HTML down to plain text with line breaks intact (block
 *  elements render as newlines), so the AI sees a clean, structure-preserving
 *  transcript rather than markup. */
function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ");
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.innerText || div.textContent || "").replace(/\u00a0/g, " ").trim();
}

function draftToTemplate(draft: StructuredDraft): WorkoutTemplate {
  return {
    id: "",
    name: draft.name,
    data: draft.data,
    archetypes: [],
    movement_type: [],
    muscle_groups: [],
    equipment: [],
    difficulty: null,
    position: [],
    condition_tags: [],
    source_client_id: null,
    source_session_id: null,
    usage_count: 0,
    created_at: "",
    updated_at: "",
  };
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Paste" },
    { n: 2 as const, label: "Review & edit" },
    { n: 3 as const, label: "Save or assign" },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => (
        <Fragment key={s.n}>
          {i > 0 && <span className="w-6 h-px bg-[var(--hub-border)]" />}
          <div
            className={cn(
              "inline-flex items-center gap-2 text-[13px] font-semibold",
              step >= s.n ? "text-[var(--color-ink)]" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "w-[26px] h-[26px] rounded-full border grid place-items-center text-xs font-bold",
                step === s.n
                  ? "bg-rose border-rose text-white"
                  : step > s.n
                    ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-teal"
                    : "border-[var(--hub-field-border)] bg-[var(--hub-card)] text-muted-foreground",
              )}
            >
              {step > s.n ? <IconCheck className="h-3.5 w-3.5" /> : s.n}
            </span>
            {s.label}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export function TemplatePasteClient({ startBlank = false }: { startBlank?: boolean }) {
  const [pasteHtml, setPasteHtml] = useState("");
  const [structuring, setStructuring] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [draft, setDraft] = useState<StructuredDraft | null>(startBlank ? blankDraft : null);
  const [createdTemplate, setCreatedTemplate] = useState<WorkoutTemplate | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(startBlank ? 2 : 1);

  // Save dialog state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  // Assign dialog state
  const [assignOpen, setAssignOpen] = useState(false);

  const [success, setSuccess] = useState<{ title: string; body: string } | null>(null);

  const editorRef = useRef<TemplateEditorHandle>(null);
  const clients = useAssignableClients();

  const structure = async () => {
    const text = htmlToPlainText(pasteHtml);
    if (!text) {
      toast.error("Paste some workout text first.");
      return;
    }
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
      setDraft(data as StructuredDraft);
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setStructureError(msg);
      toast.error(msg);
    } finally {
      setStructuring(false);
    }
  };

  const backToPaste = () => {
    setDraft(null);
    setStructureError(null);
    setCreatedTemplate(null);
    setStep(1);
  };

  const openSave = () => {
    setSaveName(editorRef.current?.getName() ?? "");
    setSaveOpen(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    const saved = await editorRef.current?.save(saveName);
    setSaving(false);
    if (saved) {
      setSaveOpen(false);
      setSuccess({
        title: "Template saved",
        body: `"${saved.name}" is now in your templates, ready to assign.`,
      });
      setStep(3);
    }
  };

  const openAssign = async () => {
    if (createdTemplate) {
      setAssignOpen(true);
      return;
    }
    // Assigning before saving persists the reviewed template first, then grounds
    // a block against its id — assign implies save, so nothing is lost.
    const saved = await editorRef.current?.save();
    if (saved) setAssignOpen(true);
  };

  const handleAssigned = (clientName: string) => {
    const name = createdTemplate?.name ?? editorRef.current?.getName() ?? "This template";
    setSuccess({
      title: `Assigned to ${clientName}`,
      body: `"${name}" is grounded into ${clientName}'s next block via the Plan Agent.`,
    });
    setStep(3);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hub/workouts" className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New workout template</h1>
          <p className="text-muted-foreground">
            {startBlank
              ? "Start from an empty editor and build the template by hand."
              : "Paste a workout you've agreed outside the app, let it structure, then review before saving."}
          </p>
        </div>
      </div>

      <Stepper step={step} />

      {step === 1 && (
        <HubCard>
          <HubCardHeader
            title="Paste your workout"
            subtitle="Bold, headings and lists carry over from Word, Docs, Gmail or chat."
            divider
            className="pt-0"
          />
          <div className="p-4 space-y-3">
            <RichTextEditor
              value={pasteHtml}
              onChange={setPasteHtml}
              placeholder={"Flare-day mobility — Margaret (agreed 13 Aug)\n\nWarm-up\n• Diaphragmatic breathing x 6 breaths\n\nMain block\n1. Sit to stand — 3 sets, 8 reps, tempo 2-1-2, rest 60 sec\n\nCool down\n• Box breathing 4 rounds"}
              minHeight={260}
            />
            <p className="text-xs text-muted-foreground">
              The AI will turn this into warm-up / main block / cooldown sections with sets, reps,
              tempo and rest picked out of your notes. Nothing is saved until you review it.
            </p>
            {structureError && (
              <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertDescription>{structureError}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasteHtml("")}
                disabled={structuring || !pasteHtml}
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={structure}
                disabled={structuring || !pasteHtml.trim()}
                className="gap-2 bg-rose hover:bg-rose/90 text-white"
              >
                {structuring ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconSparkles className="h-4 w-4" />}
                {structuring ? "Structuring…" : "Structure with AI"}
              </Button>
            </div>
          </div>
        </HubCard>
      )}

      {step === 2 && draft && (
        <>
          <div className="flex items-center gap-2 rounded-[12px] border border-[var(--hub-border)] bg-[var(--status-success-bg)] p-4 text-sm text-[var(--color-ink)]">
            <IconCheckCircle className="h-4 w-4 text-teal shrink-0" />
            Structured from your paste — review and correct before saving. Nothing is saved yet.
          </div>

          <TemplateEditorClient
            ref={editorRef}
            template={draftToTemplate(draft)}
            sourceClientName={null}
            isNew
            onCreated={setCreatedTemplate}
          />

          <div className="flex items-center gap-2.5 flex-wrap">
            {!startBlank && (
              <Button type="button" variant="outline" onClick={backToPaste}>
                <IconArrowLeft className="h-4 w-4" />
                Back to paste
              </Button>
            )}
            <span className="ml-auto" />
            <Button type="button" variant="outline" onClick={openAssign}>
              <IconZap className="h-4 w-4" />
              Assign to client
            </Button>
            <Button type="button" onClick={openSave} className="gap-1.5 bg-rose hover:bg-rose/90 text-white">
              <IconSave className="h-4 w-4" />
              Save as template
            </Button>
          </div>
        </>
      )}

      {step === 3 && success && (
        <HubCard padded={false}>
          <div className="px-8 py-12 flex flex-col items-center text-center">
            <div className="w-[60px] h-[60px] rounded-full bg-[var(--status-success-bg)] text-teal flex items-center justify-center mb-4">
              <IconCheckCircle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-extrabold text-[var(--color-ink)]">{success.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 mb-5 max-w-md">{success.body}</p>
            <Link
              href="/hub/workouts"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-rose hover:bg-rose/90 text-white text-[13px] font-semibold transition-colors"
            >
              Go to workouts
            </Link>
          </div>
        </HubCard>
      )}

      {saveOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !saving && setSaveOpen(false)} />
          <div className="relative w-full max-w-md rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--color-ink)]">Save as template</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This saves a new reusable template in workout_templates — the reviewed structure above is what gets stored.
            </p>
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Template name
            </label>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2 text-sm outline-none focus:border-rose"
            />
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmSave} disabled={saving || !saveName.trim()} className="bg-rose hover:bg-rose/90 text-white">
                {saving ? <IconLoader2 className="h-4 w-4 animate-spin" /> : null}
                Save template
              </Button>
            </div>
          </div>
        </div>
      )}

      {assignOpen && (
        <TemplateAssignDialog
          templateId={createdTemplate?.id ?? ""}
          templateName={createdTemplate?.name ?? ""}
          clients={clients}
          onClose={() => setAssignOpen(false)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}
