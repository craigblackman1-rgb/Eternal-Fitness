import { createHash } from "crypto";
import { createPgClient } from "@/lib/pg-client";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  listCalendarView,
  getIntegrationStatus,
  GraphReconnectError,
  graphConfigured,
  type GraphCalendarEvent,
} from "@/lib/graph-client";
import { sessionDurationMinutes } from "@/lib/scheduling";
import { findDuplicateCandidate, dayKey } from "@/lib/outlook-duplicates";
import type { Session, TimeTier } from "@/types";

/**
 * One-way sync: sessions.scheduled_at -> the dedicated Outlook calendar.
 * The calendar is a view of the training plan; sessions.scheduled_at is never
 * written from anything read back from Outlook. sync_hash makes the recurring
 * run a cheap no-op when nothing changed.
 *
 * CR-EF-028 exception, read-only within this file: before creating a *new*
 * event for a session that's never been synced, check for a pre-existing
 * same-day, name-matching Outlook event (Esther's own personal note) and
 * pause instead of creating a duplicate — see outlook_duplicate_candidates.
 */

// Sync window: yesterday to +60 days, matching the WO spec.
const WINDOW_PAST_MS = 24 * 60 * 60 * 1000;
const WINDOW_FUTURE_MS = 60 * 24 * 60 * 60 * 1000;

interface SessionRow {
  id: string;
  block_id: string;
  session_number: number;
  data: Session | null;
  scheduled_at: string | null;
  cancelled_at: string | null;
}

interface MappingRow {
  session_id: string;
  event_id: string;
  calendar_id: string;
  sync_hash: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  paused: number;
  skipped: string | null;
  errors: string[];
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://eternal-fitness.co.uk";
}

function buildEventInput(row: SessionRow, clientName: string) {
  const start = new Date(row.scheduled_at as string);
  const minutes = sessionDurationMinutes((row.data?.time_tier ?? null) as TimeTier | null);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  const trainUrl = `${siteUrl()}/hub/m/train/${row.id}`;
  const subject = `${clientName} — Session ${row.session_number}`;
  const bodyHtml =
    `<p>${clientName} — Session ${row.session_number}` +
    (row.data?.focus_label ? ` · ${row.data.focus_label}` : "") +
    `</p><p><a href="${trainUrl}">Open in the hub</a></p>`;
  return {
    subject,
    bodyHtml,
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
  };
}

function hashEvent(calendarId: string, input: { subject: string; bodyHtml: string; startUtc: string; endUtc: string }): string {
  return createHash("sha256")
    .update([calendarId, input.subject, input.bodyHtml, input.startUtc, input.endUtc].join("|"))
    .digest("hex");
}

async function resolveClientNames(db: ReturnType<typeof createPgClient>, blockIds: string[]): Promise<Map<string, string>> {
  const nameByBlock = new Map<string, string>();
  if (blockIds.length === 0) return nameByBlock;
  const { data: blocks } = await db.from("blocks").select("id, client_id").in("id", blockIds);
  const clientIds = [...new Set((blocks ?? []).map((b: { client_id: string }) => b.client_id).filter(Boolean))];
  const { data: clients } = clientIds.length
    ? await db.from("clients").select("id, name").in("id", clientIds)
    : { data: [] };
  const clientById = new Map((clients ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  for (const b of (blocks ?? []) as { id: string; client_id: string }[]) {
    nameByBlock.set(b.id, clientById.get(b.client_id) ?? "Client");
  }
  return nameByBlock;
}

/**
 * Full sync over the window plus cleanup of mapped events whose session was
 * cancelled, unscheduled, or moved out of the window.
 */
export async function syncCalendar(): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, deleted: 0, unchanged: 0, paused: 0, skipped: null, errors: [] };

  if (!graphConfigured()) {
    result.skipped = "Graph env vars not configured";
    return result;
  }
  const status = await getIntegrationStatus();
  if (!status.connected) {
    result.skipped = "No Microsoft account connected";
    return result;
  }
  if (!status.calendarId) {
    result.skipped = "No calendar selected";
    return result;
  }
  const calendarId = status.calendarId;

  const db = createPgClient();
  const windowStart = new Date(Date.now() - WINDOW_PAST_MS).toISOString();
  const windowEnd = new Date(Date.now() + WINDOW_FUTURE_MS).toISOString();

  const { data: sessionRows, error: sesErr } = await db
    .from("sessions")
    .select("id, block_id, session_number, data, scheduled_at, cancelled_at")
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", windowStart)
    .lte("scheduled_at", windowEnd);
  if (sesErr) throw new Error(`sessions read failed: ${sesErr.message}`);
  const sessions = (sessionRows ?? []) as SessionRow[];

  const { data: mappingRows, error: mapErr } = await db
    .from("session_calendar_events")
    .select("session_id, event_id, calendar_id, sync_hash");
  if (mapErr) throw new Error(`session_calendar_events read failed: ${mapErr.message}`);
  const mappings = (mappingRows ?? []) as MappingRow[];
  const mappingBySession = new Map(mappings.map((m) => [m.session_id, m]));

  const active = sessions.filter((s) => !s.cancelled_at);
  const nameByBlock = await resolveClientNames(db, [...new Set(active.map((s) => s.block_id).filter(Boolean))]);
  const activeIds = new Set(active.map((s) => s.id));

  // CR-EF-028 — collision detection for sessions about to sync for the first
  // time. Fetches the whole window once; only used for sessions with no
  // existing mapping below, never for ones already synced.
  const knownEventIds = new Set(mappings.map((m) => m.event_id));
  const calendarEvents = await listCalendarView(calendarId, windowStart, windowEnd);
  const eventsByDay = new Map<string, GraphCalendarEvent[]>();
  for (const ev of calendarEvents) {
    if (!ev.start?.dateTime) continue;
    const key = dayKey(ev.start.dateTime + "Z");
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(ev);
  }
  const { data: candidateRows, error: candErr } = await db
    .from("outlook_duplicate_candidates")
    .select("session_id, status");
  if (candErr) throw new Error(`outlook_duplicate_candidates read failed: ${candErr.message}`);
  const candidateBySession = new Map(
    ((candidateRows ?? []) as { session_id: string; status: string }[]).map((c) => [c.session_id, c.status])
  );

  // 1. Remove events for mapped sessions that are no longer active in-window
  //    (cancelled, unscheduled, or moved outside the window), and any mapping
  //    that points at a previously-selected calendar.
  for (const m of mappings) {
    if (activeIds.has(m.session_id) && m.calendar_id === calendarId) continue;
    try {
      await deleteEvent(m.event_id);
      const { error } = await db.from("session_calendar_events").delete().eq("session_id", m.session_id);
      if (error) throw new Error(error.message);
      result.deleted++;
    } catch (err) {
      if (err instanceof GraphReconnectError) throw err;
      result.errors.push(`delete ${m.session_id}: ${(err as Error).message}`);
    }
  }

  // 2. Create/update events for active in-window sessions.
  for (const s of active) {
    try {
      const clientName = nameByBlock.get(s.block_id) ?? "Client";
      const input = buildEventInput(s, clientName);
      const hash = hashEvent(calendarId, input);
      const existing = mappingBySession.get(s.id);

      if (existing && existing.calendar_id === calendarId) {
        if (existing.sync_hash === hash) {
          result.unchanged++;
          continue;
        }
        const stillThere = await updateEvent(existing.event_id, input);
        if (stillThere) {
          const { error } = await db
            .from("session_calendar_events")
            .update({ sync_hash: hash, synced_at: new Date().toISOString() })
            .eq("session_id", s.id);
          if (error) throw new Error(error.message);
          result.updated++;
          continue;
        }
        // Event was deleted by hand in Outlook — recreate it below.
        const { error } = await db.from("session_calendar_events").delete().eq("session_id", s.id);
        if (error) throw new Error(error.message);
      }

      // CR-EF-028 — this session has never been synced (no mapping). Before
      // pushing a brand-new event, check whether it's already paused on an
      // open candidate, or would collide with one of Esther's own personal
      // entries for the first time.
      if (!existing) {
        const candidateStatus = candidateBySession.get(s.id);
        if (candidateStatus === "open") {
          result.paused++;
          continue;
        }
        if (!candidateStatus) {
          const day = dayKey(s.scheduled_at as string);
          const match = findDuplicateCandidate(eventsByDay.get(day) ?? [], knownEventIds, clientName, s.scheduled_at as string);
          if (match) {
            const { error } = await db.from("outlook_duplicate_candidates").insert({
              session_id: s.id,
              existing_event_id: match.event.id,
              existing_calendar_id: calendarId,
              existing_subject: match.event.subject ?? "",
              existing_start_at: match.event.start?.dateTime ? new Date(match.event.start.dateTime + "Z").toISOString() : null,
              flag: match.flag,
            });
            if (error) throw new Error(error.message);
            result.paused++;
            continue;
          }
        }
        // candidateStatus === "kept_separate", or no collision found — proceed to create normally.
      }

      const created = await createEvent(calendarId, input, s.id);
      const { error } = await db.from("session_calendar_events").upsert(
        {
          session_id: s.id,
          event_id: created.id,
          calendar_id: calendarId,
          sync_hash: hash,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );
      if (error) throw new Error(error.message);
      result.created++;
    } catch (err) {
      if (err instanceof GraphReconnectError) throw err;
      result.errors.push(`sync ${s.id}: ${(err as Error).message}`);
    }
  }

  return result;
}

/**
 * On-demand single-session sync, fired from the sessions PATCH so a reschedule
 * shows up in Outlook immediately rather than on the next cron tick. Failures
 * are swallowed by the caller — the cron run repairs any miss.
 */
export async function syncSessionCalendarEvent(sessionId: string): Promise<void> {
  if (!graphConfigured()) return;
  const status = await getIntegrationStatus();
  if (!status.connected || !status.calendarId) return;
  const calendarId = status.calendarId;

  const db = createPgClient();
  const { data: row, error } = await db
    .from("sessions")
    .select("id, block_id, session_number, data, scheduled_at, cancelled_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`session read failed: ${error.message}`);
  if (!row) return;
  const s = row as SessionRow;

  const { data: mapRow } = await db
    .from("session_calendar_events")
    .select("session_id, event_id, calendar_id, sync_hash")
    .eq("session_id", sessionId)
    .maybeSingle();
  const existing = (mapRow as MappingRow | null) ?? null;

  const isActive = Boolean(s.scheduled_at) && !s.cancelled_at;

  if (!isActive) {
    if (existing) {
      await deleteEvent(existing.event_id);
      await db.from("session_calendar_events").delete().eq("session_id", sessionId);
    }
    return;
  }

  const nameByBlock = await resolveClientNames(db, s.block_id ? [s.block_id] : []);
  const input = buildEventInput(s, nameByBlock.get(s.block_id) ?? "Client");
  const hash = hashEvent(calendarId, input);

  if (existing && existing.calendar_id === calendarId) {
    if (existing.sync_hash === hash) return;
    const stillThere = await updateEvent(existing.event_id, input);
    if (stillThere) {
      await db
        .from("session_calendar_events")
        .update({ sync_hash: hash, synced_at: new Date().toISOString() })
        .eq("session_id", sessionId);
      return;
    }
    await db.from("session_calendar_events").delete().eq("session_id", sessionId);
  } else if (existing) {
    // Mapping points at an old calendar — clean it up and recreate.
    await deleteEvent(existing.event_id);
    await db.from("session_calendar_events").delete().eq("session_id", sessionId);
  }

  // CR-EF-028 — same collision check as the batch sync, for the immediate
  // on-schedule push. A session that's never been synced and would collide
  // with one of Esther's own personal entries gets paused, not duplicated.
  if (!existing) {
    const { data: candRow } = await db
      .from("outlook_duplicate_candidates")
      .select("status")
      .eq("session_id", sessionId)
      .maybeSingle();
    const candidateStatus = (candRow as { status: string } | null)?.status;
    if (candidateStatus === "open") return;
    if (!candidateStatus) {
      const { data: mappingRows } = await db.from("session_calendar_events").select("event_id");
      const knownEventIds = new Set(((mappingRows ?? []) as { event_id: string }[]).map((m) => m.event_id));
      const dayStart = new Date(dayKey(s.scheduled_at as string) + "T00:00:00.000Z");
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayEvents = await listCalendarView(calendarId, dayStart.toISOString(), dayEnd.toISOString());
      const match = findDuplicateCandidate(
        dayEvents,
        knownEventIds,
        nameByBlock.get(s.block_id) ?? "Client",
        s.scheduled_at as string
      );
      if (match) {
        await db.from("outlook_duplicate_candidates").insert({
          session_id: s.id,
          existing_event_id: match.event.id,
          existing_calendar_id: calendarId,
          existing_subject: match.event.subject ?? "",
          existing_start_at: match.event.start?.dateTime ? new Date(match.event.start.dateTime + "Z").toISOString() : null,
          flag: match.flag,
        });
        return;
      }
    }
  }

  const created = await createEvent(calendarId, input, s.id);
  await db.from("session_calendar_events").upsert(
    {
      session_id: s.id,
      event_id: created.id,
      calendar_id: calendarId,
      sync_hash: hash,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );
}
