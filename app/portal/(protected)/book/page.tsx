import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { deriveSessionPot } from "@/lib/session-pot";
import type { DBSession } from "@/types";
import { PortalBookingClient } from "./PortalBookingClient";

/**
 * CR-EF-097 — Portal booking page.
 *
 * The client sees their pot (sessions left) BEFORE the slot picker.
 * The pot is a gate, not a widget — a client cannot reach a slot
 * without first seeing what is left.
 *
 * Portal register: the real portal shell from layout.tsx, not the
 * warm marketing tokens and not the cool-grey hub.
 */
export default async function PortalBookPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) redirect("/portal/login");

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();

  if (!client) redirect("/portal");

  const supabase = createClient();

  // Fetch additional client fields not on PortalClient
  const { data: clientExtra } = await supabase
    .from("clients")
    .select("sessions_purchased, block_expiry_date, block_expiry_extensions")
    .eq("id", client.id)
    .single();

  // Fetch the client's current block sessions
  const { data: blockRows } = await supabase
    .from("blocks")
    .select("id")
    .eq("client_id", client.id)
    .eq("status", "active")
    .limit(1)
    .single();

  let sessions: Array<{
    id: string;
    status: string | null;
    charged_free: string | null;
    cancelled_at: string | null;
    scheduled_at: string | null;
    session_number: number;
    parent_session_id: string | null;
  }> = [];

  if (blockRows) {
    const { data: sessionRows } = await supabase
      .from("sessions")
      .select("id, status, charged_free, cancelled_at, scheduled_at, session_number, parent_session_id")
      .eq("block_id", blockRows.id)
      .order("session_number", { ascending: true });

    sessions = sessionRows ?? [];
  }

  // Derive the session pot — CR-EF-101: sub-sessions excluded automatically
  const pot = deriveSessionPot(
    sessions as Pick<DBSession, "status" | "charged_free" | "cancelled_at" | "parent_session_id">[],
    clientExtra?.sessions_purchased
  );

  // Fetch availability settings
  const { data: settings } = await supabase
    .from("booking_settings")
    .select("session_length, gap_after, notice_hours, lead_hours, horizon_weeks")
    .limit(1)
    .single();

  // Get client's already-booked slots for the availability engine
  const bookedSlots = sessions
    .filter((s) => s.scheduled_at && s.status !== "cancelled")
    .map((s) => {
      const d = new Date(s.scheduled_at!);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return `${dateStr} ${timeStr}`;
    });

  return (
    <PortalBookingClient
      clientName={client.name}
      pot={pot}
      blockExpiry={clientExtra?.block_expiry_date ?? null}
      blockExpiryExtensions={clientExtra?.block_expiry_extensions ?? []}
      sessionsPurchased={clientExtra?.sessions_purchased ?? null}
      settings={settings}
      bookedSlots={bookedSlots}
      clientId={client.id}
    />
  );
}
