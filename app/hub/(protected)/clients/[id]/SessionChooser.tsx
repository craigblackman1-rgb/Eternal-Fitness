"use client";

import { useEffect, useState } from "react";
import type { DBProgramSlot } from "@/lib/programs/types";
import type { SessionVersion } from "@/types";

/* ── SessionChooser — the guided three-way choice from program-chooser.html.
   When assigning a workout to a session, offers:
   1. Program queue (default, pre-selected next slot)
   2. Workout template (pick from library — real list, not placeholder)
   3. One-off build (navigates to add-workout page)
   Each option states what it does to the queue and paid pot. */

interface TemplateSummary {
  id: string;
  name: string;
  equipment: string[];
  position: string[];
  estimatedMinutes: number;
}

interface SessionChooserProps {
  nextSlot: DBProgramSlot | null;
  currentWeek: number;
  programWeeks: number;
  slotPosition: number;
  totalSlots: number;
  sessionsRemaining: number;
  programName: string;
  clientNumber: number;
  onConfirmProgram: (slotId: string) => void;
  onConfirmTemplate: (templateId: string, templateName: string, templateData: SessionVersion) => void;
  onConfirmOneOff: () => void;
  onCancel: () => void;
}

function slotLetter(slot: DBProgramSlot): string {
  const label = slot.label?.trim();
  if (label) {
    const match = label.match(/^([A-Za-z0-9]+)/);
    return match ? match[1] : label.slice(0, 3);
  }
  return String.fromCharCode(64 + slot.position);
}

function formatDeliveryMode(mode: string | null): string {
  if (!mode) return "—";
  return mode === "studio_1to1" ? "Studio 1:1" : mode === "home_training" ? "Home training" : mode;
}

export function SessionChooser({
  nextSlot,
  currentWeek,
  programWeeks,
  slotPosition,
  totalSlots,
  sessionsRemaining,
  programName,
  clientNumber,
  onConfirmProgram,
  onConfirmTemplate,
  onConfirmOneOff,
  onCancel,
}: SessionChooserProps) {
  const [choice, setChoice] = useState<"program" | "template" | "oneoff">("program");

  /* Template list state */
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  /* Load templates on demand when user picks the template route */
  useEffect(() => {
    if (choice !== "template" || templates.length > 0 || templatesLoading) return;
    setTemplatesLoading(true);
    fetch(`/api/clients/${clientNumber}/add-workout`)
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx) => {
        if (ctx?.matchedTemplates) setTemplates(ctx.matchedTemplates);
      })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, [choice, clientNumber, templates.length, templatesLoading]);

  const filteredTemplates = templateQuery.trim()
    ? templates.filter((t) => t.name.toLowerCase().includes(templateQuery.toLowerCase()))
    : templates;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  const nextSlotLabel = nextSlot ? slotLetter(nextSlot) : null;
  const remaining = Math.max(0, sessionsRemaining - 1);

  return (
    <div>
      {/* ── Choice cards ── */}
      <div className="grid grid-cols-3 gap-3 max-[1080px]:grid-cols-1">
        {/* Program queue */}
        <button
          type="button"
          onClick={() => setChoice("program")}
          aria-pressed={choice === "program"}
          className={`
            text-left border rounded-nested bg-white p-3.5 cursor-pointer font-[inherit]
            transition-[border-color,box-shadow] duration-[120ms]
            ${choice === "program"
              ? "border-rose shadow-[inset_0_0_0_1px_var(--rose)] bg-[var(--status-primary-bg)]"
              : "border-[var(--hub-border)] hover:border-rose"
            }
          `}
        >
          <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${choice === "program" ? "text-rose-text" : "text-[var(--color-muted)]"}`}>
            From her program
          </span>
          <p className="mt-1.5 mb-0.5 text-sm font-bold text-[var(--color-ink)]">
            {nextSlotLabel ? `Next up: Workout ${nextSlotLabel}` : "No next slot"}
          </p>
          <p className="m-0 text-[12.5px] text-[var(--color-body)]">
            Slot {slotPosition} of {totalSlots} in {programName}.
          </p>
          <p className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
            Uses <b className="text-[var(--color-ink)]">1 of {remaining}</b> remaining paid sessions · advances the queue to <b className="text-[var(--color-ink)]">slot {slotPosition + 1}</b>
          </p>
        </button>

        {/* Template */}
        <button
          type="button"
          onClick={() => setChoice("template")}
          aria-pressed={choice === "template"}
          className={`
            text-left border rounded-nested bg-white p-3.5 cursor-pointer font-[inherit]
            transition-[border-color,box-shadow] duration-[120ms]
            ${choice === "template"
              ? "border-rose shadow-[inset_0_0_0_1px_var(--rose)] bg-[var(--status-primary-bg)]"
              : "border-[var(--hub-border)] hover:border-rose"
            }
          `}
        >
          <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${choice === "template" ? "text-rose-text" : "text-[var(--color-muted)]"}`}>
            A workout template
          </span>
          <p className="mt-1.5 mb-0.5 text-sm font-bold text-[var(--color-ink)]">
            Pick from the library
          </p>
          <p className="m-0 text-[12.5px] text-[var(--color-body)]">
            A one-off from the shared exercise library, outside this program.
          </p>
          <p className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
            Uses <b className="text-[var(--color-ink)]">1 of {remaining}</b> remaining paid sessions · <b className="text-[var(--color-ink)]">does not</b> move the queue
          </p>
        </button>

        {/* One-off build */}
        <button
          type="button"
          onClick={() => setChoice("oneoff")}
          aria-pressed={choice === "oneoff"}
          className={`
            text-left border rounded-nested bg-white p-3.5 cursor-pointer font-[inherit]
            transition-[border-color,box-shadow] duration-[120ms]
            ${choice === "oneoff"
              ? "border-rose shadow-[inset_0_0_0_1px_var(--rose)] bg-[var(--status-primary-bg)]"
              : "border-[var(--hub-border)] hover:border-rose"
            }
          `}
        >
          <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${choice === "oneoff" ? "text-rose-text" : "text-[var(--color-muted)]"}`}>
            Build one-off
          </span>
          <p className="mt-1.5 mb-0.5 text-sm font-bold text-[var(--color-ink)]">
            Freeform, for today only
          </p>
          <p className="m-0 text-[12.5px] text-[var(--color-body)]">
            Not saved as reusable content — build it from scratch for this session.
          </p>
          <p className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
            Uses <b className="text-[var(--color-ink)]">1 of {remaining}</b> remaining paid sessions · <b className="text-[var(--color-ink)]">does not</b> move the queue
          </p>
        </button>
      </div>

      {/* ── Detail panels ── */}

      {/* Program detail */}
      {choice === "program" && nextSlot && (
        <div className="mt-3.5 border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] p-3.5">
          <p className="text-[13.5px] font-bold text-[var(--color-ink)] m-0 mb-2">
            Workout {slotLetter(nextSlot)} — slot {slotPosition} of {totalSlots}
          </p>
          <p className="text-[13px] text-[var(--color-muted)] m-0">
            {nextSlot.data?.sections?.length ?? 0} section{((nextSlot.data?.sections?.length ?? 0) === 1) ? "" : "s"} · Week {currentWeek} of {programWeeks}
          </p>
        </div>
      )}

      {/* Template picker */}
      {choice === "template" && (
        <div className="mt-3.5 border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] p-3.5">
          <p className="text-[13.5px] font-bold text-[var(--color-ink)] m-0 mb-2">
            Choose a template
          </p>
          {templatesLoading && (
            <p className="text-[13px] text-[var(--color-muted)] m-0">Loading templates…</p>
          )}
          {!templatesLoading && templates.length === 0 && (
            <p className="text-[13px] text-[var(--color-muted)] m-0">
              No templates match this client&apos;s equipment and training format.
            </p>
          )}
          {!templatesLoading && templates.length > 0 && (
            <>
              <input
                type="search"
                placeholder="Search templates…"
                value={templateQuery}
                onChange={(e) => setTemplateQuery(e.target.value)}
                className="w-full h-8 border border-[var(--hub-field-border)] rounded-control px-2.5 text-[12.5px] font-[inherit] bg-white mb-2 focus:outline-none focus:border-rose focus:shadow-[0_0_0_3px_rgba(193,131,159,.28)]"
              />
              <div className="max-h-[180px] overflow-y-auto space-y-1">
                {filteredTemplates.length === 0 && (
                  <p className="text-[12px] text-[var(--color-muted)] m-0 py-2">No matches.</p>
                )}
                {filteredTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id === selectedTemplateId ? null : t.id)}
                    className={`w-full text-left border rounded-control p-2.5 cursor-pointer font-[inherit] transition-[border-color] duration-[100ms] ${
                      selectedTemplateId === t.id
                        ? "border-rose bg-white shadow-[inset_0_0_0_1px_var(--rose)]"
                        : "border-[var(--hub-border)] bg-white hover:border-rose"
                    }`}
                  >
                    <span className="text-[13px] font-bold text-[var(--color-ink)] block">{t.name}</span>
                    <span className="text-[11px] text-[var(--color-muted)]">
                      {formatDeliveryMode(t.position[0] ?? null)} · {t.equipment.length > 0 ? t.equipment.join(", ") : "Bodyweight"} · est. {t.estimatedMinutes} min
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* One-off detail */}
      {choice === "oneoff" && (
        <div className="mt-3.5 border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] p-3.5">
          <p className="text-[13.5px] font-bold text-[var(--color-ink)] m-0 mb-2">
            Build for today
          </p>
          <p className="text-[13px] text-[var(--color-muted)] m-0">
            Opens the section editor — warm-up, supersets, standalone, cool-down. Nothing is saved back to a reusable program.
          </p>
        </div>
      )}

      {/* ── Footer actions ── */}
      <div className="flex justify-end gap-2 mt-3.5 pt-3.5 border-t border-[var(--hub-border)]">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-1.5 rounded-control border border-transparent bg-transparent text-[var(--color-muted)] font-[inherit] text-xs font-semibold cursor-pointer px-3.5 py-1.5 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={choice === "template" && !selectedTemplateId}
          onClick={() => {
            if (choice === "program" && nextSlot) {
              onConfirmProgram(nextSlot.id);
            } else if (choice === "template" && selectedTemplate) {
              onConfirmTemplate(selectedTemplate.id, selectedTemplate.name, {} as SessionVersion);
            } else if (choice === "oneoff") {
              onConfirmOneOff();
            }
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-control bg-rose text-white font-[inherit] text-xs font-semibold cursor-pointer px-3.5 py-1.5 hover:bg-[color-mix(in_oklab,var(--rose)_88%,var(--ink))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {choice === "program" && nextSlotLabel
            ? `Assign Workout ${nextSlotLabel} to this session`
            : choice === "template"
              ? selectedTemplateId
                ? `Assign "${selectedTemplate?.name}" to this session`
                : "Pick a template first"
              : "Open the one-off builder"}
        </button>
      </div>
    </div>
  );
}
