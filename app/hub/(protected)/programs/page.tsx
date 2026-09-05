import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ProgramsListClient } from "./ProgramsListClient";
import type { DBProgram } from "@/lib/programs/types";

interface ProgramRow extends DBProgram {
  clients?: { name: string; client_number: string | null } | null;
  slot_count?: number;
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams?: { client?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  // Resolve client_number → client UUID + name + active_program_id
  let clientContext: { id: string; name: string; client_number: string; active_program_id: string | null } | null = null;
  if (searchParams?.client) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, client_number, active_program_id")
      .eq("client_number", searchParams.client)
      .single();
    if (client) {
      clientContext = {
        id: client.id,
        name: client.name,
        client_number: client.client_number,
        active_program_id: client.active_program_id,
      };
    }
  }

  const PAGE_SIZE = 1000;
  const allPrograms: ProgramRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page } = await supabase
      .from("programs")
      .select("*, clients(name, client_number)")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!page || page.length === 0) break;
    allPrograms.push(...(page as ProgramRow[]));
    if (page.length < PAGE_SIZE) break;
  }

  // Fetch slot counts per program
  const programIds = allPrograms.map((p) => p.id);
  let slotCounts: Record<string, number> = {};
  if (programIds.length > 0) {
    const { data: slots } = await supabase
      .from("program_slots")
      .select("program_id")
      .in("program_id", programIds);
    if (slots) {
      for (const s of slots as { program_id: string }[]) {
        slotCounts[s.program_id] = (slotCounts[s.program_id] || 0) + 1;
      }
    }
  }

  const programs = allPrograms.map((p) => ({
    ...p,
    slot_count: slotCounts[p.id] || 0,
  }));

  return <ProgramsListClient programs={programs} clientContext={clientContext} />;
}
