"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Toolbar, toolbarSelectClasses } from "@/components/hub/Toolbar";
import { IconChevronLeft, IconChevronRight, IconDumbbell, IconMenu, IconPlus, IconVideo, IconEdit3, IconX } from "@/components/icons";
import { EmptyState } from "@/components/hub/EmptyState";
import type { Archetype } from "@/types";
import type { ExerciseEntry } from "./page";
import { ExerciseMediaPlaceholder } from "@/components/exercise-media";
import { ExerciseFormDialog } from "./ExerciseFormDialog";
import { toast } from "sonner";

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

function sourceLabel(source: ExerciseEntry["source"]): string {
  if (source === "original") return "Original";
  if (source === "trainerize") return "Trainerize";
  return "Custom";
}

export function ExerciseBrowser({
  exercises,
  movementTypes,
  allEquipment,
  allMuscleGroups,
}: {
  exercises: ExerciseEntry[];
  movementTypes: string[];
  allEquipment: string[];
  allMuscleGroups: string[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<Archetype | "all">("all");
  const [movementFilter, setMovementFilter] = useState("all");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<ExerciseEntry["source"] | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingExercise, setEditingExercise] = useState<ExerciseEntry | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkArchetypes, setBulkArchetypes] = useState<Archetype[]>([]);
  const [bulkEquipment, setBulkEquipment] = useState("");
  const [bulkMuscleGroups, setBulkMuscleGroups] = useState("");
  const [bulkTags, setBulkTags] = useState("");
  const [bulkActive, setBulkActive] = useState<boolean | null>(null);
  const PAGE_SIZE = 60;

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (archetypeFilter !== "all" && !ex.archetypes.includes(archetypeFilter)) return false;
      if (movementFilter !== "all" && ex.movement_type !== movementFilter) return false;
      if (muscleFilter !== "all" && !ex.muscle_groups.includes(muscleFilter)) return false;
      if (equipmentFilter !== "all" && !ex.equipment.includes(equipmentFilter)) return false;
      if (sourceFilter !== "all" && ex.source !== sourceFilter) return false;
      if (difficultyFilter > 0 && (ex.difficulty == null || ex.difficulty > difficultyFilter)) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, search, archetypeFilter, movementFilter, muscleFilter, equipmentFilter, sourceFilter, difficultyFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const selectedExercise = useMemo(
    () => (selectedId ? exercises.find((e) => e.id === selectedId) ?? null : null),
    [selectedId, exercises]
  );

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
    setSourceFilter("all");
    setDifficultyFilter(0);
    setPage(0);
  };

  const hasFilters = search || archetypeFilter !== "all" || movementFilter !== "all" || muscleFilter !== "all" || equipmentFilter !== "all" || sourceFilter !== "all" || difficultyFilter > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const splitCommaField = (value: string): string[] =>
    value.split(",").map((v) => v.trim()).filter(Boolean);

  async function handleBulkApply() {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      const payload: Record<string, unknown> = { ids: [...selectedIds] };
      if (bulkArchetypes.length > 0) payload.addArchetypes = bulkArchetypes;
      if (bulkEquipment.trim()) payload.addEquipment = splitCommaField(bulkEquipment);
      if (bulkMuscleGroups.trim()) payload.addMuscleGroups = splitCommaField(bulkMuscleGroups);
      if (bulkTags.trim()) payload.addTags = splitCommaField(bulkTags);
      if (bulkActive !== null) payload.active = bulkActive;

      const res = await fetch("/api/exercises/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Bulk update failed");
      }

      toast.success(`${selectedIds.size} exercise${selectedIds.size > 1 ? "s" : ""} updated`);
      clearSelection();
      setBulkArchetypes([]);
      setBulkEquipment("");
      setBulkMuscleGroups("");
      setBulkTags("");
      setBulkActive(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Exercise library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {exercises.length} exercises &middot; {filtered.length} match
          </p>
        </div>
        <ExerciseFormDialog
          trigger={
            <button className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-rose px-3.5 text-sm font-semibold text-white hover:bg-rose/90 transition-colors">
              <IconPlus className="h-4 w-4" />
              Add Exercise
            </button>
          }
        />
      </div>

      {/* ── Bulk-edit bar ── */}
      {selectedIds.size > 0 && (
        <HubCard padded={false}>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--color-ink)]">{selectedIds.size} selected</span>
                <button
                  onClick={clearSelection}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkApply}
                  disabled={bulkSaving}
                  className="rounded-lg bg-rose hover:bg-rose/90 text-white"
                >
                  {bulkSaving ? "Applying..." : "Apply Changes"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <span className="text-xs font-medium text-muted-foreground">Add archetypes:</span>
              {(["A", "B", "C"] as Archetype[]).map((a) => (
                <label key={a} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={bulkArchetypes.includes(a)}
                    onCheckedChange={() =>
                      setBulkArchetypes((prev) =>
                        prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                      )
                    }
                  />
                  Type {a}
                </label>
              ))}

              <span className="text-xs font-medium text-muted-foreground">Add equipment:</span>
              <Input
                className="h-7 w-40 text-xs rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)]"
                value={bulkEquipment}
                onChange={(e) => setBulkEquipment(e.target.value)}
                placeholder="e.g. dumbbell, mat"
              />

              <span className="text-xs font-medium text-muted-foreground">Add muscles:</span>
              <Input
                className="h-7 w-40 text-xs rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)]"
                value={bulkMuscleGroups}
                onChange={(e) => setBulkMuscleGroups(e.target.value)}
                placeholder="e.g. quads, glutes"
              />

              <span className="text-xs font-medium text-muted-foreground">Add tags:</span>
              <Input
                className="h-7 w-36 text-xs rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)]"
                value={bulkTags}
                onChange={(e) => setBulkTags(e.target.value)}
                placeholder="e.g. bilateral"
              />

              <span className="text-xs font-medium text-muted-foreground">Active:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setBulkActive(bulkActive === true ? null : true)}
                  className={`h-7 text-xs rounded-lg px-3 font-medium transition-colors ${
                    bulkActive === true
                      ? "bg-rose text-white"
                      : "border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setBulkActive(bulkActive === false ? null : false)}
                  className={`h-7 text-xs rounded-lg px-3 font-medium transition-colors ${
                    bulkActive === false
                      ? "bg-rose text-white"
                      : "border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>
        </HubCard>
      )}

      {/* ── Filters toolbar ── */}
      <HubCard padded={false}>
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[var(--hub-border)]">
          <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-[var(--status-success-bg)] text-teal shrink-0">
            <IconMenu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[var(--color-ink)]">Exercises</div>
            <div className="text-xs text-muted-foreground">Filter, select and edit movements</div>
          </div>
          <div className="ml-auto">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pt-4 pb-3">
          <Toolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            searchPlaceholder="Search exercises..."
            count={`${filtered.length} ${filtered.length === 1 ? "exercise" : "exercises"}`}
            segments={[
              { value: "all", label: "All archetypes" },
              { value: "A", label: "Type A" },
              { value: "B", label: "Type B" },
              { value: "C", label: "Type C" },
            ]}
            activeSegment={archetypeFilter}
            onSegmentChange={(v) => { setArchetypeFilter(v as Archetype | "all"); setPage(0); }}
          >
            <select value={movementFilter} onChange={(e) => resetAndSet(setMovementFilter)(e.target.value)} className={toolbarSelectClasses} aria-label="Filter by movement type">
              <option value="all">All types</option>
              {movementTypes.map((mt) => (
                <option key={mt} value={mt}>{movementTypeLabels[mt] || mt}</option>
              ))}
            </select>

            <select value={muscleFilter} onChange={(e) => resetAndSet(setMuscleFilter)(e.target.value)} className={toolbarSelectClasses} aria-label="Filter by main muscle">
              <option value="all">All muscles</option>
              {allMuscleGroups.map((mg) => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </select>

            <select value={equipmentFilter} onChange={(e) => resetAndSet(setEquipmentFilter)(e.target.value)} className={toolbarSelectClasses} aria-label="Filter by equipment">
              <option value="all">All equipment</option>
              {allEquipment.filter(Boolean).map((eq) => (
                <option key={eq} value={eq}>{equipmentLabels[eq] || eq}</option>
              ))}
            </select>

            <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value as ExerciseEntry["source"] | "all"); setPage(0); }} className={toolbarSelectClasses} aria-label="Filter by source">
              <option value="all">All sources</option>
              <option value="original">Original</option>
              <option value="trainerize">Trainerize</option>
              <option value="custom">Custom</option>
            </select>

            <select value={String(difficultyFilter)} onChange={(e) => { setDifficultyFilter(Number(e.target.value)); setPage(0); }} className={toolbarSelectClasses} aria-label="Filter by max difficulty">
              <option value="0">Any level</option>
              <option value="1">Beginner (1)</option>
              <option value="2">Easy (2)</option>
              <option value="3">Intermediate (3)</option>
              <option value="4">Advanced (4)</option>
              <option value="5">Expert (5)</option>
            </select>
          </Toolbar>
        </div>
      </HubCard>

      {/* ── Two-panel grid: compact list + detail ── */}
      <div className="grid grid-cols-[1.45fr_1fr] gap-5 items-start max-[1100px]:grid-cols-1">
        {/* Left: Compact list */}
        <HubCard padded={false}>
          {filtered.length === 0 ? (
            <div className="px-5 pb-5 pt-4">
              <EmptyState
                icon={<IconDumbbell className="h-8 w-8" />}
                title="No exercises match your filters"
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
                      <th className="w-10 text-left px-4 py-2"></th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Movement</th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Type</th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Level</th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((ex) => {
                      const isSelected = selectedId === ex.id;
                      return (
                        <tr
                          key={ex.id}
                          className={`border-b border-[var(--hub-border)] transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[var(--status-primary-bg)] hover:bg-[var(--status-primary-bg)]"
                              : "hover:bg-[var(--hub-hover)]"
                          }`}
                          onClick={() => setSelectedId(isSelected ? null : ex.id)}
                        >
                          <td className="px-4 py-1 align-middle" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(ex.id)}
                              onCheckedChange={() => toggleSelect(ex.id)}
                              aria-label={`Select ${ex.name}`}
                            />
                          </td>
                          <td className="px-3 py-1 align-middle">
                            <div className="flex items-center gap-2 min-w-0">
                              {ex.image_url ? (
                                <img
                                  src={ex.image_url}
                                  alt={ex.name}
                                  className="w-5 h-5 rounded object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded bg-[var(--status-success-bg)] text-teal flex items-center justify-center shrink-0">
                                  <IconDumbbell className="w-2.5 h-2.5" />
                                </div>
                              )}
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className="font-medium text-[var(--color-ink)] text-[12.5px] truncate">{ex.name}</span>
                                {ex.archetypes.map((a) => (
                                  <span
                                    key={a}
                                    className="inline-flex rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] border border-[var(--status-primary-border)] px-1.5 py-0 text-[10px] font-semibold leading-none shrink-0"
                                  >
                                    {a}
                                  </span>
                                ))}
                                {ex.source === "trainerize" && ex.trainerize_custom === true && (
                                  <span className="inline-flex rounded-full bg-[var(--hub-hover)] text-muted-foreground border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold leading-none shrink-0">
                                    Custom
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-1 align-middle text-[12.5px] text-[var(--color-body)] whitespace-nowrap">
                            {ex.movement_type ? movementTypeLabels[ex.movement_type] || ex.movement_type : "—"}
                          </td>
                          <td className="px-3 py-1 align-middle">
                            {ex.difficulty != null ? (
                              <span className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-1.5 py-0 text-[10.5px] font-medium text-[var(--color-body)] leading-[18px]">
                                {difficultyLabel(ex.difficulty)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[12.5px]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-1 align-middle">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {sourceLabel(ex.source)}
                            </span>
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

        {/* Right: Detail panel */}
        <div className="sticky top-6">
          <HubCard padded={false}>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--hub-border)]">
              <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-[var(--status-success-bg)] text-teal shrink-0">
                <IconDumbbell className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[var(--color-ink)] truncate">
                  {selectedExercise ? selectedExercise.name : "Detail"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedExercise ? "Exercise information" : "Select a movement from the list"}
                </div>
              </div>
              {selectedExercise && (
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-[var(--color-ink)] flex items-center justify-center shrink-0 transition-colors"
                  aria-label="Close detail"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="px-5 py-4">
              {!selectedExercise ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Pick an exercise from the list to see its coaching cues, modifications and details.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Media */}
                    {selectedExercise.image_url ? (
                      <img
                        src={selectedExercise.image_url}
                        alt={selectedExercise.name}
                        className="w-full h-[168px] rounded-xl object-cover"
                      />
                    ) : selectedExercise.video_url ? (
                      <a
                        href={selectedExercise.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 h-[168px] rounded-xl bg-gradient-to-br from-[var(--status-success-bg)] to-[var(--status-primary-bg)] text-teal hover:opacity-90 transition-opacity"
                      >
                        <IconVideo className="h-8 w-8" />
                        <span className="text-sm font-semibold">Watch demo video</span>
                      </a>
                    ) : (
                      <div className="h-[168px] rounded-xl bg-gradient-to-br from-[var(--status-success-bg)] to-[var(--status-primary-bg)] flex items-center justify-center">
                        <IconDumbbell className="h-10 w-10 text-teal/40" />
                      </div>
                    )}

                  {selectedExercise.video_url && selectedExercise.image_url && (
                    <a
                      href={selectedExercise.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-rose hover:underline text-xs font-medium w-fit"
                    >
                      <IconVideo className="h-3.5 w-3.5" />
                      Watch demo video
                    </a>
                  )}

                  {/* Tags */}
                  <div className="flex gap-2 flex-wrap">
                    {selectedExercise.archetypes.map((a) => (
                      <span
                        key={a}
                        className="inline-flex rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] border border-[var(--status-primary-border)] px-2.5 py-0.5 text-[11px] font-semibold"
                      >
                        Type {a}
                      </span>
                    ))}
                    <span className="inline-flex rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] px-2.5 py-0.5 text-[11px] font-semibold">
                      {sourceLabel(selectedExercise.source)}
                    </span>
                    {selectedExercise.source === "trainerize" && selectedExercise.trainerize_custom === true && (
                      <span className="inline-flex rounded-full bg-[var(--hub-hover)] text-muted-foreground border border-[var(--hub-border)] px-2.5 py-0.5 text-[11px] font-semibold">
                        Esther&apos;s Custom
                      </span>
                    )}
                  </div>

                  {/* Category & level */}
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Category &amp; level
                    </h4>
                    <p className="text-sm text-[var(--color-body)]">
                      {selectedExercise.movement_type
                        ? movementTypeLabels[selectedExercise.movement_type] || selectedExercise.movement_type
                        : "Untagged"}
                      {" · "}
                      {selectedExercise.difficulty != null
                        ? difficultyLabel(selectedExercise.difficulty)
                        : "Unrated"}
                    </p>
                  </div>

                  {/* Intensity tiers */}
                  {selectedExercise.intensity_tiers && selectedExercise.intensity_tiers.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Intensity
                      </h4>
                      <div className="flex gap-2">
                        {(["compact", "standard", "extended"] as const).map((tier) => (
                          <span
                            key={tier}
                            className={`text-[10px] font-medium rounded-full px-2 py-0.5 border ${
                              selectedExercise.intensity_tiers.includes(tier)
                                ? "bg-[var(--status-primary-bg)] text-[var(--status-primary)] border-[var(--status-primary-border)]"
                                : "bg-[var(--hub-hover)] text-muted-foreground/40 border-[var(--hub-border)]"
                            }`}
                          >
                            {tier === "compact" ? "~45m" : tier === "standard" ? "~60m" : "~75m"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coaching cues */}
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Coaching cues
                    </h4>
                    <p className="text-sm text-[var(--color-body)] leading-relaxed">
                      {selectedExercise.coaching_cue || "—"}
                    </p>
                  </div>

                  {/* Modifications */}
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Modifications
                    </h4>
                    <p className="text-sm text-[var(--color-body)] leading-relaxed">
                      {selectedExercise.default_mod || "—"}
                    </p>
                  </div>

                  {/* Muscle groups */}
                  {selectedExercise.muscle_groups.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Muscles
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedExercise.muscle_groups.map((mg) => (
                          <span
                            key={mg}
                            className="inline-flex rounded-full bg-[var(--hub-hover)] px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {mg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment */}
                  {selectedExercise.equipment.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Equipment
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedExercise.equipment.map((eq) => (
                          <span
                            key={eq}
                            className="inline-flex rounded-full bg-[var(--hub-hover)] px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {equipmentLabels[eq] || eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit button */}
                  <div className="pt-1">
                    <button
                      onClick={() => setEditingExercise(selectedExercise)}
                      className="inline-flex items-center gap-1.5 h-8 rounded-lg px-3 text-xs font-semibold border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[var(--color-ink)] hover:border-[var(--hub-field-border-hover)] transition-colors"
                    >
                      <IconEdit3 className="h-3.5 w-3.5" />
                      Edit exercise
                    </button>
                  </div>
                </div>
              )}
            </div>
          </HubCard>
        </div>
      </div>

      <ExerciseFormDialog
        exercise={editingExercise}
        open={editingExercise !== null}
        onOpenChange={(val) => { if (!val) setEditingExercise(null); }}
      />
    </div>
  );
}
