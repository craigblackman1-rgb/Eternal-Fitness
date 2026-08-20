import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await request.json() as Partial<{
    name: string;
    source: "original" | "trainerize" | "custom";
    trainerize_id: string | null;
    trainerize_custom: boolean | null;
    archetypes: string[];
    movement_type: string | null;
    muscle_groups: string[];
    equipment: string[];
    tags: string[];
    difficulty: number | null;
    position: "seated" | "supported" | "standing" | null;
    intensity_tiers: string[];
    coaching_cue: string | null;
    default_mod: string | null;
    image_url: string | null;
    video_url: string | null;
    active: boolean;
  }>;

  const { data, error } = await supabase
    .from("exercises")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
