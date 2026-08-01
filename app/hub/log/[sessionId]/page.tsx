import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { DBSession, SetLog } from "@/types";
import { LiveSessionLog } from "./LiveSessionLog";

export default async function LiveSessionLogPage({ params }: { params: { sessionId: string } }) {
  const supabase = createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", params.sessionId)
    .single();

  if (!session) notFound();

  const { data: block } = await supabase
    .from("blocks")
    .select("id, client_id, block_number")
    .eq("id", session.block_id)
    .single();

  let client: { name: string; client_number: number | null } | null = null;
  if (block) {
    const { data: c } = await supabase
      .from("clients")
      .select("name, client_number")
      .eq("id", block.client_id)
      .single();
    client = c ?? null;
  }

  const { data: setLogs } = await supabase
    .from("set_logs")
    .select("*")
    .eq("session_id", params.sessionId)
    .order("exercise_ref", { ascending: true })
    .order("set_number", { ascending: true });

  const blockNumber = block?.block_number ?? null;
  const sessionData = (session as DBSession).data ?? null;
  const sessionLog = sessionData?.session_log ?? null;

  return (
    <LiveSessionLog
      sessionId={session.id}
      sessionNumber={session.session_number}
      archetype={session.archetype}
      phase={session.phase}
      week={session.week}
      data={sessionData}
      sessionLog={sessionLog}
      scheduledAt={session.scheduled_at ?? null}
      blockNumber={blockNumber}
      clientName={client?.name ?? "Unknown client"}
      clientNumber={client?.client_number ?? null}
      setLogs={(setLogs ?? []) as SetLog[]}
    />
  );
}
