import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ExerciseBrowser } from "./exercise-browser";

export interface ExerciseEntry {
  id: string;
  name: string;
  source: "original" | "trainerize" | "custom";
  trainerize_custom: boolean | null;
  archetypes: string[];
  movement_type: string | null;
  muscle_groups: string[];
  equipment: string[];
  tags: string[];
  difficulty: number | null;
  /** Physical position during the exercise — Seated/Supported/Standing.
   *  Feeds the workout-templates browser's position facet (G2, 2026-08-20). */
  position: "seated" | "supported" | "standing" | null;
  intensity_tiers: string[];
  coaching_cue: string | null;
  default_mod: string | null;
  image_url: string | null;
  video_url: string | null;
}

export default async function ExercisesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  // PostgREST defaults to a 1000-row cap per request — page through in batches
  // to get the full library (2500+ rows since the Trainerize import).
  const allExercises: ExerciseEntry[] = [];
  const PAGE_SIZE = 1000;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page } = await supabase
      .from("exercises")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!page || page.length === 0) break;
    allExercises.push(...(page as ExerciseEntry[]));
    if (page.length < PAGE_SIZE) break;
  }

  const typedExercises = allExercises;

  const movementTypes = [...new Set(typedExercises.map((e) => e.movement_type).filter(Boolean))].sort();
  const allEquipment = [...new Set(typedExercises.flatMap((e) => e.equipment))].sort();
  const allMuscleGroups = [...new Set(typedExercises.flatMap((e) => e.muscle_groups))].sort();

  return (
    <ExerciseBrowser
      exercises={typedExercises}
      movementTypes={movementTypes}
      allEquipment={allEquipment}
      allMuscleGroups={allMuscleGroups}
    />
  );
}
