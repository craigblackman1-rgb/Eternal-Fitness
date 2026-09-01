import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { Session, SessionVersion, Exercise, WorkoutTemplate, StudioEquipment } from "@/types";

/**
 * CR-EF-120 — Add-workout context + session creation.
 *
 * GET  — returns client context (equipment, delivery mode, active block,
 *        filtered templates with exclusion reasons, next session position).
 * POST — creates a session in the client's active block (auto-created if
 *        needed). Accepts template, paste, or Q&A source.
 */

/* ── Equipment matching ──────────────────────────────────────────────── */

function normaliseEquipment(name: string): string {
  return name.trim().toLowerCase();
}

function templateNeedsEquipment(template: WorkoutTemplate): string[] {
  const all = [...(template.data?.warm_up ?? []), ...(template.data?.main_block ?? []), ...(template.data?.cooldown ?? [])] as Exercise[];
  const needed = new Set<string>();
  for (const ex of all) {
    for (const eq of ex.equipment ?? []) {
      if (eq) needed.add(eq);
    }
  }
  return Array.from(needed);
}

function templateMatchesEquipment(template: WorkoutTemplate, clientEquipment: string[] | null): { match: boolean; missing: string[] } {
  if (clientEquipment === null) return { match: true, missing: [] };
  const needed = templateNeedsEquipment(template);
  if (needed.length === 0) return { match: true, missing: [] };
  const available = new Set(clientEquipment.map(normaliseEquipment));
  const missing = needed.filter((n) => !available.has(normaliseEquipment(n)));
  return { match: missing.length === 0, missing };
}

function templateMatchesDeliveryMode(template: WorkoutTemplate, deliveryMode: string | null): boolean {
  if (!deliveryMode) return true;
  const positions = template.position ?? [];
  if (positions.length === 0) return true;
  const modeKey = deliveryMode === "studio_1to1" ? "studio" : deliveryMode === "home_training" ? "home" : deliveryMode;
  return positions.some((p) => p.toLowerCase() === modeKey);
}

/* ── GET: client context for the add-workout flow ────────────────────── */

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, client_number, delivery_mode, equipment, package_type, profile, sessions_purchased")
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const equipmentGuard = client.equipment === null;

  /* Active block + sessions */
  const { data: blocks } = await supabase
    .from("blocks")
    .select("id, block_number, status, scheduled_start")
    .eq("client_id", client.id)
    .order("block_number", { ascending: false });

  const activeBlock = (blocks ?? []).find((b) => b.status === "active") ?? (blocks ?? [])[0] ?? null;

  let sessions: { id: string; session_number: number; scheduled_at: string | null; status: string | null; parent_session_id: string | null; data: Session }[] = [];
  if (activeBlock) {
    const { data: sessionRows } = await supabase
      .from("sessions")
      .select("id, session_number, scheduled_at, status, parent_session_id, data")
      .eq("block_id", activeBlock.id)
      .order("session_number", { ascending: true });
    sessions = (sessionRows ?? []) as typeof sessions;
  }

  /* Next scheduled session for "next up after X's session" copy */
  const now = new Date().toISOString();
  const upcomingSessions = sessions
    .filter((s) => !s.parent_session_id && s.scheduled_at && s.scheduled_at > now && s.status !== "cancelled")
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  const nextScheduledSession = upcomingSessions[0] ?? null;
  const lastScheduledSession = sessions
    .filter((s) => !s.parent_session_id && s.scheduled_at && s.status !== "cancelled")
    .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""))[0] ?? null;

  /* Templates — filtered by equipment + delivery mode */
  const { data: allTemplates } = await supabase
    .from("workout_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  const templates = (allTemplates ?? []) as WorkoutTemplate[];
  const matchedTemplates: { template: WorkoutTemplate; matchInfo: { match: boolean; missing: string[] } }[] = [];
  const excludedTemplates: { template: WorkoutTemplate; reason: string }[] = [];

  for (const t of templates) {
    const equipMatch = templateMatchesEquipment(t, client.equipment ?? null);
    const deliveryMatch = templateMatchesDeliveryMode(t, client.delivery_mode);
    if (equipMatch.match && deliveryMatch) {
      matchedTemplates.push({ template: t, matchInfo: equipMatch });
    } else {
      const reasons: string[] = [];
      if (!equipMatch.match) {
        reasons.push(`needs ${equipMatch.missing.join(", ")} — ${client.name} ${client.equipment && client.equipment.length === 0 ? "has no equipment" : "doesn't have these"}`);
      }
      if (!deliveryMatch) {
        reasons.push(`designed for ${t.position?.join(" or ") ?? "a different training format"}`);
      }
      excludedTemplates.push({ template: t, reason: reasons.join("; ") });
    }
  }

  /* Equipment catalogue for the context banner */
  const { data: equipCatalog } = await supabase
    .from("studio_equipment")
    .select("name, home_equivalent")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const equipmentNames = client.equipment ?? [];

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      clientNumber: client.client_number,
      deliveryMode: client.delivery_mode,
      equipment: client.equipment,
      packageType: client.package_type,
      profile: client.profile,
    },
    equipmentGuard,
    activeBlock: activeBlock ? { id: activeBlock.id, blockNumber: activeBlock.block_number } : null,
    sessionCount: sessions.filter((s) => !s.parent_session_id).length,
    nextScheduledSession: nextScheduledSession
      ? { dayOfWeek: new Date(nextScheduledSession.scheduled_at!).toLocaleDateString("en-GB", { weekday: "long" }), date: nextScheduledSession.scheduled_at }
      : null,
    lastScheduledSession: lastScheduledSession
      ? { dayOfWeek: new Date(lastScheduledSession.scheduled_at!).toLocaleDateString("en-GB", { weekday: "long" }), date: lastScheduledSession.scheduled_at }
      : null,
    matchedTemplates: matchedTemplates.map((m) => ({
      id: m.template.id,
      name: m.template.name,
      archetypes: m.template.archetypes,
      equipment: m.template.equipment,
      muscleGroups: m.template.muscle_groups,
      movementType: m.template.movement_type,
      position: m.template.position,
      estimatedMinutes: ((m.template.data?.warm_up?.length ?? 0) + (m.template.data?.main_block?.length ?? 0) + (m.template.data?.cooldown?.length ?? 0)) * 4 || 20,
    })),
    excludedTemplates: excludedTemplates.map((e) => ({
      id: e.template.id,
      name: e.template.name,
      reason: e.reason,
    })),
    equipmentNames,
    equipmentCatalog: (equipCatalog ?? []) as StudioEquipment[],
  });
}

/* ── POST: create a session in the client's active block ─────────────── */

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    source: "template" | "paste" | "qa";
    template_id?: string;
    workout_data?: SessionVersion;
    name?: string;
    notes?: string;
    week?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { source, template_id, workout_data, name, notes, week } = body;

  if (!source || !["template", "paste", "qa"].includes(source)) {
    return NextResponse.json({ error: "source must be template, paste, or qa" }, { status: 400 });
  }

  /* Fetch client */
  const { data: client } = await supabase
    .from("clients")
    .select("id, client_number, delivery_mode, equipment, profile")
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  if (client.equipment === null) {
    return NextResponse.json({ error: "Equipment must be set before adding workouts" }, { status: 400 });
  }

  /* Find or create active block */
  let { data: blocks } = await supabase
    .from("blocks")
    .select("id, block_number, status")
    .eq("client_id", client.id)
    .order("block_number", { ascending: false });

  let activeBlock = (blocks ?? []).find((b) => b.status === "active") ?? null;

  if (!activeBlock) {
    const blockNumber = ((blocks ?? [])[0]?.block_number ?? 0) + 1;
    const { data: newBlock, error: blockError } = await supabase
      .from("blocks")
      .insert({
        client_id: client.id,
        block_number: blockNumber,
        status: "active",
        block_note: "Auto-created when adding a workout.",
      })
      .select("id, block_number, status")
      .single();

    if (blockError || !newBlock) {
      return NextResponse.json({ error: "Failed to create programme" }, { status: 500 });
    }
    activeBlock = newBlock;
  }

  /* Determine session number */
  const { data: existingSessions } = await supabase
    .from("sessions")
    .select("session_number, week")
    .eq("block_id", activeBlock.id);

  const rows = (existingSessions ?? []) as { session_number: number; week: number | null }[];
  const sessionNumber = rows.reduce((max, s) => Math.max(max, s.session_number), 0) + 1;
  if (sessionNumber > 18) {
    return NextResponse.json({ error: "This programme already has the maximum of 18 sessions" }, { status: 400 });
  }

  /* Resolve week */
  const maxWeek = rows.reduce((max, s) => (s.week != null && s.week > max ? s.week : max), 0);
  const resolvedWeek = week ?? (maxWeek > 0 ? maxWeek : 1);

  /* Build session data based on source */
  let sessionData: Session;
  let resolvedName: string | null = null;

  if (source === "template") {
    if (!template_id) return NextResponse.json({ error: "template_id is required for template source" }, { status: 400 });

    const { data: template, error: tErr } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (tErr || !template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const templateData = template.data as SessionVersion;
    resolvedName = template.name;

    const asExercises = (arr: unknown[] | undefined): Exercise[] => (arr ?? []) as Exercise[];
    sessionData = {
      session_id: crypto.randomUUID(),
      block_id: activeBlock.id,
      client_id: client.id,
      session_number: sessionNumber,
      archetype: template.archetypes?.[0] as Session["archetype"] ?? "A",
      week: resolvedWeek,
      phase: null,
      focus_label: template.name,
      time_tier: "standard",
      versions: {
        studio: { warm_up: asExercises(templateData.warm_up), main_block: asExercises(templateData.main_block), cooldown: asExercises(templateData.cooldown) },
        home: { warm_up: asExercises(templateData.warm_up), main_block: asExercises(templateData.main_block), cooldown: asExercises(templateData.cooldown) },
      },
      coaching_notes: notes ?? `Added from template "${template.name}".`,
      client_intro: "",
    };

    await supabase
      .from("workout_templates")
      .update({ usage_count: (template.usage_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", template_id);

  } else {
    /* paste or qa — both provide workout_data directly */
    if (!workout_data) return NextResponse.json({ error: "workout_data is required for paste/qa source" }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

    resolvedName = name.trim();

    sessionData = {
      session_id: crypto.randomUUID(),
      block_id: activeBlock.id,
      client_id: client.id,
      session_number: sessionNumber,
      archetype: "A",
      week: resolvedWeek,
      phase: null,
      focus_label: resolvedName,
      time_tier: "standard",
      versions: {
        studio: workout_data,
        home: workout_data,
      },
      coaching_notes: notes ?? (source === "qa" ? "Built from Q&A." : "Pasted workout."),
      client_intro: "",
    };
  }

  /* Insert the session */
  const { data: created, error: insertError } = await supabase
    .from("sessions")
    .insert({
      block_id: activeBlock.id,
      session_number: sessionNumber,
      archetype: sessionData.archetype,
      week: resolvedWeek,
      phase: null,
      data: sessionData,
    })
    .select("id")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  /* Determine where it lands in the schedule (plain language) */
  const { data: allBlockSessions } = await supabase
    .from("sessions")
    .select("scheduled_at, status, parent_session_id")
    .eq("block_id", activeBlock.id);

  const now = new Date().toISOString();
  const nonParent = (allBlockSessions ?? []).filter((s: { parent_session_id: string | null; scheduled_at: string | null; status: string | null }) => !s.parent_session_id && s.scheduled_at && s.status !== "cancelled");
  const nextSess = nonParent
    .filter((s: { scheduled_at: string | null }) => (s.scheduled_at ?? "") > now)
    .sort((a: { scheduled_at: string | null }, b: { scheduled_at: string | null }) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))[0] ?? null;
  const lastSess = nonParent
    .sort((a: { scheduled_at: string | null }, b: { scheduled_at: string | null }) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""))[0] ?? null;

  const nextSessionLabel = (() => {
    if (nextSess?.scheduled_at) {
      const day = new Date(nextSess.scheduled_at).toLocaleDateString("en-GB", { weekday: "long" });
      return `next up after ${day}'s session`;
    }
    if (lastSess?.scheduled_at) {
      const day = new Date(lastSess.scheduled_at).toLocaleDateString("en-GB", { weekday: "long" });
      return `next up after ${day}'s session`;
    }
    return "first in the programme";
  })();

  return NextResponse.json({
    sessionId: created.id,
    name: resolvedName,
    nextSessionLabel,
    blockNumber: activeBlock.block_number,
  }, { status: 201 });
}
