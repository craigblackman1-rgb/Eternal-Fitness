"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HubCard } from "@/components/hub/HubCard";
import { HubCardHeader } from "@/components/hub/HubCardHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  IconChevronLeft,
  IconSave,
  IconTrash2,
  IconPlus,
  IconChevronUp,
  IconChevronDown,
  IconX,
  IconDumbbell,
} from "@/components/icons";
import { movementTypeLabels } from "../workout-template-browser";
import { toast } from "sonner";
import type { WorkoutTemplate, Exercise, SessionVersion } from "@/types";

function difficultyLabel(d: number): string {
  if (d <= 1) return "Beginner";
  if (d <= 2) return "Easy";
  if (d <= 3) return "Intermediate";
  if (d <= 4) return "Advanced";
  return "Expert";
}

function blankExercise(): Exercise {
  return {
    exercise_name: "",
    sets: 1,
    reps: "",
    tempo: "-",
    rest: "-",
    coaching_cue: "",
    modification: "",
    equipment: [],
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function TemplateEditorClient({
  template,
  sourceClientName,
  isNew = false,
  onCreated,
}: {
  template: WorkoutTemplate;
  sourceClientName: string | null;
  /** Create mode — no row exists yet; save POSTs to /api/workout-templates. */
  isNew?: boolean;
  onCreated?: (t: WorkoutTemplate) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [data, setData] = useState<SessionVersion>(template.data);
  const [conditionTags, setConditionTags] = useState<string[]>(template.condition_tags);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [archetypes, setArchetypes] = useState(template.archetypes);
  const [movementTypes, setMovementTypes] = useState(template.movement_type);
  const [muscleGroups, setMuscleGroups] = useState(template.muscle_groups);
  const [equipment, setEquipment] = useState(template.equipment);
  const [difficulty, setDifficulty] = useState(template.difficulty);
  const [usageCount, setUsageCount] = useState(template.usage_count);

  const updateExercise = (
    section: keyof SessionVersion,
    idx: number,
    patch: Partial<Exercise>
  ) => {
    setData((prev) => {
      const arr = [...prev[section]];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [section]: arr };
    });
  };

  const addExercise = (section: keyof SessionVersion) => {
    setData((prev) => ({
      ...prev,
      [section]: [...prev[section], blankExercise()],
    }));
  };

  const removeExercise = (section: keyof SessionVersion, idx: number) => {
    setData((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== idx),
    }));
  };

  const moveExercise = (section: keyof SessionVersion, idx: number, dir: -1 | 1) => {
    setData((prev) => {
      const arr = [...prev[section]];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...prev, [section]: arr };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (isNew && !createdId) {
        const res = await fetch("/api/workout-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, data, condition_tags: conditionTags }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
        const created = (await res.json()) as WorkoutTemplate;
        setCreatedId(created.id);
        setArchetypes(created.archetypes);
        setMovementTypes(created.movement_type);
        setMuscleGroups(created.muscle_groups);
        setEquipment(created.equipment);
        setDifficulty(created.difficulty);
        setUsageCount(created.usage_count);
        onCreated?.(created);
        toast.success("Template saved");
        return;
      }

      const id = createdId ?? template.id;
      const res = await fetch(`/api/workout-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, data, condition_tags: conditionTags }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      const updated = await res.json();
      setArchetypes(updated.archetypes);
      setMovementTypes(updated.movement_type);
      setMuscleGroups(updated.muscle_groups);
      setEquipment(updated.equipment);
      setDifficulty(updated.difficulty);
      setUsageCount(updated.usage_count);
      toast.success("Template saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workout-templates/${template.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete");
      toast.success("Template deleted");
      router.push("/hub/workout-templates");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const totalExercises =
    data.warm_up.length + data.main_block.length + data.cooldown.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 justify-between">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <Link href="/hub/workout-templates" className="text-muted-foreground hover:text-foreground shrink-0 mt-1">
            <IconChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{isNew ? "New template" : "Edit template"}</h1>
            <div className="mt-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-md font-semibold text-[var(--color-ink)]"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isNew && (
            <Button
              onClick={() => setDeleteOpen(true)}
              variant="ghost"
              className="rounded-lg gap-1.5 px-3.5 py-1.5 h-auto text-sm font-semibold text-red-500 hover:text-red-600"
            >
              <IconTrash2 className="h-4 w-4" />Delete
            </Button>
          )}
          <Button
            onClick={save}
            disabled={saving}
            className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white px-3.5 py-1.5 h-auto text-sm font-semibold"
          >
            <IconSave className="h-4 w-4" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This template will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTemplate}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HubCard>
        <HubCardHeader title="Details" />
        <div className="mt-5 border-t border-[var(--hub-border)] pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            {sourceClientName && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Source client</div>
                <div className="text-[var(--color-ink)]">{sourceClientName}</div>
              </div>
            )}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Usage</div>
              <div className="tabular-nums text-[var(--color-ink)]">{usageCount}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Exercises</div>
              <div className="tabular-nums text-[var(--color-ink)]">{totalExercises}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Difficulty</div>
              <div>
                {difficulty != null ? (
                  <span className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-body)]">
                    {difficultyLabel(difficulty)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
            {!isNew && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Created</div>
                <div className="text-[var(--color-body)] text-[13px]">{formatDate(template.created_at)}</div>
              </div>
            )}
            {!isNew && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Updated</div>
                <div className="text-[var(--color-body)] text-[13px]">{formatDate(template.updated_at)}</div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Archetypes</div>
            <div className="flex flex-wrap gap-1">
              {archetypes.map((a) => (
                <span key={a} className="inline-flex rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] border border-[var(--status-primary-border)] px-1.5 py-0 text-[10px] font-semibold leading-none">
                  {a}
                </span>
              ))}
              {archetypes.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Movement types</div>
            <div className="flex flex-wrap gap-1">
              {movementTypes.map((mt) => (
                <span key={mt} className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold text-muted-foreground leading-none">
                  {movementTypeLabels[mt] || mt}
                </span>
              ))}
              {movementTypes.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Muscle groups</div>
            <div className="flex flex-wrap gap-1">
              {muscleGroups.map((mg) => (
                <span key={mg} className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold text-muted-foreground leading-none">
                  {mg}
                </span>
              ))}
              {muscleGroups.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Equipment</div>
            <div className="flex flex-wrap gap-1">
              {equipment.map((eq) => (
                <span key={eq} className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold text-muted-foreground leading-none">
                  {eq}
                </span>
              ))}
              {equipment.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Condition tags</div>
            <TagInput value={conditionTags} onChange={setConditionTags} />
          </div>
        </div>
      </HubCard>

      <ExerciseSection
        title="Warm-up"
        icon={<IconDumbbell className="w-4 h-4" />}
        exercises={data.warm_up}
        onUpdate={(idx, patch) => updateExercise("warm_up", idx, patch)}
        onAdd={() => addExercise("warm_up")}
        onRemove={(idx) => removeExercise("warm_up", idx)}
        onMove={(idx, dir) => moveExercise("warm_up", idx, dir)}
      />

      <ExerciseSection
        title="Main Block"
        icon={<IconDumbbell className="w-4 h-4" />}
        exercises={data.main_block}
        onUpdate={(idx, patch) => updateExercise("main_block", idx, patch)}
        onAdd={() => addExercise("main_block")}
        onRemove={(idx) => removeExercise("main_block", idx)}
        onMove={(idx, dir) => moveExercise("main_block", idx, dir)}
      />

      <ExerciseSection
        title="Cooldown"
        icon={<IconDumbbell className="w-4 h-4" />}
        exercises={data.cooldown}
        onUpdate={(idx, patch) => updateExercise("cooldown", idx, patch)}
        onAdd={() => addExercise("cooldown")}
        onRemove={(idx) => removeExercise("cooldown", idx)}
        onMove={(idx, dir) => moveExercise("cooldown", idx, dir)}
      />
    </div>
  );
}

function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
        >
          {tag}
          <button onClick={() => remove(tag)} className="hover:text-foreground">
            <IconX className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Input
        placeholder="Add tag…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        className="h-7 w-32 text-xs rounded-full border-[var(--hub-field-border)] bg-[var(--hub-card)]"
      />
    </div>
  );
}

function EquipmentTagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold text-muted-foreground"
        >
          {tag}
          <button onClick={() => remove(tag)} className="hover:text-foreground">
            <IconX className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <Input
        placeholder="Add…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        className="h-6 w-24 text-[10px] rounded-full border-[var(--hub-field-border)] bg-[var(--hub-card)]"
      />
    </div>
  );
}

function ExerciseSection({
  title,
  icon,
  exercises,
  onUpdate,
  onAdd,
  onRemove,
  onMove,
}: {
  title: string;
  icon: React.ReactNode;
  exercises: Exercise[];
  onUpdate: (idx: number, patch: Partial<Exercise>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);

  return (
    <HubCard>
      <HubCardHeader
        icon={icon}
        title={title}
        subtitle={`${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`}
        action={
          <Button
            onClick={onAdd}
            className="rounded-lg gap-1 bg-rose hover:bg-rose/90 text-white px-2.5 py-1 h-auto text-xs font-semibold"
          >
            <IconPlus className="h-3.5 w-3.5" />Add exercise
          </Button>
        }
      />

      <div className="mt-5 border-t border-[var(--hub-border)] pt-5 space-y-3">
        {exercises.map((ex, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-2.5"
          >
            <div className="mt-0.5 flex flex-col gap-0.5">
              <button
                disabled={idx === 0}
                onClick={() => onMove(idx, -1)}
                className="grid h-4 w-5 place-items-center rounded-t border border-[var(--hub-border)] text-muted-foreground hover:bg-[var(--hub-hover)] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Move up"
              >
                <IconChevronUp className="h-3 w-3" />
              </button>
              <button
                disabled={idx === exercises.length - 1}
                onClick={() => onMove(idx, 1)}
                className="grid h-4 w-5 place-items-center rounded-b border border-t-0 border-[var(--hub-border)] text-muted-foreground hover:bg-[var(--hub-hover)] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Move down"
              >
                <IconChevronDown className="h-3 w-3" />
              </button>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Exercise name"
                  value={ex.exercise_name}
                  onChange={(e) => onUpdate(idx, { exercise_name: e.target.value })}
                  className="flex-1 min-w-[160px] font-semibold text-sm text-[var(--color-ink)]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoveIdx(idx)}
                  className="px-2 rounded-lg h-auto text-xs text-red-500 hover:text-red-600 shrink-0"
                >
                  <IconTrash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Sets</label>
                  <Input
                    type="number"
                    min={0}
                    value={ex.sets}
                    onChange={(e) => onUpdate(idx, { sets: Math.max(0, Number(e.target.value)) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Reps</label>
                  <Input
                    value={ex.reps}
                    onChange={(e) => onUpdate(idx, { reps: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Tempo</label>
                  <Input
                    value={ex.tempo}
                    onChange={(e) => onUpdate(idx, { tempo: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Rest</label>
                  <Input
                    value={ex.rest}
                    onChange={(e) => onUpdate(idx, { rest: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Group label</label>
                  <Input
                    value={ex.group_label ?? ""}
                    onChange={(e) => onUpdate(idx, { group_label: e.target.value || undefined })}
                    placeholder="e.g. Superset A"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Log type</label>
                  <select
                    value={ex.log_type ?? "reps"}
                    onChange={(e) => onUpdate(idx, { log_type: e.target.value as "reps" | "time" })}
                    className="h-8 w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2 text-xs font-[inherit] outline-none"
                  >
                    <option value="reps">Reps &amp; wt</option>
                    <option value="time">Time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Coaching cue</label>
                  <Input
                    value={ex.coaching_cue}
                    onChange={(e) => onUpdate(idx, { coaching_cue: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Modification</label>
                  <Input
                    value={ex.modification}
                    onChange={(e) => onUpdate(idx, { modification: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">Equipment</label>
                <EquipmentTagInput
                  value={ex.equipment}
                  onChange={(v) => onUpdate(idx, { equipment: v })}
                />
              </div>
            </div>
          </div>
        ))}

        {exercises.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No exercises in this section yet.</p>
        )}
      </div>

      <AlertDialog open={removeIdx !== null} onOpenChange={(v) => { if (!v) setRemoveIdx(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &ldquo;{removeIdx != null ? exercises[removeIdx]?.exercise_name || "exercise" : ""}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This exercise will be removed from the template. This does not affect any sessions that have already used this template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeIdx != null) onRemove(removeIdx);
                setRemoveIdx(null);
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HubCard>
  );
}
