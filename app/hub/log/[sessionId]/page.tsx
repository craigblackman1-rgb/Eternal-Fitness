import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

/**
 * Retired route — the standalone Live Log (/hub/log/[sessionId]) was folded into
 * the consolidated Session screen. This redirects every old entry point (schedule
 * calendar, block overview) to the new surface at
 * /hub/clients/[client_id]/blocks/[block_id]/sessions/[session_number], preserving
 * any pre-existing links rather than 404-ing them.
 */
export default async function LiveSessionLogRedirect({ params }: { params: { sessionId: string } }) {
  const supabase = createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, block_id, session_number")
    .eq("id", params.sessionId)
    .single();

  if (!session) notFound();

  const { data: block } = await supabase
    .from("blocks")
    .select("id, client_id")
    .eq("id", session.block_id)
    .single();

  if (!block) notFound();

  // Client routes resolve by client_number (an integer), not the client's UUID id
  // (CR-EF-035) — a link built from block.client_id would silently 404.
  const { data: client } = await supabase
    .from("clients")
    .select("client_number")
    .eq("id", block.client_id)
    .single();

  if (!client || client.client_number == null) notFound();

  redirect(`/hub/clients/${client.client_number}/blocks/${block.id}/sessions/${session.session_number}`);
}
