"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExercisePicker } from "@/components/hub/ExercisePicker";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";

export interface InsertPositionOption {
  index: number;
  label: string;
}

export function AddExerciseDialog({
  open,
  onOpenChange,
  sectionLabel,
  positionOptions,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionLabel: string;
  positionOptions: InsertPositionOption[];
  onAdd: (exercise: ExerciseEntry, insertIndex: number) => void;
}) {
  const [positionIndex, setPositionIndex] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setPositionIndex(
        positionOptions.length
          ? positionOptions[positionOptions.length - 1].index
          : 0,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const headerContent = (
    <div className="flex flex-col gap-[5px]">
      <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
        Insert position
      </label>
      <Select
        value={String(positionIndex)}
        onValueChange={(v) => setPositionIndex(Number(v))}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setPositionIndex(
              positionOptions.length
                ? positionOptions[positionOptions.length - 1].index
                : 0,
            );
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {positionOptions.map((opt) => (
            <SelectItem key={opt.index} value={String(opt.index)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <ExercisePicker
      open={open}
      onOpenChange={onOpenChange}
      onSelect={(ex) => {
        onAdd(ex, positionIndex);
      }}
      title={`Add exercise — ${sectionLabel}`}
      description="Search the exercise library and choose where it lands."
      headerContent={headerContent}
    />
  );
}
