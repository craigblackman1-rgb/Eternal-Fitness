"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HubCard, HubPageHeader } from "@/components/hub";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconDumbbell, IconMenu, IconSearch, IconChevronLeft, IconChevronRight, IconPlus, IconChevronDown, IconFileText, IconX, IconZap, IconPencil } from "@/components/icons";
import { EmptyState } from "@/components/hub/EmptyState";
import { DEFAULT_ARCHETYPE_FOCUS_LABELS } from "@/lib/planAgentPrompt";
import { TemplateAssignDialog, useAssignableClients } from "./assign-dialog";
import type { WorkoutTemplate, Exercise } from "@/types";

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

const positionLabels: Record<string, string> = {
  seated: "Seated",
  supported: "Supported",
  standing: "Standing",
};

function exerciseCount(t: WorkoutTemplate): number {
  return (t.data.warm_up?.length ?? 0) + (t.data.main_block?.length ?? 0) + (t.data.cooldown?.length ?? 0);
}

function allExerciseNames(t: WorkoutTemplate): string[] {
  return [...(t.data.warm_up ?? []), ...(t.data.main_block ?? []), ...(t.data.cooldown ?? [])].map((ex) => ex.exercise_name);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Prescription line for the read-only detail drawer — sets × reps, with tempo
 *  and rest appended when the exercise carries them (mirrors the mockup's `rx`). */
function exerciseRx(ex: Exercise): string {
  const parts: string[] = [];
  const reps = (ex.reps ?? "").trim();
  if (ex.sets > 0 || reps) parts.push(`${ex.sets} × ${reps || "—"}`);
  if (ex.tempo && ex.tempo !== "-") parts.push(`@ ${ex.tempo}`);
  if (ex.rest && ex.rest !== "-") parts.push(ex.rest);
  return parts.join(" · ");
}

const SECTION_LABELS: [string, "warm_up" | "main_block" | "cooldown"][] = [
  ["Warm-up", "warm_up"],
  ["Main block", "main_block"],
  ["Cooldown", "cooldown"],
];

export function WorkoutTemplateBrowser({
  templates,
  archetypeOptions,
  movementOptions,
  muscleOptions,
  equipmentOptions,
  conditionTagOptions,
  archetypeLabels = DEFAULT_ARCHETYPE_FOCUS_LABELS,
}: {
  templates: WorkoutTemplate[];
  archetypeOptions: string[];
  movementOptions: string[];
  muscleOptions: string[];
  equipmentOptions: string[];
  conditionTagOptions: string[];
  archetypeLabels?: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<"all" | "A" | "B" | "C">("all");
  const [movementFilter, setMovementFilter] = useState("all");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [page, setPage] = useState(0);
  const router = useRouter();
  const PAGE_SIZE = 60;

  const [selected, setSelected] = useState<WorkoutTemplate | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const clients = useAssignableClients();

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (splitRef.current && !splitRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !allExerciseNames(t).some((n) => n.toLowerCase().includes(search.toLowerCase()))) return false;
      if (archetypeFilter !== "all" && !t.archetypes.includes(archetypeFilter)) return false;
      if (movementFilter !== "all" && !t.movement_type.includes(movementFilter)) return false;
      if (muscleFilter !== "all" && !t.muscle_groups.includes(muscleFilter)) return false;
      if (equipmentFilter !== "all" && !t.equipment.includes(equipmentFilter)) return false;
      if (positionFilter !== "all" && !t.position.includes(positionFilter)) return false;
      if (conditionFilter !== "all" && !t.condition_tags.includes(conditionFilter)) return false;
      return true;
    }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [templates, search, archetypeFilter, movementFilter, muscleFilter, equipmentFilter, positionFilter, conditionFilter]);

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
    setPositionFilter("all");
    setConditionFilter("all");
    setPage(0);
  };

  const hasFilters = search || archetypeFilter !== "all" || movementFilter !== "all" || muscleFilter !== "all" || equipmentFilter !== "all" || positionFilter !== "all" || conditionFilter !== "all";

  const drawerSubtitle = (t: WorkoutTemplate) => {
    const arche = t.archetypes.length ? t.archetypes.map((a) => `Type ${a}`).join(" + ") : "";
    const pos = t.position.length ? t.position.map((p) => positionLabels[p] || p).join(" + ") : "";
    return [arche, pos, `used ${t.usage_count}×`].filter(Boolean).join(" · ");
  };

  return (
    <div className="space-y-5">
      <HubPageHeader
        title="Workouts"
        subtitle="Reusable sessions — assigned into a client's next block or saved back from a logged session."
        actions={
          <>
            <Link href="/hub/exercises" className="text-sm font-medium text-teal hover:underline mr-2">Exercise library</Link>
            <div ref={splitRef} className="relative inline-flex">
            <Link
              href="/hub/workouts/new"
              className="inline-flex items-center gap-1.5 h-9 pl-4 pr-3 rounded-l-lg bg-rose hover:bg-rose/90 text-white text-sm font-semibold transition-colors"
            >
              <IconPlus className="h-4 w-4" />
              New workout
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More new-template options"
              className="inline-flex items-center justify-center h-9 w-8 rounded-r-lg bg-rose hover:bg-rose/90 text-white border-l border-white/30 transition-colors"
            >
              <IconChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 z-50 rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-lg p-1.5">
                <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Create a template
                </div>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); router.push("/hub/workouts/new"); }}
                  className="flex items-start gap-2.5 w-full text-left rounded-lg px-2.5 py-2 hover:bg-[var(--hub-hover)]"
                >
                  <IconFileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[13px] font-semibold text-[var(--color-ink)]">
                    Paste &amp; structure
                    <span className="block text-[11.5px] font-normal text-muted-foreground mt-0.5">
                      Paste a workout you agreed outside the app; AI turns it into a template.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); router.push("/hub/workouts/new?blank=1"); }}
                  className="flex items-start gap-2.5 w-full text-left rounded-lg px-2.5 py-2 hover:bg-[var(--hub-hover)]"
                >
                  <IconPlus className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[13px] font-semibold text-[var(--color-ink)]">
                    Start blank
                    <span className="block text-[11.5px] font-normal text-muted-foreground mt-0.5">
                      Open the template editor empty and build it by hand.
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>
          </>
        }
      />

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

          <Select value={archetypeFilter} onValueChange={(v) => { setArchetypeFilter(v as "all" | "A" | "B" | "C"); setPage(0); }}>
            <SelectTrigger className="h-9 w-64 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Archetype" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All archetypes</SelectItem>
              {(["A", "B", "C"] as const).map((a) => (
                <SelectItem key={a} value={a}>Type {a} — {archetypeLabels[a] || a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <Select value={positionFilter} onValueChange={resetAndSet(setPositionFilter)}>
            <SelectTrigger className="h-9 w-36 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-xs focus:border-rose focus:ring-rose/30">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All positions</SelectItem>
              <SelectItem value="seated">Seated</SelectItem>
              <SelectItem value="supported">Supported</SelectItem>
              <SelectItem value="standing">Standing</SelectItem>
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
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2">Template</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Exercises</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Equipment</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Position</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Conditions</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Used</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t) => {
                    const names = allExerciseNames(t);
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-[var(--hub-border)] transition-colors hover:bg-[var(--hub-hover)] cursor-pointer"
                        onClick={() => setSelected(t)}
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
                                  <span
                                    key={a}
                                    title={`Type ${a} — ${archetypeLabels[a] || a}`}
                                    className="inline-flex rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] border border-[var(--status-primary-border)] px-1.5 py-0 text-[10px] font-semibold leading-none"
                                  >
                                    {a}
                                  </span>
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
                        <td className="px-3 py-2.5 align-middle">
                          {t.equipment.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.equipment.map((eq) => (
                                <span key={eq} className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold text-muted-foreground leading-none">
                                  {equipmentLabels[eq] || eq}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[13px]">None</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          {t.position.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.position.map((p) => (
                                <span key={p} className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-body)]">
                                  {positionLabels[p] || p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[13px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          {t.condition_tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.condition_tags.map((ct) => (
                                <span key={ct} className="inline-flex rounded-full bg-[var(--hub-hover)] border border-[var(--hub-border)] px-1.5 py-0 text-[10px] font-semibold text-muted-foreground leading-none">
                                  {ct}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[13px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <span className="tabular-nums text-[13px] text-muted-foreground">{t.usage_count}×</span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-[13px] text-muted-foreground">{formatDate(t.updated_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
                <p className="text-xs text-muted-foreground tabular-nums">
                  Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
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

      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSelected(null)}
          />
          <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-[560px] flex flex-col bg-[var(--hub-canvas)] shadow-2xl">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--hub-border)] bg-[var(--hub-card)]">
              <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center bg-[var(--status-primary-bg)] text-rose shrink-0">
                <IconDumbbell className="w-[18px] h-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[var(--color-ink)] truncate">{selected.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{drawerSubtitle(selected)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="ml-auto w-[34px] h-[34px] rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-[var(--color-ink)] flex items-center justify-center shrink-0"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-wrap gap-1.5 mb-5">
                {selected.archetypes.map((a) => (
                  <span
                    key={a}
                    title={`Type ${a} — ${archetypeLabels[a] || a}`}
                    className="inline-flex rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary-text)] border border-[var(--status-primary-border)] px-2 py-0.5 text-[11px] font-semibold"
                  >
                    Type {a} — {archetypeLabels[a] || a}
                  </span>
                ))}
                {selected.condition_tags.map((ct) => (
                  <span
                    key={ct}
                    className="inline-flex rounded-full bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)] px-2 py-0.5 text-[11px] font-semibold"
                  >
                    {ct}
                  </span>
                ))}
                {selected.position.map((p) => (
                  <span
                    key={p}
                    className="inline-flex rounded-full bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] border border-[var(--status-neutral-border)] px-2 py-0.5 text-[11px] font-semibold"
                  >
                    {positionLabels[p] || p}
                  </span>
                ))}
              </div>

              {SECTION_LABELS.map(([label, key]) => {
                const list = selected.data[key] ?? [];
                if (!list.length) return null;
                return (
                  <div key={key} className="mb-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {label}
                    </h4>
                    {list.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2 text-[13px] py-1.5 border-b border-[var(--hub-border)] last:border-b-0">
                        <span className="text-muted-foreground tabular-nums w-4 shrink-0">{i + 1}</span>
                        <span className="text-[var(--color-ink)] font-semibold">{ex.exercise_name}</span>
                        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">{exerciseRx(ex)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5 px-6 py-4 border-t border-[var(--hub-border)] bg-[var(--hub-card)]">
              <button
                type="button"
                onClick={() => router.push(`/hub/workouts/${selected.id}`)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[var(--color-ink)] text-[13px] font-semibold hover:border-[var(--hub-field-border-hover)] transition-colors"
              >
                <IconPencil className="h-4 w-4" />
                Open in editor
              </button>
              <span className="ml-auto" />
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-rose hover:bg-rose/90 text-white text-[13px] font-semibold transition-colors"
              >
                <IconZap className="h-4 w-4" />
                Assign to client
              </button>
            </div>
          </aside>
        </>
      )}

      {assignOpen && selected && (
        <TemplateAssignDialog
          templateId={selected.id}
          templateName={selected.name}
          clients={clients}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => setSelected(null)}
        />
      )}
    </div>
  );
}
