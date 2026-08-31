import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { deriveSessionPot } from "@/lib/session-pot";
import type { DBSession } from "@/types";
import { SessionsClient } from "./SessionsClient";

/**
 * CR-EF-097 — Portal "My sessions" page.
 *
 * Shows upcoming sessions with notice-rule pills, the cancellation rule
 * explainer, past sessions, and a sidebar with "Message Esther" + expiry.
 *
 * The notice rule is carried THREE times (mockup design position):
 *   1. A pill on the row BEFORE the click
 *   2. A before/after count in the cancel dialog
 *   3. The consequence written into the confirm button's own label
 */
export default async function PortalSessionsPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) redirect("/portal/login");

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();
  if (!client) redirect("/portal");

  const supabase = createClient();

  // Fetch client extras
  const { data: clientExtra } = await supabase
    .from("clients")
    .select("sessions_purchased, block_expiry_date, block_expiry_extensions")
    .eq("id", client.id)
    .single();

  // Fetch the client's current block
  const { data: blockRows } = await supabase
    .from("blocks")
    .select("id, block_number, focus_label")
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
    completed_at: string | null;
    session_number: number;
    data: { focus_label?: string } | null;
  }> = [];

  if (blockRows) {
    const { data: sessionRows } = await supabase
      .from("sessions")
      .select("id, status, charged_free, cancelled_at, scheduled_at, completed_at, session_number, data")
      .eq("block_id", blockRows.id)
      .order("session_number", { ascending: true });

    sessions = sessionRows ?? [];
  }

  // Derive pot
  const pot = deriveSessionPot(
    sessions as Pick<DBSession, "status" | "charged_free" | "cancelled_at">[],
    clientExtra?.sessions_purchased
  );

  // Fetch notice period setting
  const { data: settings } = await supabase
    .from("booking_settings")
    .select("notice_hours, session_length")
    .limit(1)
    .single();

  const noticeHours = settings?.notice_hours ?? 24;
  const sessionLength = settings?.session_length ?? 60;

  // Split into upcoming and past
  const now = new Date();
  const upcoming = sessions.filter(
    (s) =>
      s.scheduled_at &&
      !s.cancelled_at &&
      s.status !== "completed" &&
      new Date(s.scheduled_at) > now
  );
  const past = sessions.filter(
    (s) =>
      s.status === "completed" ||
      s.cancelled_at ||
      (s.scheduled_at && new Date(s.scheduled_at) <= now)
  );

  return (
    <SessionsClient
      clientName={client.name}
      pot={pot}
      blockNumber={blockRows?.block_number ?? 1}
      blockFocusLabel={blockRows?.focus_label ?? null}
      blockExpiry={clientExtra?.block_expiry_date ?? null}
      blockExpiryExtensions={clientExtra?.block_expiry_extensions ?? []}
      upcoming={upcoming.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduled_at!,
        sessionNumber: s.session_number,
        status: s.status ?? "scheduled",
      }))}
      past={past.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduled_at,
        sessionNumber: s.session_number,
        status: s.status ?? "planned",
        chargedFree: s.charged_free as "charged" | "free" | null,
        completedAt: s.completed_at,
        cancelledAt: s.cancelled_at,
      }))}
      noticeHours={noticeHours}
      sessionLength={sessionLength}
      sessionsPurchased={pot.purchased}
    />
  );
}
