import type { createPgClient } from "@/lib/pg-client";
import type { Exercise, SessionVersion } from "@/types";
import { ensureUids } from "@/lib/exercise-ref";

/**
 * CR-EF-125 — attach supplementary workouts to a parent session.
 *
 * Loads the client's active supplementary list and, for each entry, inserts a
 * sub-session if one doesn't already exist for that entry+parent pair. Idempotent
 * by construction. Never attaches to sub-sessions, completed sessions, or
 * cancelled sessions.
 *
 * Called from the four session-creation sites:
 * 1. POST app/api/blocks/[id]/sessions (top-level only)
 * 2. POST app/api/clients/[id]/add-workout
 * 3. POST app/api/sessions/[id]/clone (top-level only)
 * 4. lib/outlook-bookings.ts materializeBookingSession (both branches)
 */
export async function attachSupplementaryWork({
  clientId,
  parentSession,
  db,
}: {
  clientId: string;
  parentSession: {
    id: string;
    block_id: string;
    session_number: number;
    scheduled_at: string | null;
    status: string | null;
  };
  db: ReturnType<typeof createPgClient>;
}): Promise<{ attached: number }> {
  // Never attach to a sub-session, a completed session, or a cancelled session.
  if (parentSession.status === "completed" || parentSession.status === "cancelled") {
    return { attached: 0 };
  }

  const { data: activeRows, error: listErr } = await db
    .from("client_supplementary_workouts")
    .select("id, workout_template_id")
    .eq("client_id", clientId)
    .is("removed_at", null)
    .order("sort_order", { ascending: true });

  if (listErr || !activeRows || activeRows.length === 0) {
    return { attached: 0 };
  }

  let attached = 0;

  for (const entry of activeRows as { id: string; workout_template_id: string }[]) {
    // Check if a sub-session already exists for this entry+parent pair.
    const { data: existing } = await db
      .from("sessions")
      .select("id", { head: true, count: "exact" })
      .eq("parent_session_id", parentSession.id)
      .eq("supplementary_source_id", entry.id)
      .maybeSingle();

    if (existing) continue;

    // Load the template content.
    const { data: template, error: tplErr } = await db
      .from("workout_templates")
      .select("*")
      .eq("id", entry.workout_template_id)
      .single();

    if (tplErr || !template) continue;

    const templateData = template.data as SessionVersion;
    const asExercises = (arr: unknown[] | undefined): Exercise[] => (arr ?? []) as Exercise[];

    const sessionData = {
      session_id: crypto.randomUUID(),
      block_id: parentSession.block_id,
      client_id: clientId,
      session_number: parentSession.session_number,
      archetype: template.archetypes?.[0] ?? null,
      week: null,
      phase: null,
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
      coaching_notes: `Supplementary: ${template.name}.`,
      client_intro: "",
    };

    // BUG-EF-111 — regenerate exercise uids so this sub-session never shares
    // uids with other sessions derived from the same template.
    const sectionKeys = ["warm_up", "main_block", "cooldown"] as const;
    for (const v of Object.keys(sessionData.versions)) {
      const ver = sessionData.versions[v as keyof typeof sessionData.versions];
      for (const sk of sectionKeys) {
        (ver as Record<string, unknown>)[sk] = ensureUids((ver as Record<string, unknown>)[sk] as { uid?: string }[], { forceNew: true });
      }
    }

    const status = parentSession.scheduled_at ? "scheduled" : "planned";

    const { error: insertErr } = await db.from("sessions").insert({
      block_id: parentSession.block_id,
      session_number: parentSession.session_number,
      parent_session_id: parentSession.id,
      scheduled_at: parentSession.scheduled_at,
      status,
      data: sessionData,
      supplementary_source_id: entry.id,
    });

    if (!insertErr) {
      attached++;
      // Bump usage_count.
      await db
        .from("workout_templates")
        .update({
          usage_count: ((template as { usage_count?: number }).usage_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.workout_template_id);
    }
  }

  return { attached };
}
