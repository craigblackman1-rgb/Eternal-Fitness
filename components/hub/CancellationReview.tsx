"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deriveSessionPot } from "@/lib/session-pot";
import type { DBSession, ChargedFree } from "@/types";

type SessionPotBreakdown = ReturnType<typeof deriveSessionPot>;

interface ReviewSession {
  id: string;
  sessionNumber: number;
  scheduledAt: string | null;
  cancelReason: string | null;
  blockNumber: number;
  focusLabel: string;
}

interface ReviewClient {
  clientId: string;
  clientName: string;
  sessionsPurchased: number | null;
  pot: SessionPotBreakdown;
  sessions: ReviewSession[];
}

interface CancellationReviewProps {
  clients: ReviewClient[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * CR-EF-099 — Cancellation review screen.
 * Esther reviews each unreviewed cancellation case by case,
 * marking charged or free. Decisions are individually reversible.
 */
export function CancellationReview({ clients: initialClients }: CancellationReviewProps) {
  const router = useRouter();
  const [clientStates, setClientStates] = useState<Record<string, ReviewClient>>(
    () => Object.fromEntries(initialClients.map((c) => [c.clientId, c])),
  );
  const [decisions, setDecisions] = useState<Record<string, ChargedFree>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleDecision = useCallback((sessionId: string, chargedFree: ChargedFree) => {
    setDecisions((prev) => ({ ...prev, [sessionId]: chargedFree }));
  }, []);

  const handleSave = useCallback(async (clientId: string, session: ReviewSession) => {
    const chargedFree = decisions[session.id];
    if (!chargedFree) return;

    setSavingId(session.id);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charged_free: chargedFree }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save" }));
        toast.error(err.error || "Failed to save decision");
        return;
      }

      // Update local state: remove session from unreviewed, recompute pot
      setClientStates((prev) => {
        const client = prev[clientId];
        if (!client) return prev;

        const updatedSessions = client.sessions.filter((s) => s.id !== session.id);
        if (updatedSessions.length === 0) {
          const next = { ...prev };
          delete next[clientId];
          return next;
        }

        // Recompute pot with the new charged_free value
        const updatedAllSessions = [
          ...client.pot.completed ? Array(client.pot.completed).fill({ status: "completed" }) : [],
          ...Array(client.pot.chargedCancellations + (chargedFree === "charged" ? 1 : 0)).fill({ status: "cancelled", charged_free: "charged" }),
          ...Array(client.pot.freeCancellations + (chargedFree === "free" ? 1 : 0)).fill({ status: "cancelled", charged_free: "free" }),
          ...Array(client.pot.unreviewedCancellations - 1).fill({ status: "cancelled", charged_free: null }),
        ];
        const newPot = deriveSessionPot(updatedAllSessions, client.sessionsPurchased);

        return {
          ...prev,
          [clientId]: { ...client, sessions: updatedSessions, pot: newPot },
        };
      });

      setDecisions((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });

      toast.success(
        chargedFree === "charged"
          ? `Charged — session counted against the pot`
          : `Free — session does not count`,
      );
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }, [decisions, router]);

  const handleRevert = useCallback(async (clientId: string, session: ReviewSession) => {
    setSavingId(session.id);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charged_free: null }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to revert" }));
        toast.error(err.error || "Failed to revert decision");
        return;
      }

      setClientStates((prev) => {
        const client = prev[clientId];
        if (!client) return prev;

        // Recompute pot with one fewer charged/free cancellation
        const updatedAllSessions = [
          ...Array(client.pot.completed).fill({ status: "completed" }),
          ...Array(Math.max(0, client.pot.chargedCancellations - 1)).fill({ status: "cancelled", charged_free: "charged" }),
          ...Array(client.pot.freeCancellations).fill({ status: "cancelled", charged_free: "free" }),
          ...Array(client.pot.unreviewedCancellations + 1).fill({ status: "cancelled", charged_free: null }),
        ];
        const newPot = deriveSessionPot(updatedAllSessions, client.sessionsPurchased);

        return {
          ...prev,
          [clientId]: { ...client, pot: newPot },
        };
      });

      toast.success("Decision reverted — session is unreviewed again");
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }, [router]);

  const remainingClients = Object.values(clientStates);

  if (remainingClients.length === 0) {
    return (
      <div className="rounded-surface border border-[var(--hub-border)] bg-[var(--hub-card)] p-10 text-center">
        <p className="text-sm text-muted-foreground">All cancelled sessions have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {remainingClients.map((client) => {
        const remainingAfterCharged = (client.pot.remaining ?? (client.pot.purchasedIsEstimate ? client.pot.estimatedRemaining : null)) != null
          ? Math.max((client.pot.remaining ?? client.pot.estimatedRemaining) - 1, 0)
          : null;

        return (
          <div key={client.clientId} className="rounded-surface border border-[var(--hub-border)] bg-[var(--hub-card)] overflow-hidden">
            {/* Client header */}
            <div className="px-5 py-4 border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-pill bg-rose/15 text-rose flex items-center justify-center text-xs font-bold shrink-0">
                    {client.clientName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{client.clientName}</h2>
                    <p className="text-xs text-muted-foreground">
                      {client.sessions.length} unreviewed cancellation{client.sessions.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground tabular-nums">
                    {client.pot.purchasedIsEstimate ? client.pot.estimatedRemaining : client.pot.remaining ?? "?"}
                    {client.pot.purchasedIsEstimate && <span className="text-muted-foreground font-semibold ml-1">(est.)</span>}
                    {" remaining"}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    of {client.pot.purchasedIsEstimate ? client.pot.estimatedPurchase : client.pot.purchased ?? "?"} purchased
                    {client.pot.purchasedIsEstimate && " (est.)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Session rows */}
            <div className="divide-y divide-[var(--hub-border)]">
              {client.sessions.map((session) => {
                const currentDecision = decisions[session.id];
                const isSaving = savingId === session.id;

                return (
                  <div key={session.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      {/* Session info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {session.focusLabel || `Session ${session.sessionNumber}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Block {session.blockNumber} · Session {session.sessionNumber}
                          </span>
                          {session.scheduledAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(session.scheduledAt)}
                            </span>
                          )}
                        </div>
                        {session.cancelReason && (
                          <p className="text-xs text-muted-foreground italic max-w-lg">
                            &ldquo;{session.cancelReason}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Decision control */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex rounded-lg border border-[var(--hub-border)] overflow-hidden">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleDecision(session.id, "charged")}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                              currentDecision === "charged"
                                ? "bg-[var(--status-danger)] text-white"
                                : "bg-[var(--hub-card)] text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)]"
                            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            Charged
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleDecision(session.id, "free")}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors border-l border-[var(--hub-border)] ${
                              currentDecision === "free"
                                ? "bg-[var(--status-success)] text-white"
                                : "bg-[var(--hub-card)] text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)]"
                            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            Free
                          </button>
                        </div>

                        {currentDecision && (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSave(client.clientId, session)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              currentDecision === "charged"
                                ? "bg-[var(--status-danger)] hover:bg-[var(--status-danger)]/90 text-white"
                                : "bg-[var(--status-success)] hover:bg-[var(--status-success)]/90 text-white"
                            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {isSaving ? "Saving…" : "Save"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Consequence preview */}
                    {currentDecision && (
                      <div className={`mt-2.5 rounded-lg p-2.5 border text-xs ${
                        currentDecision === "charged"
                          ? "bg-[var(--status-danger-bg)] border-[var(--status-danger-bd)] text-[var(--status-danger)]"
                           : "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success-text)]"
                      }`}>
                        {currentDecision === "charged" ? (
                          <span>
                            Counts as used &mdash; {client.clientName} drops from {(client.pot.remaining ?? (client.pot.purchasedIsEstimate ? client.pot.estimatedRemaining : null)) ?? "?"} to{" "}
                            <strong>{remainingAfterCharged ?? "?"}</strong> remaining{client.pot.purchasedIsEstimate ? " (est.)" : ""}.
                          </span>
                        ) : (
                          <span>
                            Does not count &mdash; {client.clientName} keeps all{" "}
                            <strong>{(client.pot.remaining ?? (client.pot.purchasedIsEstimate ? client.pot.estimatedRemaining : null)) ?? "?"}</strong> remaining sessions{client.pot.purchasedIsEstimate ? " (est.)" : ""}.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
