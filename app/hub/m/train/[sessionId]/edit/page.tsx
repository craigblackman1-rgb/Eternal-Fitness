import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { DBSession, DeliveryMode } from "@/types";
import { EditSheet } from "./EditSheet";

export default async function EditSessionPage({ params }: { params: { sessionId: string } }) {
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

  let client: {
    id: string;
    name: string;
    client_number: number | null;
    delivery_mode: DeliveryMode;
  } | null = null;
  if (block) {
    const { data: c } = await supabase
      .from("clients")
      .select("id, name, client_number, delivery_mode")
      .eq("id", block.client_id)
      .single();
    client = c ?? null;
  }

  const sessionRow = session as DBSession;
  const sessionData = sessionRow.data ?? null;
  const deliveryMode: DeliveryMode = client?.delivery_mode ?? "studio_1to1";

  return (
    <EditSheet
      sessionId={sessionRow.id}
      sessionNumber={sessionRow.session_number}
      data={sessionData}
      clientName={client?.name ?? "Unknown client"}
      clientNumber={client?.client_number ?? null}
      deliveryMode={deliveryMode}
      blockNumber={block?.block_number ?? null}
    />
  );
}
