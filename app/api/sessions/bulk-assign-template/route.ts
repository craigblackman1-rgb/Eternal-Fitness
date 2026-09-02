import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { ensureUids } from "@/lib/exercise-ref";

/**
 * CR-EF-111 — bulk-assign a workout template to multiple Outlook-placeholder
 * sessions in one action. Each session receives the template's exercise data,
 * the template name as its focus_label, and the template's first archetype
 * (if valid). The coaching_notes is overwritten to record the bulk assignment.
 *
 * The route reuses the same data shape as the single-session PATCH flow in
 * AssignWorkoutDialog — no new assignment mechanism is introduced.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { session_ids, template_id } = body as { session_ids?: string[]; template_id?: string };

  if (!Array.isArray(session_ids) || session_ids.length === 0) {
    return NextResponse.json({ error: "session_ids is required and must be a non-empty array" }, { status: 400 });
  }
  if (!template_id || typeof template_id !== "string") {
    return NextResponse.json({ error: "template_id is required" }, { status: 400 });
  }
  if (session_ids.length > 50) {
    return NextResponse.json({ error: "Cannot assign more than 50 sessions at once" }, { status: 400 });
  }

  // Fetch the template once.
  const { data: template, error: tplErr } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", template_id)
    .single();
  if (tplErr || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const templateData = template.data as { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
  const asExercises = (arr: unknown[] | undefined): unknown[] => arr ?? [];

  const resolvedArchetype =
    template.archetypes?.[0] && ["A", "B", "C"].includes(template.archetypes[0])
      ? template.archetypes[0]
      : null;

  let assigned = 0;
  const errors: { session_id: string; error: string }[] = [];

  for (const sessionId of session_ids) {
    // Verify the session exists and is an Outlook placeholder (defence-in-depth).
    const { data: session, error: fetchErr } = await supabase
      .from("sessions")
      .select("id, data, archetype, week, phase")
      .eq("id", sessionId)
      .single();

    if (fetchErr || !session) {
      errors.push({ session_id: sessionId, error: "Session not found" });
      continue;
    }

    const label = (session.data as Record<string, unknown>)?.focus_label;
    if (
      typeof label !== "string" ||
      !label.startsWith("Outlook booking — ") ||
      session.archetype != null ||
      session.week != null ||
      session.phase != null
    ) {
      errors.push({ session_id: sessionId, error: "Session is not an unassigned Outlook placeholder" });
      continue;
    }

    const updatedData = {
      ...(session.data as Record<string, unknown>),
      versions: {
        studio: {
          warm_up: asExercises(templateData.warm_up),
          main_block: asExercises(templateData.main_block),
          cooldown: asExercises(templateData.cooldown),
        },
        home: {
          warm_up: asExercises(templateData.warm_up),
          main_block: asExercises(templateData.main_block),
          cooldown: asExercises(templateData.cooldown),
        },
      },
      focus_label: template.name,
      coaching_notes: `Assigned from template: ${template.name} (bulk assignment)`,
    };

    // BUG-EF-111 — regenerate exercise uids per target session so every
    // assigned session gets its own unique uids instead of sharing the
    // template's originals.
    const sectionKeys = ["warm_up", "main_block", "cooldown"] as const;
    for (const v of Object.keys(updatedData.versions)) {
      const ver = updatedData.versions[v as keyof typeof updatedData.versions];
      for (const sk of sectionKeys) {
        (ver as unknown as Record<string, unknown>)[sk] = ensureUids(
          (ver as unknown as Record<string, unknown>)[sk] as { uid?: string }[],
          { forceNew: true },
        );
      }
    }

    const { error: updateErr } = await supabase
      .from("sessions")
      .update({ data: updatedData, archetype: resolvedArchetype })
      .eq("id", sessionId);

    if (updateErr) {
      errors.push({ session_id: sessionId, error: updateErr.message });
    } else {
      assigned++;
    }
  }

  // Bump the template's usage_count once for the whole batch.
  if (assigned > 0) {
    await supabase
      .from("workout_templates")
      .update({
        usage_count: (template.usage_count ?? 0) + assigned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template_id);
  }

  return NextResponse.json({ assigned, errors, template_name: template.name });
}
