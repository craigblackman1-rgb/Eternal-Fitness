"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HubPageHeader } from "@/components/hub/HubPageHeader";
import { HubCard } from "@/components/hub/HubCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IconArrowLeft } from "@/components/icons";
import type { ParsedProgram, ParsedSlot, SlotData, ProgramSection, ProgramExercise } from "@/lib/programs/types";

const slotLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function exercisePrescription(ex: ProgramExercise): string {
  const parts: string[] = [];
  if (ex.sets && ex.reps) parts.push(`${ex.sets} × ${ex.reps}`);
  else if (ex.sets) parts.push(`${ex.sets} sets`);
  else if (ex.reps) parts.push(ex.reps);
  if (ex.weight) parts.push(ex.weight);
  if (ex.duration) parts.push(ex.duration);
  return parts.join(" · ") || "—";
}

const sectionAccents: Record<string, string> = {
  warmup: "border-l-teal",
  cooldown: "border-l-muted",
  superset: "border-l-rose",
  circuit: "border-l-navy",
  straight: "border-l-muted",
};

const sectionHeaderBg: Record<string, string> = {
  warmup: "bg-teal/10 text-teal-text",
  cooldown: "bg-[var(--s-neutral-bg)] text-navy",
  superset: "bg-rose/10 text-rose-text",
  circuit: "bg-dark-navy/10 text-navy",
  straight: "bg-[var(--hub-hover)] text-foreground",
};

function SectionPreview({ section, slotIndex }: { section: ProgramSection; slotIndex: number }) {
  const kindLabel =
    section.kind === "warmup" ? "Warm-up" :
    section.kind === "cooldown" ? "Cool-down" :
    section.kind === "superset" ? `Superset ${slotIndex}` :
    section.kind === "circuit" ? `Circuit ${slotIndex}` :
    "Standalone";

  const accent = sectionAccents[section.kind] || "border-l-muted";
  const hdrBg = sectionHeaderBg[section.kind] || "bg-[var(--hub-hover)] text-foreground";
  const isSuperset = section.kind === "superset";

  return (
    <div className={cn("border border-[var(--hub-border)] border-l-4 rounded-nested mb-3 overflow-hidden bg-white", accent)}>
      <div className={cn("flex items-center gap-2 px-3 py-2 border-b border-[var(--hub-border)] text-[11.5px] font-extrabold uppercase tracking-widest", hdrBg)}>
        <span>{kindLabel}</span>
        {section.rest && (
          <span className="ml-auto normal-case tracking-normal font-medium text-[12px] text-body">
            {section.rest}
          </span>
        )}
      </div>
      <div>
        {section.exercises.map((ex, exIdx) => {
          const letter = isSuperset
            ? `${slotLetters[slotIndex - 1] || "A"}${exIdx + 1}`
            : undefined;
          return (
            <div key={exIdx} className="flex items-center gap-3 py-2.5 px-3 text-[13px] border-b border-[var(--hub-border)] last:border-b-0">
              {isSuperset && letter && (
                <span className="shrink-0 w-6 h-6 rounded-control-sm flex items-center justify-center text-[10.5px] font-extrabold bg-dark-navy text-white">
                  {letter}
                </span>
              )}
              <span className="flex-1 min-w-0 text-foreground font-medium">
                {ex.exercise_name}
                {ex.per_side && (
                  <span className="inline-flex items-center h-5 px-2 ml-2 rounded-pill bg-rose/10 border border-rose/20 text-rose-text text-[10.5px] font-bold uppercase tracking-wide">
                    {ex.per_side}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-body text-[12.5px]">
                {exercisePrescription(ex)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProgramImportClient() {
  const router = useRouter();
  const [pastedText, setPastedText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedProgram | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [programName, setProgramName] = useState("");

  const handleParse = async () => {
    if (!pastedText.trim()) return;
    setParsing(true);
    setParseError(null);
    setParsed(null);
    try {
      const res = await fetch("/api/programs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });

      // Streaming response: read lines, ignore keep-alive, parse final line
      if (res.headers.get("content-type")?.includes("text/plain") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let result: ParsedProgram | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue; // skip keep-alive newlines
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.error) throw new Error(parsed.error);
              result = parsed;
            } catch {
              // skip non-JSON keep-alive lines
            }
          }
        }
        // Process any remaining buffer
        const trimmed = buffer.trim();
        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.error) throw new Error(parsed.error);
            result = parsed;
          } catch (err) {
            if (err instanceof Error && err.message.includes("Parse failed")) throw err;
          }
        }
        if (result) {
          setParsed(result);
          setProgramName(result.name || "");
        }
      } else {
        // Fallback: non-streaming JSON response (defensive)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Parse failed (${res.status})`);
        }
        const data: ParsedProgram = await res.json();
        setParsed(data);
        setProgramName(data.name || "");
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsed || parsed.slots.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: programName || parsed.name || "Imported program",
          weeks: parsed.weeks || 6,
          slots: parsed.slots.map((s) => ({
            label: s.label,
            data: s.data,
          })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { id } = await res.json();
      toast.success("Program saved");
      router.push(`/hub/programs/${id}`);
    } catch {
      toast.error("Failed to save program");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/hub/programs"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-body hover:text-foreground"
      >
        <IconArrowLeft className="h-3.5 w-3.5" />
        Programs
      </Link>

      <HubPageHeader
        title="Import a program"
        subtitle="Paste a programme from Trainerize, a coach's plan, or plain text — we'll read the structure and show you exactly what will be saved."
      />

      <HubCard>
        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <h2 className="text-[15px] font-bold text-foreground">Parsed programme</h2>
            <span className="text-[12.5px] text-muted-foreground">Parsed live as you edit the left-hand text</span>
          </div>

          <div className="grid grid-cols-2 gap-4 items-start max-[1180px]:grid-cols-1">
            {/* Left: paste area */}
            <div>
              <textarea
                className="w-full min-h-[560px] border border-[var(--hub-field-border)] rounded-control p-3 font-mono text-[12.5px] leading-relaxed text-foreground bg-field-fill resize-y focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose"
                spellCheck={false}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={"Paste your programme here.\n\nWorkout A\nSuperset 1\nSingle Leg RDL TRX 3x10\nSingle Arm Floor Press LEFT 3x10-12\n\nrest 60s / 90s after pair"}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Plain text, one exercise per line. Sets × reps as &quot;3x10&quot; or &quot;3x10-12&quot;. Weight as &quot;@16kg&quot;. &quot;LEFT&quot;/&quot;RIGHT&quot; anywhere in the line is read as a per-side note.
              </p>
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleParse}
                  disabled={!pastedText.trim() || parsing}
                >
                  {parsing ? "Parsing…" : "Parse"}
                </Button>
              </div>
            </div>

            {/* Right: parsed result */}
            <div>
              {parseError && (
                <div className="border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] rounded-nested p-3 mb-3 text-[13px] text-[var(--status-danger)]">
                  {parseError}
                </div>
              )}

              {parsed && parsed.slots.length > 0 && (
                <>
                  {parsed.slots.map((slot, slotIdx) => (
                    <div key={slotIdx} className="mb-4">
                      {parsed.slots.length > 1 && (
                        <h3 className="text-xs font-bold text-foreground mb-2">{slot.label}</h3>
                      )}
                      {slot.data.sections.map((section, sIdx) => (
                        <SectionPreview
                          key={sIdx}
                          section={section}
                          slotIndex={sIdx + 1}
                        />
                      ))}
                    </div>
                  ))}

                  {/* Name + weeks fields */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="block text-[12.5px] text-muted-foreground mb-1">Programme name</label>
                      <input
                        type="text"
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        placeholder={parsed.name || "Imported programme"}
                        className="w-full h-8 border border-[var(--hub-field-border)] rounded-control-sm px-2.5 text-[13px] text-foreground bg-field-fill focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose"
                      />
                    </div>
                    <div>
                      <label className="block text-[12.5px] text-muted-foreground mb-1">Weeks</label>
                      <input
                        type="number"
                        value={parsed.weeks || 6}
                        readOnly
                        className="w-full h-8 border border-[var(--hub-field-border)] rounded-control-sm px-2.5 text-[13px] text-foreground bg-field-fill"
                      />
                    </div>
                  </div>
                </>
              )}

              {parsed && parsed.slots.length === 0 && !parseError && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  The parser returned no recognisable slots. Try pasting a more structured workout.
                </p>
              )}

              {!parsed && !parseError && !parsing && (
                <div className="flex items-center justify-center min-h-[300px] text-sm text-muted-foreground">
                  Paste text on the left and click Parse to see the structured result.
                </div>
              )}

              {parsing && (
                <div className="flex items-center justify-center min-h-[300px] text-sm text-muted-foreground">
                  Parsing…
                </div>
              )}
            </div>
          </div>
        </div>
      </HubCard>

      {/* Save / discard */}
      {parsed && parsed.slots.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setParsed(null); setPastedText(""); }}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save as new programme"}
          </Button>
        </div>
      )}
    </div>
  );
}
