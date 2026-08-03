"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
    if (!search) return exercises.slice(0, 24);
    return exercises
      .filter((ex) => ex.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 24);
  }, [search, exercises]);

  const handleAdd = (ex: ExerciseEntry) => {
    onAdd(ex, positionIndex);
    setSearch("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full flex-col gap-0 p-0 [&>button[data-slot=close]]:hidden"
        style={{
          width: "min(460px, 100vw)",
          background: "var(--hub-canvas)",
          boxShadow: "-12px 0 40px rgba(16,24,40,.14)",
        }}
      >
        <div className="flex items-center gap-3 border-b border-[var(--hub-border)] bg-[var(--hub-card)] px-[22px] py-[18px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-rose/10 text-rose">
            <IconPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-[15px] font-bold text-[var(--color-ink)] m-0 p-0 leading-none">
              Add exercise — {sectionLabel}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5 p-0">
              Search the exercise library and choose where it lands.
            </SheetDescription>
          </div>
          <SheetClose className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </SheetClose>
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-[18px] space-y-[14px]">
          <div className="flex flex-col gap-[5px]">
            <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Insert position
            </label>
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

          <div className="flex flex-col gap-[5px]">
            <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Search the exercise library
            </label>
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search 148 movements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col gap-[6px] mt-1">
            {loading && (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading exercises...</p>
            )}
            {!loading && filtered.length === 0 && search && (
              <p className="rounded-xl border border-dashed border-[var(--hub-border)] py-4 text-center text-sm text-muted-foreground">
                No exercises match &ldquo;{search}&rdquo;
              </p>
            )}
            {filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleAdd(ex)}
                className="flex w-full items-center gap-2.5 rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-2.5 text-left text-sm transition-colors hover:bg-[var(--hub-hover)]"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-[var(--color-ink)]">{ex.name}</span>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {ex.equipment.length > 0 ? ex.equipment.join(", ") : "No equipment"}
                  </p>
                </div>
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-hover)] text-rose hover:bg-rose/10 hover:border-rose/20"
                  aria-label={`Add ${ex.name}`}
                >
                  <IconPlus className="h-[15px] w-[15px]" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
