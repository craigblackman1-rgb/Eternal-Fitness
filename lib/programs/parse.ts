/**
 * Program paste parser — CR-EF-154 P4.
 *
 * Core parsing logic extracted so it can be called directly from the test
 * script without an HTTP server. The API route delegates here.
 *
 * Mechanism: same as the workout-templates/structure endpoint — sends pasted
 * text to an LLM (DeepSeek V3.1 via OpenRouter, or Claude Sonnet direct)
 * with a structured system prompt, extracts JSON, normalises it into the
 * SlotData shape. One repair round-trip on parse failure.
 */

import { getAiConfig, aiChat, QUALITY_MODEL } from "@/lib/ai-client";
import type { ParsedProgram, SlotData, ProgramSection, ProgramExercise } from "./types";

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
// Core parse function (AI-backed, exported for API route)
// ─────────────────────────────────────────────────────────────────────

/**
 * Parse pasted programme text into the program slot shape.
 * Returns null if AI is not configured.
 * Throws on parse failure after repair attempt.
 */
export async function parseProgram(text: string): Promise<ParsedProgram | null> {
  const aiConfig = getAiConfig();
  if (!aiConfig.provider) return null;

  const model = aiConfig.provider === "openrouter" ? QUALITY_MODEL.openrouter : QUALITY_MODEL.claude;

  let raw: string | null;
  try {
    raw = await aiChat({ system: SYSTEM, user: text, maxTokens: 12000, model, temperature: 0.2 });
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
