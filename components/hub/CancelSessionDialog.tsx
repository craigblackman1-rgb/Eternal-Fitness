"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deriveSessionPot } from "@/lib/session-pot";
import { sessionWorkoutName } from "@/lib/session-display";
import type { DBSession, ChargedFree } from "@/types";

interface CancelSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: DBSession;
  clientName: string;
  sessionsPurchased: number | null;
  /** All sessions in the block — needed to re-derive the pot. */
  allSessions: Pick<DBSession, "status" | "charged_free" | "cancelled_at" | "parent_session_id">[];
  /** CR-EF-101 — number of sub-sessions linked to this parent. */
  childCount?: number;
}

/**
 * CR-EF-099 — Cancellation dialog with consequence preview.
 * Esther marks charged or free, and the consequence is visible before she confirms:
 * "this will use one of Sarah's remaining 4 sessions" vs
 * "this will not consume a session".
 */
export function CancelSessionDialog({
  open,
  onOpenChange,
  session,
  clientName,
  sessionsPurchased,
  allSessions,
  childCount = 0,
}: CancelSessionDialogProps) {
  const router = useRouter();
  const [chargedFree, setChargedFree] = useState<ChargedFree | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const pot = deriveSessionPot(allSessions, sessionsPurchased);

  const handleConfirm = useCallback(async () => {
    if (!chargedFree) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason.trim() || null,
          charged_free: chargedFree,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to cancel" }));
        toast.error(err.error || "Failed to cancel session");
        return;
      }
      toast.success(
        chargedFree === "charged"
          ? `Cancelled and charged — ${clientName} now has ${pot.purchasedIsEstimate ? pot.estimatedRemaining - 1 : pot.remaining != null ? pot.remaining - 1 : "?"} sessions remaining`
          : `Cancelled free of charge — ${clientName} still has ${pot.purchasedIsEstimate ? pot.estimatedRemaining : pot.remaining ?? "?"} sessions remaining`,
      );
      onOpenChange(false);
      setChargedFree(null);
      setReason("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [chargedFree, reason, session.id, clientName, pot.remaining, onOpenChange, router]);

  const handleClose = () => {
    onOpenChange(false);
    setChargedFree(null);
    setReason("");
  };

  if (!open) return null;

  const afterCharged = pot.remaining != null ? pot.remaining - 1 : null;
  const sessionLabel = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : sessionWorkoutName(session, `Session ${session.session_number}`);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-navy/42 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-[560px] mx-4 bg-[var(--hub-canvas)] shadow-2xl flex flex-col max-h-[calc(100vh-48px)]" style={{ borderRadius: "var(--r-surface)" }}>
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 bg-[var(--hub-card)] border-b border-[var(--hub-border)]" style={{ borderRadius: "var(--r-surface) var(--r-surface) 0 0" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[var(--status-danger-bg)] text-[var(--status-danger)] shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width={18} height={18}>
              <circle cx="12" cy="12" r="9" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground tracking-tight">Cancel session</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {clientName} · {sessionLabel}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)] shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={16} height={16}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">How is this cancellation treated?</p>

          {/* CR-EF-101 — sub-session cascade warning */}
          {childCount > 0 && (
            <div className="rounded-lg p-3 border bg-amber/5 border-amber/20 text-xs text-foreground flex items-start gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width={14} height={14} className="shrink-0 mt-0.5 text-amber">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>
                This slot has {childCount} supplementary work item{childCount === 1 ? "" : "s"} attached. Cancelling the parent will also cancel {childCount === 1 ? "it" : "them"}.
              </span>
            </div>
          )}

          {/* Option: Charged */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
              chargedFree === "charged"
                ? "border-rose bg-rose/5"
                : "border-[var(--hub-border)] bg-[var(--hub-card)] hover:border-[var(--hub-field-hover)]"
            }`}
          >
            <input
              type="radio"
              name="cancelKind"
              checked={chargedFree === "charged"}
              onChange={() => setChargedFree("charged")}
              className="mt-0.5 accent-rose w-4 h-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="text-[13.5px] font-bold text-foreground flex items-center gap-2 flex-wrap">
                Charged — late notice
                <span className="inline-flex items-center rounded-full px-2 py-0 text-[10.5px] font-extrabold uppercase tracking-wider bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger-bd)]">
                  Uses a session
                </span>
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Cancelled inside 24 hours, or the client did not turn up.
              </span>
            </span>
          </label>

          {/* Option: Free */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
              chargedFree === "free"
                ? "border-rose bg-rose/5"
                : "border-[var(--hub-border)] bg-[var(--hub-card)] hover:border-[var(--hub-field-hover)]"
            }`}
          >
            <input
              type="radio"
              name="cancelKind"
              checked={chargedFree === "free"}
              onChange={() => setChargedFree("free")}
              className="mt-0.5 accent-rose w-4 h-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="text-[13.5px] font-bold text-foreground flex items-center gap-2 flex-wrap">
                Free — enough notice
                <span className="inline-flex items-center rounded-full px-2 py-0 text-[10.5px] font-extrabold uppercase tracking-wider bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
                  No session used
                </span>
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                24 hours&apos; notice or more. The slot goes back on the calendar.
              </span>
            </span>
          </label>

          {/* Consequence preview */}
          {chargedFree && (
            <div
              className={`rounded-xl p-4 border flex gap-3 ${
                chargedFree === "charged"
                  ? "bg-[var(--status-danger-bg)] border-[var(--status-danger-bd)]"
                   : "bg-[var(--status-success-bg)] border-[var(--status-success-border)]"
              }`}
            >
              <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 bg-white/72 ${
                chargedFree === "charged" ? "text-[var(--status-danger)]" : "text-[var(--status-success)]"
              }`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width={16} height={16}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-foreground leading-snug">
                  {chargedFree === "charged" ? (
                    <>
                      This <em className="font-extrabold not-italic text-[var(--status-danger)]">will use one</em> of {clientName}&apos;s {pot.purchasedIsEstimate ? pot.estimatedRemaining : pot.remaining ?? "?"} remaining sessions{pot.purchasedIsEstimate ? " (est.)" : ""}.
                    </>
                  ) : (
                    <>
                      This <em className="font-extrabold not-italic text-[var(--status-success)]">will not consume a session</em>.
                    </>
                  )}
                </p>
                <p className="text-xs text-body mt-1">
                  {chargedFree === "charged" ? (
                    <>
                      {clientName} would be left with {afterCharged != null ? afterCharged : "?"} session{afterCharged === 1 ? "" : "s"}{pot.purchasedIsEstimate && afterCharged != null ? " (est.)" : ""}.
                    </>
                  ) : (
                    <>
                      {clientName} keeps all {pot.purchasedIsEstimate ? pot.estimatedRemaining : pot.remaining ?? "?"} remaining sessions. The slot is released back to the calendar.
                    </>
                  )}
                </p>
                <div className="inline-flex items-center gap-2 mt-2.5 text-xs font-bold text-body bg-white/80 border border-[var(--hub-border)] rounded-full px-3 py-0.5 tabular-nums">
                  <span>{pot.purchasedIsEstimate ? pot.estimatedRemaining : pot.remaining ?? "?"}{pot.purchasedIsEstimate ? " (est.)" : ""} remaining</span>
                  <span className="text-muted-foreground font-semibold">&rarr;</span>
                  <span className="text-foreground">{chargedFree === "charged" ? (afterCharged != null ? afterCharged : "?") : (pot.purchasedIsEstimate ? pot.estimatedRemaining : pot.remaining ?? "?")}{chargedFree === "charged" && pot.purchasedIsEstimate && afterCharged != null ? " (est.)" : ""} remaining</span>
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Reason <span className="font-medium normal-case tracking-normal">— optional, shows on the client&apos;s record</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. away for a week, work clash, unwell…"
              className="w-full border border-[var(--hub-field-border)] rounded-lg px-3 py-2.5 text-sm font-[inherit] bg-[var(--hub-card)] text-foreground resize-y min-h-[70px] leading-relaxed focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 px-6 py-3.5 bg-[var(--hub-card)] border-t border-[var(--hub-border)]" style={{ borderRadius: "0 0 var(--r-surface) var(--r-surface)" }}>
          <span className="flex-1" />
          <Button variant="ghost" onClick={handleClose} className="rounded-lg">
            Keep session
          </Button>
          <Button
            variant={chargedFree === "charged" ? "destructive" : "default"}
            disabled={!chargedFree || saving}
            onClick={handleConfirm}
            className={`rounded-lg gap-1.5 ${
              chargedFree === "charged"
                ? "bg-[var(--status-danger)] hover:bg-[var(--status-danger)]/90 text-white"
                : "bg-rose hover:bg-rose/90 text-white"
            }`}
          >
            {saving ? "Saving…" : chargedFree === "charged" ? "Cancel and charge" : "Cancel free of charge"}
          </Button>
        </div>
      </div>
    </div>
  );
}
