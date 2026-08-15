import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  getIntegrationStatus,
  graphConfigured,
  listCalendars,
  GraphReconnectError,
  setCalendar,
  type GraphCalendar,
} from "@/lib/graph-client";
import { syncCalendar } from "@/lib/calendar-sync";

export const dynamic = "force-dynamic";

/**
 * Connection state for Settings → Integrations. Returns metadata only — token
 * values never leave lib/graph-client.ts.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!graphConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  const status = await getIntegrationStatus();
  if (!status.connected) {
    return NextResponse.json({ configured: true, connected: false });
  }

  // Listing calendars doubles as a live token check — a dead refresh token
  // surfaces here as tokenExpired so the UI can show "reconnect".
  let calendars: GraphCalendar[] = [];
  let tokenExpired = false;
  try {
    calendars = await listCalendars();
  } catch (err) {
    if (err instanceof GraphReconnectError) tokenExpired = true;
    else throw err;
  }

  return NextResponse.json({
    configured: true,
    connected: true,
    tokenExpired,
    accountEmail: status.accountEmail,
    calendarId: status.calendarId,
    calendarName: status.calendarName,
    calendars: calendars.filter((c) => c.canEdit !== false).map((c) => ({
      id: c.id,
      name: c.name,
      isDefaultCalendar: c.isDefaultCalendar === true,
    })),
  });
}

/** Selects the calendar to sync into, then runs an immediate full sync. */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const calendarId = typeof body?.calendarId === "string" ? body.calendarId : "";
  const calendarName = typeof body?.calendarName === "string" ? body.calendarName : "";
  if (!calendarId || !calendarName) {
    return NextResponse.json({ error: "calendarId and calendarName are required" }, { status: 400 });
  }

  try {
    await setCalendar(calendarId, calendarName);
    const result = await syncCalendar();
    return NextResponse.json({ success: true, sync: result });
  } catch (err) {
    if (err instanceof GraphReconnectError) {
      return NextResponse.json({ error: "Microsoft connection has expired — reconnect the account" }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
