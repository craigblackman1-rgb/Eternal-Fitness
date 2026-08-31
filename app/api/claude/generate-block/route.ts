import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAiConfig } from "@/lib/ai-client";
import { loadPlanAgentBundle } from "@/lib/planAgentData";
import { generateViaAi, resolvePlanModel, weekPhases, getWeeklyArchetypes, type TemplateFramework } from "@/lib/planGeneration";
import { tryAcquireGenerationLock, releaseGenerationLock } from "@/lib/generationLock";
import type { ClientProfile, Session, Archetype, Phase, Exercise, SessionVersion } from "@/types";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId, blockNote, previousSummary, templateId } = await request.json();

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  let template: TemplateFramework | null = null;
  let templateUsageCount = 0;
  if (templateId) {
    const { data: templateRow } = await supabase
      .from("workout_templates")
      .select("name, condition_tags, data, usage_count")
      .eq("id", templateId)
      .single();
    if (templateRow) {
      template = {
        name: templateRow.name,
        condition_tags: templateRow.condition_tags ?? [],
        data: templateRow.data as SessionVersion,
      };
      templateUsageCount = (templateRow.usage_count as number) ?? 0;
    }
  }

  const { data: client } = await supabase.from("clients").select("*").eq("client_number", parseInt(clientId)).single();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Guard against a second full (up to 18-call) generation firing for the same
  // client while one is still in flight — e.g. a page refresh mid-generation
  // followed by clicking "Generate" again, which the client-side "disabled
  // while generating" button state doesn't survive. See generationLock.ts.
  if (!tryAcquireGenerationLock(client.id)) {
    return NextResponse.json(
      { error: "A block is already being generated for this client — wait for it to finish before trying again." },
      { status: 409 },
    );
  }

  try {
    return await generateBlockForClient(supabase, client, template, templateId, templateUsageCount, blockNote, previousSummary);
  } finally {
    releaseGenerationLock(client.id);
  }
}

async function generateBlockForClient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  template: TemplateFramework | null,
  templateId: string | undefined,
  templateUsageCount: number,
  blockNote: string | undefined,
  previousSummary: string | undefined,
): Promise<NextResponse> {
  const profile = (client.profile as unknown) as ClientProfile;
  if (!profile || !profile.logistics) {
    return NextResponse.json({ error: "Client profile is incomplete" }, { status: 400 });
  }

  const { data: existingBlocks } = await supabase
    .from("blocks")
    .select("block_number")
    .eq("client_id", client.id)
    .order("block_number", { ascending: false })
    .limit(1);

  const blockNumber = (existingBlocks?.[0]?.block_number ?? 0) + 1;

  const bundle = await loadPlanAgentBundle(supabase, client.id);

  const aiConfig = getAiConfig();
  let sessions: Session[];

  if (aiConfig.provider) {
    try {
      sessions = await generateViaAi(profile, client.pace_mode as string | null, bundle, blockNote, previousSummary, template);
    } catch (err) {
      const detail = err instanceof Error ? err.message.slice(0, 500) : "unknown error";
      // Log the model actually billed (resolvePlanModel(), the QUALITY_MODEL
      // override), not aiConfig.model — that's just the app's configured
      // default and doesn't reflect the override, which hid the real cost
      // driver during the 2026-08-13 incident.
      const billedModel = resolvePlanModel();
      console.error(`[generate-block] AI generation failed via ${aiConfig.provider} (${billedModel}): ${detail}`);
      return NextResponse.json(
        { error: `AI generation failed via ${aiConfig.provider} (${billedModel}): ${detail}` },
        { status: 502 },
      );
    }
  } else {
    const { data: exercisePool } = await supabase
      .from("exercises")
      .select("id, name, archetypes, movement_type, equipment, coaching_cue, default_mod")
      .eq("active", true);
    sessions = generateFallback(profile, blockNumber, (exercisePool ?? []) as ExerciseDbEntry[], template);
  }

  const invalid =
    !Array.isArray(sessions) ||
    sessions.length === 0 ||
    sessions.some(
      (s) =>
        !s?.session_number ||
        !s?.versions?.studio?.main_block?.length ||
        !s?.versions?.home?.main_block?.length,
    );
  if (invalid) {
    console.error(
      `[generate-block] rejected invalid session plan (provider=${aiConfig.provider ?? "fallback"}, count=${Array.isArray(sessions) ? sessions.length : "not-array"}) — no block created`,
    );
    return NextResponse.json(
      { error: "Generation produced an invalid or empty session plan — no block was created. Try again; if this persists the AI provider is misconfigured or underpowered." },
      { status: 502 },
    );
  }

  const { data: block, error: blockError } = await supabase
    .from("blocks")
    .insert({
      client_id: client.id,
      block_number: blockNumber,
      status: "draft",
      block_note: blockNote || null,
    })
    .select()
    .single();

  if (blockError) {
    return NextResponse.json({ error: blockError.message }, { status: 500 });
  }

  const sessionRows = sessions.map((session) => ({
    block_id: block.id,
    session_number: session.session_number,
    archetype: session.archetype,
    week: session.week,
    phase: session.phase,
    data: session,
  }));

  const { error: sessionsError } = await supabase.from("sessions").insert(sessionRows);

  if (sessionsError) {
    await supabase.from("blocks").delete().eq("id", block.id);
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  if (template && templateId) {
    await supabase
      .from("workout_templates")
      .update({ usage_count: templateUsageCount + 1, updated_at: new Date().toISOString() })
      .eq("id", templateId);
  }

  return NextResponse.json({ blockId: block.id, templateUsed: template?.name ?? null }, { status: 201 });
}

/* ─── Fallback generator — pulls from the `exercises` table (source-agnostic:
 *     original + any tagged custom/trainerize rows), not the retired exercise-db.json ─── */

interface ExerciseDbEntry {
  id: string;
  name: string;
  archetypes: Archetype[];
  movement_type: string | null;
  equipment: string[];
  coaching_cue: string | null;
  default_mod: string | null;
}

const archetypeSectionTypes: Record<Archetype, { warm_up: string[]; main_block: string[]; cooldown: string[] }> = {
  A: {
    warm_up: ["spinal_mobility", "upper_body_mobility", "full_body_mobility"],
    main_block: ["lower_body_mobility", "full_body_mobility", "hinge_pattern"],
    cooldown: ["rest_recovery", "spinal_mobility", "lower_body_mobility"],
  },
  B: {
    warm_up: ["core_anterior", "core_posterior", "core_lateral"],
    main_block: ["squat_pattern", "lunge_pattern", "hinge_pattern", "horizontal_pull", "horizontal_push", "vertical_push", "loaded_carry", "push_accessory", "pull_accessory"],
    cooldown: ["spinal_mobility", "lower_body_mobility", "rest_recovery"],
  },
  C: {
    warm_up: ["mobility_dynamic", "core_posterior", "lateral_movement"],
    main_block: ["hinge_pattern", "power_output", "lateral_movement", "locomotion", "cardio"],
    cooldown: ["lower_body_mobility", "rest_recovery"],
  },
};

function pickExercise(
  pool: ExerciseDbEntry[],
  usedIds: Set<string>,
  allowRepeat: boolean
): ExerciseDbEntry | null {
  const available = pool.filter((e) => allowRepeat || !usedIds.has(e.id));
  if (available.length === 0) return null;
  const pick = available[Math.floor(Math.random() * available.length)];
  usedIds.add(pick.id);
  return pick;
}

function makeExercise(
  entry: ExerciseDbEntry,
  phase: Phase,
  section: "warm_up" | "main_block" | "cooldown"
): Exercise {
  const isDeload = phase === "deload";
  const isFoundation = phase === "foundation";
  const isPeak = phase === "peak";

  let sets: number;
  let reps: string;
  let tempo: string;
  let rest: string;

  if (section === "warm_up") {
    sets = 1; reps = "8-10"; tempo = "slow, controlled"; rest = "none";
  } else if (section === "cooldown") {
    sets = 1; reps = "hold 30-45s"; tempo = "breathe"; rest = "none";
  } else {
    if (isDeload) { sets = 2; reps = "10-12"; tempo = "2-0-2"; rest = "60s"; }
    else if (isFoundation) { sets = 3; reps = "10-12"; tempo = "2-0-2"; rest = "60s"; }
    else if (isPeak) { sets = 4; reps = "6-8"; tempo = "2-0-1"; rest = "90s"; }
    else { sets = 3; reps = "8-10"; tempo = "2-0-2"; rest = "60-75s"; }
  }

  return {
    exercise_name: entry.name,
    sets,
    reps,
    tempo,
    rest,
    coaching_cue: entry.coaching_cue ?? "",
    modification: entry.default_mod ?? "Modify as needed for this client's contraindications.",
    equipment: entry.equipment,
  };
}

function composeSessionVersion(
  archetype: Archetype,
  phase: Phase,
  usedIds: Set<string>,
  isHome: boolean,
  db: ExerciseDbEntry[],
): SessionVersion {
  const archetypePool = db.filter((e) => e.archetypes.includes(archetype));

  const sectionTypes = archetypeSectionTypes[archetype];

  function composeSection(section: "warm_up" | "main_block" | "cooldown"): Exercise[] {
    const types = sectionTypes[section];
    const target = section === "main_block" ? 3 : 2;

    const picked: Exercise[] = [];
    const usedInSession = new Set<string>();

    for (let i = 0; i < target && i < types.length; i++) {
      const typePool = archetypePool.filter(
        (e) => e.movement_type === types[i] && !usedIds.has(e.id) && !usedInSession.has(e.id)
      );
      const entry = pickExercise(typePool, usedIds, false);
      if (entry) {
        usedInSession.add(entry.id);
        picked.push(makeExercise(entry, phase, section));
      }
    }

    if (picked.length < target) {
      const remaining = archetypePool.filter(
        (e) => !usedIds.has(e.id) && !usedInSession.has(e.id)
      );
      while (picked.length < target && remaining.length > 0) {
        const entry = pickExercise(remaining, usedIds, false);
        if (!entry) break;
        usedInSession.add(entry.id);
        picked.push(makeExercise(entry, phase, section));
      }
    }

    return picked.length > 0 ? picked : [makeExercise(archetypePool[0], phase, section)];
  }

  const warm_up = composeSection("warm_up");
  const main_block = composeSection("main_block").map((ex, i) => ({
    ...ex,
    group_label: i < 2 ? "Superset A" : "Arms + Core",
  }));
  const cooldown = composeSection("cooldown");

  if (isHome) {
    return { warm_up, main_block, cooldown };
  }

  return { warm_up, main_block, cooldown };
}

/** Rescales a template's own exercises to the current phase's volume, keeping the
 *  exercise choice fixed — the non-AI fallback path can't reason about picking
 *  fresh exercises per week the way the AI path does, so for a template-grounded
 *  block it deterministically repeats the template's exercises with phase-
 *  appropriate sets/reps/tempo/rest instead. */
function rescaleTemplateSection(exercises: Exercise[], phase: Phase, section: "warm_up" | "main_block" | "cooldown"): Exercise[] {
  const isDeload = phase === "deload";
  const isFoundation = phase === "foundation";
  const isPeak = phase === "peak";
  if (section !== "main_block") return exercises;

  let sets: number, reps: string, tempo: string, rest: string;
  if (isDeload) { sets = 2; reps = "10-12"; tempo = "2-0-2"; rest = "60s"; }
  else if (isFoundation) { sets = 3; reps = "10-12"; tempo = "2-0-2"; rest = "60s"; }
  else if (isPeak) { sets = 4; reps = "6-8"; tempo = "2-0-1"; rest = "90s"; }
  else { sets = 3; reps = "8-10"; tempo = "2-0-2"; rest = "60-75s"; }

  return exercises.map((ex) => ({ ...ex, sets, reps, tempo, rest }));
}

function generateFallback(profile: ClientProfile, blockNumber: number, exercisePool: ExerciseDbEntry[], template?: TemplateFramework | null): Session[] {
  const sessions: Session[] = [];
  const usedIds = new Set<string>();
  const spw = profile.logistics.sessions_per_week;
  const primaryGoal = profile.goals.primary;

  const archetypeFocus: Record<Archetype, string> = {
    A: "Mobility & Movement Quality",
    B: "Strength & Stability",
    C: "Power & Conditioning",
  };

  let sessionNumber = 0;

  for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
    const wp = weekPhases[weekIndex];
    const archetypes = getWeeklyArchetypes(spw, weekIndex, primaryGoal);

    const phaseLabel =
      wp.phase === "foundation" ? "Building Foundations"
      : wp.phase === "build" ? "Adding Load"
      : wp.phase === "develop" ? "Increasing Complexity"
      : wp.phase === "peak" ? "Peak Output"
      : "Active Recovery";

    for (const archetype of archetypes) {
      sessionNumber++;

      sessions.push({
        session_id: `generated-${blockNumber}-${sessionNumber}`,
        block_id: "",
        client_id: profile.client.id,
        session_number: sessionNumber,
        archetype,
        week: wp.week,
        phase: wp.phase,
        focus_label: `${archetypeFocus[archetype]} — ${phaseLabel}`,
        time_tier: profile.logistics.time_tier,
        versions: template
          ? {
              studio: {
                warm_up: rescaleTemplateSection(template.data.warm_up, wp.phase, "warm_up"),
                main_block: rescaleTemplateSection(template.data.main_block, wp.phase, "main_block"),
                cooldown: rescaleTemplateSection(template.data.cooldown, wp.phase, "cooldown"),
              },
              home: {
                warm_up: rescaleTemplateSection(template.data.warm_up, wp.phase, "warm_up"),
                main_block: rescaleTemplateSection(template.data.main_block, wp.phase, "main_block"),
                cooldown: rescaleTemplateSection(template.data.cooldown, wp.phase, "cooldown"),
              },
            }
          : {
              studio: composeSessionVersion(archetype, wp.phase, usedIds, false, exercisePool),
              home: composeSessionVersion(archetype, wp.phase, usedIds, true, exercisePool),
            },
        coaching_notes: `Client-specific: ${profile.health.contraindications?.join(", ") || "none noted"}. ${profile.notes.watch_for || ""}.${template ? ` Built from template "${template.name}".` : ""}`,
        client_intro: archetypeFocus[archetype],
      });
    }
  }

  return sessions;
}
