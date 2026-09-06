import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { SlotData } from "@/lib/programs/types";

/**
 * GET  /api/programs/[id]   — fetch program + slots
 * PATCH /api/programs/[id]  — update program + optionally replace slots
 */

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const { data: program, error: progErr } = await supabase
    .from("programs")
    .select("*, clients(name, client_number)")
    .eq("id", id)
    .single();

  if (progErr || !program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const { data: slots, error: slotsErr } = await supabase
    .from("program_slots")
    .select("*")
    .eq("program_id", id)
    .order("position", { ascending: true });

  if (slotsErr) {
    return NextResponse.json({ error: slotsErr.message }, { status: 500 });
  }

  return NextResponse.json({ ...program, slots: slots || [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const body = await request.json();
  const { name, weeks, notes, status, slots } = body;

  // Update program fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (weeks !== undefined) updates.weeks = weeks;
  if (notes !== undefined) updates.notes = notes;
  if (status !== undefined) updates.status = status;

  const { error: updateErr } = await supabase
    .from("programs")
    .update(updates)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Replace slots if provided
  if (Array.isArray(slots)) {
    // Delete existing slots
    await supabase.from("program_slots").delete().eq("program_id", id);

    // Insert new slots
    if (slots.length > 0) {
      const slotRows = slots.map((slot: { id?: string; label?: string; data?: SlotData; position?: number }, i: number) => ({
        program_id: id,
        position: slot.position ?? i + 1,
        label: slot.label || null,
        data: slot.data || { sections: [] },
      }));

      const { error: slotsErr } = await supabase.from("program_slots").insert(slotRows);
      if (slotsErr) {
        return NextResponse.json({ error: slotsErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  // Check if program exists
  const { data: program, error: progErr } = await supabase
    .from("programs")
    .select("id")
    .eq("id", id)
    .single();

  if (progErr || !program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  // Check if any client has this as their active program
  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("active_program_id", id);

  // Check if any sessions reference this program
  const { count: sessionCount } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("program_id", id);

  if ((clientCount ?? 0) > 0 || (sessionCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "Program is in use — archive it instead",
        in_use: { clients: clientCount ?? 0, sessions: sessionCount ?? 0 },
      },
      { status: 409 },
    );
  }

  // Delete program — program_slots cascade via ON DELETE CASCADE
  const { error: delErr } = await supabase
    .from("programs")
    .delete()
    .eq("id", id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
