import type { TrainingRule, TrainingRuleType, SessionVersion, Frequency } from "@/types";
import { formatFrequency } from "@/types";
import { buildTrainingRulesSection } from "@/lib/trainingRules";

/**
 * Shared Plan Agent prompt sections — pure functions, no I/O — used by both
 * plan-chat (conversation) and generate-block (session generation) so the two
 * can never drift apart again. Every section reads its wording from
 * plan_agent_settings (editable at Settings → Plan Agent Rules) with the
 * defaults below as fallback if a row is missing.
 */

export type PlanAgentSettingsMap = Record<string, { value_type: string; value: unknown }>;

export type MuscleGroup =
  | "quads" | "hamstrings" | "glutes" | "back"
  | "chest" | "shoulders" | "arms" | "core";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "quads", "hamstrings", "glutes", "back", "chest", "shoulders", "arms", "core",
];

export interface PaceModeEntry {
  label: string;
  superset_a: number;
  superset_b: number;
  arms_core: number;
  finisher: boolean;
  total: number;
}

export interface ExerciseLibraryRow {
  name: string;
  source: string;
  movement_type: string | null;
  muscle_groups: string[];
  equipment: string[];
  coaching_cue?: string | null;
  default_mod?: string | null;
}

export interface EquipmentRow {
  name: string;
  detail: string | null;
  home_equivalent: string | null;
}

/* ─── Defaults (mirrored in db/migrations/20260711_plan_agent_settings_v2.sql) ─── */

export const DEFAULT_TRAINING_PRINCIPLES = [
  "Programme by strength-training principles, not a fixed template: compound movements first, then accessories and isolation work, with mobility woven into rest periods.",
  "Each session has 1–2 focus patterns for its main strength work (e.g. hinge focus, press focus) and the focus rotates across the block so no pattern is neglected.",
  "Rep ranges: compounds 8–12 as the hypertrophy default, or 4–8 on a max-effort focus lift where the phase and the client's clearance allow; isolation and accessory work 10–15.",
  "Sets: 3 for main strength work as the default; 2 when time or client capacity is limited (Slow pace, deload week).",
  "Control the eccentric — 2–4 seconds lowering; state the tempo cue on exercises where it matters.",
  "Progressive overload across the 6-week block — load progresses only when form is perfect; final week is a deload (drop volume, submaximal loads).",
  "Mobility and stretches sit inside rest periods or between strength exercises within a superset — dynamic drills mid-session, no static holds over 15 seconds until the cooldown.",
];

export const DEFAULT_SESSION_FORMATS = [
  "Straight sets — one exercise for all its sets before moving on. Use for max-effort compound lifts.",
  "Superset — 2 exercises alternated, rest after the pair.",
  "Tri-set — 3 exercises rotated, rest after the round.",
  "Strength circuit / giant set — 4–6 items rotated over the sets, and it may embed a stretch or mobility drill between strength exercises (Esther's usual style).",
  "Metabolic block — short conditioning pairing (carries, slams, battle ropes, step-ups), continuous effort, 60–90s rest between rounds.",
  "Skill block — balance or skill progressions tied to the client's life goals (e.g. paddleboard kneeling-to-stand series).",
  "Pick the mix that suits this client and session — do not force every session into the same shape. Give every main-block exercise a clear group_label naming its format (e.g. \"Superset A\", \"Tri-Set\", \"Metabolic Block\", \"Skill Block\").",
];

/** Each line: "<Split label>: <comma-separated muscle groups>". The client's
 *  profile picks one by label; Full body is the default. */
export const DEFAULT_SPLITS = [
  "Full body: quads, hamstrings, glutes, back, chest, shoulders, arms, core",
  "Upper body: back, chest, shoulders, arms, core",
  "Lower body: quads, hamstrings, glutes, core",
];

export const DEFAULT_BUILD_CHECKLIST = [
  "Review block history and the most recent client update — what did we do last, and what comes next logically? Has anything changed in this client's health or circumstances?",
  "Confirm paperwork (PAR-Q / clearance) is in order before programming.",
  "Pick exercises ONLY from the exercise library list provided. Only use equipment on the studio list. Don't pair exercises that need the same barbell.",
  "Coverage audit before responding: for each muscle group in this client's split, name the exercise that covers it. If any group has no exercise, go back and add one.",
  "Re-read the HARD CONSTRAINTS for this client and confirm nothing you've included conflicts with them.",
  "Sessions across the block must feel genuinely different — different warm-ups, focuses, finishers.",
  "Landmine or unusual exercises: flag custom Trainerize video needs. Flag anything needing Esther's clinical review.",
];

export const DEFAULT_SAFETY_RULES = [
  "Never programme exercises requiring equipment not confirmed in the studio",
  "Never exceed the client's intensity ceiling",
  "Every exercise must have a documented modification",
  "Never mark a plan as approved — that is Esther's action only",
  "Cancer-related fatigue is not training fatigue — default to lower volume",
  "If lymphoedema risk is present, flag any compression or sustained upper limb loading",
  "If BP monitoring required, flag exercises that cause Valsalva",
  "If clearance is pending, label the plan DRAFT — PENDING CLEARANCE",
  "If there is no PAR-Q on file and no trainer override recorded above, refuse to produce a full plan — tell Esther it must be completed first",
];

export const DEFAULT_PACE_MODES: Record<string, PaceModeEntry> = {
  fast:   { label: "Fast",   superset_a: 3, superset_b: 3, arms_core: 3, finisher: true,  total: 10 },
  medium: { label: "Medium", superset_a: 3, superset_b: 2, arms_core: 2, finisher: true,  total: 8  },
  slow:   { label: "Slow",   superset_a: 2, superset_b: 2, arms_core: 2, finisher: false, total: 6  },
};

export const DEFAULT_CLINICAL_SYSTEM_PROMPT = `You are an expert exercise physiologist supporting Esther Fair, a personal trainer who is Level 4 qualified in Cancer and Exercise Rehabilitation, also qualified in Exercise Referral, with experience in adaptive training and complex health needs.

Your output will be reviewed by Esther before any client sees it. Generate safe, clinically-aware
sessions. Every exercise must include a modification specific to this client's contraindications.
Never exceed the client's implied intensity ceiling based on their conditions and fitness level.

The user prompt includes a HARD CONSTRAINTS section for this specific client — these are non-negotiable.
If an exercise conflicts with anything marked [HARD], do not include it; find an alternative that
respects the constraint instead. Do not ask Esther to repeat these — they are already known.

Return one valid JSON object matching the Session schema. No markdown, no preamble, no explanation.`;

export const DEFAULT_PHASE_GUIDANCE: Record<string, string> = {
  foundation: "basic regressions, learn patterns, low load, lower ROM",
  build: "increase load, add complexity to established patterns",
  develop: "compound movements, greater ROM, higher challenge",
  peak: "highest intensity/volume of the block",
  deload: "drop volume, submax loads, active recovery focus, easier exercises",
};

export const DEFAULT_ARCHETYPE_FOCUS_LABELS: Record<string, string> = {
  A: "Mobility & Movement Quality",
  B: "Strength & Stability",
  C: "Power & Conditioning",
};

/* ─── Settings resolution ─── */

function listSetting(settings: PlanAgentSettingsMap, key: string, fallback: string[]): string[] {
  const raw = settings[key]?.value;
  return Array.isArray(raw) && raw.length > 0 ? (raw as string[]) : fallback;
}

export function resolveTrainingPrinciples(s: PlanAgentSettingsMap): string[] {
  return listSetting(s, "training_principles", DEFAULT_TRAINING_PRINCIPLES);
}
export function resolveSessionFormats(s: PlanAgentSettingsMap): string[] {
  return listSetting(s, "session_formats", DEFAULT_SESSION_FORMATS);
}
export function resolveSplits(s: PlanAgentSettingsMap): string[] {
  return listSetting(s, "splits", DEFAULT_SPLITS);
}
export function resolveBuildChecklist(s: PlanAgentSettingsMap): string[] {
  return listSetting(s, "build_checklist", DEFAULT_BUILD_CHECKLIST);
}
export function resolveSafetyRules(s: PlanAgentSettingsMap): string[] {
  return listSetting(s, "safety_rules", DEFAULT_SAFETY_RULES);
}
export function resolvePaceModes(s: PlanAgentSettingsMap): Record<string, PaceModeEntry> {
  const raw = s.pace_modes?.value;
  return raw && typeof raw === "object" ? (raw as Record<string, PaceModeEntry>) : DEFAULT_PACE_MODES;
}
export function resolveClinicalSystemPrompt(s: PlanAgentSettingsMap): string {
  const raw = s.clinical_system_prompt?.value;
  return typeof raw === "string" ? raw : DEFAULT_CLINICAL_SYSTEM_PROMPT;
}
export function resolvePhaseGuidance(s: PlanAgentSettingsMap): Record<string, string> {
  const raw = s.phase_guidance?.value;
  return raw && typeof raw === "object" ? { ...DEFAULT_PHASE_GUIDANCE, ...(raw as Record<string, string>) } : DEFAULT_PHASE_GUIDANCE;
}
export function resolveArchetypeFocusLabels(s: PlanAgentSettingsMap): Record<string, string> {
  const raw = s.archetype_focus_labels?.value;
  return raw && typeof raw === "object" ? { ...DEFAULT_ARCHETYPE_FOCUS_LABELS, ...(raw as Record<string, string>) } : DEFAULT_ARCHETYPE_FOCUS_LABELS;
}

/* ─── Splits ─── */

export interface SplitDefinition {
  label: string;
  groups: MuscleGroup[];
}

/** Parses "Full body: quads, hamstrings, ..." lines from the splits setting.
 *  Unknown group names are dropped rather than failing — the coverage audit
 *  only ever enforces groups it understands. */
export function parseSplits(lines: string[]): SplitDefinition[] {
  const defs: SplitDefinition[] = [];
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const label = line.slice(0, idx).trim();
    const groups = line
      .slice(idx + 1)
      .split(",")
      .map((g) => g.trim().toLowerCase())
      .filter((g): g is MuscleGroup => (MUSCLE_GROUPS as string[]).includes(g));
    if (label && groups.length > 0) defs.push({ label, groups });
  }
  return defs.length > 0 ? defs : [{ label: "Full body", groups: [...MUSCLE_GROUPS] }];
}

export function resolveClientSplit(settings: PlanAgentSettingsMap, clientSplitLabel: string | undefined): SplitDefinition {
  const defs = parseSplits(resolveSplits(settings));
  const wanted = (clientSplitLabel ?? "").trim().toLowerCase();
  return defs.find((d) => d.label.toLowerCase() === wanted) ?? defs[0];
}

/* ─── Muscle-group mapping — how an exercise proves coverage ─── */

const TRAINERIZE_MUSCLE_MAP: Record<string, MuscleGroup | null> = {
  "quads": "quads",
  "hamstrings": "hamstrings",
  "glutes": "glutes",
  "abductors": "glutes",
  "adductors": null,
  "calves": null,
  "neck": null,
  "lats": "back",
  "back (upper)": "back",
  "back (middle)": "back",
  "back (lower)": "back",
  "traps": "back",
  "chest": "chest",
  "chest (mid)": "chest",
  "chest (upper)": "chest",
  "chest (inner)": "chest",
  "shoulders": "shoulders",
  "shoulder (front)": "shoulders",
  "shoulder (side)": "shoulders",
  "shoulder (rear)": "shoulders",
  "bicep": "arms",
  "biceps": "arms",
  "tricep": "arms",
  "triceps": "arms",
  "forearms": "arms",
  "abs": "core",
  "obliques": "core",
  "core": "core",
};

const MOVEMENT_TYPE_MAP: Record<string, MuscleGroup[]> = {
  squat_pattern: ["quads", "glutes"],
  lunge_pattern: ["quads", "glutes"],
  hinge_pattern: ["hamstrings", "glutes", "back"],
  horizontal_push: ["chest", "shoulders", "arms"],
  vertical_push: ["shoulders", "arms"],
  push_accessory: ["chest", "shoulders", "arms"],
  horizontal_pull: ["back", "arms"],
  vertical_pull: ["back", "arms"],
  pull_accessory: ["back", "arms"],
  core_anterior: ["core"],
  core_posterior: ["core"],
  core_lateral: ["core"],
  loaded_carry: ["core"],
};

/** Last-resort inference from the exercise name, for library rows with no tags.
 *  Deliberately conservative — only unambiguous movement words. */
const NAME_KEYWORD_MAP: Array<[RegExp, MuscleGroup[]]> = [
  [/deadlift|rdl|romanian|good morning|hip hinge|swing/i, ["hamstrings", "glutes", "back"]],
  [/squat|leg press|step.?up|lunge|split squat|pistol/i, ["quads", "glutes"]],
  [/hip thrust|glute bridge|glute/i, ["glutes"]],
  [/hamstring curl|leg curl|nordic/i, ["hamstrings"]],
  [/leg extension/i, ["quads"]],
  [/bench press|chest press|push.?up|press.?up|chest fly|pec/i, ["chest", "arms"]],
  [/overhead press|shoulder press|push press|lateral raise|front raise|rear delt|face pull|arnold/i, ["shoulders"]],
  [/\brow\b|rowing|pulldown|pull.?down|pull.?up|chin.?up|lat /i, ["back", "arms"]],
  [/curl\b/i, ["arms"]],
  [/tricep|skull ?crusher|dip\b|pushdown/i, ["arms"]],
  [/plank|dead bug|bird dog|pallof|crunch|sit.?up|ab |rollout|woodchop|russian twist|hollow/i, ["core"]],
  [/carry|farmer/i, ["core"]],
];

/** All muscle groups this library exercise can be credited with. */
export function exerciseMuscleGroups(ex: Pick<ExerciseLibraryRow, "name" | "movement_type" | "muscle_groups">): MuscleGroup[] {
  const groups = new Set<MuscleGroup>();
  for (const mg of ex.muscle_groups ?? []) {
    const mapped = TRAINERIZE_MUSCLE_MAP[mg.trim().toLowerCase()];
    if (mapped) groups.add(mapped);
  }
  if (ex.movement_type && MOVEMENT_TYPE_MAP[ex.movement_type]) {
    for (const g of MOVEMENT_TYPE_MAP[ex.movement_type]) groups.add(g);
  }
  if (groups.size === 0) {
    for (const [re, gs] of NAME_KEYWORD_MAP) {
      if (re.test(ex.name)) {
        gs.forEach((g) => groups.add(g));
        break;
      }
    }
  }
  return [...groups];
}

/* ─── Prompt sections ─── */

export function buildPrinciplesSection(settings: PlanAgentSettingsMap): string {
  return resolveTrainingPrinciples(settings).map((p) => `- ${p}`).join("\n");
}

export function buildFormatsSection(settings: PlanAgentSettingsMap): string {
  return resolveSessionFormats(settings).map((f) => `- ${f}`).join("\n");
}

/** Describes a saved workout_templates row as a structural reference — the AI
 *  reads it as "this shape and rough volume", not a literal script to copy;
 *  exercise choice must still come from the EXERCISE LIBRARY section and
 *  respect this client's specific contraindications/phase/archetype. Used
 *  when a block is generated "from a template" (Master Template Registry /
 *  Session Roller brain-dump, 2026-08-07) — grounds the whole block in a
 *  condition-specific framework instead of a free-form chat. */
export function buildTemplateFrameworkSection(template: { name: string; condition_tags: string[]; data: SessionVersion }): string {
  const describeSection = (label: string, exercises: SessionVersion["warm_up"]) => {
    if (!exercises?.length) return `${label}: (none in the template)`;
    return `${label}:\n${exercises
      .map((ex) => `  - ${ex.exercise_name} — ${ex.sets ?? "?"} × ${ex.reps || "?"}${ex.tempo ? `, tempo ${ex.tempo}` : ""}${ex.group_label ? ` [${ex.group_label}]` : ""}`)
      .join("\n")}`;
  };
  return `TEMPLATE FRAMEWORK — "${template.name}"${template.condition_tags?.length ? ` (${template.condition_tags.join(", ")})` : ""}:
This block was requested to follow this template as its structural framework. Use it as a shape and
rough volume guide for EVERY session in this block — the same number of movement slots per section,
a similar set/rep skeleton, and the same session-format grouping (supersets etc.) — while still:
- choosing the actual exercise for each slot from the EXERCISE LIBRARY section below (never invent one),
- varying exercise choice appropriately across the 6 weeks (this is a template shape, not one session repeated 18 times),
- overriding anything here that conflicts with this client's HARD CONSTRAINTS or CONTRAINDICATIONS — client
  safety always wins over matching the template.

${describeSection("Warm-up", template.data.warm_up)}

${describeSection("Main block", template.data.main_block)}

${describeSection("Cooldown", template.data.cooldown)}`;
}

export function buildSplitSection(split: SplitDefinition, frequency: Frequency): string {
  return `TRAINING SPLIT: ${split.label}
Muscle-group contract — every session must directly target each of these groups with at least one
compound or isolation exercise, ideally under resistance: ${split.groups.join(", ")}.
A compound lift may cover more than one group, but every group must be traceable to a specific
exercise. A session with zero coverage of any group above is not acceptable and must not be produced.
This client's cadence: ${formatFrequency(frequency)}.`;
}

export function buildChecklistSection(settings: PlanAgentSettingsMap): string {
  return resolveBuildChecklist(settings).map((c) => `- ${c}`).join("\n");
}

export function buildSafetySection(settings: PlanAgentSettingsMap): string {
  return resolveSafetyRules(settings).map((r) => `- ${r}`).join("\n");
}

export function buildEquipmentSection(rows: EquipmentRow[]): string {
  return rows.map((e) => `- ${e.name}${e.detail ? ` (${e.detail})` : ""}`).join("\n");
}

/** The allowed exercise menu — tagged library rows grouped by primary muscle
 *  group so the model can find coverage quickly. */
export function buildExerciseMenuSection(rows: ExerciseLibraryRow[]): string {
  const byGroup = new Map<string, string[]>();
  const other: string[] = [];
  for (const row of rows) {
    const entry = `${row.name}${row.equipment?.length ? `  (uses: ${row.equipment.join(", ")})` : ""}`;
    const groups = exerciseMuscleGroups(row);
    if (groups.length === 0) {
      other.push(entry);
    } else {
      const primary = groups[0];
      if (!byGroup.has(primary)) byGroup.set(primary, []);
      byGroup.get(primary)!.push(entry);
    }
  }
  const parts: string[] = [];
  for (const g of MUSCLE_GROUPS) {
    const list = byGroup.get(g);
    if (list?.length) parts.push(`${g.toUpperCase()}:\n${list.map((e) => `- ${e}`).join("\n")}`);
  }
  if (other.length) parts.push(`MOBILITY / STRETCHES / SKILL / OTHER:\n${other.map((e) => `- ${e}`).join("\n")}`);
  return parts.join("\n\n");
}

export function buildHardConstraintsSection(
  adaptations: TrainingRule[],
  contraindications: string[],
  ruleTypesById: Record<string, Pick<TrainingRuleType, "label" | "bucket">>,
): string {
  const rules = buildTrainingRulesSection(adaptations ?? [], ruleTypesById);
  const contra = (contraindications ?? []).length > 0
    ? contraindications.map((c) => `- ${c}`).join("\n")
    : "None recorded.";
  return `HARD CONSTRAINTS FOR THIS CLIENT — non-negotiable, check every exercise against this list before including it:
${rules}

CONTRAINDICATIONS — never programme these:
${contra}

These come directly from Esther's notes on this specific client. If an exercise conflicts with anything
above, do not include it — find an alternative that respects the constraint. Do not ask Esther to repeat
these; they are already known.`;
}
