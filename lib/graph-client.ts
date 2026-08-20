import { createPgClient } from "@/lib/pg-client";

/**
 * Server-only Microsoft Graph client for the Outlook calendar integration.
 *
 * Security constraint (from the L6 work order): integration_tokens rows are
 * bearer credentials to Esther's entire calendar, stored in the same Postgres
 * as client PII. Every read of that table must go through this module — no API
 * route may select from integration_tokens directly or return a row from it.
 *
 * Single-tenant app registration (Esther's own M365 organisation), so the
 * authority URL is tenant-scoped, not /common.
 */

const PROVIDER = "microsoft";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
export const GRAPH_SCOPES = "offline_access Calendars.ReadWrite User.Read";

export class GraphConfigError extends Error {}
/** Thrown when the refresh token is dead — the UI should show "reconnect". */
export class GraphReconnectError extends Error {}

function env(name: "MS_GRAPH_CLIENT_ID" | "MS_GRAPH_CLIENT_SECRET" | "MS_GRAPH_TENANT_ID" | "MS_GRAPH_REDIRECT_URI"): string {
  const v = process.env[name];
  if (!v) throw new GraphConfigError(`${name} is not configured`);
  return v;
}

export function graphConfigured(): boolean {
  return Boolean(
    process.env.MS_GRAPH_CLIENT_ID &&
    process.env.MS_GRAPH_CLIENT_SECRET &&
    process.env.MS_GRAPH_TENANT_ID &&
    process.env.MS_GRAPH_REDIRECT_URI
  );
}

export function authorityUrl(path: "authorize" | "token"): string {
  return `https://login.microsoftonline.com/${env("MS_GRAPH_TENANT_ID")}/oauth2/v2.0/${path}`;
}

interface TokenRow {
  id: string;
  provider: string;
  account_email: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

/** Connection metadata safe to hand to the UI — never the tokens themselves. */
export interface IntegrationStatus {
  connected: boolean;
  accountEmail: string | null;
  calendarId: string | null;
  calendarName: string | null;
}

async function getTokenRow(): Promise<TokenRow | null> {
  const db = createPgClient();
  const { data, error } = await db
    .from("integration_tokens")
    .select("*")
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (error) throw new Error(`integration_tokens read failed: ${error.message}`);
  return (data as TokenRow | null) ?? null;
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const row = await getTokenRow();
  return {
    connected: Boolean(row),
    accountEmail: row?.account_email ?? null,
    calendarId: row?.calendar_id ?? null,
    calendarName: row?.calendar_name ?? null,
  };
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(authorityUrl("token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("MS_GRAPH_CLIENT_ID"),
      client_secret: env("MS_GRAPH_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: env("MS_GRAPH_REDIRECT_URI"),
      scope: GRAPH_SCOPES,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return res.json();
}

export async function saveConnection(tokens: TokenResponse, accountEmail: string | null): Promise<void> {
  const db = createPgClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { error } = await db
    .from("integration_tokens")
    .upsert(
      {
        provider: PROVIDER,
        account_email: accountEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? "",
        expires_at: expiresAt,
        scope: tokens.scope ?? GRAPH_SCOPES,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" }
    );
  if (error) throw new Error(`integration_tokens save failed: ${error.message}`);
}

export async function setCalendar(calendarId: string, calendarName: string): Promise<void> {
  const db = createPgClient();
  const { error } = await db
    .from("integration_tokens")
    .update({ calendar_id: calendarId, calendar_name: calendarName, updated_at: new Date().toISOString() })
    .eq("provider", PROVIDER);
  if (error) throw new Error(`calendar selection save failed: ${error.message}`);
}

export async function disconnect(): Promise<void> {
  const db = createPgClient();
  // Mapping rows are meaningless without a connection to manage the events.
  const { error: evErr } = await db.from("session_calendar_events").delete().neq("event_id", "");
  if (evErr) throw new Error(`session_calendar_events clear failed: ${evErr.message}`);
  const { error } = await db.from("integration_tokens").delete().eq("provider", PROVIDER);
  if (error) throw new Error(`integration_tokens delete failed: ${error.message}`);
}

/**
 * Returns a currently-valid access token, refreshing (and persisting the
 * ROTATED refresh token — Microsoft invalidates the old one on use) when the
 * stored token is within 2 minutes of expiry.
 */
async function getAccessToken(): Promise<string> {
  const row = await getTokenRow();
  if (!row) throw new GraphReconnectError("Microsoft account is not connected");

  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt - Date.now() > 2 * 60 * 1000) return row.access_token;

  const res = await fetch(authorityUrl("token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("MS_GRAPH_CLIENT_ID"),
      client_secret: env("MS_GRAPH_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
      scope: GRAPH_SCOPES,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // invalid_grant = refresh token revoked/expired — needs a full reconnect.
    if (res.status === 400 && body.includes("invalid_grant")) {
      throw new GraphReconnectError("Microsoft refresh token is no longer valid — reconnect the account");
    }
    throw new Error(`Token refresh failed (${res.status}): ${body.slice(0, 500)}`);
  }
  const tokens: TokenResponse = await res.json();

  const db = createPgClient();
  const { error } = await db
    .from("integration_tokens")
    .update({
      access_token: tokens.access_token,
      // Persist the rotated refresh token; keep the old one only if Microsoft
      // didn't send a replacement (it normally does).
      refresh_token: tokens.refresh_token ?? row.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("provider", PROVIDER);
  if (error) throw new Error(`refreshed token persist failed: ${error.message}`);

  return tokens.access_token;
}

async function graphFetch(path: string, init?: RequestInit & { accessToken?: string }): Promise<Response> {
  const token = init?.accessToken ?? (await getAccessToken());
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function getMe(accessToken: string): Promise<{ email: string | null; displayName: string | null }> {
  const res = await graphFetch("/me", { accessToken });
  if (!res.ok) return { email: null, displayName: null };
  const me = await res.json();
  return {
    email: me.mail ?? me.userPrincipalName ?? null,
    displayName: me.displayName ?? null,
  };
}

export interface GraphCalendar {
  id: string;
  name: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
}

export async function listCalendars(): Promise<GraphCalendar[]> {
  const res = await graphFetch("/me/calendars?$select=id,name,isDefaultCalendar,canEdit&$top=50");
  if (!res.ok) {
    if (res.status === 401) throw new GraphReconnectError("Graph rejected the access token");
    throw new Error(`listCalendars failed (${res.status})`);
  }
  const body = await res.json();
  return (body.value ?? []) as GraphCalendar[];
}

export interface CalendarEventInput {
  subject: string;
  bodyHtml: string;
  /** ISO instant (UTC). Sent with timeZone: "UTC" — BST/GMT drift is the classic failure here. */
  startUtc: string;
  endUtc: string;
}

function eventPayload(input: CalendarEventInput) {
  return {
    subject: input.subject,
    body: { contentType: "HTML", content: input.bodyHtml },
    start: { dateTime: input.startUtc, timeZone: "UTC" },
    end: { dateTime: input.endUtc, timeZone: "UTC" },
  };
}

/**
 * transactionId makes creates idempotent on Graph's side — the 15-minute cron
 * and the on-demand sync from a sessions PATCH can't race into duplicates.
 */
export async function createEvent(
  calendarId: string,
  input: CalendarEventInput,
  transactionId: string
): Promise<{ id: string }> {
  const res = await graphFetch(`/me/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({ ...eventPayload(input), transactionId }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new GraphReconnectError("Graph rejected the access token");
    const body = await res.text();
    throw new Error(`createEvent failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const event = await res.json();
  return { id: event.id as string };
}

/** Returns false if the event no longer exists in Outlook (deleted by hand). */
export async function updateEvent(eventId: string, input: CalendarEventInput): Promise<boolean> {
  const res = await graphFetch(`/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(eventPayload(input)),
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    if (res.status === 401) throw new GraphReconnectError("Graph rejected the access token");
    const body = await res.text();
    throw new Error(`updateEvent failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return true;
}

export interface GraphCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  organizer?: { emailAddress?: { address?: string; name?: string } };
  createdDateTime?: string;
}

/**
 * Read-back for CR-EF-050 — lists the connected calendar's events over a
 * window, paging through @odata.nextLink. Read-only; never used by the
 * app->Outlook sync (lib/calendar-sync.ts), which never reads anything back.
 */
export async function listCalendarView(
  calendarId: string,
  startUtc: string,
  endUtc: string
): Promise<GraphCalendarEvent[]> {
  const events: GraphCalendarEvent[] = [];
  let path: string | null =
    `/me/calendars/${encodeURIComponent(calendarId)}/calendarView` +
    `?startDateTime=${encodeURIComponent(startUtc)}&endDateTime=${encodeURIComponent(endUtc)}` +
    `&$select=id,subject,start,end,organizer,createdDateTime&$top=100`;
  while (path) {
    const res = await graphFetch(path.startsWith("http") ? path.replace(GRAPH_BASE, "") : path);
    if (!res.ok) {
      if (res.status === 401) throw new GraphReconnectError("Graph rejected the access token");
      const body = await res.text();
      throw new Error(`listCalendarView failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const body = await res.json();
    events.push(...(body.value ?? []));
    const next = body["@odata.nextLink"] as string | undefined;
    path = next ? next.replace(GRAPH_BASE, "") : null;
  }
  return events;
}

/** 404 is success — the event is already gone. */
export async function deleteEvent(eventId: string): Promise<void> {
  const res = await graphFetch(`/me/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  if (res.ok || res.status === 404) return;
  if (res.status === 401) throw new GraphReconnectError("Graph rejected the access token");
  const body = await res.text();
  throw new Error(`deleteEvent failed (${res.status}): ${body.slice(0, 300)}`);
}
