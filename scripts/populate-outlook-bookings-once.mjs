// One-off manual seed for outlook_booking_events, mirroring lib/outlook-bookings.ts's
// syncOutlookBookings() logic exactly (used here only because that module isn't yet
// deployed/reachable via the real cron endpoint). Once this branch is live, the 15-min
// cron (app/api/cron/sync-calendar/route.ts) takes over and this script is dead weight.
//
// Run: MS_GRAPH_CLIENT_ID=... MS_GRAPH_CLIENT_SECRET=... MS_GRAPH_TENANT_ID=... \
//   node scripts/populate-outlook-bookings-once.mjs

import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const dbMatch = env.match(/^DATABASE_URL=(.+)$/m);
const CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
const TENANT_ID = process.env.MS_GRAPH_TENANT_ID;
if (!dbMatch || !CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
  console.error("Missing DATABASE_URL (.env.local) or MS_GRAPH_* env vars");
  process.exit(1);
}

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const BOOKINGS_ORGANIZER_EMAIL = "eternalfitnessbookings@eternal-fitness.co.uk";
const WINDOW_PAST_MS = 24 * 60 * 60 * 1000;
const WINDOW_FUTURE_MS = 60 * 24 * 60 * 60 * 1000;
// Mirror: lib/outlook-bookings.ts
const SUBJECT_NAME_RE = /^(?:Online\s+)?(?:Personal Training|Initial consult)\s*-\s*(.+)$/i;

function parseClientNameFromSubject(subject) {
  const m = (subject ?? "").trim().match(SUBJECT_NAME_RE);
  return m ? m[1].trim() : null;
}

function matchClientByParsedName(parsedName, clients) {
  const norm = (s) => s.trim().toLowerCase();
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
    console.log("No connected Microsoft calendar. Nothing to do.");
    await client.end();
    return;
  }
  const { refresh_token, calendar_id: calendarId } = tokenRows[0];
  const { access_token: accessToken } = await refreshAccessToken(refresh_token);

  const windowStart = new Date(Date.now() - WINDOW_PAST_MS).toISOString();
  const windowEnd = new Date(Date.now() + WINDOW_FUTURE_MS).toISOString();
  const events = await listCalendarView(accessToken, calendarId, windowStart, windowEnd);
  const bookingEvents = events.filter(
    (ev) => (ev.organizer?.emailAddress?.address ?? "").trim().toLowerCase() === BOOKINGS_ORGANIZER_EMAIL
  );
  console.log(`${events.length} events in window, ${bookingEvents.length} are Bookings appointments`);

  const { rows: clients } = await client.query(`SELECT id, name FROM clients`);

  let created = 0, updated = 0, skippedResolved = 0;
  for (const ev of bookingEvents) {
    const parsedName = parseClientNameFromSubject(ev.subject ?? "");
    const matched = parsedName ? matchClientByParsedName(parsedName, clients) : null;

    const { rows: existingRows } = await client.query(
      `SELECT id, status FROM outlook_booking_events WHERE event_id = $1`,
      [ev.id]
    );
    const existing = existingRows[0];
    if (existing && existing.status !== "open") {
      skippedResolved++;
      continue;
    }

    const startAt = ev.start?.dateTime ? new Date(ev.start.dateTime + "Z").toISOString() : new Date().toISOString();
    const endAt = ev.end?.dateTime ? new Date(ev.end.dateTime + "Z").toISOString() : null;

    if (existing) {
      await client.query(
        `UPDATE outlook_booking_events SET calendar_id=$1, subject=$2, start_at=$3, end_at=$4, parsed_name=$5, client_id=$6, updated_at=now() WHERE event_id=$7`,
        [calendarId, ev.subject ?? "", startAt, endAt, parsedName, matched?.id ?? null, ev.id]
      );
      updated++;
    } else {
      await client.query(
        `INSERT INTO outlook_booking_events (event_id, calendar_id, subject, start_at, end_at, parsed_name, client_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [ev.id, calendarId, ev.subject ?? "", startAt, endAt, parsedName, matched?.id ?? null]
      );
      created++;
    }
  }
  console.log(`created=${created} updated=${updated} skipped(already resolved)=${skippedResolved}`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
