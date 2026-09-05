import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * POST /api/programs/[id]/extend — extend a program by N weeks.
 *
 * Duplicates each existing slot once per additional week, appending them
 * after the current slots with incremented positions. Updates the program's
 * `weeks` column to reflect the new total.
 */

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const body = await request.json();
  const extraWeeks = Number(body.weeks);

  if (!extraWeeks || extraWeeks < 1 || extraWeeks > 12) {
    return NextResponse.json({ error: "weeks must be 1–12" }, { status: 400 });
  }

  // Fetch program
  const { data: program, error: progErr } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .single();

  if (progErr || !program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  // Fetch existing slots in position order
  const { data: existingSlots, error: slotsErr } = await supabase
    .from("program_slots")
    .select("*")
    .eq("program_id", id)
    .order("position", { ascending: true });

  if (slotsErr || !existingSlots) {
    return NextResponse.json({ error: slotsErr?.message ?? "Failed to load slots" }, { status: 500 });
  }

  if (existingSlots.length === 0) {
    return NextResponse.json({ error: "Program has no slots to extend" }, { status: 400 });
  }

  const currentWeeks = program.weeks as number;
  const newTotalWeeks = currentWeeks + extraWeeks;
  const slotCount = existingSlots.length;

  // Build new slots: duplicate each existing slot once per extra week
  const newSlots: { program_id: string; position: number; label: string | null; data: unknown }[] = [];
  let nextPosition = existingSlots.length + 1;

  for (let w = 0; w < extraWeeks; w++) {
    for (const slot of existingSlots) {
      newSlots.push({
        program_id: id,
        position: nextPosition,
        label: slot.label,
        data: slot.data,
      });
      nextPosition++;
    }
  }

  // Insert new slots
  if (newSlots.length > 0) {
    const { error: insertErr } = await supabase.from("program_slots").insert(newSlots);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  // Update the weeks column
  const { error: updateErr } = await supabase
    .from("programs")
    .update({ weeks: newTotalWeeks, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    previousWeeks: currentWeeks,
    newWeeks: newTotalWeeks,
    addedSlots: newSlots.length,
    totalSlots: existingSlots.length + newSlots.length,
  });
}
