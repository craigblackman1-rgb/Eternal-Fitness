// Read-only diagnostic for CR-EF-028 — sizes how often an app-synced session
// event collides with a separate, Esther-typed personal Outlook entry for the
// same real appointment (e.g. "Emma Atkinson — Session 4" next to "Emma").
//
// For every known app-created event (session_calendar_events), looks at every
// OTHER event on the same calendar day and flags one as a likely duplicate if
// its subject contains the client's first name and it isn't itself an
// app-created event.
//
// Run: MS_GRAPH_CLIENT_ID=... MS_GRAPH_CLIENT_SECRET=... MS_GRAPH_TENANT_ID=... \
//   node scripts/diagnose-outlook-duplicate-events.mjs

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

function dayKey(iso) {
  return iso.slice(0, 10);
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
  const events = await listCalendarView(accessToken, calendarId, windowStart, windowEnd);
  console.log(`Outlook events in window: ${events.length}`);

  const { rows: mapped } = await client.query(`
    SELECT sce.event_id, s.scheduled_at, c.name AS client_name, s.session_number
    FROM session_calendar_events sce
    JOIN sessions s ON s.id = sce.session_id
    JOIN blocks b ON b.id = s.block_id
    JOIN clients c ON c.id = b.client_id
  `);
  console.log(`App-known session<->event mappings: ${mapped.length}`);

  const knownEventIds = new Set(mapped.map((m) => m.event_id));
  const eventsByDay = new Map();
  for (const ev of events) {
    const day = dayKey(ev.start?.dateTime ?? "");
    if (!eventsByDay.has(day)) eventsByDay.set(day, []);
    eventsByDay.get(day).push(ev);
  }

  const collisions = [];
  for (const m of mapped) {
    if (!m.scheduled_at) continue;
    const day = dayKey(new Date(m.scheduled_at).toISOString());
    const firstName = m.client_name.trim().split(/\s+/)[0].toLowerCase();
    const sameDay = eventsByDay.get(day) ?? [];
    for (const ev of sameDay) {
      if (knownEventIds.has(ev.id)) continue; // the app's own event, not a duplicate
      const subj = (ev.subject ?? "").toLowerCase();
      if (subj.includes(firstName)) {
        collisions.push({
          client: m.client_name,
          sessionNumber: m.session_number,
          scheduledAt: m.scheduled_at,
          appEventId: mapped.find((x) => x.client_name === m.client_name)?.event_id,
          duplicateSubject: ev.subject,
          duplicateEventId: ev.id,
          duplicateOrganizer: ev.organizer?.emailAddress?.address,
          duplicateCreated: ev.createdDateTime,
        });
      }
    }
  }

  console.log(`\nLikely duplicate pairs found: ${collisions.length} (out of ${mapped.length} app-synced sessions checked)\n`);
  for (const c of collisions) {
    console.log(
      `- ${c.client} · Session ${c.sessionNumber} @ ${c.scheduledAt} <-> "${c.duplicateSubject}" ` +
        `(organizer=${c.duplicateOrganizer}, created=${c.duplicateCreated})`
    );
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
