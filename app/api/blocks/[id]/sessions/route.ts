import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { MAX_BLOCK_WEEKS } from "@/types";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("count") === "true";
  const sessionNumber = searchParams.get("session_number");

  if (countOnly) {
    const { count, error } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("block_id", params.id);
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
  const { template_id, week, archetype, scheduled_at } = body as {
    template_id?: string;
    week?: number;
    archetype?: string;
    scheduled_at?: string;
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

  let resolvedWeek = week ?? null;
  let resolvedPhase: string | null = null;
  let sessionData: Record<string, unknown>;

  if (template_id) {
    if (typeof template_id !== "string") {
      return NextResponse.json({ error: "template_id must be a string" }, { status: 400 });
    }
    // Upper bound matches sessions_week_check — blocks are no longer assumed to be
    // 6 weeks (Nathan Wadey's supplied plan is 12), and clients.package allows 24.
    if (!resolvedWeek || typeof resolvedWeek !== "number" || resolvedWeek < 1 || resolvedWeek > MAX_BLOCK_WEEKS) {
      return NextResponse.json({ error: `week must be between 1 and ${MAX_BLOCK_WEEKS}` }, { status: 400 });
    }

    const { data: template, error: templateError } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("id", template_id)
      .single();
    if (templateError || !template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const resolvedArchetype =
      archetype && ["A", "B", "C"].includes(archetype)
        ? archetype
        : template.archetypes?.[0] && ["A", "B", "C"].includes(template.archetypes[0])
          ? template.archetypes[0]
          : null;

    resolvedPhase = rows.find((s) => s.week === resolvedWeek)?.phase ?? null;

    const templateData = template.data as { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
    const stripEquipment = (exercises: unknown[]) =>
      (exercises as Record<string, unknown>[]).map((ex) => ({ ...ex, equipment: [] }));

    sessionData = {
      session_id: crypto.randomUUID(),
      block_id: params.id,
      client_id: block.client_id,
      session_number: sessionNumber,
      archetype: resolvedArchetype,
      week: resolvedWeek,
      phase: resolvedPhase,
      focus_label: template.name,
      time_tier: "standard",
      versions: {
        studio: {
          warm_up: templateData.warm_up ?? [],
          main_block: templateData.main_block ?? [],
          cooldown: templateData.cooldown ?? [],
        },
        home: {
          warm_up: stripEquipment(templateData.warm_up ?? []),
          main_block: stripEquipment(templateData.main_block ?? []),
          cooldown: stripEquipment(templateData.cooldown ?? []),
        },
      },
      coaching_notes: `Added from template "${template.name}".`,
      client_intro: "",
    };

    const { data: created, error: insertError } = await supabase
      .from("sessions")
      .insert({
        block_id: params.id,
        session_number: sessionNumber,
        archetype: resolvedArchetype,
        week: resolvedWeek,
        phase: resolvedPhase,
        data: sessionData,
        ...(scheduled_at ? { scheduled_at: scheduled_at } : {}),
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await supabase
      .from("workout_templates")
      .update({ usage_count: (template.usage_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", template_id);

    return NextResponse.json(created, { status: 201 });
  }

  // Booking path: a session is a booked calendar slot with no prescription
  // content. The block supplies the client/week context.
  const maxWeek = rows.reduce((max, s) => (s.week != null && s.week > max ? s.week : max), 0);
  resolvedWeek = resolvedWeek ?? (maxWeek > 0 ? maxWeek : 1);
  if (resolvedWeek < 1 || resolvedWeek > MAX_BLOCK_WEEKS) {
    return NextResponse.json({ error: `week must be between 1 and ${MAX_BLOCK_WEEKS}` }, { status: 400 });
  }
  resolvedPhase = rows.find((s) => s.week === resolvedWeek)?.phase ?? null;

  sessionData = {
    session_id: crypto.randomUUID(),
    block_id: params.id,
    client_id: block.client_id,
    session_number: sessionNumber,
    archetype: null,
    week: resolvedWeek,
    phase: resolvedPhase,
    focus_label: null,
    time_tier: "standard",
    versions: {
      studio: { warm_up: [], main_block: [], cooldown: [] },
      home: { warm_up: [], main_block: [], cooldown: [] },
    },
    coaching_notes: "Booked session (no content yet).",
    client_intro: "",
  };

  const insertPayload: Record<string, unknown> = {
    block_id: params.id,
    session_number: sessionNumber,
    archetype: null,
    week: resolvedWeek,
    phase: resolvedPhase,
    data: sessionData,
  };
  if (scheduled_at) insertPayload.scheduled_at = scheduled_at;

  const { data: created, error: insertError } = await supabase
    .from("sessions")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json(created, { status: 201 });
}
