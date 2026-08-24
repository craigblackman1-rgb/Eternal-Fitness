import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { deriveSessionStatus } from "@/lib/session-status";

// CR-EF-083 — bulk "swap this exercise across all remaining sessions".
// The single-session swap stays local in SessionEditor (saved via the normal
// PATCH /api/sessions/[id] on "Save changes"); this endpoint only reaches the
// OTHER, later sessions in the source session's block. It never touches a
// completed or cancelled session — rewriting a finished prescription would
// corrupt the historical logged-set data attached to it.

const SECTION_KEYS = ["warm_up", "main_block", "cooldown"] as const;
const VERSION_KEYS = ["studio", "home"] as const;

interface SwapTarget {
  exercise_name: string;
  coaching_cue?: string;
  modification?: string;
  equipment?: string[];
  image_url?: string | null;
  video_url?: string | null;
}

/** Replace every occurrence of `fromLower` (case-insensitive) across both versions
 *  with the target prescription, preserving each exercise's own sets/reps/tempo/rest,
 *  group_label, log_type and uid. Returns null when nothing matched. */
function swapInVersions(
  versions: unknown,
  fromLower: string,
  to: SwapTarget,
): { versions: Record<string, unknown>; swapped: number } | null {
  if (!versions || typeof versions !== "object" || Array.isArray(versions)) return null;
  const nextVersions: Record<string, unknown> = { ...(versions as Record<string, unknown>) };
  let swapped = 0;

  for (const versionKey of VERSION_KEYS) {
    const version = nextVersions[versionKey];
    if (!version || typeof version !== "object" || Array.isArray(version)) continue;
    const nextVersion: Record<string, unknown> = { ...(version as Record<string, unknown>) };
    let versionChanged = false;

    for (const sectionKey of SECTION_KEYS) {
      const list = Array.isArray(nextVersion[sectionKey]) ? (nextVersion[sectionKey] as Record<string, unknown>[]) : [];
      if (list.length === 0) continue;

      const nextList = list.map((ex) => {
        if (!ex || typeof ex !== "object") return ex;
        const name = typeof ex.exercise_name === "string" ? ex.exercise_name : "";
        if (name.trim().toLowerCase() !== fromLower) return ex;
        swapped++;
        return {
          ...ex,
          exercise_name: to.exercise_name,
          coaching_cue: to.coaching_cue ?? "",
          modification: to.modification ?? "",
          equipment: to.equipment ?? [],
          media:
            to.video_url || to.image_url
              ? {
                  ...(ex.media && typeof ex.media === "object" ? ex.media : {}),
                  ...(to.image_url ? { image_url: to.image_url } : {}),
                  ...(to.video_url ? { video_url: to.video_url } : {}),
                }
              : ex.media,
        };
      });

      if (nextList.some((ex, i) => ex !== list[i])) {
        nextVersion[sectionKey] = nextList;
        versionChanged = true;
      }
    }

    if (versionChanged) nextVersions[versionKey] = nextVersion;
  }

  if (swapped === 0) return null;
  return { versions: nextVersions, swapped };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { from_exercise_name, to } = body as { from_exercise_name?: string; to?: SwapTarget };

  if (!from_exercise_name?.trim() || !to?.exercise_name?.trim()) {
    return NextResponse.json(
      { error: "from_exercise_name and to.exercise_name are required" },
      { status: 400 },
    );
  }

  const fromLower = from_exercise_name.trim().toLowerCase();

  // Locate the source session so we know its block and its position in it.
  const { data: source, error: sourceError } = await supabase
    .from("sessions")
    .select("block_id, session_number")
    .eq("id", params.id)
    .single();
  if (sourceError || !source) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("block_id", source.block_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updatedSessions = 0;
  let swappedExercises = 0;

  for (const row of (rows ?? []) as Record<string, any>[]) {
    if (row.id === params.id) continue; // current session handled client-side
    if ((row.session_number ?? 0) <= (source.session_number ?? 0)) continue; // only remaining (later) sessions

    const status = deriveSessionStatus({
      status: row.status,
      completed_at: row.completed_at,
      cancelled_at: row.cancelled_at,
      scheduled_at: row.scheduled_at,
      session_log: row.data?.session_log,
    });
    if (status === "completed" || status === "cancelled") continue; // never touch finished/cancelled

    const result = swapInVersions(row.data?.versions, fromLower, to);
    if (!result) continue;

    const updatedData = { ...(row.data ?? {}), versions: result.versions };
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ data: updatedData })
      .eq("id", row.id);
    if (updateError) {
      console.error(`[swap-exercise] failed to update session ${row.id}:`, updateError);
      continue;
    }
    updatedSessions++;
    swappedExercises += result.swapped;
  }

  return NextResponse.json({ updated_sessions: updatedSessions, swapped_exercises: swappedExercises });
}
