import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { materializeBookingSession } from "@/lib/outlook-bookings";

// CR-EF-050/090 — turn an Outlook Bookings event into a real session. This is
// now the manual fallback for the cases the sync's auto-confirm (CR-EF-090,
// lib/outlook-bookings.ts) can't resolve on its own: no name match, more than
// one candidate client, or — the case this route exists for — more than one
// block to choose between (the hub UI's block-picker runs first). Sets
// scheduled_at from the Outlook event's own start time, and — critically —
// links the *existing* Outlook event into session_calendar_events rather than
// creating a new one: this event already exists in Outlook (it's literally
// what we're reconciling), so the app must adopt it, not duplicate it. The
// next 15-min sync (lib/calendar-sync.ts) will then normalise its
// subject/body to the app's standard format, same as any other app-managed
// session.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { clientId, blockId } = body as { clientId?: string; blockId?: string };
  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  if (!blockId || typeof blockId !== "string") {
    return NextResponse.json({ error: "blockId is required" }, { status: 400 });
  }

  const { data: booking, error: bookingErr } = await supabase
    .from("outlook_booking_events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: "Outlook booking event not found" }, { status: 404 });
  if (booking.status !== "open") {
    return NextResponse.json({ error: `This booking is already ${booking.status}` }, { status: 409 });
  }

  const { data: block, error: blockErr } = await supabase
    .from("blocks")
    .select("id, client_id, block_number")
    .eq("id", blockId)
    .maybeSingle();
  if (blockErr) return NextResponse.json({ error: blockErr.message }, { status: 500 });
  if (!block || block.client_id !== clientId) {
    return NextResponse.json({ error: "Block not found for this client" }, { status: 404 });
  }

  const { data: client, error: clientErr } = await supabase.from("clients").select("id, name").eq("id", clientId).maybeSingle();
  if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  let sessionId: string;
  try {
    const result = await materializeBookingSession(supabase, booking, clientId, blockId, client.name);
    sessionId = result.sessionId;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to confirm booking" }, { status: 500 });
  }

  const { data: session, error: sessionErr } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 500 });
  const { data: updatedBooking, error: bookingErr2 } = await supabase
    .from("outlook_booking_events")
    .select("*")
    .eq("id", params.id)
    .single();
  if (bookingErr2) return NextResponse.json({ error: bookingErr2.message }, { status: 500 });

  return NextResponse.json({ session, booking: updatedBooking }, { status: 201 });
}
