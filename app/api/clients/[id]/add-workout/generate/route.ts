import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAiConfig, aiChat, QUALITY_MODEL } from "@/lib/ai-client";
import type { ClientProfile, SessionVersion, Exercise } from "@/types";

/**
 * CR-EF-120 — Q&A generation: takes a few trainer answers and produces a
 * structured single-session preview via AI. Returns the structured draft
 * WITHOUT saving — the caller shows a preview and confirms before writing.
 */

const SYSTEM = `You are an expert exercise physiologist assistant for a personal trainer. You generate a single workout session based on the trainer's answers and the client's profile.

Return ONE valid JSON object matching this exact schema (no markdown, no preamble):
{
  "name": "a short human-readable workout name (e.g. 'Home — Full Body Strength')",
  "data": {
    "warm_up": [
      { "exercise_name": "string", "sets": number, "reps": "string", "tempo": "string", "rest": "string", "coaching_cue": "string", "modification": "string", "equipment": ["string"] }
    ],
    "main_block": [ ...same shape... ],
    "cooldown": [ ...same shape... ]
  }
}

Rules:
- Match exercises to the client's available equipment ONLY. Never suggest equipment they don't have.
- Respect all restrictions and contraindications listed in the client profile.
- Keep the workout achievable for the stated effort level.
- 4-8 exercises total across all sections.
- Preserve the trainer's wording for exercise names where applicable.
- Equipment array should list only the equipment actually needed for each exercise.`;

function stripFences(text: string): string {
  return text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*$/gi, "").trim();
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

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
}

function normalizeExercise(raw: unknown): Exercise {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = asString(obj.exercise_name).trim() || asString(obj.name).trim() || "Untitled exercise";
  const setsRaw = obj.sets ?? obj.set_count;
  const setsNumber = typeof setsRaw === "number" ? setsRaw : parseInt(asString(setsRaw), 10);
  const sets = Number.isFinite(setsNumber) && setsNumber > 0 ? setsNumber : 1;

  return {
    exercise_name: name,
    sets,
    reps: asString(obj.reps).trim(),
    tempo: asString(obj.tempo).trim(),
    rest: asString(obj.rest).trim(),
    coaching_cue: asString(obj.coaching_cue).trim(),
    modification: asString(obj.modification).trim(),
    equipment: asStringArray(obj.equipment),
  };
}

function normalizeSessionVersion(raw: unknown): SessionVersion {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (key: string): Exercise[] => {
    const val = data[key];
    if (!Array.isArray(val)) return [];
    return val.map(normalizeExercise).filter((e) => e.exercise_name !== "Untitled exercise");
  };
  return { warm_up: pick("warm_up"), main_block: pick("main_block"), cooldown: pick("cooldown") };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { focus?: string; effort?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { focus, effort, notes } = body;
  if (!focus) return NextResponse.json({ error: "focus is required" }, { status: 400 });

  const aiConfig = getAiConfig();
  if (!aiConfig.provider) {
    return NextResponse.json(
      { error: "AI is not configured — add ANTHROPIC_API_KEY or OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  /* Fetch client context */
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, delivery_mode, equipment, profile")
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const profile = (client.profile as Record<string, unknown>) ?? {};
  const health = (profile.health as Record<string, unknown>) ?? {};
  const conditions = (health.conditions as string[]) ?? [];
  const contraindications = (health.contraindications as string[]) ?? [];
  const painPoints = (health.pain_points as string[]) ?? [];
  const medications = ((health.medications as { name: string }[]) ?? []);
  const profileNotes = (profile.notes as Record<string, unknown>) ?? {};
  const restrictions = (profileNotes.watch_for as string) ?? "";
  const programmingAdaptations = ((profile.programming_adaptations as { severity: string; detail: string }[]) ?? []);
  const hardRules = programmingAdaptations.filter((r) => r.severity === "hard").map((r) => r.detail);

  const equipmentList = client.equipment ?? [];
  const deliveryMode = client.delivery_mode ?? "studio_1to1";

  const userPrompt = `Client: ${client.name}
Training format: ${deliveryMode === "studio_1to1" ? "Studio 1:1" : "Home training"}
Available equipment: ${equipmentList.length > 0 ? equipmentList.join(", ") : "Not specified — use bodyweight only"}

Health conditions: ${conditions.length > 0 ? conditions.join(", ") : "None recorded"}
Contraindications: ${contraindications.length > 0 ? contraindications.join(", ") : "None recorded"}
Pain points: ${painPoints.length > 0 ? painPoints.join(", ") : "None recorded"}
Medications: ${medications.length > 0 ? medications.map((m) => m.name ?? "unknown").join(", ") : "None recorded"}
Known restrictions: ${restrictions || "None"}
Hard training rules: ${hardRules.length > 0 ? hardRules.join("; ") : "None"}

Trainer's request:
Focus: ${focus}
Effort level: ${effort || "Standard effort"}
Notes: ${notes || "None"}

Generate a single workout session that matches the focus, respects the effort level, and honours all restrictions and equipment constraints.`;

  const model = aiConfig.provider === "openrouter" ? QUALITY_MODEL.openrouter : QUALITY_MODEL.claude;

  let raw: string | null;
  try {
    raw = await aiChat({ system: SYSTEM, user: userPrompt, maxTokens: 4000, model, temperature: 0.3 });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 300) : "unknown error";
    return NextResponse.json({ error: `Generation failed: ${detail}` }, { status: 502 });
  }

  if (!raw) return NextResponse.json({ error: "AI returned no response" }, { status: 502 });

  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = extractJson(raw);
  } catch {
    /* one repair attempt */
    try {
      const repaired = await aiChat({
        system: SYSTEM,
        messages: [
          { role: "user" as const, content: userPrompt },
          { role: "assistant" as const, content: raw },
          { role: "user" as const, content: "That response was not valid JSON. Return the same workout as a single valid JSON object matching the schema. Output ONLY the JSON — no markdown fences." },
        ],
        maxTokens: 4000,
        model,
        temperature: 0.3,
      });
      if (repaired) parsed = extractJson(repaired);
    } catch {
      /* fall through */
    }
  }

  if (!parsed) {
    return NextResponse.json({ error: "Could not parse the AI response. Try again." }, { status: 502 });
  }

  const data = normalizeSessionVersion(parsed.data);
  if (data.warm_up.length === 0 && data.main_block.length === 0 && data.cooldown.length === 0) {
    return NextResponse.json({ error: "AI returned an empty workout. Try again with more detail." }, { status: 422 });
  }

  const workoutName = asString(parsed.name).trim() || `${focus} workout`;

  return NextResponse.json({ name: workoutName, data });
}
