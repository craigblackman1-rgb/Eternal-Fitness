import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    name,
    movement_type,
    archetypes,
    muscle_groups,
    equipment,
    tags,
    difficulty,
    position,
    coaching_cue,
    default_mod,
    image_url,
    video_url,
  } = await request.json() as {
    name: string;
    movement_type?: string | null;
    archetypes?: string[];
    muscle_groups?: string[];
    equipment?: string[];
    tags?: string[];
    difficulty?: number | null;
    position?: "seated" | "supported" | "standing" | null;
    coaching_cue?: string | null;
    default_mod?: string | null;
    image_url?: string | null;
    video_url?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: name.trim(),
      source: "custom",
      movement_type: movement_type ?? null,
      archetypes: archetypes ?? [],
      muscle_groups: muscle_groups ?? [],
      equipment: equipment ?? [],
      tags: tags ?? [],
      difficulty: difficulty ?? null,
      position: position ?? null,
      coaching_cue: coaching_cue ?? null,
      default_mod: default_mod ?? null,
      image_url: image_url ?? null,
      video_url: video_url ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
