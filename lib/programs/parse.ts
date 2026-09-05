/**
 * Program paste parser — CR-EF-154 P4 / P5 (parallel per-slot parsing).
 *
 * Core parsing logic extracted so it can be called directly from the test
 * script without an HTTP server. The API route delegates here.
 *
 * Mechanism: splits text into per-workout chunks when workout headings are
 * present, parses each chunk with its own aiChat call concurrently
 * (Promise.all), then resolves cross-slot references. Falls back to the
 * original single whole-text parse when no workout headings are found.
 */

import { getAiConfig, aiChat } from "@/lib/ai-client";
import type { ParsedProgram, ParsedSlot, SlotData, ProgramSection, ProgramExercise } from "./types";

type SlotParseResult = ParsedSlot | { failed: true; label: string };

// ─────────────────────────────────────────────────────────────────────
// Full-program system prompt (used for fallback whole-text parse)
// ─────────────────────────────────────────────────────────────────────

const SYSTEM = `You are an expert exercise physiologist assistant. You turn a trainer's pasted workout programme notes into structured JSON.

Return ONE valid JSON object matching this exact schema (no markdown, no preamble, no explanation):
{
  "name": "a short human-readable programme name (e.g. 'Ian bilateral康复 program')",
  "weeks": number or null if not stated,
  "slots": [
    {
      "label": "Workout A",
      "data": {
        "sections": [
          {
            "kind": "warmup" | "cooldown" | "circuit" | "superset" | "straight",
            "label": "optional section label (e.g. 'Warm-up', 'Superset 1', 'Cool-down')",
            "rounds": number or null,
            "rest": "string (e.g. '60-90 sec') or null",
            "exercises": [
              {
                "exercise_name": "string",
                "per_side": "string or null (e.g. 'LEFT arm only', 'RIGHT side only')",
                "sets": number or null,
                "reps": "string (e.g. '10', '10-12', '2 min', '60 sec')",
                "weight": "string or null (e.g. '16kg', 'bodyweight', 'light band')",
                "duration": "string or null (e.g. '2 min', '30 sec')",
                "notes": "string or null"
              }
            ]
          }
        ]
      }
    }
  ]
}

Rules:
- Each slot is a separate workout (e.g. "WORKOUT A" → one slot, "WORKOUT B" → another).
- Detect sections within each workout: Warm-up, Supersets, Straight sets / Standalone, Cool-down.
- kind = "warmup" for warm-up sections, "cooldown" for cool-down sections.
- kind = "superset" for paired exercises with shared rest/rounds.
- kind = "straight" for standalone/straight-set exercises.
- kind = "circuit" for circuit-style sections (rounds, no rest between exercises).
- "rounds" applies to supersets and circuits (e.g. "3 rounds" → rounds: 3).
- "rest" is the rest period for the section (e.g. "rest 60-90 sec" → rest: "60-90 sec").
- "per_side" captures laterality cues like "(LEFT side only)", "(LEFT arm only)", "(LEFT shoulder only)". Set to null if bilateral or not specified.
- Parse the prescription: "3x10" → sets: 3, reps: "10". "3x10-12" → sets: 3, reps: "10-12". "3x60 sec" → sets: 3, reps: "60 sec". "1-2 sets" → sets: 1-2 as string? No — sets should be a number; if ambiguous use the higher number. reps: null.
- Weight from "@ 16kg" → weight: "16kg". "bodyweight" → weight: "bodyweight". "light" → weight: "light".
- Duration: "2 min" → duration: "2 min". "30 sec" → duration: "30 sec". If duration is present, reps may be null.
- "same as Workout A" / "same as A" → copy the referenced section from the earlier slot. The parser must resolve these references.
- Do not invent exercises — only use exercises the trainer actually wrote.
- Preserve the trainer's own wording for exercise names.
- Ignore greeting lines, client names, and trailing notes that are not exercises.
- exercises with "1-2 sets" where sets is ambiguous: set sets to 2 (upper bound) and put the range in notes if needed.`;

// ─────────────────────────────────────────────────────────────────────
// Single-slot system prompt (used for parallel per-chunk parsing)
// ─────────────────────────────────────────────────────────────────────

const SLOT_SYSTEM = `You are an expert exercise physiologist assistant. You turn a trainer's pasted workout notes into structured JSON for ONE workout slot.

Return ONE valid JSON object matching this exact schema (no markdown, no preamble, no explanation):
{
  "label": "the workout label (e.g. 'Workout A')",
  "data": {
    "sections": [
      {
        "kind": "warmup" | "cooldown" | "circuit" | "superset" | "straight",
        "label": "optional section label (e.g. 'Warm-up', 'Superset 1', 'Cool-down')",
        "rounds": number or null,
        "rest": "string (e.g. '60-90 sec') or null",
        "exercises": [
          {
            "exercise_name": "string",
            "per_side": "string or null (e.g. 'LEFT arm only', 'RIGHT side only')",
            "sets": number or null,
            "reps": "string (e.g. '10', '10-12', '2 min', '60 sec')",
            "weight": "string or null (e.g. '16kg', 'bodyweight', 'light band')",
            "duration": "string or null (e.g. '2 min', '30 sec')",
            "notes": "string or null"
          }
        ]
      }
    ]
  }
}

Rules:
- Detect sections: Warm-up, Supersets, Straight sets / Standalone, Cool-down.
- kind = "warmup" for warm-up, "cooldown" for cool-down.
- kind = "superset" for paired exercises with shared rest/rounds.
- kind = "straight" for standalone/straight-set exercises.
- kind = "circuit" for circuit-style sections.
- "rounds" applies to supersets and circuits (e.g. "3 rounds" → rounds: 3).
- "rest" is the rest period for the section.
- "per_side" captures laterality cues like "(LEFT side only)". Set to null if bilateral.
- Parse the prescription: "3x10" → sets: 3, reps: "10". "3x10-12" → sets: 3, reps: "10-12". "3x60 sec" → sets: 3, reps: "60 sec".
- Weight from "@ 16kg" → weight: "16kg". "bodyweight" → weight: "bodyweight".
- Duration: "2 min" → duration: "2 min". If duration is present, reps may be null.
- Do not invent exercises — only use exercises the trainer actually wrote.
- Preserve the trainer's own wording for exercise names.
- Ignore greeting lines, client names, and trailing notes that are not exercises.
- exercises with "1-2 sets" where sets is ambiguous: set sets to 2 and put the range in notes if needed.`;

// ─────────────────────────────────────────────────────────────────────
// JSON extraction (reused from workout-templates/structure)
// ─────────────────────────────────────────────────────────────────────

function stripFences(text: string): string {
  return text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/gi, "")
    .trim();
}

export function extractJson(text: string): Record<string, unknown> {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response contained no JSON object");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ─────────────────────────────────────────────────────────────────────
// Normalisation
// ─────────────────────────────────────────────────────────────────────

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function normalizeExercise(raw: unknown): ProgramExercise {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = asString(obj.exercise_name).trim() || asString(obj.name).trim() || "Untitled exercise";

  return {
    exercise_name: name,
    per_side: asString(obj.per_side).trim() || undefined,
    sets: asNumber(obj.sets),
    reps: asString(obj.reps).trim() || undefined,
    weight: asString(obj.weight).trim() || undefined,
    duration: asString(obj.duration).trim() || undefined,
    notes: asString(obj.notes).trim() || undefined,
  };
}

function normalizeSection(raw: unknown): ProgramSection | null {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kind = asString(obj.kind).toLowerCase().trim();

  const validKinds = ["circuit", "superset", "straight", "warmup", "cooldown"];
  if (!validKinds.includes(kind)) return null;

  const exercises = Array.isArray(obj.exercises)
    ? obj.exercises.map(normalizeExercise).filter((e) => e.exercise_name !== "Untitled exercise")
    : [];

  if (exercises.length === 0) return null;

  return {
    kind: kind as ProgramSection["kind"],
    label: asString(obj.label).trim() || undefined,
    rounds: asNumber(obj.rounds),
    rest: asString(obj.rest).trim() || undefined,
    exercises,
  };
}

function normalizeSlot(raw: unknown): { label: string; data: SlotData } | null {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const label = asString(obj.label).trim() || "Workout";

  const dataObj = (obj.data && typeof obj.data === "object" ? obj.data : {}) as Record<string, unknown>;
  const sectionsRaw = Array.isArray(dataObj.sections) ? dataObj.sections : [];
  const sections = sectionsRaw.map(normalizeSection).filter((s): s is ProgramSection => s !== null);

  if (sections.length === 0) return null;

  return { label, data: { sections } };
}

function normalizeProgram(raw: unknown): ParsedProgram {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const name = asString(obj.name).trim() || undefined;
  const weeks = asNumber(obj.weeks);
  const slotsRaw = Array.isArray(obj.slots) ? obj.slots : [];
  const slots = slotsRaw.map(normalizeSlot).filter((s): s is NonNullable<ReturnType<typeof normalizeSlot>> => s !== null);

  return { name, weeks, slots };
}

// ─────────────────────────────────────────────────────────────────────
// Normalise raw AI JSON into ParsedProgram (exported for tests)
// ─────────────────────────────────────────────────────────────────────

/**
 * Normalise raw JSON (as the AI would return it) into the canonical
 * ParsedProgram shape. Exported so the test script can validate the
 * normalisation pipeline without needing an AI API key.
 */
export function normaliseProgramJson(raw: unknown): ParsedProgram {
  return normalizeProgram(raw);
}

// ─────────────────────────────────────────────────────────────────────
// Workout heading detection & text chunking (parallel parse, P5)
// ─────────────────────────────────────────────────────────────────────

/**
 * Detect workout headings and split raw text into per-workout chunks.
 * Tolerant of formatting: "WORKOUT A", "Workout A", "Workout 1", "Workout A — Upper Body", etc.
 * Returns null if no workout headings are found (caller should fall back to whole-text parse).
 */
export function chunkWorkouts(text: string): { label: string; chunk: string }[] | null {
  const headingRe = /^\s*workout\s+([A-Z0-9]+)\b[^\n]*$/gim;
  const matches = [...text.matchAll(headingRe)];
  if (matches.length < 2) return null;

  const chunks: { label: string; chunk: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const chunk = text.slice(start, end).trim();
    const labelRaw = matches[i][1] || String(i + 1);
    const label = `Workout ${labelRaw}`;
    chunks.push({ label, chunk });
  }
  return chunks;
}

/**
 * Parse one chunk (a single workout) with its own AI call.
 * Returns the slot object on success, or a failure marker on failure.
 */
async function parseSlotChunk(chunk: string, label: string, model: string, timeoutMs?: number): Promise<SlotParseResult> {
  let raw: string | null;
  try {
    raw = await aiChat({ system: SLOT_SYSTEM, user: chunk, maxTokens: 6000, model, temperature: 0.2, timeoutMs: timeoutMs ?? 90_000 });
  } catch {
    return { failed: true, label };
  }
  if (!raw) return { failed: true, label };

  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = extractJson(raw);
  } catch {
    // Repair round-trip
    try {
      const repaired = await aiChat({
        system: SLOT_SYSTEM,
        messages: [
          { role: "user", content: chunk },
          { role: "assistant", content: raw },
          {
            role: "user",
            content: `That response failed JSON parsing. Return the structured workout as a single valid JSON object matching the schema. Output ONLY the JSON — no markdown, no commentary.`,
          },
        ],
        maxTokens: 6000,
        model,
        temperature: 0.2,
        timeoutMs: timeoutMs ?? 90_000,
      });
      if (repaired) parsed = extractJson(repaired);
    } catch {
      // fall through
    }
  }
  if (!parsed) return { failed: true, label };

  return normalizeSlot(parsed) ?? { failed: true, label };
}

/**
 * Resolve cross-slot references after parallel parsing.
 * If a slot's label matches "same as Workout X" patterns in other slots,
 * copy sections from the referenced slot. Also handles warmup/cooldown
 * inheritance: if a slot's warmup or cooldown sections are empty and
 * an earlier slot has them, copy them over.
 */
function resolveCrossSlotReferences(slots: ParsedSlot[]): ParsedSlot[] {
  const byLabel = new Map<string, ParsedSlot>();
  for (const s of slots) byLabel.set(s.label.toLowerCase(), s);

  for (const slot of slots) {
    const allExercises = slot.data.sections.flatMap((s) => s.exercises);
    const text = allExercises.map((e) => e.exercise_name).join(" ").toLowerCase();

    // "same as Workout A" / "same as A" patterns in the original text
    // If a slot has no real exercises (empty sections), inherit from an earlier slot
    if (slot.data.sections.length === 0) {
      for (const [refLabel, refSlot] of byLabel) {
        if (refLabel !== slot.label.toLowerCase() && refSlot.data.sections.length > 0) {
          slot.data.sections = JSON.parse(JSON.stringify(refSlot.data.sections));
          break;
        }
      }
    }

    // Warmup/cooldown inheritance: if a slot lacks warmup/cooldown
    // but an earlier slot has them, copy
    const hasWarmup = slot.data.sections.some((s) => s.kind === "warmup");
    const hasCooldown = slot.data.sections.some((s) => s.kind === "cooldown");

    if (!hasWarmup || !hasCooldown) {
      for (const ref of slots) {
        if (ref === slot) break;
        if (!hasWarmup) {
          const refWarmup = ref.data.sections.find((s) => s.kind === "warmup");
          if (refWarmup) {
            slot.data.sections.unshift(JSON.parse(JSON.stringify(refWarmup)));
          }
        }
        if (!hasCooldown) {
          const refCooldown = ref.data.sections.find((s) => s.kind === "cooldown");
          if (refCooldown) {
            slot.data.sections.push(JSON.parse(JSON.stringify(refCooldown)));
          }
        }
      }
    }
  }

  return slots;
}

/**
 * Build the full ParsedProgram from resolved slots.
 */
function assembleProgram(slots: ParsedSlot[], programmeName?: string): ParsedProgram {
  return {
    name: programmeName || slots[0]?.label || undefined,
    weeks: undefined,
    slots,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Core parse function (AI-backed, exported for API route)
// ─────────────────────────────────────────────────────────────────────

/**
 * Parse pasted programme text into the program slot shape.
 * Returns null if AI is not configured.
 * Throws on parse failure after repair attempt.
 *
 * Strategy: if workout headings are found, parse each chunk in parallel
 * with its own AI call (faster, avoids timeout). Otherwise fall back to
 * a single whole-text parse.
 */
export async function parseProgram(text: string): Promise<ParsedProgram | null> {
  const aiConfig = getAiConfig();
  if (!aiConfig.provider) return null;

  const model = aiConfig.model;

  // Try parallel per-slot parsing when workout headings are present
  const chunks = chunkWorkouts(text);
  if (chunks && chunks.length >= 2) {
    const results = await Promise.all(
      chunks.map(({ chunk, label }) => parseSlotChunk(chunk, label, model, 90_000)),
    );

    const failed = results.filter((r): r is { failed: true; label: string } => "failed" in r && r.failed);
    const slots = results.filter((r): r is ParsedSlot => !("failed" in r));

    if (failed.length > 0 && failed.length < results.length) {
      const names = failed.map((f) => f.label).join(", ");
      throw new Error(`${names} failed to parse — hit Parse again`);
    }

    if (slots.length > 0) {
      const resolved = resolveCrossSlotReferences(slots);
      return assembleProgram(resolved);
    }
    // All parallel calls failed — fall through to whole-text parse as fallback
  }

  // Whole-text fallback (original single-call parse)
  let raw: string | null;
  try {
    raw = await aiChat({ system: SYSTEM, user: text, maxTokens: 12000, model, temperature: 0.2, timeoutMs: 150_000 });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 300) : "unknown error";
    throw new Error(`AI call failed: ${detail}`);
  }

  if (!raw) throw new Error("AI returned no response");

  let parsed: Record<string, unknown> | undefined;
  let parseError: string | undefined;
  try {
    parsed = extractJson(raw);
  } catch (err) {
    parseError = err instanceof Error ? err.message : "unknown error";
  }

  // Repair round-trip (same bounded-retry as workout-templates/structure)
  if (!parsed) {
    let repaired: string | null = null;
    try {
      repaired = await aiChat({
        system: SYSTEM,
        messages: [
          { role: "user", content: text },
          { role: "assistant", content: raw },
          {
            role: "user",
            content: `That response failed JSON parsing (${parseError}). Return the same structured programme as a single valid JSON object matching the schema. Output ONLY the JSON object — no markdown fences, no commentary, no trailing commas.`,
          },
        ],
        maxTokens: 12000,
        model,
        temperature: 0.2,
        timeoutMs: 150_000,
      });
    } catch {
      // fall through
    }
    if (repaired) {
      try {
        parsed = extractJson(repaired);
      } catch (err) {
        parseError = err instanceof Error ? err.message : parseError;
      }
    }
  }

  if (!parsed) {
    throw new Error(`Could not parse AI response: ${parseError ?? "unknown"}`);
  }

  return normalizeProgram(parsed);
}
