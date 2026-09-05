import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ProgramBuilderClient } from "./ProgramBuilderClient";
import type { DBProgram, DBProgramSlot } from "@/lib/programs/types";

interface ProgramWithSlots extends DBProgram {
  clients?: { name: string; client_number: string | null } | null;
  slots: DBProgramSlot[];
}

export default async function ProgramBuilderPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: program, error: progErr } = await supabase
    .from("programs")
    .select("*, clients(name, client_number)")
    .eq("id", params.id)
    .single();

  if (progErr || !program) notFound();

  const { data: slots } = await supabase
    .from("program_slots")
    .select("*")
    .eq("program_id", params.id)
    .order("position", { ascending: true });

  return (
    <ProgramBuilderClient
      program={program as ProgramWithSlots}
      slots={(slots ?? []) as DBProgramSlot[]}
    />
  );
}
