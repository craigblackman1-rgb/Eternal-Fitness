import type { PgClient } from "@/lib/pg-client";

/** Media fields as stored in the `exercises` library table's flat columns. */
export interface ExerciseMediaFields {
  image_url?: string | null;
  video_url?: string | null;
}

/** Minimal shape required to backfill media and equipment onto a prescribed exercise. */
export type BackfillableExercise = {
  exercise_name?: string | null;
  media?: ExerciseMediaFields | null;
  equipment?: string[] | null;
};

/**
 * Fills in missing exercise media (image/video) and equipment by name-match
 * against the `exercises` library (the source of truth). Only entries that
 * lack an image, video, or have an empty equipment array are looked up —
 * anything a trainer attached manually (or that AI already embedded) is left
 * untouched. Returns a new array; the input is never mutated.
 *
 * Mirrors the by-name-join pattern in `lib/portal-data.ts`: collect the missing
 * names, one query against `exercises` selecting `name, image_url, video_url, equipment`,
 * build a lowercase-name map, then merge into each exercise's `media` and `equipment`.
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
    if (!ex.media?.image_url || !ex.media?.video_url || !ex.equipment || ex.equipment.length === 0) {
      missingNames.add(name);
    }
  }
  if (missingNames.size === 0) return exercises;

  const { data: library } = await pg
    .from("exercises")
    .select("name, image_url, video_url, equipment");

  const imageByName = new Map<string, string>();
  const videoByName = new Map<string, string>();
  const equipmentByName = new Map<string, string[]>();
  for (const entry of (library ?? []) as { name: string | null; image_url: string | null; video_url: string | null; equipment: string[] | null }[]) {
    if (!entry.name) continue;
    const key = entry.name.toLowerCase();
    if (entry.image_url && !imageByName.has(key)) imageByName.set(key, entry.image_url);
    if (entry.video_url && !videoByName.has(key)) videoByName.set(key, entry.video_url);
    if (entry.equipment && entry.equipment.length > 0 && !equipmentByName.has(key)) equipmentByName.set(key, entry.equipment);
  }

  return exercises.map((ex) => {
    const name = (ex.exercise_name ?? "").trim().toLowerCase();
    const existing = ex.media ?? {};
    const image_url = existing.image_url ?? (name ? imageByName.get(name) ?? null : null);
    const video_url = existing.video_url ?? (name ? videoByName.get(name) ?? null : null);
    const equipment = (ex.equipment && ex.equipment.length > 0)
      ? ex.equipment
      : (name ? equipmentByName.get(name) ?? ex.equipment ?? [] : ex.equipment ?? []);

    const mediaChanged = image_url !== (existing.image_url ?? null) || video_url !== (existing.video_url ?? null);
    const equipmentChanged = equipment !== ex.equipment;
    if (!mediaChanged && !equipmentChanged) return ex;

    const patch: Partial<T> = {};
    if (mediaChanged) {
      const media: ExerciseMediaFields = { ...existing };
      if (image_url) media.image_url = image_url;
      if (video_url) media.video_url = video_url;
      (patch as Record<string, unknown>).media = media;
    }
    if (equipmentChanged) {
      (patch as Record<string, unknown>).equipment = equipment;
    }
    return { ...ex, ...patch };
  });
}
