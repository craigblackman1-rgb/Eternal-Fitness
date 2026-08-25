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
import { IconSearch, IconPlus } from "@/components/icons";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";

interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: ExerciseEntry) => void;
  title?: string;
  description?: string;
  /** Extra content rendered between the header and search (e.g. position selector). */
  headerContent?: React.ReactNode;
  /** Optional slot rendered below the equipment line in each result card. */
  renderResultMeta?: (exercise: ExerciseEntry) => React.ReactNode;
}

const MAX_RESULTS = 24;

export function ExercisePicker({
  open,
  onOpenChange,
  onSelect,
  title = "Search exercises",
  description = "Find an exercise in the library or add a custom one.",
  headerContent,
  renderResultMeta,
}: ExercisePickerProps) {
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [creatingCustom, setCreatingCustom] = useState(false);

  useEffect(() => {
    if (!open) return;
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
    if (!search) return exercises.slice(0, MAX_RESULTS);
    return exercises
      .filter((ex) => ex.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, MAX_RESULTS);
  }, [search, exercises]);

  const handleSelect = (ex: ExerciseEntry) => {
    onSelect(ex);
    setSearch("");
    setCustomName("");
  };

  const handleCreateCustom = async () => {
    const trimmed = customName.trim();
    if (!trimmed) return;

    setCreatingCustom(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to create exercise");
      const created = (await res.json()) as ExerciseEntry;
      setExercises((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      handleSelect(created);
    } catch {
      // silently fail — the sheet stays open so the user can retry
    } finally {
      setCreatingCustom(false);
    }
  };

  const showCustomInput =
    search.length > 0 &&
    !exercises.some((ex) => ex.name.toLowerCase() === search.toLowerCase());

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
            <IconSearch className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-[15px] font-bold text-[var(--color-ink)] m-0 p-0 leading-none">
              {title}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5 p-0">
              {description}
            </SheetDescription>
          </div>
          <SheetClose className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </SheetClose>
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-[18px] space-y-[14px]">
          {headerContent}

          <div className="flex flex-col gap-[5px]">
            <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Search the exercise library
            </label>
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
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

            {!loading && filtered.length === 0 && search && !showCustomInput && (
              <p className="rounded-[12px] border border-dashed border-[var(--hub-border)] py-4 text-center text-sm text-muted-foreground">
                No exercises match &ldquo;{search}&rdquo;
              </p>
            )}

            {!loading && filtered.length === 0 && !search && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Start typing to search the exercise library.
              </p>
            )}

            {showCustomInput && (
              <div className="rounded-[12px] border border-dashed border-rose/30 bg-rose/5 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  &ldquo;{search}&rdquo; isn&apos;t in the library yet.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Custom exercise name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCustom();
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <button
                    onClick={handleCreateCustom}
                    disabled={creatingCustom || !customName.trim()}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-rose/20 bg-rose/10 px-3 text-xs font-semibold text-rose hover:bg-rose/15 disabled:opacity-50"
                  >
                    <IconPlus className="h-3 w-3" />
                    {creatingCustom ? "Adding…" : "Add"}
                  </button>
                </div>
              </div>
            )}

            {filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelect(ex)}
                className="flex w-full items-center gap-2.5 rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-2.5 text-left text-sm transition-colors hover:bg-[var(--hub-hover)]"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-[var(--color-ink)]">{ex.name}</span>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {ex.equipment.length > 0 ? ex.equipment.join(", ") : "No equipment"}
                  </p>
                  {renderResultMeta?.(ex)}
                </div>
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-hover)] text-rose hover:bg-rose/10 hover:border-rose/20"
                  aria-label={`Select ${ex.name}`}
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

/**
 * Compact trigger button for the exercise picker sheet.
 * Renders as an input-styled button that opens the ExercisePicker.
 */
export function ExercisePickerButton({
  value,
  onSelect,
  placeholder = "Exercise name",
  className,
}: {
  value: string;
  onSelect: (exercise: ExerciseEntry) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "flex h-9 w-full items-center gap-2 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 text-left text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--hub-hover)]",
          className ?? "",
        ].join(" ")}
      >
        {value ? (
          <span className="truncate">{value}</span>
        ) : (
          <span className="text-muted-foreground font-normal">{placeholder}</span>
        )}
        <IconSearch className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <ExercisePicker
        open={open}
        onOpenChange={setOpen}
        onSelect={(ex) => {
          onSelect(ex);
          setOpen(false);
        }}
        title="Select exercise"
        description="Search the exercise library or add a custom exercise."
      />
    </>
  );
}
