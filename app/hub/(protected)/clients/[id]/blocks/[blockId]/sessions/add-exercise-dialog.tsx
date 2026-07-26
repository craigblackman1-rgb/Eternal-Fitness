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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconSearch, IconPlus } from "@/components/icons";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";

export interface InsertPositionOption {
  /** Index in the section's exercise array to splice the new exercise at. */
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
  const [search, setSearch] = useState("");
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [positionIndex, setPositionIndex] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    setPositionIndex(positionOptions.length ? positionOptions[positionOptions.length - 1].index : 0);
    if (exercises.length > 0) return;

    let cancelled = false;
    setLoading(true);
    fetch("/api/exercises")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load exercises");
        const data = (await res.json()) as ExerciseEntry[];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return [];
    return exercises
      .filter((ex) => ex.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 24);
  }, [search, exercises]);

  const handleAdd = (ex: ExerciseEntry) => {
    onAdd(ex, positionIndex);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add exercise — {sectionLabel}</DialogTitle>
          <DialogDescription>
            Search the exercise library and choose where it lands in this section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Insert position</label>
          <Select value={String(positionIndex)} onValueChange={(v) => setPositionIndex(Number(v))}>
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
            <p className="py-4 text-center text-sm text-muted-foreground">Loading exercises...</p>
          )}
          {!loading && filtered.length === 0 && search && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No exercises match &ldquo;{search}&rdquo;
            </p>
          )}
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleAdd(ex)}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--hub-border)] p-3 text-left text-sm transition-colors hover:bg-[var(--hub-hover)]"
            >
              <div className="min-w-0">
                <span className="font-medium">{ex.name}</span>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {ex.equipment.length > 0 ? ex.equipment.join(", ") : "No equipment"}
                </p>
              </div>
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose/10 text-rose">
                <IconPlus className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
