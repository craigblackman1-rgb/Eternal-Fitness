import { aiChat, getAiConfig, QUALITY_MODEL } from "@/lib/ai-client";
import { buildParqSection } from "@/lib/parq-summary";
import { buildRecentUpdatesSection } from "@/lib/recent-updates-summary";
import { buildBlockHistoryText, type PlanAgentBundle } from "@/lib/planAgentData";
import {
  buildEquipmentSection,
  buildExerciseMenuSection,
  buildFormatsSection,
  buildHardConstraintsSection,
  buildPrinciplesSection,
  buildSafetySection,
  buildSplitSection,
  buildTemplateFrameworkSection,
  resolveArchetypeFocusLabels,
  resolveClientSplit,
  resolveClinicalSystemPrompt,
  resolvePaceModes,
  resolvePhaseGuidance,
  type SplitDefinition,
} from "@/lib/planAgentPrompt";
import {
  buildExerciseIndex,
  validateGeneratedSession,
  type ExerciseIndex,
} from "@/lib/planValidation";
import type { ClientProfile, Session, Archetype, Phase, SessionVersion } from "@/types";

/** A saved workout_templates row, passed through when a block is generated
 *  "from a template" rather than free-form chat (option 3, 2026-08-07). */
export interface TemplateFramework {
  name: string;
  condition_tags: string[];
  data: SessionVersion;
}

export const weekPhases: { week: number; phase: Phase }[] = [
  { week: 1, phase: "foundation" },
  { week: 2, phase: "foundation" },
  { week: 3, phase: "build" },
  { week: 4, phase: "develop" },
  { week: 5, phase: "peak" },
  { week: 6, phase: "deload" },
];

export function getWeeklyArchetypes(spw: number, weekIndex: number, primaryGoal: string): Archetype[] {
  const goalBias: Record<string, Archetype[]> = {
    strength: ["B", "A", "C"],
    mobility: ["A", "B", "C"],
    weight_loss: ["C", "B", "A"],
    rehabilitation: ["A", "C", "B"],
    confidence: ["A", "B", "C"],
    general_fitness: ["A", "B", "C"],
  };

  const bias = goalBias[primaryGoal] || ["A", "B", "C"];

  if (spw === 3) return [bias[0], bias[1], bias[2]];

  if (spw === 2) {
    const a = bias[weekIndex % 3];
    const b = bias[(weekIndex + 1) % 3];
    return [a, b];
  }

  return [bias[weekIndex % 3]];
}

/** Model for plan generation. A full 6-week block is far too large to return in
 *  one response (~5k output tokens *per session*), so we generate one session
 *  per call and assemble. That keeps each response small enough to parse
 *  reliably and lets us retry individual sessions. Overridable via PLAN_MODEL.
 *  This is the step that writes the actual exercises Esther sees — quality
 *  matters more than cost here (2026-07-10: was defaulting to Haiku for
 *  speed/cost, but plan quality suffered — Esther's own hand-built plans were
 *  noticeably richer). Default to the best available model; drop to Sonnet or
 *  Haiku via env var if cost/latency becomes a real problem. The default is
 *  provider-aware — a bare PLAN_MODEL override must use the id format of
 *  whichever provider is configured (OpenRouter: "anthropic/claude-…",
 *  Anthropic direct: "claude-…"). */
export function resolvePlanModel(): string {
  if (process.env.PLAN_MODEL) return process.env.PLAN_MODEL;
  return getAiConfig().provider === "openrouter" ? QUALITY_MODEL.openrouter : QUALITY_MODEL.claude;
}

interface SessionSlot {
  session_number: number;
  week: number;
  phase: Phase;
  archetype: Archetype;
}

/** Build the ordered list of sessions with a pre-assigned, evenly-distributed
 *  archetype per slot (reusing the goal-biased rotation the fallback uses). */
function buildSessionSlots(profile: ClientProfile): SessionSlot[] {
  const spw = profile.logistics.sessions_per_week;
  const slots: SessionSlot[] = [];
  let n = 0;
  for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
    const wp = weekPhases[weekIndex];
    const archetypes = getWeeklyArchetypes(spw, weekIndex, profile.goals.primary);
    for (const archetype of archetypes) {
      n++;
      slots.push({ session_number: n, week: wp.week, phase: wp.phase, archetype });
    }
  }
  return slots;
}

/** Caps how many session-generation calls are in flight at once. Every call
 *  resends the full (~35-40k token) system prompt, so unbounded concurrency
 *  turns one "Generate Block" click into a burst of up to 18 simultaneous
 *  full-context AI calls — this is what actually drained ~£30 of OpenRouter
 *  credit in 5 minutes on 2026-08-13. Throttling doesn't reduce total tokens
 *  sent, but it caps how much can be spent before Esther (or a bug) has a
 *  chance to notice something's wrong and stop. Overridable via env for
 *  tuning against serverless time limits. Raised 4 -> 8 on 2026-08-18 (Craig's
 *  call) to speed up generation now that a failing session gets a fresh retry
 *  instead of aborting the whole block — failures cost less to absorb, so a
 *  higher burst ceiling is a reasonable trade for faster wall-clock. */
const GENERATION_CONCURRENCY = Number(process.env.PLAN_GENERATION_CONCURRENCY) || 8;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function generateViaAi(
  profile: ClientProfile,
  paceMode: string | null,
  bundle: PlanAgentBundle,
  blockNote?: string,
  previousSummary?: string,
  template?: TemplateFramework | null,
): Promise<Session[]> {
  const slots = buildSessionSlots(profile);
  const split = resolveClientSplit(bundle.settings, profile.logistics.split);
  const index = buildExerciseIndex(bundle.allExercises);
  const system = buildGenerationSystemPrompt(profile, bundle, split, template);

  const settled = await mapWithConcurrency(slots, GENERATION_CONCURRENCY, (slot) =>
    generateOneSession(profile, paceMode, slot, bundle, split, index, system, blockNote, previousSummary),
  );

  const sessions: Session[] = [];
  const failures: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sessions.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : "unknown";
      failures.push(`session ${slots[i].session_number}: ${reason}`);
    }
  });

  if (failures.length > 0) {
    throw new Error(`${failures.length}/${slots.length} sessions failed — ${failures.slice(0, 3).join("; ")}`);
  }

  sessions.sort((a, b) => a.session_number - b.session_number);
  return sessions;
}

/** One system prompt shared by every per-session call — the global rules,
 *  client constraints, equipment, and the allowed exercise menu. */
export function buildGenerationSystemPrompt(
  profile: ClientProfile,
  bundle: PlanAgentBundle,
  split: SplitDefinition,
  template?: TemplateFramework | null,
): string {
  const health = profile.health as ClientProfile["health"];
  const parqOverride = health?.parq_trainer_override
    ? { confirmed: true, note: health.parq_trainer_override_note }
    : undefined;

  return `${resolveClinicalSystemPrompt(bundle.settings)}

---

${buildHardConstraintsSection(profile.programming_adaptations, profile.health.contraindications ?? [], bundle.ruleTypesById)}

---
${template ? `${buildTemplateFrameworkSection(template)}

---
` : ""}

PAR-Q SCREENING:
${buildParqSection(bundle.parq, parqOverride)}

---

${buildSplitSection(split, profile.logistics.sessions_per_week)}

TRAINING PRINCIPLES:
${buildPrinciplesSection(bundle.settings)}

SESSION FORMATS — structure the main block from these:
${buildFormatsSection(bundle.settings)}

SAFETY RULES — never violate:
${buildSafetySection(bundle.settings)}

---

STUDIO EQUIPMENT — the complete list, use nothing else:
${buildEquipmentSection(bundle.equipmentRows)}

---

EXERCISE LIBRARY — every exercise you programme MUST be chosen from this list. Copy the exercise name EXACTLY as written (the "(uses: …)" annotation is information only — never include it in exercise_name):
${buildExerciseMenuSection(bundle.menuExercises)}`;
}

export function sessionPrompt(
  profile: ClientProfile,
  paceMode: string | null,
  slot: SessionSlot,
  bundle: PlanAgentBundle,
  blockNote?: string,
  previousSummary?: string,
): string {
  const phaseGuidance = resolvePhaseGuidance(bundle.settings);
  const archetypeFocusLabels = resolveArchetypeFocusLabels(bundle.settings);
  const paceModes = resolvePaceModes(bundle.settings);
  const pace = paceModes[paceMode ?? "medium"] ?? paceModes.medium;

  return `Generate ONE training session (number ${slot.session_number} of a 6-week block) for this client:

Client Profile:
${JSON.stringify(profile, null, 2)}

BLOCK HISTORY:
${buildBlockHistoryText(bundle.blocks)}

RECENT CLIENT UPDATES (already communicated to this client — don't repeat, build on it):
${buildRecentUpdatesSection(bundle.recentUpdates)}

${blockNote ? `Esther's note for this block: ${blockNote}` : ""}
${previousSummary ? `Previous block summary: ${previousSummary}` : ""}
${blockNote || previousSummary ? `
The note/summary above is intent and context ONLY — it is written in plain language and may
describe exercises loosely, list several options joined by "or", or use phrasing that isn't an
exact exercise name. NEVER copy that wording into an exercise_name field. For every single
exercise slot (including warm_up and cooldown), pick ONE specific exact name from the EXERCISE
LIBRARY section below that best matches the intent — never the note's own words.` : ""}

THIS SESSION:
- session_number: ${slot.session_number}
- week: ${slot.week}
- phase: ${slot.phase} (${phaseGuidance[slot.phase]})
- suggested emphasis: ${archetypeFocusLabels[slot.archetype]}
- pace: ${pace.label} — target roughly ${pace.total} work exercises in the main block${pace.finisher ? ", finisher allowed" : ", no finisher for this client"}
- time_tier: ${profile.logistics.time_tier}

Remember: every muscle group in this client's split must be covered within THIS session, every
exercise must come from the EXERCISE LIBRARY list (exact names), and only studio-list equipment
may be used.

Return a single JSON object with this exact shape:
{
  "session_number": ${slot.session_number},
  "archetype": "${slot.archetype}",
  "week": ${slot.week},
  "phase": "${slot.phase}",
  "focus_label": "<short focus label, e.g. 'Hinge focus — max effort'>",
  "versions": {
    "studio": { "warm_up": [Exercise], "main_block": [Exercise], "cooldown": [Exercise] },
    "home":   { "warm_up": [Exercise], "main_block": [Exercise], "cooldown": [Exercise] }
  }
}

Each Exercise is: { "exercise_name", "sets" (number), "reps", "tempo", "rest", "coaching_cue", "modification", "equipment" (string array), "group_label" }.
Every main_block exercise MUST carry a "group_label" naming its format group (e.g. "Superset A", "Tri-Set", "Straight Sets", "Metabolic Block", "Skill Block"). Consecutive exercises sharing a group_label are performed together as that format. warm_up and cooldown do not need group_label.
The "home" version must substitute bodyweight/band alternatives where studio equipment is unavailable, keeping every exercise's clinical modification.

Return ONLY the JSON object — no markdown fences, no commentary.`;
}

interface SessionAttemptResult {
  session?: Session;
  violations: import("@/lib/planValidation").PlanViolation[];
  parseError?: string;
}

/** One fresh generation + at most one in-context repair round-trip. Bounds a
 *  single attempt to 2 AI calls, same as before — the outer retry loop in
 *  generateOneSession is what changed, not this per-attempt cost. */
async function attemptSession(
  profile: ClientProfile,
  paceMode: string | null,
  slot: SessionSlot,
  bundle: PlanAgentBundle,
  split: SplitDefinition,
  index: ExerciseIndex,
  system: string,
  archetypeFocusLabels: Record<string, string>,
  studioEquipmentNames: string[],
  planModel: string,
  blockNote?: string,
  previousSummary?: string,
): Promise<SessionAttemptResult> {
  const user = sessionPrompt(profile, paceMode, slot, bundle, blockNote, previousSummary);

  const text = await aiChat({ system, user, model: planModel, maxTokens: 8000 });
  if (!text) return { violations: [], parseError: "AI returned no response" };

  let parsed: Partial<Session> | undefined;
  let parseError: string | undefined;
  try {
    parsed = parseSessionObject(text);
  } catch (err) {
    parseError = err instanceof Error ? err.message : "invalid JSON";
  }

  let session: Session | undefined;
  let violations = parsed ? validateGeneratedSession(
    (session = stampSession(parsed, profile, slot, archetypeFocusLabels)),
    index,
    studioEquipmentNames,
    split,
  ) : [];

  if (parseError || violations.length > 0) {
    const feedback = parseError
      ? `That response failed JSON parsing (${parseError}). Return the same session as a single valid JSON object. Output ONLY the JSON object — no markdown fences, no commentary, no trailing commas.`
      : `That session fails validation:\n${violations.map((v) => `- ${v.detail}`).join("\n")}\n\nReturn the corrected session as a single valid JSON object (same shape). Fix every violation. Replacements must be chosen ONLY from the EXERCISE LIBRARY section, copying names exactly as written (no abbreviations, no equipment suffixes); use only studio-list equipment, and cover every muscle group in the split. Output ONLY the JSON object.`;

    const repaired = await aiChat({
      system,
      messages: [
        { role: "user", content: user },
        { role: "assistant", content: parsed ? JSON.stringify(parsed) : text },
        { role: "user", content: feedback },
      ],
      model: planModel,
      maxTokens: 8000,
    });

    if (repaired) {
      try {
        parsed = parseSessionObject(repaired);
        session = stampSession(parsed, profile, slot, archetypeFocusLabels);
        violations = validateGeneratedSession(session, index, studioEquipmentNames, split);
      } catch (err) {
        if (!session) parseError = err instanceof Error ? err.message : "invalid JSON";
        // else: keep the pre-repair session + violations, handled by the caller
      }
    }
  }

  return { session, violations, parseError };
}

/** Sessions occasionally fail validation even after their in-context repair —
 *  most often the model inventing a near-miss exercise name instead of copying
 *  the library exactly. Previously that hard-failed the session, which in turn
 *  aborted the ENTIRE block (see generateViaAi) — with up to 18 independent
 *  sessions per block, even a modest per-session failure rate compounds into
 *  near-certain block failure (a ~15% per-session rate is a ~93% chance at
 *  least one of 18 fails). A second, fully fresh attempt (new generation, not
 *  just a repair of the same bad output) gives a session a second independent
 *  roll before giving up, which squares the failure rate instead of just
 *  padding it — 15% × 15% ≈ 2%. Only the sessions that actually fail pay for
 *  the extra calls; a session that succeeds on the first attempt costs the
 *  same as before. */
const MAX_SESSION_ATTEMPTS = 2;

async function generateOneSession(
  profile: ClientProfile,
  paceMode: string | null,
  slot: SessionSlot,
  bundle: PlanAgentBundle,
  split: SplitDefinition,
  index: ExerciseIndex,
  system: string,
  blockNote?: string,
  previousSummary?: string,
): Promise<Session> {
  const archetypeFocusLabels = resolveArchetypeFocusLabels(bundle.settings);
  const studioEquipmentNames = bundle.equipmentRows.map((e) => e.name);
  const PLAN_MODEL = resolvePlanModel();

  let last: SessionAttemptResult = { violations: [] };
  for (let attempt = 1; attempt <= MAX_SESSION_ATTEMPTS; attempt++) {
    last = await attemptSession(
      profile, paceMode, slot, bundle, split, index, system,
      archetypeFocusLabels, studioEquipmentNames, PLAN_MODEL,
      blockNote, previousSummary,
    );

    const hardViolations = (last.violations ?? []).filter(
      (v) => v.type === "unknown_exercise" || v.type === "missing_muscle_groups",
    );
    if (last.session && hardViolations.length === 0) {
      const equipmentWarnings = last.violations.filter((v) => v.type === "unknown_equipment");
      if (equipmentWarnings.length > 0) {
        console.warn(`[generate-block] session ${slot.session_number} equipment warnings: ${equipmentWarnings.map((v) => v.detail).join("; ")}`);
        last.session.coaching_notes = [
          last.session.coaching_notes,
          `EQUIPMENT CHECK NEEDED: ${equipmentWarnings.map((v) => v.detail).join("; ")}`,
        ].filter(Boolean).join(" — ");
      }
      return last.session;
    }

    if (attempt < MAX_SESSION_ATTEMPTS) {
      console.warn(`[generate-block] session ${slot.session_number} attempt ${attempt} failed (${last.parseError ?? hardViolations.map((v) => v.detail).join("; ")}) — retrying fresh`);
    }
  }

  const hardViolations = (last.violations ?? []).filter((v) => v.type === "unknown_exercise" || v.type === "missing_muscle_groups");
  if (hardViolations.length > 0) {
    throw new Error(
      `failed validation after ${MAX_SESSION_ATTEMPTS} attempts: ${hardViolations.map((v) => v.detail).join("; ").slice(0, 300)}`,
    );
  }
  throw new Error(last.parseError ?? `failed to produce a parseable session after ${MAX_SESSION_ATTEMPTS} attempts`);
}

function stampSession(
  parsed: Partial<Session>,
  profile: ClientProfile,
  slot: SessionSlot,
  archetypeFocusLabels: Record<string, string>,
): Session {
  // Stamp the slot metadata authoritatively so numbering/phase never drift.
  return {
    session_id: "",
    block_id: "",
    client_id: profile.client.id,
    session_number: slot.session_number,
    archetype: slot.archetype,
    week: slot.week,
    phase: slot.phase,
    focus_label:
      parsed.focus_label ||
      archetypeFocusLabels[slot.archetype],
    time_tier: profile.logistics.time_tier,
    versions: parsed.versions as Session["versions"],
    coaching_notes: parsed.coaching_notes,
    client_intro: parsed.client_intro ?? archetypeFocusLabels[slot.archetype],
  } as Session;
}

/** Parse a single session object, tolerating markdown fences, surrounding prose,
 *  and trailing commas that otherwise break JSON.parse. */
export function parseSessionObject(text: string): Partial<Session> {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Slice to the outermost JSON object so leading/trailing prose is ignored.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  let obj: Partial<Session>;
  try {
    obj = JSON.parse(cleaned) as Partial<Session>;
  } catch {
    obj = JSON.parse(cleaned.replace(/,(\s*[}\]])/g, "$1")) as Partial<Session>;
  }

  if (!obj?.versions?.studio?.main_block?.length || !obj?.versions?.home?.main_block?.length) {
    throw new Error("session object missing studio/home main_block");
  }
  return obj;
}

