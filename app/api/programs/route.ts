import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { SlotData } from "@/lib/programs/types";

/**
 * GET  /api/programs          — list programs (hub-auth)
 * POST /api/programs          — create program with optional slots
 */

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("programs")
    .select("*, clients(name, client_number)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, client_id, weeks, notes, status, slots } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const programData: Record<string, unknown> = {
    name: name.trim(),
    client_id: client_id || null,
    weeks: typeof weeks === "number" ? weeks : 6,
    notes: notes || null,
    status: status || "active",
  };

  const { data: program, error: progErr } = await supabase
    .from("programs")
    .insert(programData)
    .select("id")
    .single();

  if (progErr || !program) {
    return NextResponse.json({ error: progErr?.message || "Failed to create program" }, { status: 500 });
  }

  // Insert slots if provided
  if (Array.isArray(slots) && slots.length > 0) {
    const slotRows = slots.map((slot: { label?: string; data?: SlotData; position?: number }, i: number) => ({
      program_id: program.id,
      position: slot.position ?? i + 1,
      label: slot.label || null,
      data: slot.data || { sections: [] },
    }));

    const { error: slotsErr } = await supabase.from("program_slots").insert(slotRows);
    if (slotsErr) {
      // Roll back the program if slots fail
      await supabase.from("programs").delete().eq("id", program.id);
      return NextResponse.json({ error: slotsErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: program.id }, { status: 201 });
}
