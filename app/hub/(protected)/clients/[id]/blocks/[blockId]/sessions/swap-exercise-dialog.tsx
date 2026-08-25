"use client";

import { Badge } from "@/components/ui/badge";
import { ExercisePicker } from "@/components/hub/ExercisePicker";
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
      renderResultMeta={(ex) => (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {ex.archetypes.map((a) => (
            <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0">
              {a}
            </Badge>
          ))}
          <span className="text-[11px] text-muted-foreground">
            {ex.movement_type
              ? movementTypeLabels[ex.movement_type] || ex.movement_type
              : "Untagged"}
          </span>
          {ex.coaching_cue && (
            <p className="w-full mt-1 text-[11px] italic text-muted-foreground line-clamp-1">
              {ex.coaching_cue}
            </p>
          )}
        </div>
      )}
    />
  );
}
