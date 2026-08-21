// Read-only diagnostic for CR-EF-050 (Lane G, wo-ef-consolidated-2026-08-20).
//
// Sizes the gap between what's actually in Esther's connected Outlook calendar
// and what the app knows about via `sessions` / `session_calendar_events`.
// Makes no writes anywhere — no DB writes, no Graph writes.
//
// Needs MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET / MS_GRAPH_TENANT_ID in the
// environment (not committed to .env.local — pass them inline) plus the usual
// DATABASE_URL from .env.local (SSH tunnel to prod Postgres on 5433).
//
// Run from the repo root:
//   MS_GRAPH_CLIENT_ID=... MS_GRAPH_CLIENT_SECRET=... MS_GRAPH_TENANT_ID=... \
//     node scripts/diagnose-outlook-bookings-gap.mjs

import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const dbMatch = env.match(/^DATABASE_URL=(.+)$/m);
if (!dbMatch) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
const TENANT_ID = process.env.MS_GRAPH_TENANT_ID;
if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
  console.error("MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET / MS_GRAPH_TENANT_ID must be set in the environment");
  process.exit(1);
}

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const WINDOW_PAST_MS = 24 * 60 * 60 * 1000; // matches lib/calendar-sync.ts's sync window
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
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return res.json();
}

async function listCalendarView(accessToken, calendarId, startIso, endIso) {
  const events = [];
  let url =
    `${GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/calendarView` +
    `?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}` +
    `&$select=id,subject,start,end,organizer,attendees,createdDateTime,bodyPreview&$top=100`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`calendarView failed (${res.status}): ${body.slice(0, 500)}`);
    }
    const body = await res.json();
    events.push(...(body.value ?? []));
    url = body["@odata.nextLink"] ?? null;
  }
  return events;
}

async function main() {
  await client.connect();

  const { rows: tokenRows } = await client.query(
    `SELECT account_email, refresh_token, calendar_id, calendar_name FROM integration_tokens WHERE provider = 'microsoft'`
  );
  if (tokenRows.length === 0) {
    console.log("No Microsoft account connected (integration_tokens has no 'microsoft' row). Nothing to diagnose.");
    await client.end();
    return;
  }
  const { account_email, refresh_token, calendar_id, calendar_name } = tokenRows[0];
  if (!calendar_id) {
    console.log("Microsoft account connected but no calendar selected yet. Nothing to diagnose.");
    await client.end();
    return;
  }
  console.log(`Connected account: ${account_email}`);
  console.log(`Synced calendar: ${calendar_name} (${calendar_id})`);

  const tokens = await refreshAccessToken(refresh_token);
  const accessToken = tokens.access_token;

  const windowStart = new Date(Date.now() - WINDOW_PAST_MS);
  const windowEnd = new Date(Date.now() + WINDOW_FUTURE_MS);
  console.log(`Window: ${windowStart.toISOString()} .. ${windowEnd.toISOString()} (matches the app's sync window)`);

  const events = await listCalendarView(accessToken, calendar_id, windowStart.toISOString(), windowEnd.toISOString());
  console.log(`\nOutlook events in window: ${events.length}`);

  const { rows: mappedEventIds } = await client.query(
    `SELECT event_id FROM session_calendar_events WHERE calendar_id = $1`,
    [calendar_id]
  );
  const mappedIdSet = new Set(mappedEventIds.map((r) => r.event_id));

  const { rows: clients } = await client.query(`SELECT id, name, email FROM clients WHERE email IS NOT NULL`);
  const clientByEmail = new Map(clients.map((c) => [String(c.email).trim().toLowerCase(), c]));

  const unmatched = [];
  for (const ev of events) {
    if (mappedIdSet.has(ev.id)) continue; // app-created event, already accounted for
    unmatched.push(ev);
  }

  console.log(`Outlook events with NO session_calendar_events mapping (not created/tracked by the app): ${unmatched.length}`);

  if (unmatched.length === 0) {
    console.log("\nNo gap found in this window — every Outlook event in range was created by the app's own sync.");
    await client.end();
    return;
  }

  console.log("\n--- Unmatched events ---");
  let autoMatchable = 0;
  for (const ev of unmatched) {
    const candidateEmails = [
      ev.organizer?.emailAddress?.address,
      ...(ev.attendees ?? []).map((a) => a.emailAddress?.address),
    ]
      .filter(Boolean)
      .map((e) => e.trim().toLowerCase());

    let matchedClient = null;
    for (const email of candidateEmails) {
      if (clientByEmail.has(email)) {
        matchedClient = clientByEmail.get(email);
        break;
      }
    }
    if (matchedClient) autoMatchable++;

    console.log(
      `- "${ev.subject}" | start=${ev.start?.dateTime} | organizer=${ev.organizer?.emailAddress?.address ?? "?"} | ` +
        `attendees=[${candidateEmails.join(", ")}] | createdAt=${ev.createdDateTime} | ` +
        `${matchedClient ? `MATCH -> client "${matchedClient.name}" (${matchedClient.id})` : "NO CLIENT MATCH"}`
    );
  }

  console.log(`\nSummary: ${unmatched.length} unmatched Outlook events in window, ${autoMatchable} would auto-match a client by email, ${unmatched.length - autoMatchable} would need manual review.`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
