"use client";

import { useCallback, useEffect, useState } from "react";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CalendarOption {
  id: string;
  name: string;
  isDefaultCalendar: boolean;
}

interface StatusResponse {
  configured: boolean;
  connected: boolean;
  tokenExpired?: boolean;
  accountEmail?: string | null;
  calendarId?: string | null;
  calendarName?: string | null;
  calendars?: CalendarOption[];
}

export function IntegrationsManager() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState("");
  // Distinct from status.configured === false: this means the check itself
  // failed (network error, 500, etc), not that Graph is genuinely unconfigured.
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/integrations/microsoft/status");
      if (!res.ok) {
        const message = await res
          .json()
          .then((b) => b.error as string)
          .catch(() => `Status check failed (${res.status})`);
        throw new Error(message);
      }
      const body: StatusResponse = await res.json();
      setStatus(body);
      setSelectedCalendar(body.calendarId ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load integration status";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Surface the OAuth callback's outcome once, from the redirect params.
  // (window.location rather than useSearchParams — no Suspense boundary needed.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) toast.error(error);
    else if (params.get("connected")) toast.success("Microsoft account connected — now pick the calendar to sync into");
  }, []);

  async function disconnect() {
    if (!window.confirm("Disconnect the Microsoft account? Synced events stay in Outlook; the sync stops.")) return;
    setWorking(true);
    try {
      const res = await fetch("/api/integrations/microsoft/disconnect", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Disconnect failed");
      toast.success("Microsoft account disconnected");
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setWorking(false);
    }
  }

  async function saveCalendar() {
    const calendar = status?.calendars?.find((c) => c.id === selectedCalendar);
    if (!calendar) return;
    setWorking(true);
    try {
      const res = await fetch("/api/integrations/microsoft/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: calendar.id, calendarName: calendar.name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save calendar");
      const s = body.sync;
      toast.success(
        s
          ? `Calendar saved — synced ${s.created} new, ${s.updated} updated, ${s.deleted} removed`
          : "Calendar saved"
      );
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save calendar");
    } finally {
      setWorking(false);
    }
  }

  let content: React.ReactNode;

  if (loading) {
    content = <p className="text-sm text-muted-foreground">Checking connection…</p>;
  } else if (loadError) {
    content = (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Couldn&apos;t check the connection: {loadError}</p>
        <Button variant="outline" size="sm" onClick={loadStatus}>Try again</Button>
      </div>
    );
  } else if (!status?.configured) {
    content = (
      <p className="text-sm text-muted-foreground">
        Microsoft Graph isn&apos;t configured on this environment yet (MS_GRAPH_* environment
        variables are missing), so the calendar connection can&apos;t be started from here.
      </p>
    );
  } else if (!status.connected) {
    content = (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Not connected. Sign in with the Microsoft account whose Outlook calendar should hold
          the studio sessions.
        </p>
        <Button asChild disabled={working}>
          <a href="/api/integrations/microsoft/authorize">Connect Microsoft account</a>
        </Button>
      </div>
    );
  } else if (status.tokenExpired) {
    content = (
      <div className="space-y-3">
        <p className="text-sm text-foreground">
          Connected as <span className="font-medium">{status.accountEmail ?? "unknown account"}</span>,
          but the sign-in has expired and the sync is paused.
        </p>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/api/integrations/microsoft/authorize">Reconnect</a>
          </Button>
          <Button variant="outline" onClick={disconnect} disabled={working}>
            Disconnect
          </Button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          Connected as <span className="font-medium">{status.accountEmail ?? "unknown account"}</span>.
          {status.calendarName
            ? ` Syncing into “${status.calendarName}”.`
            : " Pick the calendar sessions should sync into — a dedicated “Eternal Fitness” calendar is recommended so it can be cleared or re-synced without touching personal events."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedCalendar}
            onChange={(e) => setSelectedCalendar(e.target.value)}
            disabled={working}
          >
            <option value="">Choose a calendar…</option>
            {(status.calendars ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isDefaultCalendar ? " (default)" : ""}
              </option>
            ))}
          </select>
          <Button
            onClick={saveCalendar}
            disabled={working || !selectedCalendar || selectedCalendar === status.calendarId}
          >
            {working ? "Saving…" : status.calendarId ? "Change calendar" : "Save & sync"}
          </Button>
          <Button variant="outline" onClick={disconnect} disabled={working}>
            Disconnect
          </Button>
        </div>
        {status.calendarId && (
          <p className="text-xs text-muted-foreground">
            Sessions from yesterday to 60 days ahead sync every 15 minutes, and immediately when
            one is scheduled, moved or cancelled in the hub. Each event links straight to the
            live session screen on the phone.
          </p>
        )}
      </div>
    );
  }

  return (
    <HubCard>
      <HubCardHeader
        title="Outlook calendar"
        subtitle="One-way sync: hub schedule → Outlook"
      />
      {content}
    </HubCard>
  );
}
