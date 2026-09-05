"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { HubCard, HubAlert, EmptyState } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { IconCalendar, IconCheck, IconCheckCircle, IconX, IconAlertTriangle, IconClock, IconPlus, IconRefreshCw, IconTrash2 } from "@/components/icons";

interface PendingAction {
  id: string;
  action: string;
  session_id: string;
  event_id: string | null;
  calendar_id: string;
  event_input: { subject: string; bodyHtml: string; startUtc: string; endUtc: string } | null;
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

function actionLabel(action: string) {
  switch (action) {
    case "create": return "Create event";
    case "update": return "Update event";
    case "delete": return "Delete event";
    default: return action;
  }
}

function actionIcon(action: string) {
  switch (action) {
    case "create": return <IconPlus className="h-[17px] w-[17px]" />;
    case "update": return <IconRefreshCw className="h-[17px] w-[17px]" />;
    case "delete": return <IconTrash2 className="h-[17px] w-[17px]" />;
    default: return <IconCalendar className="h-[17px] w-[17px]" />;
  }
}

function actionColorClasses(action: string) {
  switch (action) {
    case "create":
      return {
        bg: "bg-[var(--status-success-bg)]",
        border: "border-[var(--status-success-border)]",
        text: "text-[var(--status-success-text)]",
      };
    case "update":
      return {
        bg: "bg-[var(--status-info-bg)]",
        border: "border-[var(--status-info-border)]",
        text: "text-[var(--status-info)]",
      };
    case "delete":
      return {
        bg: "bg-[var(--status-danger-bg)]",
        border: "border-[var(--status-danger-border)]",
        text: "text-[var(--status-danger)]",
      };
    default:
      return {
        bg: "bg-[var(--status-neutral-bg)]",
        border: "border-[var(--hub-border)]",
        text: "text-muted-foreground",
      };
  }
}

function actionApproveLabel(action: string) {
  switch (action) {
    case "create": return "Approve — create event";
    case "update": return "Approve — update event";
    case "delete": return "Approve — delete event";
    default: return "Approve";
  }
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
        setToast(`Approved — ${actionLabel(row?.action ?? "").toLowerCase()} for ${row?.client_name ?? "client"}`);
      } else {
        setToast(`Rejected — ${actionLabel(row?.action ?? "").toLowerCase()} for ${row?.client_name ?? "client"} dropped`);
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
      setToast(`Approved all — ${n} action${n === 1 ? "" : "s"} processed`);
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
          <li>When <strong>confirm-before-sync</strong> is enabled, every calendar change (create, update, delete) queues here instead of syncing automatically.</li>
          <li><strong>Approve</strong> — executes the pending Outlook change. Creates and updates push the event to Outlook; deletes remove it permanently.</li>
          <li><strong>Reject</strong> — drops the pending action. The Outlook calendar stays as-is.</li>
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
            <div className="w-10 h-10 rounded-[11px] grid place-items-center bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <IconCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Creates</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{openRows.filter((r) => r.action === "create").length}</p>
            </div>
          </div>
        </HubCard>
        <HubCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] grid place-items-center bg-[var(--status-info-bg)] text-[var(--status-info)]">
              <IconRefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updates</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{openRows.filter((r) => r.action === "update").length}</p>
            </div>
          </div>
        </HubCard>
      </div>

      {/* Queue card */}
      <HubCard padded={false}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Calendar actions waiting on your review</p>
            <span
              className={
                "inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-semibold " +
                (openRows.length
                  ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger-border)]"
                  : "bg-[var(--status-success-bg)] text-[var(--status-success-text)]")
              }
            >
              {openRows.length} pending
            </span>
          </div>
          {openRows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--status-success-border)] text-[var(--status-success-text)] font-semibold hover:bg-[var(--status-success-bg)]"
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
              description="Every calendar action has been reviewed. When confirm-before-sync is enabled, new changes will queue here automatically."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--hub-border)]">
            {openRows.map((row) => {
              const colors = actionColorClasses(row.action);
              return (
                <li key={row.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-[38px] h-[38px] rounded-nested grid place-items-center shrink-0 ${colors.bg} border ${colors.border} ${colors.text}`}>
                        {actionIcon(row.action)}
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
                      <span className={`inline-flex items-center gap-1.5 rounded-pill border ${colors.border} ${colors.bg} px-2.5 py-0.5 text-xs font-semibold ${colors.text}`}>
                        {actionLabel(row.action)}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">
                        {queuedAgo(row.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Reason panel */}
                  <div className={`mt-3 rounded-surface border ${colors.border} ${colors.bg} px-3.5 py-2.5`}>
                    <p className={`text-[11px] font-bold uppercase tracking-wide ${colors.text} mb-1`}>
                      {row.action === "delete" ? "Outlook event to be deleted" : "Event details"}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-sm">
                      <span className="font-semibold text-foreground">
                        &ldquo;{row.client_name}&rdquo;
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatWhen(row.scheduled_at)}
                      </span>
                      {row.event_input && (
                        <span className="text-xs text-muted-foreground">
                          {row.event_input.subject}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{row.reason}</p>
                  </div>

                  {/* Decision actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="w-full text-xs text-muted-foreground">This action stays queued until you choose.</p>
                    <Button
                      size="sm"
                      className={
                        row.action === "delete"
                          ? "bg-[var(--status-danger)] text-white hover:bg-[var(--status-danger)]/90"
                          : "bg-[var(--status-success)] text-white hover:bg-[var(--status-success)]/90"
                      }
                      disabled={busy !== null}
                      onClick={() => act(row.id, "approve")}
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                      {actionApproveLabel(row.action)}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => act(row.id, "reject")}
                      title="Drops this pending action — nothing changes in Outlook"
                    >
                      <IconX className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--hub-border)]">
          <span className="text-xs text-muted-foreground">
            {openRows.length === 0
              ? "Nothing waiting on you right now"
              : "New calendar actions are added automatically when confirm-before-sync is enabled"}
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
          <div className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-surface shadow-2xl w-full max-w-[460px] flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--hub-border)]">
              <h2 id="confirm-title" className="flex-1 text-[15px] font-bold text-foreground">Approve all pending actions?</h2>
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
                <div className="w-9 h-9 rounded-nested grid place-items-center shrink-0 bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
                  <IconAlertTriangle className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-[13.5px] leading-relaxed text-body">
                    This will process <strong>{openRows.length}</strong> pending calendar action{openRows.length === 1 ? "" : "s"}.
                    {openRows.some((r) => r.action === "delete") && " Delete actions permanently remove Outlook events and can't be undone."}
                  </p>
                  <ul className="mt-2 pl-4 text-xs text-muted-foreground max-h-[130px] overflow-y-auto list-disc space-y-0.5">
                    {openRows.map((r) => (
                      <li key={r.id}>
                        {actionLabel(r.action)} — {r.client_name} · {formatWhen(r.scheduled_at)}
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
                className="bg-[var(--status-success)] text-white hover:bg-[var(--status-success)]/90"
                disabled={busy !== null}
                onClick={approveAll}
              >
                <IconCheck className="h-3.5 w-3.5" />
                Yes, approve {openRows.length} action{openRows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[90]">
          <div className="bg-foreground text-white text-sm font-medium px-4 py-2.5 rounded-nested shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
