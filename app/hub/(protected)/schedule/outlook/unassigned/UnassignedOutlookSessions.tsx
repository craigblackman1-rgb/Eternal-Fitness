"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HubCard, HubAlert, EmptyState } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSearch, IconDumbbell, IconCalendar } from "@/components/icons";
import { toast } from "sonner";
import Link from "next/link";

interface UnassignedSession {
  id: string;
  session_number: number;
  focus_label: string | null;
  scheduled_at: string | null;
  client_id: string;
  client_name: string;
  block_id: string;
  block_number: number | null;
}

interface TemplateOption {
  id: string;
  name: string;
  archetypes: string[];
}

function formatWhen(iso: string | null) {
  if (!iso) return "Not scheduled";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * CR-EF-111 — bulk-assign page for Outlook-auto-created sessions with no
 * workout assigned. Lists every unassigned-Outlook session across all clients,
 * grouped by client, with checkboxes for bulk template assignment.
 *
 * The design mirrors the OutlookBookingsQueue pattern (summary stats, list,
 * template picker) but operates on already-materialized sessions instead of
 * raw booking events.
 */
export function UnassignedOutlookSessions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<UnassignedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/unassigned-outlook", { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      setSessions(await res.json());
    } catch (e) {
      setError(e instanceof Error ? (e.name === "TimeoutError" ? "The server took too long to respond — try refreshing." : e.message) : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setLoadingTemplates(true);
    fetch("/api/workout-templates", { signal: AbortSignal.timeout(15000) })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: TemplateOption[]) => setTemplates(list))
      .catch((e) => { setError(e instanceof Error ? (e.name === "TimeoutError" ? "The server took too long to respond — try refreshing." : e.message) : "Failed to load templates"); setTemplates([]); })
      .finally(() => setLoadingTemplates(false));
  }, []);

  const filteredTemplates = templateSearch
    ? templates.filter((t) => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
    : templates;

  // Group sessions by client for display.
  const grouped = useMemo(() => {
    const map = new Map<string, { clientName: string; sessions: UnassignedSession[] }>();
    for (const s of sessions) {
      const key = s.client_id;
      if (!map.has(key)) map.set(key, { clientName: s.client_name, sessions: [] });
      map.get(key)!.sessions.push(s);
    }
    return Array.from(map.values());
  }, [sessions]);

  const toggleAll = () => {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map((s) => s.id)));
    }
  };

  const toggleSession = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClient = (clientSessions: UnassignedSession[]) => {
    const ids = clientSessions.map((s) => s.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const assignTemplate = async (template: TemplateOption) => {
    if (selected.size === 0) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/sessions/bulk-assign-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_ids: Array.from(selected),
          template_id: template.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign");
      }
      const result = await res.json();
      toast.success(`Assigned "${template.name}" to ${result.assigned} session${result.assigned === 1 ? "" : "s"}`);
      if (result.errors?.length > 0) {
        toast.warning(`${result.errors.length} session${result.errors.length === 1 ? "" : "s"} could not be assigned`);
      }
      setSelected(new Set());
      load();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign workout");
    }
    setAssigning(false);
  };

  if (loading) return <p className="p-8 text-center text-muted-foreground">Loading…</p>;

  if (error) return (
    <HubAlert severity="warning" title="Something went wrong">
      <div className="flex items-center justify-between gap-3">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={load}>Try again</Button>
      </div>
    </HubAlert>
  );

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<IconCalendar className="h-6 w-6" />}
        title="All Outlook sessions have workouts assigned"
        description="Every Outlook-booked session has a template assigned. New unassigned sessions will appear here as they are created."
      />
    );
  }

  return (
    <div className="space-y-6">
      <HubAlert severity="info" title="How bulk assign works">
        Select one or more Outlook-placeholder sessions, then pick a workout template. The template&rsquo;s
        exercises will be applied to every selected session, replacing the &ldquo;No workout assigned yet&rdquo; placeholder.
      </HubAlert>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <HubCard className="p-4">
          <p className="text-2xl font-semibold text-foreground">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">Unassigned sessions</p>
        </HubCard>
        <HubCard className="p-4">
          <p className="text-2xl font-semibold text-foreground">{grouped.length}</p>
          <p className="text-xs text-muted-foreground">Clients affected</p>
        </HubCard>
        <HubCard className="p-4">
          <p className="text-2xl font-semibold text-foreground">{selected.size}</p>
          <p className="text-xs text-muted-foreground">Selected</p>
        </HubCard>
      </div>

      {/* Template picker — only visible when selection > 0 */}
      {selected.size > 0 && (
        <HubCard className="p-4">
          <p className="text-sm font-semibold text-foreground mb-3">
            Assign a template to {selected.size} selected session{selected.size === 1 ? "" : "s"}
          </p>
          <div className="relative mb-3">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates…"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-9 border-[var(--hub-field-border)] hover:border-[var(--hub-field-border-hover)] focus:border-rose focus:ring-2 focus:ring-rose/20 bg-[var(--hub-card)]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {loadingTemplates ? (
              <p className="text-sm text-muted-foreground text-center py-3">Loading templates…</p>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                {templates.length === 0 ? "No templates saved yet." : "No templates match your search."}
              </p>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => assignTemplate(t)}
                  disabled={assigning}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--hub-hover)] transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--status-success-bg)] text-teal flex items-center justify-center shrink-0">
                    <IconDumbbell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    {t.archetypes?.length > 0 && (
                      <p className="text-xs text-muted-foreground">{t.archetypes.join(", ")}</p>
                    )}
                  </div>
                  {assigning && <span className="text-xs text-muted-foreground shrink-0">Assigning…</span>}
                </button>
              ))
            )}
          </div>
        </HubCard>
      )}

      {/* Session list grouped by client */}
      <HubCard padded={false}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Unassigned Outlook sessions</p>
            <span className="inline-flex items-center rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning)] px-2 py-0.5 text-xs font-semibold">
              {sessions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {selected.size === sessions.length ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div className="divide-y divide-[var(--hub-border)]">
          {grouped.map(({ clientName, sessions: clientSessions }) => {
            const allClientSelected = clientSessions.every((s) => selected.has(s.id));
            return (
              <div key={clientSessions[0].client_id}>
                {/* Client header */}
                <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--hub-canvas)]">
                  <input
                    type="checkbox"
                    checked={allClientSelected}
                    onChange={() => toggleClient(clientSessions)}
                    className="h-4 w-4 rounded border-[var(--hub-field-border)] accent-teal"
                  />
                  <span className="text-sm font-semibold text-foreground">{clientName}</span>
                  <span className="text-xs text-muted-foreground">
                    {clientSessions.length} session{clientSessions.length === 1 ? "" : "s"}
                  </span>
                  <Link
                    href={`/hub/clients/${clientSessions[0].client_id}`}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground ml-auto"
                  >
                    View client
                  </Link>
                </div>
                {/* Session rows */}
                {clientSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--hub-hover)] transition-colors ${
                      selected.has(s.id) ? "bg-[var(--status-primary-bg)]" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleSession(s.id)}
                      className="h-4 w-4 rounded border-[var(--hub-field-border)] accent-teal"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">
                        Session {s.session_number}
                        {s.scheduled_at ? ` · ${formatWhen(s.scheduled_at)}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/hub/clients/${s.client_id}/blocks/${s.block_id}/sessions/${s.session_number}`}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground shrink-0"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </HubCard>

      <p className="text-xs text-muted-foreground">
        <Link href="/hub/schedule/outlook" className="underline underline-offset-2">Back to Outlook reconciliation</Link>
      </p>
    </div>
  );
}
