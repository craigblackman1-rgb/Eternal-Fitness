"use client";

import { ExercisePicker } from "@/components/hub/ExercisePicker";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";

export function SwapExerciseDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: ExerciseEntry) => void;
}) {
  return (
    <ExercisePicker
      open={open}
      onOpenChange={onOpenChange}
      onSelect={(ex) => {
        onSelect(ex);
        onOpenChange(false);
      }}
      title="Swap Exercise"
      description="Search for an exercise to replace the current one."
    />
  );
}
