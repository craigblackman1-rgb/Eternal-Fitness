"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HubCard } from "@/components/hub/HubCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconDumbbell, IconMenu, IconSearch, IconChevronLeft, IconChevronRight, IconX, IconCopy } from "@/components/icons";
import { EmptyState } from "@/components/hub/EmptyState";
import type { WorkoutTemplate } from "@/types";

export const movementTypeLabels: Record<string, string> = {
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

const equipmentLabels: Record<string, string> = {
  mat: "Mat",
  dumbbell: "Dumbbell",
  kettlebell: "Kettlebell",
  "resistance band": "Band",
  "barbell+plates": "Barbell",
  TRX: "TRX",
  "step/box": "Step/Box",
  "stationary bike": "Bike",
  treadmill: "Treadmill",
  "rowing machine": "Rower",
  "stability ball": "Stability Ball",
  "foam roller": "Foam Roller",
};

function difficultyLabel(d: number): string {
  if (d <= 1) return "Beginner";
  if (d <= 2) return "Easy";
  if (d <= 3) return "Intermediate";
  if (d <= 4) return "Advanced";
  return "Expert";
}

function exerciseCount(t: WorkoutTemplate): number {
  return (t.data.warm_up?.length ?? 0) + (t.data.main_block?.length ?? 0) + (t.data.cooldown?.length ?? 0);
}

function allExerciseNames(t: WorkoutTemplate): string[] {
  return [...(t.data.warm_up ?? []), ...(t.data.main_block ?? []), ...(t.data.cooldown ?? [])].map((ex) => ex.exercise_name);
}

export function WorkoutTemplateBrowser({
  templates,
  archetypeOptions,
  movementOptions,
  muscleOptions,
  equipmentOptions,
  conditionTagOptions,
}: {
  templates: WorkoutTemplate[];
  archetypeOptions: string[];
  movementOptions: string[];
  muscleOptions: string[];
  equipmentOptions: string[];
  conditionTagOptions: string[];
}) {
  const [search, setSearch] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<"all" | "A" | "B" | "C">("all");
  const [movementFilter, setMovementFilter] = useState("all");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState<number>(0);
  const [conditionFilter, setConditionFilter] = useState("all");
  const [page, setPage] = useState(0);
  const router = useRouter();
  const PAGE_SIZE = 60;

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !allExerciseNames(t).some((n) => n.toLowerCase().includes(search.toLowerCase()))) return false;
      if (archetypeFilter !== "all" && !t.archetypes.includes(archetypeFilter)) return false;
      if (movementFilter !== "all" && !t.movement_type.includes(movementFilter)) return false;
      if (muscleFilter !== "all" && !t.muscle_groups.includes(muscleFilter)) return false;
      if (equipmentFilter !== "all" && !t.equipment.includes(equipmentFilter)) return false;
      if (difficultyFilter > 0 && (t.difficulty == null || t.difficulty > difficultyFilter)) return false;
      if (conditionFilter !== "all" && !t.condition_tags.includes(conditionFilter)) return false;
      return true;
    }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [templates, search, archetypeFilter, movementFilter, muscleFilter, equipmentFilter, difficultyFilter, conditionFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const resetAndSet = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  const clearFilters = () => {
    setSearch("");
    setArchetypeFilter("all");
    setMovementFilter("all");
    setMuscleFilter("all");
    setEquipmentFilter("all");
    setDifficultyFilter(0);
    setConditionFilter("all");
    setPage(0);
  };

  const hasFilters = search || archetypeFilter !== "all" || movementFilter !== "all" || muscleFilter !== "all" || equipmentFilter !== "all" || difficultyFilter > 0 || conditionFilter !== "all";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Workout Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {templates.length} template{templates.length === 1 ? "" : "s"} &middot; {filtered.length} match
          </p>
        </div>
      </div>

      <HubCard padded={false}>
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[var(--hub-border)]">
          <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-[var(--status-success-bg)] text-teal shrink-0">
            <IconMenu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[var(--color-ink)]">Templates</div>
            <div className="text-xs text-muted-foreground">Filter and browse saved workout templates</div>
          </div>
          <div className="ml-auto">
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground underline hover:text-foreground">
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9 w-56 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(["all", "A", "B", "C"] as const).map((a) => {
              const on = archetypeFilter === a;
              return (
                <button
                  key={a}
                  onClick={() => { setArchetypeFilter(a); setPage(0); }}
                  className={`h-9 rounded-full px-4 text-xs font-semibold transition-colors border ${
                    on
                      ? "bg-[var(--status-primary-bg)] border-[var(--status-primary-border)] text-[var(--status-primary)]"
                      : "bg-[var(--hub-card)] border-[var(--hub-field-border)] text-[var(--color-body)] hover:border-[var(--hub-field-border-hover)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {a === "all" ? "All archetypes" : `Type ${a}`}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-medium text-muted-foreground">Type:</span>
          <Select value={movementFilter} onValueChange={resetAndSet(setMovementFilter)}>
            <SelectTrigger className="h-9 w-44 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Movement type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {movementOptions.map((mt) => (
                <SelectItem key={mt} value={mt}>{movementTypeLabels[mt] || mt}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={muscleFilter} onValueChange={resetAndSet(setMuscleFilter)}>
            <SelectTrigger className="h-9 w-44 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Main muscle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All muscles</SelectItem>
              {muscleOptions.map((mg) => (
                <SelectItem key={mg} value={mg}>{mg}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={equipmentFilter} onValueChange={resetAndSet(setEquipmentFilter)}>
            <SelectTrigger className="h-9 w-40 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All equipment</SelectItem>
              {equipmentOptions.filter(Boolean).map((eq) => (
                <SelectItem key={eq} value={eq}>{equipmentLabels[eq] || eq}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(difficultyFilter)} onValueChange={(v) => { setDifficultyFilter(Number(v)); setPage(0); }}>
            <SelectTrigger className="h-9 w-36 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Max difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any level</SelectItem>
              <SelectItem value="1">Beginner (1)</SelectItem>
              <SelectItem value="2">Easy (2)</SelectItem>
              <SelectItem value="3">Intermediate (3)</SelectItem>
              <SelectItem value="4">Advanced (4)</SelectItem>
              <SelectItem value="5">Expert (5)</SelectItem>
            </SelectContent>
          </Select>

          {conditionTagOptions.length > 0 && (
            <Select value={conditionFilter} onValueChange={resetAndSet(setConditionFilter)}>
              <SelectTrigger className="h-9 w-36 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All conditions</SelectItem>
                {conditionTagOptions.map((ct) => (
                  <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <span className="ml-auto text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
            {filtered.length} {filtered.length === 1 ? "template" : "templates"}
          </span>
        </div>
      </HubCard>

      <HubCard padded={false}>
        {filtered.length === 0 ? (
          <div className="px-5 pb-5 pt-4">
            <EmptyState
              icon={<IconDumbbell className="h-8 w-8" />}
              title="No templates match your filters"
              description="Try adjusting or clearing your search filters."
              cta={{ label: "Clear filters", onClick: clearFilters }}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2">Name</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Exercises</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Movement</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Level</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Used</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t) => {
                    const names = allExerciseNames(t);
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-[var(--hub-border)] transition-colors hover:bg-[var(--hub-hover)] cursor-pointer"
                        onClick={() => router.push(`/hub/workout-templates/${t.id}`)}
                      >
                        <td className="px-4 py-2.5 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-[var(--status-success-bg)] text-teal flex items-center justify-center shrink-0">
                              <IconDumbbell className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-[var(--color-ink)] text-[13px] truncate block">{t.name}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {t.archetypes.map((a) => (
                                  <span key={a} className="inline-flex rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] border border-[var(--status-primary-border)] px-1.5 py-0 text-[10px] font-semibold leading-none">{a}</span>
                                ))}
                                {t.condition_tags.map((ct) => (
                                  <span key={ct} className="inline-flex rounded-full bg-[var(--hub-hover)] text-muted-foreground border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold leading-none">{ct}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-medium text-[var(--color-ink)] tabular-nums">{exerciseCount(t)} total</span>
                            <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2">{names.slice(0, 4).join(", ")}{names.length > 4 ? `, +${names.length - 4} more` : ""}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-[13px] text-[var(--color-body)]">
                          {t.movement_type.length > 0 ? t.movement_type.map((mt) => movementTypeLabels[mt] || mt).join(", ") : "—"}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          {t.difficulty != null ? (
                            <span className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-body)]">
                              {difficultyLabel(t.difficulty)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[13px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <span className="tabular-nums text-[13px] text-muted-foreground">{t.usage_count}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
                <p className="text-xs text-muted-foreground tabular-nums">
                  Page {safePage + 1} of {pageCount}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    className="inline-flex items-center gap-1 h-8 rounded-lg px-3 text-xs font-medium border border-[var(--hub-border)] bg-[var(--hub-card)] disabled:opacity-40 hover:bg-[var(--hub-hover)] transition-colors"
                  >
                    <IconChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={safePage >= pageCount - 1}
                    className="inline-flex items-center gap-1 h-8 rounded-lg px-3 text-xs font-medium border border-[var(--hub-border)] bg-[var(--hub-card)] disabled:opacity-40 hover:bg-[var(--hub-hover)] transition-colors"
                  >
                    Next
                    <IconChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </HubCard>
    </div>
  );
}
