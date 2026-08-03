"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconSearch } from "@/components/icons";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";

const movementTypeLabels: Record<string, string> = {
  spinal_mobility: "Spinal Mobility",
  upper_body_mobility: "Upper Body Mobility",
  lower_body_mobility: "Lower Body Mobility",
  full_body_mobility: "Full Body Mobility",
  rest_recovery: "Rest & Recovery",
  hinge_pattern: "Hinge Pattern",
  squat_pattern: "Squat Pattern",
  lunge_pattern: "Lunge Pattern",
  horizontal_push: "Horizontal Push",
  horizontal_pull: "Horizontal Pull",
  vertical_push: "Vertical Push",
  pull_accessory: "Pull Accessory",
  push_accessory: "Push Accessory",
  loaded_carry: "Loaded Carry",
  core_anterior: "Core — Anterior",
  core_posterior: "Core — Posterior",
  core_lateral: "Core — Lateral",
  power_output: "Power Output",
  lateral_movement: "Lateral Movement",
  locomotion: "Locomotion",
  cardio: "Cardio",
  mobility_dynamic: "Dynamic Mobility",
};

export function SwapExerciseDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: ExerciseEntry) => void;
}) {
  const [search, setSearch] = useState("");
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (exercises.length > 0) return;

    let cancelled = false;
    setLoading(true);
    fetch("/api/exercises")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load exercises");
        const data = await res.json() as ExerciseEntry[];
        if (!cancelled) setExercises(data);
      })
      .catch(() => {
        if (!cancelled) setExercises([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, exercises.length]);

  const filtered = useMemo(() => {
    if (!search) return exercises.slice(0, 24);
    return exercises
      .filter((ex) =>
        ex.name.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 24);
  }, [search, exercises]);

  const handleSelect = (ex: ExerciseEntry) => {
    onSelect(ex);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Swap Exercise</DialogTitle>
          <DialogDescription>
            Search for an exercise to replace the current one.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Type exercise name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          {loading && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Loading exercises...
            </p>
          )}
          {!loading && filtered.length === 0 && search && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No exercises match &ldquo;{search}&rdquo;
            </p>
          )}
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleSelect(ex)}
              className="w-full rounded-md border border-[var(--hub-border)] p-3 text-left text-sm transition-colors hover:bg-[var(--hub-hover)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{ex.name}</span>
                <div className="flex gap-1">
                  {ex.archetypes.map((a) => (
                    <Badge
                      key={a}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ex.movement_type ? movementTypeLabels[ex.movement_type] || ex.movement_type : "Untagged"}
                {ex.equipment.length > 0 &&
                  ` · ${ex.equipment.join(", ")}`}
              </p>
              <p className="mt-1 text-xs italic line-clamp-1">
                {ex.coaching_cue ?? "—"}
              </p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
