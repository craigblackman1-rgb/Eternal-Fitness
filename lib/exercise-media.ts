import type { PgClient } from "@/lib/pg-client";

/** Media fields as stored in the `exercises` library table's flat columns. */
export interface ExerciseMediaFields {
  image_url?: string | null;
  video_url?: string | null;
}

/** Minimal shape required to backfill media onto a prescribed exercise. */
export type BackfillableExercise = {
  exercise_name?: string | null;
  media?: ExerciseMediaFields | null;
};

/**
 * Fills in missing exercise media by name-match against the `exercises` library
 * (the source of truth). Only entries that lack an image or video are looked up —
 * anything a trainer attached manually (or that AI already embedded) is left
 * untouched. Returns a new array; the input is never mutated.
 *
 * Mirrors the by-name-join pattern in `lib/portal-data.ts`: collect the missing
 * names, one query against `exercises` selecting `name, image_url, video_url`,
 * build a lowercase-name map, then merge into each exercise's `media`.
 */
export async function backfillExerciseMedia<T extends BackfillableExercise>(
  pg: PgClient,
  exercises: T[],
): Promise<T[]> {
  if (exercises.length === 0) return exercises;

  const missingNames = new Set<string>();
  for (const ex of exercises) {
    const name = (ex.exercise_name ?? "").trim().toLowerCase();
    if (!name) continue;
    if (!ex.media?.image_url || !ex.media?.video_url) missingNames.add(name);
  }
  if (missingNames.size === 0) return exercises;

  const { data: library } = await pg
    .from("exercises")
    .select("name, image_url, video_url");

  const imageByName = new Map<string, string>();
  const videoByName = new Map<string, string>();
  for (const entry of (library ?? []) as { name: string | null; image_url: string | null; video_url: string | null }[]) {
    if (!entry.name) continue;
    const key = entry.name.toLowerCase();
    if (entry.image_url && !imageByName.has(key)) imageByName.set(key, entry.image_url);
    if (entry.video_url && !videoByName.has(key)) videoByName.set(key, entry.video_url);
  }

  return exercises.map((ex) => {
    const name = (ex.exercise_name ?? "").trim().toLowerCase();
    const existing = ex.media ?? {};
    const image_url = existing.image_url ?? (name ? imageByName.get(name) ?? null : null);
    const video_url = existing.video_url ?? (name ? videoByName.get(name) ?? null : null);

    if (image_url === (existing.image_url ?? null) && video_url === (existing.video_url ?? null)) {
      return ex;
    }

    const media: ExerciseMediaFields = { ...existing };
    if (image_url) media.image_url = image_url;
    if (video_url) media.video_url = video_url;
    return { ...ex, media };
  });
}
