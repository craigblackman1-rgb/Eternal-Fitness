import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// CR-EF-050 — turn an Outlook Bookings event into a real session. Requires a
// client AND a block (a client can have more than one active block, so the
// hub UI's block-picker always runs first). Sets scheduled_at from the
// Outlook event's own start time, and — critically — links the *existing*
// Outlook event into session_calendar_events rather than creating a new one:
// this event already exists in Outlook (it's literally what we're
// reconciling), so the app must adopt it, not duplicate it. The next 15-min
// sync (lib/calendar-sync.ts) will then normalise its subject/body to the
// app's standard format, same as any other app-managed session.
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

  const { data: existingSessions, error: existingErr } = await supabase
    .from("sessions")
    .select("session_number")
    .eq("block_id", blockId);
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });
  const sessionNumber =
    ((existingSessions ?? []) as { session_number: number }[]).reduce((max, s) => Math.max(max, s.session_number), 0) + 1;
  if (sessionNumber > 18) {
    return NextResponse.json({ error: "This block already has the maximum of 18 sessions" }, { status: 400 });
  }

  const sessionData = {
    session_id: crypto.randomUUID(),
    block_id: blockId,
    client_id: clientId,
    session_number: sessionNumber,
    archetype: null,
    week: null,
    phase: null,
    focus_label: `Outlook booking — ${client.name}`,
    time_tier: "standard",
    versions: {
      studio: { warm_up: [], main_block: [], cooldown: [] },
      home: { warm_up: [], main_block: [], cooldown: [] },
    },
    coaching_notes: `Created from a Microsoft Bookings appointment ("${booking.subject}"). Add exercises before the session.`,
    client_intro: "",
  };

  const { data: session, error: insertErr } = await supabase
    .from("sessions")
    .insert({
      block_id: blockId,
      session_number: sessionNumber,
      archetype: null,
      week: null,
      phase: null,
      status: "scheduled",
      scheduled_at: booking.start_at,
      data: sessionData,
    })
    .select()
    .single();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Adopt the existing Outlook event instead of creating a duplicate. A
  // placeholder sync_hash guarantees the next cron run's hash comparison
  // mismatches once, which is what makes it normalise the event's
  // subject/body to the app's standard format — a deliberate one-time effect,
  // not a bug.
  const { error: mapErr } = await supabase.from("session_calendar_events").upsert(
    {
      session_id: session.id,
      event_id: booking.event_id,
      calendar_id: booking.calendar_id,
      sync_hash: "",
      synced_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );
  if (mapErr) return NextResponse.json({ error: mapErr.message }, { status: 500 });

  const { data: updatedBooking, error: resolveErr } = await supabase
    .from("outlook_booking_events")
    .update({
      client_id: clientId,
      status: "confirmed",
      session_id: session.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();
  if (resolveErr) return NextResponse.json({ error: resolveErr.message }, { status: 500 });

  return NextResponse.json({ session, booking: updatedBooking }, { status: 201 });
}
