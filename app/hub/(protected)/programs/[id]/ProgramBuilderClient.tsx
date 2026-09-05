"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HubPageHeader } from "@/components/hub/HubPageHeader";
import { HubCard } from "@/components/hub/HubCard";
import { TokenPill } from "@/components/hub/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  IconArrowLeft,
  IconPlus,
  IconCopy,
  IconGripVertical,
  IconChevronDown,
} from "@/components/icons";
import type { DBProgram, DBProgramSlot, SlotData, ProgramSection, ProgramExercise, WeekBand } from "@/lib/programs/types";
import type { StatusToken } from "@/lib/hubStatus";

interface ProgramWithSlots extends DBProgram {
  clients?: { name: string; client_number: string | null } | null;
}

const statusConfig: Record<string, { token: StatusToken; label: string }> = {
  active: { token: "primary", label: "Active" },
  archived: { token: "neutral", label: "Archived" },
};

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

function sectionSummary(section: ProgramSection): string {
  const n = section.exercises.length;
  if (section.kind === "warmup") return `${n} moves`;
  if (section.kind === "cooldown") return `${n} stretches`;
  if (section.kind === "superset") {
    const rest = section.rest ? ` · ${section.rest} after the pair` : "";
    return `${n / 2} pairs${rest}`;
  }
  return `${n} exercises`;
}

function slotMeta(slot: DBProgramSlot): string {
  const sections = slot.data?.sections ?? [];
  return sections.map((s) => {
    const label = s.label || (s.kind === "warmup" ? "Warm-up" : s.kind === "cooldown" ? "Cool-down" : s.kind === "superset" ? "Superset" : s.kind === "circuit" ? "Circuit" : "Standalone");
    return label;
  }).join(" · ");
}

// ─── Section renderers ──────────────────────────────────────────────

function ExerciseRow({
  exercise,
  letter,
  isSuperset,
  onEdit,
}: {
  exercise: ProgramExercise;
  letter?: string;
  isSuperset?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-2.5 px-3 text-[13px]", "border-b border-[var(--hub-border)] last:border-b-0")}>
      {isSuperset && letter && (
        <span className="shrink-0 w-6 h-6 rounded-control-sm flex items-center justify-center text-[10.5px] font-extrabold bg-dark-navy text-white">
          {letter}
        </span>
      )}
      <span className="flex-1 min-w-0 text-foreground font-medium">
        {exercise.exercise_name}
        {exercise.per_side && (
          <span className="inline-flex items-center h-5 px-2 ml-2 rounded-pill bg-rose/10 border border-rose/20 text-rose-text text-[10.5px] font-bold uppercase tracking-wide shrink-0">
            {exercise.per_side}
          </span>
        )}
        {exercise.notes && (
          <span className="text-muted-foreground font-normal ml-2">({exercise.notes})</span>
        )}
      </span>
      <span className="shrink-0 tabular-nums text-body text-[12.5px]">
        {exercisePrescription(exercise)}
      </span>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-[12.5px] font-semibold text-rose-text hover:underline underline-offset-2"
        >
          Edit
        </button>
      )}
    </div>
  );
}

function InlineExerciseEditor({
  exercise,
  weekBands,
  totalWeeks,
  onSave,
  onCancel,
}: {
  exercise: ProgramExercise;
  weekBands: WeekBand[];
  totalWeeks: number;
  onSave: (updated: ProgramExercise, bands: WeekBand[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(exercise.exercise_name);
  const [sets, setSets] = useState(exercise.sets?.toString() ?? "");
  const [reps, setReps] = useState(exercise.reps ?? "");
  const [weight, setWeight] = useState(exercise.weight ?? "");
  const [perSide, setPerSide] = useState(exercise.per_side ?? "");
  const [bands, setBands] = useState<WeekBand[]>(weekBands);

  const handleSave = () => {
    onSave(
      {
        ...exercise,
        exercise_name: name,
        sets: sets ? parseInt(sets, 10) || undefined : undefined,
        reps: reps || undefined,
        weight: weight || undefined,
        per_side: perSide || undefined,
      },
      bands,
    );
  };

  return (
    <div className="bg-field-fill border-t border-dashed border-[var(--hub-border)] p-3">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr] gap-2.5 items-end max-md:grid-cols-1">
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Exercise</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-[13px] rounded-control-sm" />
        </div>
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Sets</label>
          <Input value={sets} onChange={(e) => setSets(e.target.value)} className="h-8 text-[13px] rounded-control-sm" />
        </div>
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reps</label>
          <Input value={reps} onChange={(e) => setReps(e.target.value)} className="h-8 text-[13px] rounded-control-sm" />
        </div>
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Weight</label>
          <Input value={weight} onChange={(e) => setWeight(e.target.value)} className="h-8 text-[13px] rounded-control-sm" />
        </div>
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Per-side note</label>
          <Input value={perSide} onChange={(e) => setPerSide(e.target.value)} placeholder="e.g. LEFT arm only" className="h-8 text-[13px] rounded-control-sm" />
        </div>
      </div>

      <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground mt-4 mb-2">Week-band progression</p>
      <div className="rounded-nested border border-[var(--hub-border)] overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--hub-border)]">
              <th className="text-left px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Weeks</th>
              <th className="text-left px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Sets × reps</th>
              <th className="text-left px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Weight</th>
            </tr>
          </thead>
          <tbody>
            {bands.length > 0 ? (
              bands.map((band, i) => (
                <tr key={i} className="border-b border-[var(--hub-border)] last:border-b-0 hover:bg-[var(--hub-hover)]">
                  <td className="px-2.5 py-2 tabular-nums whitespace-nowrap">{band.from_week}–{band.to_week}</td>
                  <td className="px-2.5 py-2 tabular-nums">
                    {band.sets && band.reps ? `${band.sets} × ${band.reps}` : "—"}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums">{band.weight || "—"}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-[var(--hub-border)] last:border-b-0">
                <td colSpan={3} className="px-2.5 py-2 text-muted-foreground">
                  No week bands — base prescription applies every week
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave}>Save exercise</Button>
      </div>
    </div>
  );
}

// ─── Section card ───────────────────────────────────────────────────

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

function SectionCard({
  section,
  sectionIndex,
  totalWeeks,
  onExerciseUpdate,
}: {
  section: ProgramSection;
  sectionIndex: number;
  totalWeeks: number;
  onExerciseUpdate: (sectionIdx: number, exerciseIdx: number, updated: ProgramExercise, bands: WeekBand[]) => void;
}) {
  const [editingExercise, setEditingExercise] = useState<number | null>(null);

  const kindLabel =
    section.kind === "warmup" ? "Warm-up circuit" :
    section.kind === "cooldown" ? "Cool-down" :
    section.kind === "superset" ? `Superset ${sectionIndex}` :
    section.kind === "circuit" ? `Circuit ${sectionIndex}` :
    "Standalone";

  const accent = sectionAccents[section.kind] || "border-l-muted";
  const hdrBg = sectionHeaderBg[section.kind] || "bg-[var(--hub-hover)] text-foreground";
  const isSuperset = section.kind === "superset";

  const roundsText = section.rounds ? `${section.rounds} round${section.rounds > 1 ? "s" : ""}` : "";
  const restParts: string[] = [];
  if (section.rest) restParts.push(section.rest);
  if (isSuperset && restParts.length) restParts[0] = `between · ${restParts[0]} after the pair`;
  const metaText = roundsText ? `${roundsText} · ${section.exercises.length} moves` : `${section.exercises.length} exercises`;

  return (
    <div className={cn("border border-[var(--hub-border)] border-l-4 rounded-nested mb-3 overflow-hidden bg-white", accent)}>
      <div className={cn("flex items-center gap-2 px-3 py-2 border-b border-[var(--hub-border)] text-[11.5px] font-extrabold uppercase tracking-widest", hdrBg)}>
        <span>{kindLabel}</span>
        <span className="ml-auto normal-case tracking-normal font-medium text-[12px] text-body">
          {isSuperset && section.rest
            ? `30s between · ${section.rest} after the pair`
            : metaText}
        </span>
      </div>
      <div>
        {section.exercises.map((ex, exIdx) => {
          const letter = isSuperset
            ? `${slotLetters[sectionIndex - 1] || "A"}${exIdx + 1}`
            : undefined;
          return (
            <div key={exIdx}>
              <ExerciseRow
                exercise={ex}
                letter={letter}
                isSuperset={isSuperset}
                onEdit={() => setEditingExercise(editingExercise === exIdx ? null : exIdx)}
              />
              {editingExercise === exIdx && (
                <InlineExerciseEditor
                  exercise={ex}
                  weekBands={ex.week_bands ?? []}
                  totalWeeks={totalWeeks}
                  onSave={(updated, bands) => {
                    onExerciseUpdate(sectionIndex, exIdx, updated, bands);
                    setEditingExercise(null);
                  }}
                  onCancel={() => setEditingExercise(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slot card ──────────────────────────────────────────────────────

function SlotCard({
  slot,
  index,
  expanded,
  onToggle,
  totalWeeks,
  onExerciseUpdate,
}: {
  slot: DBProgramSlot;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  totalWeeks: number;
  onExerciseUpdate: (slotIdx: number, sectionIdx: number, exerciseIdx: number, updated: ProgramExercise, bands: WeekBand[]) => void;
}) {
  const letter = slotLetters[index] || String(index + 1);
  const label = slot.label || `Workout ${letter}`;
  const sections = slot.data?.sections ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-2.5 border rounded-nested bg-white text-left transition-colors",
          expanded
            ? "border-rose shadow-[inset_0_0_0_1px_var(--rose)]"
            : "border-[var(--hub-border)] hover:bg-[var(--hub-hover)]",
        )}
      >
        <span className="shrink-0 text-muted-foreground text-sm cursor-grab" aria-hidden="true">
          <IconGripVertical className="h-4 w-4" />
        </span>
        <span className="shrink-0 w-[30px] h-[30px] rounded-control-sm flex items-center justify-center text-xs font-extrabold bg-rose/10 text-rose-text">
          {letter}
        </span>
        <span className="flex-1 min-w-0">
          <span className="text-[13.5px] font-semibold text-foreground block">{label}</span>
          <span className="text-xs text-muted-foreground block mt-0.5">
            {sections.length > 0 ? slotMeta(slot) : "Empty slot"}
          </span>
        </span>
        <span className="shrink-0">
          <IconChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-150", expanded && "rotate-180")} />
        </span>
      </button>

      {expanded && (
        <div className="mt-[-2px] mb-3 bg-white border border-[var(--hub-border)] rounded-nested p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">{label} — sections</span>
          </div>
          {sections.map((section, sIdx) => (
            <SectionCard
              key={sIdx}
              section={section}
              sectionIndex={sIdx + 1}
              totalWeeks={totalWeeks}
              onExerciseUpdate={(sectionIdx, exerciseIdx, updated, bands) => {
                onExerciseUpdate(index, sectionIdx, exerciseIdx, updated, bands);
              }}
            />
          ))}
          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No sections yet. Add exercises to build this slot.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main builder ───────────────────────────────────────────────────

export function ProgramBuilderClient({
  program,
  slots: initialSlots,
}: {
  program: ProgramWithSlots;
  slots: DBProgramSlot[];
}) {
  const router = useRouter();
  const [name, setName] = useState(program.name);
  const [weeks, setWeeks] = useState(program.weeks.toString());
  const [notes, setNotes] = useState(program.notes ?? "");
  const [slots, setSlots] = useState<DBProgramSlot[]>(initialSlots);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);

  const statusCfg = statusConfig[program.status] ?? statusConfig.active;
  const slotCount = slots.length;
  const totalSessions = parseInt(weeks || "6", 10) * slotCount;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          weeks: parseInt(weeks, 10) || 6,
          notes: notes || null,
          slots: slots.map((s, i) => ({
            label: s.label,
            data: s.data,
            position: i + 1,
          })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Program saved");
    } catch {
      toast.error("Failed to save program");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = () => {
    const newSlot: DBProgramSlot = {
      id: `temp-${Date.now()}`,
      program_id: program.id,
      position: slots.length + 1,
      label: `Workout ${slotLetters[slots.length] || slots.length + 1}`,
      data: { sections: [] },
      created_at: new Date().toISOString(),
    };
    setSlots([...slots, newSlot]);
    setExpandedSlot(slots.length);
  };

  const handleDuplicateSlot = (index: number) => {
    const original = slots[index];
    const copy: DBProgramSlot = {
      ...original,
      id: `temp-${Date.now()}`,
      position: slots.length + 1,
      label: `${original.label || "Workout"} (copy)`,
      data: JSON.parse(JSON.stringify(original.data)),
    };
    const newSlots = [...slots];
    newSlots.splice(index + 1, 0, copy);
    setSlots(newSlots.map((s, i) => ({ ...s, position: i + 1 })));
  };

  const handleExerciseUpdate = (
    slotIdx: number,
    sectionIdx: number,
    exerciseIdx: number,
    updated: ProgramExercise,
    bands: WeekBand[],
  ) => {
    setSlots((prev) => {
      const next = [...prev];
      const slot = { ...next[slotIdx] };
      const data = { ...slot.data };
      const sections = [...data.sections];
      const section = { ...sections[sectionIdx] };
      const exercises = [...section.exercises];
      exercises[exerciseIdx] = { ...updated, week_bands: bands.length > 0 ? bands : undefined };
      section.exercises = exercises;
      sections[sectionIdx] = section;
      data.sections = sections;
      slot.data = data;
      next[slotIdx] = slot;
      return next;
    });
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
        title={
          <span className="flex items-center gap-2.5 flex-wrap">
            {name || "Untitled program"}
            <TokenPill token={statusCfg.token} label={statusCfg.label} />
            <span className="text-sm font-normal text-muted-foreground">
              {weeks} weeks
            </span>
          </span>
        }
        subtitle={
          program.clients
            ? `Assigned to ${program.clients.name} · ${slotCount} slot${slotCount !== 1 ? "s" : ""} in rotation · ${totalSessions} sessions`
            : `Library programme · ${slotCount} slot${slotCount !== 1 ? "s" : ""} in rotation · ${totalSessions} sessions`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save program"}
            </Button>
          </div>
        }
      />

      {/* Program details */}
      <HubCard>
        <div className="p-4">
          <h2 className="text-[15px] font-bold text-foreground mb-3">Program details</h2>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div>
              <label className="block text-[12.5px] text-muted-foreground mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-[13px]" />
            </div>
            <div>
              <label className="block text-[12.5px] text-muted-foreground mb-1">Length</label>
              <div className="relative">
                <Input value={weeks} onChange={(e) => setWeeks(e.target.value)} className="h-8 text-[13px] pr-12" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">weeks</span>
              </div>
            </div>
          </div>
          {notes !== undefined && (
            <div className="mt-3">
              <label className="block text-[12.5px] text-muted-foreground mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[60px] border border-[var(--hub-field-border)] rounded-control-sm p-2.5 text-[13px] font-[inherit] text-foreground bg-field-fill resize-y focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose"
                placeholder="Optional notes about this programme…"
              />
            </div>
          )}
        </div>
      </HubCard>

      {/* Slot queue */}
      <HubCard>
        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <h2 className="text-[15px] font-bold text-foreground">Slot queue</h2>
            <span className="text-[12.5px] text-muted-foreground">Rotates A → B → A → B… as sessions complete</span>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={handleAddSlot} className="gap-1 text-xs">
                <IconPlus className="h-3 w-3" />
                Add slot
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {slots.map((slot, i) => (
              <div key={slot.id} className="relative group">
                <SlotCard
                  slot={slot}
                  index={i}
                  expanded={expandedSlot === i}
                  onToggle={() => setExpandedSlot(expandedSlot === i ? null : i)}
                  totalWeeks={parseInt(weeks || "6", 10)}
                  onExerciseUpdate={handleExerciseUpdate}
                />
                {expandedSlot !== i && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateSlot(i);
                      }}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <IconCopy className="h-3 w-3" />
                      Duplicate
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No slots yet. Click "Add slot" to start building your programme.
              </p>
            )}
          </div>
        </div>
      </HubCard>
    </div>
  );
}
