"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconDumbbell, IconMenu, IconPlus, IconSearch, IconVideo, IconEdit3 } from "@/components/icons";
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
  const [expanded, setExpanded] = useState<string | null>(null);
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

  const filteredIds = useMemo(() => new Set(filtered.map((e) => e.id)), [filtered]);

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
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Exercise library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {exercises.length} exercises &middot; {filtered.length} match
            {filtered.length > 0 && ` · page ${safePage + 1} of ${pageCount}`}
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

      {/* ── Main card: filters + table ── */}
      <HubCard padded={false}>
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[var(--hub-border)]">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--status-success-bg)] text-teal shrink-0">
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

        {/* Toolbar: search + filters */}
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9 w-56 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
            />
          </div>

          {/* Archetype pill group — restyled chips */}
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
              {movementTypes.map((mt) => (
                <SelectItem key={mt} value={mt}>
                  {movementTypeLabels[mt] || mt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={muscleFilter} onValueChange={resetAndSet(setMuscleFilter)}>
            <SelectTrigger className="h-9 w-44 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Main muscle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All muscles</SelectItem>
              {allMuscleGroups.map((mg) => (
                <SelectItem key={mg} value={mg}>
                  {mg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={equipmentFilter} onValueChange={resetAndSet(setEquipmentFilter)}>
            <SelectTrigger className="h-9 w-40 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All equipment</SelectItem>
              {allEquipment.filter(Boolean).map((eq) => (
                <SelectItem key={eq} value={eq}>
                  {equipmentLabels[eq] || eq}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v as ExerciseEntry["source"] | "all"); setPage(0); }}>
            <SelectTrigger className="h-9 w-40 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="original">Original</SelectItem>
              <SelectItem value="trainerize">Trainerize</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
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

          <span className="ml-auto text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
            {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
          </span>
        </div>

        {/* Table */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                  <th className="w-10 text-left px-5 py-2.5"></th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2.5">Movement</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2.5">Type</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2.5">Level</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2.5">Source</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2.5">Muscles</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2.5">Equipment</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((ex) => {
                  const isOpen = expanded === ex.id;
                  return (
                    <Fragment key={ex.id}>
                      <tr
                        key={ex.id}
                        className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors"
                      >
                        <td className="px-5 py-3 align-middle">
                          <Checkbox
                            checked={selectedIds.has(ex.id)}
                            onCheckedChange={() => toggleSelect(ex.id)}
                            aria-label={`Select ${ex.name}`}
                          />
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {ex.image_url ? (
                              <img
                                src={ex.image_url}
                                alt={ex.name}
                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[var(--status-success-bg)] text-teal flex items-center justify-center shrink-0">
                                <IconDumbbell className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <button
                                onClick={() => setExpanded(isOpen ? null : ex.id)}
                                className="flex items-center gap-1.5 text-left"
                              >
                                <span className="font-semibold text-[var(--color-ink)] truncate">{ex.name}</span>
                                {isOpen ? (
                                  <IconChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                )}
                              </button>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {ex.archetypes.map((a) => (
                                  <span
                                    key={a}
                                    className="inline-flex rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] border border-[var(--status-primary-border)] px-1.5 py-0 text-[10px] font-semibold"
                                  >
                                    {a}
                                  </span>
                                ))}
                                <span className="inline-flex rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] px-1.5 py-0 text-[10px] font-semibold">
                                  {sourceLabel(ex.source)}
                                </span>
                                {ex.source === "trainerize" && ex.trainerize_custom === true && (
                                  <span className="inline-flex rounded-full bg-[var(--hub-hover)] text-muted-foreground border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold">
                                    Esther&apos;s Custom
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle text-[var(--color-body)]">
                          {ex.movement_type ? movementTypeLabels[ex.movement_type] || ex.movement_type : "—"}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          {ex.difficulty != null ? (
                            <span className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-body)]">
                              {difficultyLabel(ex.difficulty)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {sourceLabel(ex.source)}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {ex.muscle_groups.length > 0 ? (
                              ex.muscle_groups.map((mg) => (
                                <span
                                  key={mg}
                                  className="inline-flex rounded-full bg-[var(--hub-hover)] px-2 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {mg}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {ex.equipment.length > 0 ? (
                              ex.equipment.map((eq) => (
                                <span
                                  key={eq}
                                  className="inline-flex rounded-full bg-[var(--hub-hover)] px-2 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {equipmentLabels[eq] || eq}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${ex.id}-detail`} className="bg-[var(--hub-canvas)] border-b border-[var(--hub-border)] last:border-0">
                          <td></td>
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="space-y-3 text-xs max-w-2xl min-w-0">
                                {ex.image_url ? (
                                  <img
                                    src={ex.image_url}
                                    alt={ex.name}
                                    className="w-40 rounded-lg object-cover"
                                  />
                                ) : ex.video_url ? (
                                  <a
                                    href={ex.video_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-rose hover:underline w-fit"
                                  >
                                    <IconVideo className="h-3 w-3" />
                                    Watch demo video
                                  </a>
                                ) : (
                                  <ExerciseMediaPlaceholder exerciseName={ex.name} />
                                )}
                                {ex.video_url && (
                                  <a
                                    href={ex.video_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-rose hover:underline w-fit"
                                  >
                                    <IconVideo className="h-3 w-3" />
                                    Watch demo video
                                  </a>
                                )}
                                {ex.intensity_tiers && (
                                  <div className="flex gap-2">
                                    {(["compact", "standard", "extended"] as const).map((tier) => (
                                      <span
                                        key={tier}
                                        className={`text-[10px] font-medium rounded-full px-2 py-0.5 border ${
                                          ex.intensity_tiers.includes(tier)
                                            ? "bg-[var(--status-primary-bg)] text-[var(--status-primary)] border-[var(--status-primary-border)]"
                                            : "bg-[var(--hub-hover)] text-muted-foreground/40 border-[var(--hub-border)]"
                                        }`}
                                      >
                                        {tier === "compact" ? "~45m" : tier === "standard" ? "~60m" : "~75m"}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold text-muted-foreground">Coaching: </span>
                                  <p className="mt-0.5 text-[var(--color-body)]">{ex.coaching_cue ?? "—"}</p>
                                </div>
                                <div>
                                  <span className="font-semibold text-muted-foreground">Modification: </span>
                                  <p className="mt-0.5 text-[var(--color-amber)]">{ex.default_mod ?? "—"}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setEditingExercise(ex)}
                                className="inline-flex items-center gap-1.5 h-8 rounded-lg px-3 text-xs font-semibold border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[var(--color-ink)] hover:border-[var(--hub-field-border-hover)] transition-colors shrink-0"
                              >
                                <IconEdit3 className="h-3.5 w-3.5" />
                                Edit exercise
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
      </HubCard>

      <ExerciseFormDialog
        exercise={editingExercise}
        open={editingExercise !== null}
        onOpenChange={(val) => { if (!val) setEditingExercise(null); }}
      />
    </div>
  );
}
