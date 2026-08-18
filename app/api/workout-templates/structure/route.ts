import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAiConfig, aiChat, QUALITY_MODEL } from "@/lib/ai-client";
import type { SessionVersion, Exercise } from "@/types";

/**
 * Structures a pasted workout (plain text) into the existing template data
 * shape (`SessionVersion` — warm_up / main_block / cooldown exercise lists)
 * using the same provider/model routing as the rest of the hub's AI features
 * (`aiChat` + `QUALITY_MODEL` — DeepSeek V3.1 via OpenRouter, or Claude Sonnet
 * direct). Returns the structured draft WITHOUT saving it — the caller routes
 * the result into `TemplateEditorClient` for review before any DB write.
 */

const SYSTEM = `You are an expert exercise physiologist assistant. You turn a trainer's pasted workout notes into a structured session template.

Return ONE valid JSON object matching this exact schema (no markdown, no preamble, no explanation):
{
  "name": "a short human-readable template name",
  "data": {
    "warm_up": [
      { "exercise_name": "string", "sets": number, "reps": "string", "tempo": "string", "rest": "string", "coaching_cue": "string", "modification": "string", "equipment": ["string"] }
    ],
    "main_block": [ ...same shape... ],
    "cooldown": [ ...same shape... ]
  }
}

Rules:
- Detect the Warm-up / Main block / Cooldown sections from headings or obvious grouping. If the paste has no clear sections, put everything in main_block.
- Parse the prescription from the text (e.g. "3 sets of 8", "3 × 8", "rest 60s", "tempo 2-1-2"). Put sets as a number; reps is always a string (e.g. "8", "10-12", "20s hold", "6 each leg"); leave tempo/rest as empty strings when not stated.
- Do not invent exercises — only use exercises the trainer actually wrote.
- Preserve the trainer's own wording for exercise names where possible, but tidy obviously broken casing.
- Ignore greeting lines, client names, and trailing notes that are not exercises.`;

interface StructuredDraft {
  name: string;
  data: SessionVersion;
}

function stripFences(text: string): string {
  return text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/gi, "")
    .trim();
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response contained no JSON object");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

const SECTION_ALIASES: Record<keyof SessionVersion, string[]> = {
  warm_up: ["warm_up", "warmup", "warm-up", "warm up", "warmupblock"],
  main_block: ["main_block", "main", "mainblock", "main block", "workout", "mainworkout"],
  cooldown: ["cooldown", "cool_down", "cool-down", "cool down", "cooldownblock"],
};

function pickSection(data: Record<string, unknown>, section: keyof SessionVersion): unknown[] {
  for (const alias of SECTION_ALIASES[section]) {
    const direct = data[alias];
    if (Array.isArray(direct)) return direct;
  }
  // Fall back to a case-insensitive key scan.
  for (const [key, value] of Object.entries(data)) {
    const normalized = key.toLowerCase().replace(/[\s-]+/g, "");
    if (SECTION_ALIASES[section].some((a) => a.replace(/[\s-]+/g, "").toLowerCase() === normalized) && Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
}

function normalizeExercise(raw: unknown): Exercise {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name =
    asString(obj.exercise_name).trim() ||
    asString(obj.name).trim() ||
    asString(obj.n).trim() ||
    asString(obj.movement).trim();

  const setsRaw = obj.sets ?? obj.set_count;
  const setsNumber = typeof setsRaw === "number" ? setsRaw : parseInt(asString(setsRaw), 10);
  const sets = Number.isFinite(setsNumber) && setsNumber > 0 ? setsNumber : 1;

  const exercise: Exercise = {
    exercise_name: name || "Untitled exercise",
    sets,
    reps: asString(obj.reps).trim(),
    tempo: asString(obj.tempo).trim(),
    rest: asString(obj.rest).trim(),
    coaching_cue: asString(obj.coaching_cue).trim(),
    modification: asString(obj.modification).trim(),
    equipment: asStringArray(obj.equipment),
  };
  return exercise;
}

function normalizeSessionVersion(raw: unknown): SessionVersion {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const warm_up = pickSection(data, "warm_up").map(normalizeExercise).filter((e) => e.exercise_name !== "Untitled exercise");
  const main_block = pickSection(data, "main_block").map(normalizeExercise).filter((e) => e.exercise_name !== "Untitled exercise");
  const cooldown = pickSection(data, "cooldown").map(normalizeExercise).filter((e) => e.exercise_name !== "Untitled exercise");
  return { warm_up, main_block, cooldown };
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { text?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = (body.text ?? body.html ?? "").toString().trim();
  if (!text) return NextResponse.json({ error: "No text to structure" }, { status: 400 });

  const aiConfig = getAiConfig();
  if (!aiConfig.provider) {
    return NextResponse.json(
      { error: "AI is not configured — add ANTHROPIC_API_KEY or OPENROUTER_API_KEY to enable structuring." },
      { status: 503 },
    );
  }

  const model = aiConfig.provider === "openrouter" ? QUALITY_MODEL.openrouter : QUALITY_MODEL.claude;

  let raw: string | null;
  try {
    raw = await aiChat({ system: SYSTEM, user: text, maxTokens: 8000, model, temperature: 0.2 });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 300) : "unknown error";
    return NextResponse.json({ error: `Structuring failed: ${detail}` }, { status: 502 });
  }

  if (!raw) return NextResponse.json({ error: "AI returned no response" }, { status: 502 });

  let parsed: Record<string, unknown> | undefined;
  let parseError: string | undefined;
  try {
    parsed = extractJson(raw);
  } catch (err) {
    parseError = err instanceof Error ? err.message : "unknown error";
  }

  // One repair round-trip for bad JSON (truncated output, trailing commas,
  // stray commentary around the object) — same bounded-retry shape as the
  // Plan Agent's session generation in planGeneration.ts.
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
            content: `That response failed JSON parsing (${parseError}). Return the same structured workout as a single valid JSON object matching the schema. Output ONLY the JSON object — no markdown fences, no commentary, no trailing commas.`,
          },
        ],
        maxTokens: 8000,
        model,
        temperature: 0.2,
      });
    } catch {
      // fall through — reported below via parseError
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
    return NextResponse.json(
      { error: `Could not parse the AI response: ${parseError ?? "unknown error"}. Try structuring again.` },
      { status: 502 },
    );
  }

  const data = normalizeSessionVersion(parsed.data);
  const name = asString(parsed.name).trim() || "Pasted workout";
  if (data.warm_up.length === 0 && data.main_block.length === 0 && data.cooldown.length === 0) {
    return NextResponse.json(
      { error: "No exercises could be parsed from the pasted text. Try cleaning up the paste and structuring again." },
      { status: 422 },
    );
  }
  const draft: StructuredDraft = { name, data };

  return NextResponse.json(draft);
}
