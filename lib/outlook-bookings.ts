import { createPgClient } from "@/lib/pg-client";
import { getIntegrationStatus, graphConfigured, listCalendarView, GraphReconnectError } from "@/lib/graph-client";

/**
 * CR-EF-050 — read-back reconciliation for Microsoft Bookings appointments.
 *
 * Bookings appointments land in the same Outlook calendar the app syncs *to*
 * (lib/calendar-sync.ts, one-way app->Outlook). This module is the read-back
 * side: pull the calendar, find events created by the Bookings mailbox, and
 * upsert them into outlook_booking_events for a human (Esther) to confirm,
 * link, or dismiss. Nothing here auto-creates a session — see
 * confirmOutlookBooking() in this file, called only from the API route the
 * hub UI hits after Esther clicks "Confirm".
 *
 * Matching is name-based, not email-based: a live diagnostic (2026-08-20)
 * found the client's real email never appears on a Bookings event — the
 * organizer/attendees are always internal addresses (the Bookings mailbox
 * itself, plus Esther). What's reliable is the event subject, which Bookings
 * always writes as "Personal Training - {name}" / "Initial consult - {name}".
 */

const BOOKINGS_ORGANIZER_EMAIL = "eternalfitnessbookings@eternal-fitness.co.uk";
const WINDOW_PAST_MS = 24 * 60 * 60 * 1000; // matches calendar-sync.ts's sync window
const WINDOW_FUTURE_MS = 60 * 24 * 60 * 60 * 1000;

const SUBJECT_NAME_RE = /^(?:Personal Training|Initial consult)\s*-\s*(.+)$/i;

export function parseClientNameFromSubject(subject: string): string | null {
  const m = subject.trim().match(SUBJECT_NAME_RE);
  return m ? m[1].trim() : null;
}

interface ClientRow {
  id: string;
  name: string;
}

/**
 * Exact case-insensitive full-name match first; falls back to a surname-only
 * match when exactly one client shares it (covers "Thomas Putnam" in Outlook
 * vs "Tom Putnam" in the app, a real case from the 2026-08-20 diagnostic).
 * Either way this is only ever a *suggestion* — the hub UI always requires
 * Esther to click Confirm before a session is created, so a wrong surname
 * guess costs one extra click, never a bad write.
 */
export function matchClientByParsedName(parsedName: string, clients: ClientRow[]): ClientRow | null {
  const norm = (s: string) => s.trim().toLowerCase();
  const exact = clients.filter((c) => norm(c.name) === norm(parsedName));
  if (exact.length === 1) return exact[0];

  const parts = parsedName.trim().split(/\s+/);
  const surname = parts[parts.length - 1];
  if (!surname) return null;
  const bySurname = clients.filter((c) => {
    const cParts = c.name.trim().split(/\s+/);
    return norm(cParts[cParts.length - 1] ?? "") === norm(surname);
  });
  return bySurname.length === 1 ? bySurname[0] : null;
}

export interface SyncOutlookBookingsResult {
  scanned: number;
  bookingEvents: number;
  created: number;
  updated: number;
  skipped: string | null;
}

/**
 * Pulls the connected calendar's events in the sync window, keeps only
 * Bookings-mailbox-organized ones, and upserts each into
 * outlook_booking_events. Never overwrites a row Esther has already resolved
 * (status != 'open') — re-parsing/re-matching only ever touches open rows.
 */
export async function syncOutlookBookings(): Promise<SyncOutlookBookingsResult> {
  const result: SyncOutlookBookingsResult = { scanned: 0, bookingEvents: 0, created: 0, updated: 0, skipped: null };

  if (!graphConfigured()) {
    result.skipped = "Graph env vars not configured";
    return result;
  }
  const status = await getIntegrationStatus();
  if (!status.connected || !status.calendarId) {
    result.skipped = "No Microsoft account/calendar connected";
    return result;
  }
  const calendarId = status.calendarId;

  const windowStart = new Date(Date.now() - WINDOW_PAST_MS).toISOString();
  const windowEnd = new Date(Date.now() + WINDOW_FUTURE_MS).toISOString();
  const events = await listCalendarView(calendarId, windowStart, windowEnd);
  result.scanned = events.length;

  const bookingEvents = events.filter(
    (ev) => (ev.organizer?.emailAddress?.address ?? "").trim().toLowerCase() === BOOKINGS_ORGANIZER_EMAIL
  );
  result.bookingEvents = bookingEvents.length;
  if (bookingEvents.length === 0) return result;

  const db = createPgClient();
  const { data: clients, error: clientsErr } = await db.from("clients").select("id, name");
  if (clientsErr) throw new Error(`clients read failed: ${clientsErr.message}`);
  const clientRows = (clients ?? []) as ClientRow[];

  for (const ev of bookingEvents) {
    const parsedName = parseClientNameFromSubject(ev.subject ?? "");
    const matched = parsedName ? matchClientByParsedName(parsedName, clientRows) : null;

    const { data: existing } = await db
      .from("outlook_booking_events")
      .select("id, status")
      .eq("event_id", ev.id)
      .maybeSingle();

    if (existing && (existing as { status: string }).status !== "open") {
      // Esther already resolved this one — never re-surface or overwrite her decision.
      continue;
    }

    const row = {
      event_id: ev.id,
      calendar_id: calendarId,
      subject: ev.subject ?? "",
      start_at: ev.start?.dateTime ? new Date(ev.start.dateTime + "Z").toISOString() : new Date().toISOString(),
      end_at: ev.end?.dateTime ? new Date(ev.end.dateTime + "Z").toISOString() : null,
      parsed_name: parsedName,
      client_id: matched?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await db.from("outlook_booking_events").update(row).eq("event_id", ev.id);
      if (error) throw new Error(`outlook_booking_events update failed: ${error.message}`);
      result.updated++;
    } else {
      const { error } = await db.from("outlook_booking_events").insert(row);
      if (error) throw new Error(`outlook_booking_events insert failed: ${error.message}`);
      result.created++;
    }
  }

  return result;
}

export { GraphReconnectError };
