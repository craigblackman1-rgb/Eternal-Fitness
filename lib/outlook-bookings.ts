import { createPgClient } from "@/lib/pg-client";
import { getIntegrationStatus, graphConfigured, listCalendarView, GraphReconnectError } from "@/lib/graph-client";

/**
 * CR-EF-050/090/091 — read-back reconciliation for Esther's Outlook calendar.
 *
 * Originally scoped to Microsoft Bookings appointments only (organizer =
 * the Bookings mailbox, subject "Personal Training - {name}"). CR-EF-091
 * (Craig, 2026-08-25) widened this: most of Esther's real client sessions are
 * booked straight onto her own calendar, not through the Bookings widget —
 * bare-name subjects like "Ian" or "Colin Farley", organizer
 * esther.fair@eternal-fitness.co.uk. Those were being silently filtered out
 * entirely, so a real client session (Colin, Odul, Ian, Steph, Becky,
 * Saffron, Sarah — all confirmed real, 2026-08-25) never appeared anywhere in
 * the app. Every event in the sync window is now processed, regardless of
 * organizer; the Bookings-formatted subject pattern is tried first (kept for
 * its higher-confidence parse), falling back to matching the raw subject
 * directly against a client name. Events that match nobody (genuine personal
 * entries — "LONDON", "0FF", blank subjects, ~200 of these in the 2026-08-20
 * diagnostic) still get upserted so the schedule can render them as plain
 * calendar blocks (CR-EF-091, not yet wired into the UI) — the point is the
 * app should show the same thing Esther sees when she opens Outlook herself,
 * not a filtered subset it judged as "real."
 *
 * Matching is name-based, not email-based: a live diagnostic (2026-08-20)
 * found the client's real email never appears on a Bookings event — the
 * organizer/attendees are always internal addresses (the Bookings mailbox
 * itself, plus Esther). What's reliable is the event subject.
 */

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
 * vs "Tom Putnam" in the app, a real case from the 2026-08-20 diagnostic);
 * falls back again to a first-name-only match when exactly one client shares
 * it (covers Esther's own-calendar entries, which are often just "Ian" or
 * "Colin" with no surname at all, CR-EF-091). Either way this is only ever a
 * *suggestion* when it isn't unique — ambiguous matches stay in the manual
 * queue rather than guessing wrong.
 */
export function matchClientByParsedName(parsedName: string, clients: ClientRow[]): ClientRow | null {
  const norm = (s: string) => s.trim().toLowerCase();
  const exact = clients.filter((c) => norm(c.name) === norm(parsedName));
  if (exact.length === 1) return exact[0];

  const parts = parsedName.trim().split(/\s+/);
  const surname = parts[parts.length - 1];
  if (surname) {
    const bySurname = clients.filter((c) => {
      const cParts = c.name.trim().split(/\s+/);
      return norm(cParts[cParts.length - 1] ?? "") === norm(surname);
    });
    if (bySurname.length === 1) return bySurname[0];
  }

  // Single-token subject ("Ian") — try a first-name-only match.
  if (parts.length === 1) {
    const firstName = parts[0];
    const byFirstName = clients.filter((c) => {
      const cParts = c.name.trim().split(/\s+/);
      return norm(cParts[0] ?? "") === norm(firstName);
    });
    if (byFirstName.length === 1) return byFirstName[0];
  }

  return null;
}

/**
 * Tries the structured Bookings-widget pattern first (higher confidence,
 * strips the "Personal Training - " prefix cleanly); falls back to matching
 * the raw subject directly, which is what a hand-added personal-calendar
 * entry looks like (CR-EF-091).
 */
function resolveEventMatch(subject: string, clients: ClientRow[]): { parsedName: string | null; matched: ClientRow | null } {
  const structured = parseClientNameFromSubject(subject);
  if (structured) {
    const matched = matchClientByParsedName(structured, clients);
    if (matched) return { parsedName: structured, matched };
  }
  const raw = subject.trim();
  if (raw) {
    const matched = matchClientByParsedName(raw, clients);
    if (matched) return { parsedName: raw, matched };
  }
  return { parsedName: structured ?? (raw || null), matched: null };
}

export interface SyncOutlookBookingsResult {
  scanned: number;
  bookingEvents: number;
  created: number;
  updated: number;
  autoConfirmed: number;
  skipped: string | null;
}

interface BlockRow {
  id: string;
  client_id: string;
}

/**
 * Auto-confirm only applies when the client has exactly one block to attach
 * the session to — more than one (which block?) or zero (nothing to attach
 * to) both stay ambiguous and fall through to the manual queue, same as an
 * unmatched name.
 */
function resolveSingleBlock(clientId: string, blocks: BlockRow[]): string | null {
  const owned = blocks.filter((b) => b.client_id === clientId);
  return owned.length === 1 ? owned[0].id : null;
}

/**
 * The materialization shared by the automatic (sync) and manual (Confirm
 * button) paths: create the scheduled, content-empty session, adopt the
 * existing Outlook event into session_calendar_events, and mark the booking
 * resolved. Content is deliberately never attached here (Craig, 2026-08-25)
 * — it's often not yet decided what the session's workout will be.
 */
export async function materializeBookingSession(
  db: ReturnType<typeof createPgClient>,
  booking: { id: string; event_id: string; calendar_id: string; subject: string; start_at: string },
  clientId: string,
  blockId: string,
  clientName: string,
): Promise<{ sessionId: string }> {
  const { data: existingSessions, error: existingErr } = await db
    .from("sessions")
    .select("session_number")
    .eq("block_id", blockId);
  if (existingErr) throw new Error(`sessions read failed: ${existingErr.message}`);
  const sessionNumber = ((existingSessions ?? []) as { session_number: number }[]).reduce(
    (max, s) => Math.max(max, s.session_number),
    0,
  ) + 1;
  if (sessionNumber > 18) throw new Error("block already has the maximum of 18 sessions");

  const sessionData = {
    session_id: crypto.randomUUID(),
    block_id: blockId,
    client_id: clientId,
    session_number: sessionNumber,
    archetype: null,
    week: null,
    phase: null,
    focus_label: `Outlook booking — ${clientName}`,
    time_tier: "standard",
    versions: {
      studio: { warm_up: [], main_block: [], cooldown: [] },
      home: { warm_up: [], main_block: [], cooldown: [] },
    },
    coaching_notes: `Created from a Microsoft Bookings appointment ("${booking.subject}"). Add exercises before the session.`,
    client_intro: "",
  };

  const { data: session, error: insertErr } = await db
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
  if (insertErr) throw new Error(`session insert failed: ${insertErr.message}`);

  const { error: mapErr } = await db.from("session_calendar_events").upsert(
    {
      session_id: session.id,
      event_id: booking.event_id,
      calendar_id: booking.calendar_id,
      sync_hash: "",
      synced_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
  if (mapErr) throw new Error(`session_calendar_events upsert failed: ${mapErr.message}`);

  const { error: resolveErr } = await db
    .from("outlook_booking_events")
    .update({
      client_id: clientId,
      status: "confirmed",
      session_id: session.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);
  if (resolveErr) throw new Error(`outlook_booking_events update failed: ${resolveErr.message}`);

  return { sessionId: session.id };
}

/**
 * Pulls every event in the connected calendar's sync window — Bookings
 * appointments and Esther's own hand-added entries alike (CR-EF-091) — and
 * upserts each into outlook_booking_events. Never overwrites a row Esther has
 * already resolved (status != 'open') — re-parsing/re-matching only ever
 * touches open rows.
 */
export async function syncOutlookBookings(): Promise<SyncOutlookBookingsResult> {
  const result: SyncOutlookBookingsResult = { scanned: 0, bookingEvents: 0, created: 0, updated: 0, autoConfirmed: 0, skipped: null };

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
  const bookingEvents = await listCalendarView(calendarId, windowStart, windowEnd);
  result.scanned = bookingEvents.length;
  result.bookingEvents = bookingEvents.length;
  if (bookingEvents.length === 0) return result;

  const db = createPgClient();
  const { data: clients, error: clientsErr } = await db.from("clients").select("id, name");
  if (clientsErr) throw new Error(`clients read failed: ${clientsErr.message}`);
  const clientRows = (clients ?? []) as ClientRow[];

  const { data: blocks, error: blocksErr } = await db.from("blocks").select("id, client_id");
  if (blocksErr) throw new Error(`blocks read failed: ${blocksErr.message}`);
  const blockRows = (blocks ?? []) as BlockRow[];

  for (const ev of bookingEvents) {
    const { parsedName, matched } = resolveEventMatch(ev.subject ?? "", clientRows);

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

    let bookingId: string;
    if (existing) {
      const { data: updated, error } = await db.from("outlook_booking_events").update(row).eq("event_id", ev.id).select().single();
      if (error) throw new Error(`outlook_booking_events update failed: ${error.message}`);
      bookingId = updated.id;
      result.updated++;
    } else {
      const { data: inserted, error } = await db.from("outlook_booking_events").insert(row).select().single();
      if (error) throw new Error(`outlook_booking_events insert failed: ${error.message}`);
      bookingId = inserted.id;
      result.created++;
    }

    // CR-EF-090 — a name match to exactly one client with exactly one block
    // is unambiguous: auto-materialize the scheduled session instead of
    // leaving it for a manual click nobody was making (18 sat open against 1
    // ever confirmed before this shipped). Anything else — no match, more
    // than one candidate client, or more than one block — stays 'open' for
    // Esther at /hub/schedule/outlook.
    if (matched) {
      const blockId = resolveSingleBlock(matched.id, blockRows);
      if (blockId) {
        try {
          await materializeBookingSession(
            db,
            { id: bookingId, event_id: row.event_id, calendar_id: row.calendar_id, subject: row.subject, start_at: row.start_at },
            matched.id,
            blockId,
            matched.name,
          );
          result.autoConfirmed++;
        } catch (err) {
          // Never let an auto-confirm failure break the sync loop or the
          // booking's visibility — it just stays 'open' for manual handling.
          console.error(`Outlook booking auto-confirm failed for ${bookingId}:`, err);
        }
      }
    }
  }

  return result;
}

export { GraphReconnectError };
