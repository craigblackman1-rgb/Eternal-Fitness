"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader } from "@/components/hub";
import { RichTextEditor } from "@/components/hub/RichTextEditor";
import { TemplateEditorClient } from "../[id]/TemplateEditorClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  IconChevronLeft,
  IconSparkles,
  IconZap,
  IconLoader2,
  IconCheckCircle,
  IconArrowLeft,
  IconAlertTriangle,
} from "@/components/icons";
import { toast } from "sonner";
import type { SessionVersion, WorkoutTemplate } from "@/types";

interface StructuredDraft {
  name: string;
  data: SessionVersion;
}

interface ClientOption {
  id: string;
  name: string;
  client_number: number | null;
}

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
    condition_tags: [],
    source_client_id: null,
    source_session_id: null,
    usage_count: 0,
    created_at: "",
    updated_at: "",
  };
}

export function TemplatePasteClient() {
  const [pasteHtml, setPasteHtml] = useState("");
  const [structuring, setStructuring] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [draft, setDraft] = useState<StructuredDraft | null>(null);
  const [createdTemplate, setCreatedTemplate] = useState<WorkoutTemplate | null>(null);

  // Assign dialog state
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignClientNumber, setAssignClientNumber] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((rows: ClientOption[]) => setClients(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, []);

  const assignableClients = useMemo(
    () => clients.filter((c) => typeof c.client_number === "number"),
    [clients],
  );

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setStructureError(msg);
      toast.error(msg);
    } finally {
      setStructuring(false);
    }
  };

  const assign = async () => {
    if (!createdTemplate || !assignClientNumber) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/claude/generate-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: assignClientNumber, templateId: createdTemplate.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      const client = assignableClients.find((c) => String(c.client_number) === assignClientNumber);
      toast.success(
        `Assigned to ${client?.name ?? "the client"} — block generated via the Plan Agent.`,
      );
      setAssignOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hub/workout-templates" className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New workout template</h1>
          <p className="text-muted-foreground">
            Paste a workout you&apos;ve agreed outside the app, let it structure, then review before saving.
          </p>
        </div>
      </div>

      {!draft && (
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

      {draft && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-[var(--hub-border)] bg-[var(--status-success-bg)] p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
              <IconCheckCircle className="h-4 w-4 text-teal" />
              Structured from your paste — review and correct before saving.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(null);
                setStructureError(null);
              }}
            >
              <IconArrowLeft className="h-4 w-4" />
              Back to paste
            </Button>
          </div>

          {createdTemplate && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-4">
              <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                <IconCheckCircle className="h-4 w-4 text-teal" />
                Template saved — &ldquo;{createdTemplate.name}&rdquo; is in your workout templates.
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/hub/workout-templates"
                  className="inline-flex items-center h-8 px-3 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-xs font-medium hover:bg-[var(--hub-hover)] transition-colors"
                >
                  Go to workout templates
                </Link>
                <Button
                  type="button"
                  onClick={() => setAssignOpen(true)}
                  className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white text-xs h-8 px-3"
                >
                  <IconZap className="h-3.5 w-3.5" />
                  Assign to client
                </Button>
              </div>
            </div>
          )}

          <TemplateEditorClient
            template={draftToTemplate(draft)}
            sourceClientName={null}
            isNew
            onCreated={setCreatedTemplate}
          />
        </>
      )}

      {assignOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => !assigning && setAssignOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--color-ink)]">Assign template to a client</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Grounds this workout into the client&apos;s next block through the Plan Agent.
            </p>
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Client
            </label>
            <select
              value={assignClientNumber}
              onChange={(e) => setAssignClientNumber(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2 text-sm outline-none focus:border-rose"
            >
              <option value="">Select a client…</option>
              {assignableClients.map((c) => (
                <option key={c.id} value={String(c.client_number)}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)} disabled={assigning}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={assign}
                disabled={assigning || !assignClientNumber}
                className="gap-1.5 bg-rose hover:bg-rose/90 text-white"
              >
                {assigning ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconZap className="h-4 w-4" />}
                {assigning ? "Generating block…" : "Assign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
