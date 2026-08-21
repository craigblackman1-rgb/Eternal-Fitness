import { createPgClient } from "@/lib/pg-client";
import type { GraphCalendarEvent } from "@/lib/graph-client";

/**
 * CR-EF-028 — collision detection between a session about to push its own
 * Outlook event and a pre-existing personal entry Esther typed herself for
 * the same real appointment (confirmed real pattern, 2026-08-21 diagnostic:
 * 5/12 synced sessions collided, every personal note pre-dating the app's
 * own sync event). Detection only — the actual pause/skip decision and the
 * queue-row insert live in lib/calendar-sync.ts's create loop, since that's
 * where the full event list and known-mapping set are already assembled.
 */

const SAME_TIME_WINDOW_MS = 30 * 60 * 1000;

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

/**
 * Finds a same-day Outlook event (not already known to the app) whose
 * subject contains the client's first name. Returns the event plus a
 * confidence flag: 'same' when its start time is within 30 minutes of the
 * session's own scheduled time (a real clash), 'off' otherwise (probably a
 * first-name coincidence, still surfaced but visibly weaker).
 */
export function findDuplicateCandidate(
  dayEvents: GraphCalendarEvent[],
  knownEventIds: Set<string>,
  clientName: string,
  scheduledAtIso: string
): { event: GraphCalendarEvent; flag: "same" | "off" } | null {
  const firstName = firstNameOf(clientName);
  if (!firstName) return null;
  const sessionMs = new Date(scheduledAtIso).getTime();

  for (const ev of dayEvents) {
    if (knownEventIds.has(ev.id)) continue;
    const subject = (ev.subject ?? "").toLowerCase();
    if (!subject.includes(firstName)) continue;
    const evStart = ev.start?.dateTime ? new Date(ev.start.dateTime + "Z").getTime() : NaN;
    const flag: "same" | "off" =
      Number.isFinite(evStart) && Math.abs(evStart - sessionMs) <= SAME_TIME_WINDOW_MS ? "same" : "off";
    return { event: ev, flag };
  }
  return null;
}

export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Adopts the existing Outlook event for this session instead of letting the
 * push-sync create a new one — same "adopt, don't duplicate" mechanism
 * CR-EF-050's confirm route uses. A placeholder sync_hash guarantees the
 * next cron run normalises the event's subject/body once, matching every
 * other app-managed session.
 */
export async function linkDuplicateCandidate(candidateId: string): Promise<void> {
  const db = createPgClient();
  const { data: candidate, error: candErr } = await db
    .from("outlook_duplicate_candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();
  if (candErr) throw new Error(candErr.message);
  if (!candidate) throw new Error("Duplicate candidate not found");
  if (candidate.status !== "open") throw new Error(`This candidate is already ${candidate.status}`);

  const { error: mapErr } = await db.from("session_calendar_events").upsert(
    {
      session_id: candidate.session_id,
      event_id: candidate.existing_event_id,
      calendar_id: candidate.existing_calendar_id,
      sync_hash: "",
      synced_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );
  if (mapErr) throw new Error(mapErr.message);

  const { error: updErr } = await db
    .from("outlook_duplicate_candidates")
    .update({ status: "linked", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (updErr) throw new Error(updErr.message);
}

/** Confirms the collision was a false positive — the next cron run's normal push-sync creates its own event. */
export async function keepSeparateDuplicateCandidate(candidateId: string): Promise<void> {
  const db = createPgClient();
  const { error } = await db
    .from("outlook_duplicate_candidates")
    .update({ status: "kept_separate", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (error) throw new Error(error.message);
}

/**
 * Reopens a resolved row. For a 'linked' undo, also removes the adopted
 * mapping so the session goes back to paused rather than silently staying
 * linked. For a 'kept_separate' undo, note this can't retroactively remove
 * an event the normal push-sync may already have created in the meantime —
 * it only reopens the row for review.
 */
export async function unresolveDuplicateCandidate(candidateId: string): Promise<void> {
  const db = createPgClient();
  const { data: candidate, error: candErr } = await db
    .from("outlook_duplicate_candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();
  if (candErr) throw new Error(candErr.message);
  if (!candidate) throw new Error("Duplicate candidate not found");

  if (candidate.status === "linked") {
    const { error } = await db.from("session_calendar_events").delete().eq("session_id", candidate.session_id);
    if (error) throw new Error(error.message);
  }

  const { error: updErr } = await db
    .from("outlook_duplicate_candidates")
    .update({ status: "open", resolved_at: null, updated_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (updErr) throw new Error(updErr.message);
}
