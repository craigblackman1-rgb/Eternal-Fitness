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

  redirect(`/hub/clients/${block.client_id}/blocks/${block.id}/sessions/${session.session_number}`);
}
