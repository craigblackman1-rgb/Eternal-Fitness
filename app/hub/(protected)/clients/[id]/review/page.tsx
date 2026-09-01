import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { computeComplianceFlags } from "@/lib/compliance";
import { deriveSessionPot } from "@/lib/session-pot";
import { deriveChronologicalPositions, sessionChronologicalLabel } from "@/lib/session-chronological-order";
import { sessionWorkoutName } from "@/lib/session-display";
import { ReviewFlowClient } from "./ReviewFlowClient";
import type { DBClientReview } from "@/types";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const numericId = parseInt(params.id);
  if (isNaN(numericId)) notFound();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("client_number", numericId)
    .single();
  if (clientError || !client) notFound();

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("client_id", client.id)
    .order("block_number", { ascending: false });

  const blockIds = (blocks ?? []).map((b) => b.id);
  let sessions: any[] = [];
  if (blockIds.length > 0) {
    const { data } = await supabase
      .from("sessions")
      .select("*, blocks(block_number)")
      .in("block_id", blockIds)
      .order("session_number", { ascending: false });
    sessions = data ?? [];
  }

  const { data: clientDocuments } = await supabase
    .from("client_documents")
    .select("id, kind, title, status")
    .eq("client_id", client.id);

  const hasSignedParqDocument = (clientDocuments ?? []).some(
    (d: any) => d.kind === "parq" && d.status === "signed",
  );
  const hasSignedAgreementDocument = (clientDocuments ?? []).some(
    (d: any) => d.kind === "terms" && d.status === "signed",
  );

  const { data: latestParq } = await supabase
    .from("signed_parq")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestAgreement } = await supabase
    .from("signed_agreements")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const complianceFlags = computeComplianceFlags({
    client,
    latestParq,
    latestAgreement,
    hasSignedParqDocument,
    hasSignedAgreementDocument,
  });

  const activeBlock = blocks?.find((b) => b.status === "active");
  const pot = deriveSessionPot(sessions, client.sessions_purchased);

  const positions = deriveChronologicalPositions(sessions);
  const completedSessions = sessions.filter((s) => {
    const st = (s as any).status ?? (s.cancelled_at ? "cancelled" : "planned");
    return st === "completed";
  });

  const completedWithNames = completedSessions.map((s) => {
    const pos = positions.get(s.id);
    return {
      id: s.id,
      name: sessionWorkoutName(s.data),
      scheduled_at: s.scheduled_at,
      position: pos ? sessionChronologicalLabel(pos.position, pos.total) : "",
    };
  });

  const unreviewedCancellations = sessions.filter((s) => {
    const st = (s as any).status ?? (s.cancelled_at ? "cancelled" : "planned");
    return st === "cancelled" && s.charged_free == null && !s.parent_session_id;
  });

  const lapsedSessions = sessions.filter(
    (s) => s.lapse_flagged_at && !s.parent_session_id,
  );

  const { data: reviews } = await supabase
    .from("client_reviews")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const extensionHistory = (client as any).block_expiry_extensions ?? [];

  return (
    <ReviewFlowClient
      client={client}
      sessions={sessions}
      blocks={blocks ?? []}
      activeBlock={activeBlock}
      pot={pot}
      completedSessions={completedWithNames}
      unreviewedCancellations={unreviewedCancellations}
      lapsedSessions={lapsedSessions}
      complianceFlags={complianceFlags}
      reviews={(reviews ?? []) as DBClientReview[]}
      positions={Object.fromEntries(positions.entries())}
      extensionHistory={extensionHistory}
      clientNumber={numericId}
    />
  );
}
