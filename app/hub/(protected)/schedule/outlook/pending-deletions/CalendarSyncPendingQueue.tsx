"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { HubCard, HubAlert, EmptyState } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { IconCalendar, IconCheck, IconCheckCircle, IconX, IconAlertTriangle, IconClock } from "@/components/icons";

interface PendingAction {
  id: string;
  action: string;
  session_id: string;
  event_id: string;
  reason: string;
  created_at: string;
  client_name: string;
  session_number: number | null;
  block_number: number | null;
  scheduled_at: string | null;
  cancelled_at: string | null;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(scheduledAt: string | null) {
  if (!scheduledAt) return "—";
  // Default 60 min — matches the most common time_tier
  return "60 min";
}

function queuedAgo(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `Queued ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Queued ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Queued ${days}d ago`;
}

export function CalendarSyncPendingQueue() {
  const [rows, setRows] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar-sync-pending-actions");
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data: PendingAction[] = await res.json();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function act(actionId: string, decision: "approve" | "reject") {
    setBusy(actionId);
    try {
      const res = await fetch("/api/calendar-sync-pending-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, decision }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const row = rows.find((r) => r.id === actionId);
      if (decision === "approve") {
        setToast(`Approved — Outlook event for ${row?.client_name ?? "client"} deleted`);
      } else {
        setToast(`Rejected — Outlook event for ${row?.client_name ?? "client"} kept as-is`);
      }
      setRows((rs) => rs.filter((r) => r.id !== actionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function approveAll() {
    setBusy("__all__");
    try {
      const res = await fetch("/api/calendar-sync-pending-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve_all" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const n = rows.length;
      setRows([]);
      setShowConfirm(false);
      setToast(`Approved all — ${n} event${n === 1 ? "" : "s"} permanently deleted`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const openRows = rows;

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Quick actions</span>
        <Link href="/hub/schedule" className="inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-sm font-semibold text-foreground hover:border-[var(--color-rose)] hover:bg-[var(--status-primary-bg)] transition-colors">
          <IconCalendar className="h-4 w-4 text-[var(--color-rose)]" />
          Back to schedule
        </Link>
        <Link href="/hub/settings/integrations" className="inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-sm font-semibold text-foreground hover:border-[var(--color-rose)] hover:bg-[var(--status-primary-bg)] transition-colors">
          <IconClock className="h-4 w-4 text-[var(--color-rose)]" />
          Integration settings
        </Link>
      </div>

      {/* How this works note */}
      <HubAlert severity="info" title="How this queue works">
        <ul className="list-disc pl-4 space-y-1">
          <li>When a session is <strong>cancelled</strong> or <strong>unscheduled</strong> in the app, its Outlook calendar event queues here instead of being deleted automatically.</li>
          <li><strong>Approve</strong> — permanently deletes the real event from Outlook. This can&rsquo;t be undone.</li>
          <li><strong>Reject</strong> — leaves the Outlook event exactly as it is. Use this if a deletion looks wrong.</li>
          <li>Nothing in this queue touches Outlook on its own. Every row is your explicit decision.</li>
        </ul>
      </HubAlert>

      {error && (
        <HubAlert severity="warning" title="Something went wrong">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </HubAlert>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HubCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] grid place-items-center bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
              <IconAlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{openRows.length}</p>
            </div>
          </div>
        </HubCard>
        <HubCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] grid place-items-center bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]">
              <IconCalendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved this week</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">0</p>
            </div>
          </div>
        </HubCard>
        <HubCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] grid place-items-center bg-[var(--status-success-bg)] text-[var(--status-success)]">
              <IconCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rejected this week</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">0</p>
            </div>
          </div>
        </HubCard>
      </div>

      {/* Queue card */}
      <HubCard padded={false}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Sessions waiting on a deletion decision</p>
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold " +
                (openRows.length
                  ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger-border)]"
                  : "bg-[var(--status-success-bg)] text-[var(--status-success)]")
              }
            >
              {openRows.length} pending
            </span>
          </div>
          {openRows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--status-danger-border)] text-[var(--status-danger)] font-semibold hover:bg-[var(--status-danger-bg)]"
              disabled={busy !== null}
              onClick={() => setShowConfirm(true)}
            >
              <IconCheck className="h-3.5 w-3.5" />
              Approve all
            </Button>
          )}
        </div>

        {loading ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Loading…</p>
        ) : openRows.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<IconCheckCircle className="h-6 w-6" />}
              title="Nothing pending — synced and clean."
              description="Every calendar deletion has been reviewed. If a session is cancelled or unscheduled, it will queue here automatically before anything leaves Outlook."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--hub-border)]">
            {openRows.map((row) => (
              <li key={row.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-[38px] h-[38px] rounded-[10px] grid place-items-center shrink-0 bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger)]">
                      <IconCalendar className="h-[17px] w-[17px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {row.client_name} · <span className="tabular-nums">{formatWhen(row.scheduled_at).split(" ").slice(-2).join(" ")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatWhen(row.scheduled_at)} · {formatDuration(row.scheduled_at)} · Session {row.session_number} · Block {row.block_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {row.reason === "Session cancelled" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--status-warning)]">
                        <IconX className="h-3 w-3" />
                        Session cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hub-border)] bg-[var(--hub-hover)] px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        <IconCalendar className="h-3 w-3" />
                        Session unscheduled
                      </span>
                    )}
                    <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">
                      {queuedAgo(row.created_at)}
                    </span>
                  </div>
                </div>

                {/* Deletion target panel */}
                <div className="mt-3 rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3.5 py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--status-danger)] mb-1">
                    Outlook event to be deleted
                  </p>
                  <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-sm">
                    <span className="font-semibold text-foreground">
                      &ldquo;{row.client_name}&rdquo;
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatWhen(row.scheduled_at)}
                    </span>
                  </div>
                </div>

                {/* Decision actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="w-full text-xs text-muted-foreground">This event stays in Outlook until you choose.</p>
                  <Button
                    size="sm"
                    className="bg-[var(--status-danger)] text-white hover:bg-[var(--status-danger)]/90"
                    disabled={busy !== null}
                    onClick={() => act(row.id, "approve")}
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                    Approve — delete event
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => act(row.id, "reject")}
                    title="Leaves the Outlook event exactly as it is"
                  >
                    <IconX className="h-3.5 w-3.5" />
                    Reject — keep event
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--hub-border)]">
          <span className="text-xs text-muted-foreground">
            {openRows.length === 0
              ? "Nothing waiting on you right now"
              : "New cancellations and unscheduled sessions are added automatically"}
          </span>
        </div>
      </HubCard>

      {/* Bulk approve confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/45 z-[60] grid place-items-center p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <div className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-2xl shadow-2xl w-full max-w-[460px] flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--hub-border)]">
              <h2 id="confirm-title" className="flex-1 text-[15px] font-bold text-foreground">Approve all pending deletions?</h2>
              <button
                type="button"
                className="w-8 h-8 rounded-lg grid place-items-center text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
                onClick={() => setShowConfirm(false)}
                aria-label="Close"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 pt-4 pb-1">
              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-[10px] grid place-items-center shrink-0 bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
                  <IconAlertTriangle className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-[13.5px] leading-relaxed text-body">
                    This will permanently delete <strong>{openRows.length}</strong> real Outlook calendar event{openRows.length === 1 ? "" : "s"}. This can&rsquo;t be undone.
                  </p>
                  <ul className="mt-2 pl-4 text-xs text-muted-foreground max-h-[130px] overflow-y-auto list-disc space-y-0.5">
                    {openRows.map((r) => (
                      <li key={r.id}>
                        {r.client_name} — &ldquo;{r.client_name}&rdquo; · {formatWhen(r.scheduled_at)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <Button variant="outline" onClick={() => setShowConfirm(false)} autoFocus>
                Cancel
              </Button>
              <Button
                className="bg-[var(--status-danger)] text-white hover:bg-[var(--status-danger)]/90"
                disabled={busy !== null}
                onClick={approveAll}
              >
                <IconCheck className="h-3.5 w-3.5" />
                Yes, delete {openRows.length} event{openRows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[90]">
          <div className="bg-foreground text-white text-sm font-medium px-4 py-2.5 rounded-[10px] shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
