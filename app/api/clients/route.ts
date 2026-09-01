import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let query = supabase.from("clients").select("*").order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`).order("name", { ascending: true }).limit(6);
  }

  const { data: clients, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, phone, profile, package_type, delivery_mode, equipment, address, emergency_contact, gp, band_set_note, gp_clearance_note } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Merge optional wizard fields into profile where appropriate
  const enrichedProfile = { ...profile };
  if (emergency_contact) {
    enrichedProfile.emergency_contact = emergency_contact;
  }
  if (gp) {
    enrichedProfile.gp = gp;
  }
  if (band_set_note !== undefined) {
    enrichedProfile.band_set_note = band_set_note;
  }
  if (gp_clearance_note !== undefined) {
    if (!enrichedProfile.health) enrichedProfile.health = {};
    enrichedProfile.health.gp_clearance_note = gp_clearance_note;
  }

  const insertRow: Record<string, unknown> = {
    name: name.trim(),
    email: email || null,
    phone: phone || null,
    profile: enrichedProfile,
    package_type: package_type ?? null,
  };

  // CR-EF-118 — wizard passes delivery_mode and equipment directly on the clients row
  if (delivery_mode !== undefined) {
    insertRow.delivery_mode = delivery_mode;
  }
  if (equipment !== undefined) {
    insertRow.equipment = equipment;
  }
  if (address !== undefined) {
    insertRow.address = address || null;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(insertRow)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
