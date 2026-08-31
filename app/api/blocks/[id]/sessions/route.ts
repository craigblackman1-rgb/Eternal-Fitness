import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { MAX_BLOCK_WEEKS, type Session, type Archetype, type Phase, type Exercise } from "@/types";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("count") === "true";
  const potOnly = searchParams.get("pot_only") === "true";
  const sessionNumber = searchParams.get("session_number");

  if (countOnly) {
    // CR-EF-101 — when pot_only, count only sessions where parent_session_id IS NULL
    let query = supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("block_id", params.id);
    if (potOnly) {
      query = query.is("parent_session_id", null);
    }
    const { count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count });
  }

  const baseQuery = supabase
    .from("sessions")
    .select("*")
    .eq("block_id", params.id)
    .order("session_number", { ascending: true });

  if (sessionNumber) {
    const { data, error } = await baseQuery.eq("session_number", parseInt(sessionNumber)).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await baseQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { template_id, week, archetype, focus_label, scheduled_at, parent_session_id } = body as {
    template_id?: string;
    week?: number;
    archetype?: string;
    focus_label?: string;
    scheduled_at?: string;
    parent_session_id?: string;
  };

  const { data: block, error: blockError } = await supabase
    .from("blocks")
    .select("id, client_id")
    .eq("id", params.id)
    .single();
  if (blockError || !block) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  const { data: existingSessions, error: existingError } = await supabase
    .from("sessions")
    .select("session_number, week, phase")
    .eq("block_id", params.id);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const rows = (existingSessions ?? []) as { session_number: number; week: number | null; phase: string | null }[];
  const sessionNumber = rows.reduce((max, s) => Math.max(max, s.session_number), 0) + 1;
  if (sessionNumber > 18) {
    return NextResponse.json({ error: "This block already has the maximum of 18 sessions" }, { status: 400 });
  }

  // week: required+validated when adding real content from a template
  // (matches the desktop AddWorkoutDialog contract, unchanged). For a
  // content-free session (booking, or build-from-scratch before the trainer
  // has picked a week) it's optional — derive it from the block's own
  // furthest-scheduled week, or 1 for a brand-new block.
  let resolvedWeek: number | null = week ?? null;
  if (template_id) {
    if (!resolvedWeek || typeof resolvedWeek !== "number" || resolvedWeek < 1 || resolvedWeek > MAX_BLOCK_WEEKS) {
      return NextResponse.json({ error: `week must be between 1 and ${MAX_BLOCK_WEEKS}` }, { status: 400 });
    }
  } else {
    const maxWeek = rows.reduce((max, s) => (s.week != null && s.week > max ? s.week : max), 0);
    resolvedWeek = resolvedWeek ?? (maxWeek > 0 ? maxWeek : 1);
    if (resolvedWeek < 1 || resolvedWeek > MAX_BLOCK_WEEKS) {
      return NextResponse.json({ error: `week must be between 1 and ${MAX_BLOCK_WEEKS}` }, { status: 400 });
    }
  }
  const resolvedPhase = rows.find((s) => s.week === resolvedWeek)?.phase ?? null;

  let sessionData: Session;
  let resolvedArchetype: string | null = null;

  if (template_id) {
    const { data: template, error: templateError } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("id", template_id)
      .single();
    if (templateError || !template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    resolvedArchetype =
      archetype && ["A", "B", "C"].includes(archetype)
        ? archetype
        : template.archetypes?.[0] && ["A", "B", "C"].includes(template.archetypes[0])
          ? template.archetypes[0]
          : null;

    const templateData = template.data as { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
    const asExercises = (arr: unknown[] | undefined): Exercise[] => (arr ?? []) as Exercise[];

    sessionData = {
      session_id: crypto.randomUUID(),
      block_id: params.id,
      client_id: block.client_id,
      session_number: sessionNumber,
      archetype: resolvedArchetype as Archetype,
      week: resolvedWeek,
      phase: resolvedPhase as Phase,
      focus_label: template.name,
      time_tier: "standard",
      versions: {
        studio: {
          warm_up: asExercises(templateData.warm_up),
          main_block: asExercises(templateData.main_block),
          cooldown: asExercises(templateData.cooldown),
        },
        home: {
          warm_up: asExercises(templateData.warm_up ?? []),
          main_block: asExercises(templateData.main_block ?? []),
          cooldown: asExercises(templateData.cooldown ?? []),
        },
      },
      coaching_notes: `Added from template "${template.name}".`,
      client_intro: "",
    };

    await supabase
      .from("workout_templates")
      .update({ usage_count: (template.usage_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", template_id);
  } else {
    // Content-free session: either a pure booking (no name yet — a session's
    // identity is its date+time, a workout is content attached separately)
    // or build-from-scratch (the trainer names it now, content comes next
    // in the exercise editor). `focus_label` distinguishes the two.
    resolvedArchetype = archetype && ["A", "B", "C"].includes(archetype) ? archetype : null;
    const name = (focus_label ?? "").trim() || null;
    sessionData = {
      session_id: crypto.randomUUID(),
      block_id: params.id,
      client_id: block.client_id,
      session_number: sessionNumber,
      archetype: resolvedArchetype as Archetype,
      week: resolvedWeek,
      phase: resolvedPhase as Phase,
      focus_label: name,
      time_tier: "standard",
      versions: {
        studio: { warm_up: [], main_block: [], cooldown: [] },
        home: { warm_up: [], main_block: [], cooldown: [] },
      },
      coaching_notes: name ? "Built from scratch." : "Booked session (no content yet).",
      client_intro: "",
    };
  }

  const insertPayload: Record<string, unknown> = {
    block_id: params.id,
    session_number: sessionNumber,
    archetype: resolvedArchetype,
    week: resolvedWeek,
    phase: resolvedPhase,
    data: sessionData,
  };
  if (scheduled_at) insertPayload.scheduled_at = scheduled_at;
  // CR-EF-101 — sub-sessions link to parent
  if (parent_session_id) insertPayload.parent_session_id = parent_session_id;

  const { data: created, error: insertError } = await supabase
    .from("sessions")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json(created, { status: 201 });
}
