// Read-only dry run of lib/calendar-sync.ts's new CR-EF-028 collision check —
// mirrors the exact logic (same-day, first-name match, 30-min "same" window)
// without touching the DB or Outlook, so it's safe to run against prod any
// time. Used to confirm the real code's detection matches expectations
// before trusting it near the live push-sync.
//
// Run: MS_GRAPH_CLIENT_ID=... MS_GRAPH_CLIENT_SECRET=... MS_GRAPH_TENANT_ID=... \
//   node scripts/dry-run-outlook-duplicate-detection.mjs

import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const dbMatch = env.match(/^DATABASE_URL=(.+)$/m);
const CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
const TENANT_ID = process.env.MS_GRAPH_TENANT_ID;
if (!dbMatch || !CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
  console.error("Missing DATABASE_URL or MS_GRAPH_* env vars");
  process.exit(1);
}

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const WINDOW_PAST_MS = 24 * 60 * 60 * 1000;
const WINDOW_FUTURE_MS = 60 * 24 * 60 * 60 * 1000;
const SAME_TIME_WINDOW_MS = 30 * 60 * 1000;

function firstNameOf(fullName) {
  return fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}
function dayKey(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}
function findDuplicateCandidate(dayEvents, knownEventIds, clientName, scheduledAtIso) {
  const firstName = firstNameOf(clientName);
  if (!firstName) return null;
  const sessionMs = new Date(scheduledAtIso).getTime();
  for (const ev of dayEvents) {
    if (knownEventIds.has(ev.id)) continue;
    const subject = (ev.subject ?? "").toLowerCase();
    if (!subject.includes(firstName)) continue;
    const evStart = ev.start?.dateTime ? new Date(ev.start.dateTime + "Z").getTime() : NaN;
    const flag = Number.isFinite(evStart) && Math.abs(evStart - sessionMs) <= SAME_TIME_WINDOW_MS ? "same" : "off";
    return { event: ev, flag };
  }
  return null;
}

const client = new pg.Client({ connectionString: dbMatch[1].trim() });

async function refreshAccessToken(refreshToken) {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "offline_access Calendars.ReadWrite User.Read",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
  return res.json();
}
async function listCalendarView(accessToken, calendarId, startIso, endIso) {
  const events = [];
  let url =
    `${GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/calendarView` +
    `?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}` +
    `&$select=id,subject,start,end,organizer,createdDateTime&$top=100`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`calendarView failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
    const body = await res.json();
    events.push(...(body.value ?? []));
    url = body["@odata.nextLink"] ?? null;
  }
  return events;
}

async function main() {
  await client.connect();
  const { rows: tokenRows } = await client.query(
    `SELECT refresh_token, calendar_id FROM integration_tokens WHERE provider = 'microsoft'`
  );
  if (tokenRows.length === 0 || !tokenRows[0].calendar_id) {
    console.log("No connected Microsoft calendar.");
    await client.end();
    return;
  }
  const { refresh_token, calendar_id: calendarId } = tokenRows[0];
  const { access_token: accessToken } = await refreshAccessToken(refresh_token);

  const windowStart = new Date(Date.now() - WINDOW_PAST_MS).toISOString();
  const windowEnd = new Date(Date.now() + WINDOW_FUTURE_MS).toISOString();

  const { rows: sessions } = await client.query(`
    SELECT s.id, s.block_id, s.scheduled_at, c.name AS client_name
    FROM sessions s
    JOIN blocks b ON b.id = s.block_id
    JOIN clients c ON c.id = b.client_id
    WHERE s.scheduled_at IS NOT NULL AND s.cancelled_at IS NULL
      AND s.scheduled_at >= $1 AND s.scheduled_at <= $2
  `, [windowStart, windowEnd]);

  const { rows: mappingRows } = await client.query(`SELECT session_id, event_id FROM session_calendar_events`);
  const mappedSessionIds = new Set(mappingRows.map((m) => m.session_id));
  const knownEventIds = new Set(mappingRows.map((m) => m.event_id));

  const { rows: existingCandidates } = await client.query(`SELECT session_id, status FROM outlook_duplicate_candidates`);
  const candidateBySession = new Map(existingCandidates.map((c) => [c.session_id, c.status]));

  const events = await listCalendarView(accessToken, calendarId, windowStart, windowEnd);
  const eventsByDay = new Map();
  for (const ev of events) {
    if (!ev.start?.dateTime) continue;
    const key = dayKey(ev.start.dateTime + "Z");
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key).push(ev);
  }

  console.log(`${sessions.length} scheduled sessions in window, ${mappedSessionIds.size} already synced.`);

  let wouldPauseNew = 0, alreadySynced = 0, alreadyQueued = 0, wouldKeepGoing = 0;
  for (const s of sessions) {
    if (mappedSessionIds.has(s.id)) { alreadySynced++; continue; } // never touched by the new logic
    const existingStatus = candidateBySession.get(s.id);
    if (existingStatus === "open") { alreadyQueued++; continue; }
    if (existingStatus === "kept_separate") { wouldKeepGoing++; continue; }
    const day = dayKey(s.scheduled_at);
    const match = findDuplicateCandidate(eventsByDay.get(day) ?? [], knownEventIds, s.client_name, s.scheduled_at);
    if (match) {
      wouldPauseNew++;
      console.log(
        `WOULD PAUSE: ${s.client_name} @ ${s.scheduled_at} <-> "${match.event.subject}" ` +
          `(flag=${match.flag}, organizer=${match.event.organizer?.emailAddress?.address})`
      );
    } else {
      wouldKeepGoing++;
    }
  }

  console.log(`\nSummary: ${alreadySynced} already synced (untouched), ${alreadyQueued} already queued, ` +
    `${wouldPauseNew} would newly pause, ${wouldKeepGoing} would sync normally.`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
