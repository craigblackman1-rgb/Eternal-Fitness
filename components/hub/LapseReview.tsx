"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface FlaggedSession {
  id: string;
  sessionNumber: number;
  scheduledAt: string | null;
  blockNumber: number;
  workoutLabel: string | null;
}

interface FlaggedClient {
  clientId: string;
  clientName: string;
  sessions: FlaggedSession[];
}

interface LapseReviewProps {
  clients: FlaggedClient[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * CR-EF-099 — Lapse review screen.
 * Esther reviews each flagged session: did it happen or not?
 * "Happened" clears the flag. "Did not happen" cancels it
 * and hands off to the existing charged/free decision flow.
 */
export function LapseReview({ clients: initialClients }: LapseReviewProps) {
  const router = useRouter();
  const [clientStates, setClientStates] = useState<Record<string, FlaggedClient>>(
    () => Object.fromEntries(initialClients.map((c) => [c.clientId, c])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleResolve = useCallback(async (clientId: string, session: FlaggedSession, happened: boolean) => {
    setSavingId(session.id);
    try {
      const body = happened
        ? { lapse_flagged_at: null }
        : {
            cancelled_at: new Date().toISOString(),
            cancel_reason: "Lapsed — flagged by cron, confirmed not happened by Esther",
            lapse_flagged_at: null,
          };

      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save" }));
        toast.error(err.error || "Failed to save");
        return;
      }

      setClientStates((prev) => {
        const client = prev[clientId];
        if (!client) return prev;

        const updatedSessions = client.sessions.filter((s) => s.id !== session.id);
        if (updatedSessions.length === 0) {
          const next = { ...prev };
          delete next[clientId];
          return next;
        }
        return {
          ...prev,
          [clientId]: { ...client, sessions: updatedSessions },
        };
      });

      toast.success(
        happened
          ? "Marked as happened — session stays scheduled"
          : "Cancelled — now in the cancellation review queue for a charged / free decision",
      );
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }, [router]);

  const remainingClients = Object.values(clientStates);

  if (remainingClients.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-10 text-center">
        <p className="text-sm text-muted-foreground">All flagged sessions have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {remainingClients.map((client) => (
        <div key={client.clientId} className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] overflow-hidden">
          {/* Client header */}
          <div className="px-5 py-4 border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose/15 text-rose flex items-center justify-center text-xs font-bold shrink-0">
                {client.clientName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">{client.clientName}</h2>
                <p className="text-xs text-muted-foreground">
                  {client.sessions.length} flagged session{client.sessions.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {/* Session rows */}
          <div className="divide-y divide-[var(--hub-border)]">
            {client.sessions.map((session) => {
              const isSaving = savingId === session.id;

              return (
                <div key={session.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {/* Session info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          Session {session.sessionNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Block {session.blockNumber}
                        </span>
                        {session.scheduledAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}
                          </span>
                        )}
                      </div>
                      {session.workoutLabel && (
                        <p className="text-xs text-muted-foreground">
                          {session.workoutLabel}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleResolve(client.clientId, session, true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-[var(--status-success)] hover:bg-[var(--status-success)]/90 text-white ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {isSaving ? "Saving\u2026" : "It happened"}
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleResolve(client.clientId, session, false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-[var(--status-danger)] hover:bg-[var(--status-danger)]/90 text-white ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {isSaving ? "Saving\u2026" : "Did not happen"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
