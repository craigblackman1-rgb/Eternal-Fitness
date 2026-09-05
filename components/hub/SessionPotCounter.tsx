"use client";

import { HubCard } from "@/components/hub";
import type { SessionPotBreakdown } from "@/lib/session-pot";

interface SessionPotCounterProps {
  pot: SessionPotBreakdown;
  blockExpiryDate: string | null;
  /** Whether the expiry has been extended from the original. */
  extended: boolean;
  /** Original expiry before extension (null if never extended). */
  originalExpiry: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * CR-EF-099 — Compact session pot strip.
 * Shows remaining / used / purchased with a breakdown bar and expiry info.
 * Replaces the manual "Session X of Y" display.
 */
export function SessionPotCounter({ pot, blockExpiryDate, extended, originalExpiry }: SessionPotCounterProps) {
  const { completed, chargedCancellations, freeCancellations, unreviewedCancellations, used, purchased, remaining, unreviewed } = pot;
  const total = purchased || 1; // avoid division by zero

  const days = blockExpiryDate ? daysUntil(blockExpiryDate) : null;
  const expiryStatus: "past" | "today" | "future" | null = days === null ? null : days < 0 ? "past" : days === 0 ? "today" : "future";

  const segments = [
    { label: "Completed", count: completed, color: "#087E8B" },
    { label: "Charged cancellation", count: chargedCancellations, color: "#8A4E63" },
    { label: "Free to book", count: Math.max(0, remaining), color: "#E4E7EC" },
  ].filter((s) => s.count > 0);

  return (
    <HubCard className="!p-0 overflow-hidden">
      <div className="flex items-center gap-6 px-5 py-4 flex-wrap">
        {/* Hero: remaining */}
        <div className="flex items-baseline gap-2.5 shrink-0">
          <span className="text-[38px] font-extrabold tracking-tight leading-none text-foreground tabular-nums">
            {remaining}
          </span>
          <span className="text-[11.5px] font-bold text-muted-foreground leading-tight max-w-[74px]">
            {expiryStatus === "past"
              ? `${remaining} session${remaining === 1 ? "" : "s"} unused at expiry`
              : "sessions remaining"}
          </span>
        </div>

        {/* Unreviewed cancellations qualifier */}
        {unreviewed > 0 && (
          <div className="shrink-0 px-3 py-1.5 rounded-lg bg-amber/10 border border-amber/20 text-xs font-bold text-foreground flex items-center gap-1.5 tabular-nums">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width={14} height={14} className="text-amber shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {unreviewed} cancellation{unreviewed === 1 ? "" : "s"} unreviewed
            <a
              href="/hub/sessions/review"
              className="ml-1 underline decoration-amber/40 hover:decoration-amber text-foreground"
            >
              Review
            </a>
          </div>
        )}

        {/* Figures */}
        <div className="flex gap-5.5 pl-5.5 border-l border-[var(--hub-border)] shrink-0">
          <div>
            <div className="text-base font-bold text-foreground leading-tight tabular-nums">{used}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Used</div>
          </div>
          <div>
            <div className="text-base font-bold text-foreground leading-tight tabular-nums">{purchased}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Purchased</div>
          </div>
        </div>

        {/* Bar */}
        <div className="flex-1 min-w-[220px]">
          <div className="flex h-3 rounded-pill overflow-hidden bg-[var(--hub-hover)] border border-[var(--hub-border)]" role="img" aria-label="Session pot breakdown">
            {segments.map((seg) => (
              <span
                key={seg.label}
                className="h-full first:rounded-l-pill last:rounded-r-pill"
                style={{
                  width: `${(seg.count / total) * 100}%`,
                  backgroundColor: seg.color,
                  borderRight: "1.5px solid var(--hub-card)",
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {segments.map((seg) => (
              <span key={seg.label} className="flex items-center gap-1.5 text-xs text-body">
                <span className="w-2.5 h-2.5 rounded-control shrink-0" style={{ backgroundColor: seg.color }} />
                {seg.label} <b className="text-foreground font-bold tabular-nums">{seg.count}</b>
              </span>
            ))}
          </div>
        </div>

        {/* Expiry */}
        {blockExpiryDate && (
          <div className="shrink-0 pl-5.5 border-l border-[var(--hub-border)]">
            <div className="text-sm font-bold text-foreground">
              Expires {formatDate(blockExpiryDate)}
            </div>
            <div className="text-[11.5px] text-muted-foreground">
              {expiryStatus === "past" && (
                <>
                  Expired {Math.abs(days!)} day{Math.abs(days!) === 1 ? "" : "s"} ago
                  {" · "}
                  Your sessions are still yours — booking is paused, not closed
                </>
              )}
              {expiryStatus === "today" && (
                <>Expires today</>
              )}
              {expiryStatus === "future" && (
                <>{days} day{days === 1 ? "" : "s"} left</>
              )}
              {extended && (
                <span className="ml-1.5 inline-flex items-center rounded-pill bg-amber/10 text-[var(--color-amber-text)] border border-amber/20 px-1.5 py-0 text-[10px] font-bold">
                  Extended
                </span>
              )}
              {!extended && " · not extended"}
            </div>
          </div>
        )}
      </div>
    </HubCard>
  );
}
