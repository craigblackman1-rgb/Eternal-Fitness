"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Archetype } from "@/types";

interface ExerciseEntry {
  id: string;
  name: string;
  source: "original" | "trainerize" | "custom";
  trainerize_custom: boolean | null;
  archetypes: string[];
  movement_type: string | null;
  muscle_groups: string[];
  equipment: string[];
  tags: string[];
  difficulty: number | null;
  position: "seated" | "supported" | "standing" | null;
  intensity_tiers: string[];
  coaching_cue: string | null;
  default_mod: string | null;
  image_url: string | null;
  video_url: string | null;
}

interface ExerciseFormDialogProps {
  /** Omit (or pass null) when the dialog is fully controlled via `open`/`onOpenChange` — e.g. the edit flow, which has no visible trigger element of its own. */
  trigger?: React.ReactNode;
  exercise?: ExerciseEntry | null;
  /** Controlled-open support, for the edit flow where a pencil icon elsewhere sets `exercise` and must also open this dialog. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function splitCommaField(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function joinArrayField(arr: string[] | null | undefined): string {
  return (arr ?? []).join(", ");
}

export function ExerciseFormDialog({ trigger, exercise, open: controlledOpen, onOpenChange }: ExerciseFormDialogProps) {
  const router = useRouter();
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) onOpenChange?.(val);
    else setInternalOpen(val);
  };
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [movementType, setMovementType] = useState("");
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [muscleGroups, setMuscleGroups] = useState("");
  const [equipment, setEquipment] = useState("");
  const [tags, setTags] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [coachingCue, setCoachingCue] = useState("");
  const [defaultMod, setDefaultMod] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const isEdit = !!exercise;

  useEffect(() => {
    if (open && exercise) {
      setName(exercise.name);
      setMovementType(exercise.movement_type ?? "");
      setArchetypes((exercise.archetypes ?? []) as Archetype[]);
      setMuscleGroups(joinArrayField(exercise.muscle_groups));
      setEquipment(joinArrayField(exercise.equipment));
      setTags(joinArrayField(exercise.tags));
      setDifficulty(exercise.difficulty != null ? String(exercise.difficulty) : "");
      setPosition(exercise.position ?? "");
      setCoachingCue(exercise.coaching_cue ?? "");
      setDefaultMod(exercise.default_mod ?? "");
      setImageUrl(exercise.image_url ?? "");
      setVideoUrl(exercise.video_url ?? "");
    }
  }, [open, exercise]);

  function toggleArchetype(a: Archetype) {
    setArchetypes((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  function resetForm() {
    setName("");
    setMovementType("");
    setArchetypes([]);
    setMuscleGroups("");
    setEquipment("");
    setTags("");
    setDifficulty("");
    setPosition("");
    setCoachingCue("");
    setDefaultMod("");
    setImageUrl("");
    setVideoUrl("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        movement_type: movementType.trim() || null,
        archetypes,
        muscle_groups: splitCommaField(muscleGroups),
        equipment: splitCommaField(equipment),
        tags: splitCommaField(tags),
        difficulty: difficulty ? Number(difficulty) : null,
        position: position || null,
        coaching_cue: coachingCue.trim() || null,
        default_mod: defaultMod.trim() || null,
        image_url: imageUrl.trim() || null,
        video_url: videoUrl.trim() || null,
      };

      let res: Response;
      if (isEdit && exercise) {
        res = await fetch(`/api/exercises/${exercise.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save exercise");

      toast.success(isEdit ? "Exercise updated" : "Exercise added");
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save exercise");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Exercise" : "Add Exercise"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the exercise details below."
              : "Add a new exercise to the library. It will be tagged as Custom."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Trap Bar Deadlift"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement_type">Movement Type</Label>
            <Input
              id="movement_type"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              placeholder="e.g. hinge_pattern"
            />
          </div>

          <div className="space-y-2">
            <Label>Archetypes</Label>
            <div className="flex gap-4">
              {(["A", "B", "C"] as Archetype[]).map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={archetypes.includes(a)}
                    onCheckedChange={() => toggleArchetype(a)}
                  />
                  Type {a}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="muscle_groups">Muscle Groups (comma-separated)</Label>
            <Input
              id="muscle_groups"
              value={muscleGroups}
              onChange={(e) => setMuscleGroups(e.target.value)}
              placeholder="e.g. quads, glutes, hamstrings"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment (comma-separated)</Label>
            <Input
              id="equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. dumbbell, mat"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. bilateral, strength"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Untagged</SelectItem>
                <SelectItem value="1">1 — Beginner</SelectItem>
                <SelectItem value="2">2 — Easy</SelectItem>
                <SelectItem value="3">3 — Intermediate</SelectItem>
                <SelectItem value="4">4 — Advanced</SelectItem>
                <SelectItem value="5">5 — Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger id="position">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Untagged</SelectItem>
                <SelectItem value="seated">Seated</SelectItem>
                <SelectItem value="supported">Supported</SelectItem>
                <SelectItem value="standing">Standing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coaching_cue">Coaching Cue</Label>
            <Textarea
              id="coaching_cue"
              value={coachingCue}
              onChange={(e) => setCoachingCue(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_mod">Default Modification</Label>
            <Textarea
              id="default_mod"
              value={defaultMod}
              onChange={(e) => setDefaultMod(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">Video URL</Label>
            <Input
              id="video_url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()} className="bg-rose hover:bg-rose/90 text-white font-semibold">
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Exercise"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
