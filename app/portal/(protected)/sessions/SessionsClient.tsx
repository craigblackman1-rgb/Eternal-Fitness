"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { SessionPotBreakdown } from "@/lib/session-pot";

// ─── Types ──────────────────────────────────────────────────────────────

interface UpcomingSession {
  id: string;
  scheduledAt: string;
  sessionNumber: number;
  chronologicalPosition: { position: number; total: number } | null;
  status: string;
}

interface PastSession {
  id: string;
  scheduledAt: string | null;
  sessionNumber: number;
  chronologicalPosition: { position: number; total: number } | null;
  status: string;
  chargedFree: "charged" | "free" | null;
  completedAt: string | null;
  cancelledAt: string | null;
  focusLabel: string;
}

interface SessionsClientProps {
  clientName: string;
  pot: SessionPotBreakdown;
  blockNumber: number;
  blockFocusLabel: string | null;
  blockExpiry: string | null;
  blockExpiryExtensions: { from: string; to: string; at: string; reason?: string }[];
  upcoming: UpcomingSession[];
  past: PastSession[];
  noticeHours: number;
  sessionLength: number;
  sessionsPurchased: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}, ${time}`;
}

function fmtWhenShort(iso: string): string {
  const d = new Date(iso);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}, ${time}`;
}

function fmtDur(hours: number): string {
  if (hours >= 48) return `${Math.round(hours / 24)} days`;
  if (hours >= 24) return "just over a day";
  if (hours <= 1) return "under an hour";
  return `${hours} hours`;
}

function noticeStatus(scheduledAt: string, noticeHours: number) {
  const now = new Date();
  const start = new Date(scheduledAt);
  const closes = new Date(start.getTime() - noticeHours * 3600e3);
  const msToClose = closes.getTime() - now.getTime();
  const hoursToClose = Math.floor(msToClose / 3600e3);
  const hoursToStart = Math.floor((start.getTime() - now.getTime()) / 3600e3);

  return {
    inside: msToClose <= 0,
    closes,
    hoursToClose,
    hoursToStart,
  };
}

function calendarDate(iso: string) {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { month: months[d.getMonth()], day: d.getDate() };
}

// ─── SVG icons ──────────────────────────────────────────────────────────

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const IconWarn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
);

// ─── Component ──────────────────────────────────────────────────────────

export function SessionsClient({
  clientName,
  pot,
  blockNumber,
  blockFocusLabel,
  blockExpiry,
  blockExpiryExtensions,
  upcoming,
  past,
  noticeHours,
  sessionLength,
  sessionsPurchased,
}: SessionsClientProps) {
  const [showBanner, setShowBanner] = useState(true);
  const [cancelSession, setCancelSession] = useState<UpcomingSession | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const expiryDate = blockExpiry ? new Date(blockExpiry) : null;
  const expiryLabel = expiryDate
    ? `Sat ${expiryDate.getDate()} ${expiryDate.toLocaleDateString("en-GB", { month: "long" })} ${expiryDate.getFullYear()}`
    : null;
  const lastExt = blockExpiryExtensions.length > 0 ? blockExpiryExtensions[blockExpiryExtensions.length - 1] : null;

  const handleCancel = useCallback(async () => {
    if (!cancelSession) return;
    const nt = noticeStatus(cancelSession.scheduledAt, noticeHours);
    try {
      const res = await fetch(`/api/sessions/${cancelSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancelled_at: new Date().toISOString(),
          charged_free: nt.inside ? "charged" : "free",
        }),
      });
      if (!res.ok) throw new Error("Cancel failed");
      setToast(nt.inside
        ? `Session cancelled. It came out of your block — ${pot.remaining - 1} left. Esther has been told.`
        : `Session cancelled and returned to your block — still ${pot.remaining} left.`);
      setCancelSession(null);
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  }, [cancelSession, noticeHours, pot.remaining]);

  return (
    <div className="space-y-5">
      {/* ── Confirmation banner ── */}
      {showBanner && (
        <div className="relative flex gap-3.5 items-start bg-white rounded-2xl border border-[rgba(8,126,139,.22)] shadow-sm p-4 pl-5 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-[var(--color-teal)]" />
          <div className="w-[38px] h-[38px] rounded-full bg-[rgba(8,126,139,.10)] text-[var(--color-teal)] grid place-items-center shrink-0 ml-1.5">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <b className="block text-[15.5px] font-bold text-foreground">Session booked</b>
            <p className="text-[13.5px] leading-relaxed mt-0.5">
              <b className="text-foreground">Check your sessions list below</b> — a confirmation is in your
              inbox, and a reminder follows the day before.
            </p>
            <div className="flex flex-wrap gap-2 mt-2.5">
              <button type="button" className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-white px-3 py-1 text-[13px] font-semibold hover:bg-[var(--hover)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" /></svg>
                Add to calendar
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1 text-[13px] font-semibold text-body hover:bg-[var(--hover)]">
                How cancelling works
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="shrink-0 w-[34px] h-[34px] rounded-[9px] border border-border bg-white grid place-items-center text-muted-foreground hover:bg-[var(--hover)]"
            aria-label="Dismiss"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Your sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything booked from your current block. You can move or cancel any of them from here —
          you will always be told what it costs you before anything is changed.
        </p>
      </div>

      {/* ── Pot strip ── */}
      <section className="flex flex-wrap items-center gap-4 lg:gap-6 bg-white border border-border rounded-2xl shadow-sm p-4">
        <div className="flex items-baseline gap-2.5 shrink-0">
          <span className="text-4xl font-bold tracking-[-.03em] text-foreground tabular-nums" style={{ fontFamily: "var(--serif, Georgia)" }}>
            {pot.remaining}
          </span>
          <span className="text-[13px] font-semibold text-body">
            sessions left<br />
            of your <b className="text-foreground">{pot.purchased}-session block</b>
          </span>
        </div>
        <div className="flex gap-1 flex-1 min-w-[160px]">
          {Array.from({ length: pot.purchased }, (_, i) => (
            <i
              key={i}
              className={cn(
                "h-4 flex-1 rounded",
                i < pot.completed ? "bg-[#CFD3DA]" : i < pot.used ? "bg-[var(--color-rose)]" : "bg-white border-[1.5px] border-[var(--color-rose)]"
              )}
            />
          ))}
        </div>
        <div className="text-[12.5px] leading-relaxed text-muted-foreground shrink-0">
          Use by <b className="text-foreground">{expiryLabel ?? "—"}</b>
          {lastExt && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[rgba(8,126,139,.10)] text-[var(--color-teal)] border border-[rgba(8,126,139,.22)] ml-2 mt-1">
              Extended by Esther
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="space-y-5">
          {/* ── Upcoming ── */}
          <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 p-5 pb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(193,131,159,.10)] text-[var(--color-rose)]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Coming up</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Times shown UK time. The pill on each row tells you where you stand
                  on notice <em>before</em> you click anything.
                </p>
              </div>
            </div>
            <ul className="list-none m-0 p-0">
              {upcoming.length === 0 ? (
                <li className="p-8 text-center text-sm text-muted-foreground">
                  <b className="block text-foreground text-[15px] mb-1">Nothing booked yet</b>
                  You have {pot.remaining} sessions left in this block.{" "}
                  <a href="/portal/book" className="font-bold text-foreground">Book a time</a>.
                </li>
              ) : (
                upcoming.map((s) => {
                  const nt = noticeStatus(s.scheduledAt, noticeHours);
                  const cal = calendarDate(s.scheduledAt);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5 border-t border-border first:border-t-0">
                      <div className="w-[52px] shrink-0 border border-border rounded-[11px] overflow-hidden text-center">
                        <div className="bg-[var(--color-rose)] text-white text-[9.5px] font-extrabold uppercase tracking-[.07em] py-0.5">{cal.month}</div>
                        <div className="text-xl font-bold text-foreground py-0.5 leading-tight">{cal.day}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15.5px] font-bold text-foreground leading-snug">{fmtWhen(s.scheduledAt)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {sessionLength} minutes · the studio · in {fmtDur(nt.hoursToStart)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {nt.inside ? (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#F7EFDD] text-[#7A5A17] border border-[rgba(176,138,62,.26)]">
                                <IconWarn /> Notice window closed
                              </span>
                              <span className="text-[12px] text-muted-foreground">Cancelling now still uses this session</span>
                            </>
                          ) : nt.hoursToClose <= 24 ? (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[rgba(193,131,159,.10)] text-[#94566F] border border-[rgba(193,131,159,.22)]">
                                <IconClock /> Free to cancel for {fmtDur(nt.hoursToClose)}
                              </span>
                              <span className="text-[12px] text-muted-foreground">Window closes {fmtWhenShort(nt.closes.toISOString())}</span>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[rgba(8,126,139,.10)] text-[var(--color-teal)] border border-[rgba(8,126,139,.22)]">
                                <IconCheck /> Free to cancel
                              </span>
                              <span className="text-[12px] text-muted-foreground">Until {fmtWhenShort(nt.closes.toISOString())}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-auto">
                        <button type="button" className="rounded-[10px] border border-border bg-white px-3 py-1 text-[13px] font-semibold hover:bg-[var(--hover)]">
                          Move
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelSession(s)}
                          className="rounded-[10px] px-3 py-1 text-[13px] font-semibold text-body hover:bg-[var(--hover)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          {/* ── The rule ── */}
          <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden" id="ruleCard">
            <div className="flex items-start gap-3 p-5 pb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(8,126,139,.10)] text-[var(--color-teal)]">
                <IconInfo />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Cancelling, and what it costs you</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Esther asks for <b className="text-foreground">{noticeHours} hours&apos; notice</b>. It is not a penalty — it is
                  the only way a one-to-one slot can be offered to somebody else in time.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="grid gap-3">
                <div className="rounded-[13px] p-4 border border-[rgba(8,126,139,.22)] bg-[rgba(8,126,139,.10)]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-[var(--color-teal)]"><IconCheck /></span>
                    <b className="text-sm text-foreground">More than {noticeHours} hours before — nothing is used</b>
                  </div>
                  <p className="text-[13.5px] leading-relaxed m-0">
                    The session goes straight back into your block and you can rebook it whenever
                    suits. <b className="text-foreground">Your count does not change.</b>
                  </p>
                </div>
                <div className="rounded-[13px] p-4 border border-[rgba(176,138,62,.26)] bg-[#F7EFDD]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-[var(--status-warning)]"><IconWarn /></span>
                    <b className="text-sm text-foreground">Inside {noticeHours} hours — the session is used</b>
                  </div>
                  <p className="text-[13.5px] leading-relaxed m-0 text-[#7A5A17]">
                    The slot cannot realistically be filled, so it still comes out of your block.
                    <b className="text-foreground"> Your count drops by one.</b> You are shown this before you confirm, never after.
                  </p>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed mt-3.5 pt-3.5 border-t border-border">
                <b className="text-foreground">Moving a session follows the same rule.</b> Changing the time more
                than {noticeHours} hours ahead costs nothing; inside {noticeHours} hours it counts as a late cancellation and a
                new booking.
                <br /><br />
                <b className="text-foreground">And if life gets in the way</b> — illness, a treatment date moved, a hospital
                appointment — <b className="text-foreground">message Esther rather than cancelling</b>. She can put a session back by
                hand, and she regularly does. The rule is the default, not the whole story.
              </p>
            </div>
          </section>

          {/* ── Past ── */}
          <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 p-5 pb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--hover)] text-muted-foreground">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Already been</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Including cancellations, and whether each one used a session — the
                  history is never quietly rewritten.
                </p>
              </div>
            </div>
            <ul className="list-none m-0 p-0">
              {past.length === 0 ? (
                <li className="p-6 text-center text-sm text-muted-foreground">No past sessions yet.</li>
              ) : (
                past.map((s) => {
                  const cal = s.scheduledAt ? calendarDate(s.scheduledAt) : null;
                  const isCompleted = s.status === "completed";
                  const isCancelled = !!s.cancelledAt;
                  const badgeClass = isCompleted
                    ? "bg-[#EDEFF2] text-body border-[#DDE1E6]"
                    : s.chargedFree === "charged"
                      ? "bg-[#F7EFDD] text-[#7A5A17] border-[rgba(176,138,62,.26)]"
                      : s.chargedFree === "free"
                        ? "bg-[rgba(8,126,139,.10)] text-[var(--color-teal)] border-[rgba(8,126,139,.22)]"
                        : "bg-[rgba(193,131,159,.10)] text-[#94566F] border-[rgba(193,131,159,.22)]";
                  const badgeLabel = isCompleted
                    ? "Attended"
                    : s.chargedFree === "charged"
                      ? "Session used"
                      : s.chargedFree === "free"
                        ? "Returned to block"
                        : "Put back by Esther";

                  return (
                    <li key={s.id} className={cn("flex flex-wrap items-center gap-3.5 px-5 py-3.5 border-t border-border first:border-t-0", !isCompleted && "opacity-70")}>
                      {cal ? (
                        <div className="w-[52px] shrink-0 border border-border rounded-[11px] overflow-hidden text-center">
                          <div className={cn("text-white text-[9.5px] font-extrabold uppercase tracking-[.07em] py-0.5", isCompleted ? "bg-[#CFD3DA] text-[#5C636C]" : "bg-[#CFD3DA]")}>{cal.month}</div>
                          <div className={cn("text-xl font-bold py-0.5 leading-tight", isCompleted ? "text-foreground" : "text-muted-foreground")}>{cal.day}</div>
                        </div>
                      ) : (
                        <div className="w-[52px] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-[15.5px] font-bold leading-snug", isCompleted ? "text-foreground" : "text-muted-foreground line-through decoration-1")}>
                          {s.scheduledAt ? fmtWhen(s.scheduledAt) : "Unscheduled"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {isCompleted ? `${s.focusLabel || `Session ${s.chronologicalPosition?.position ?? s.sessionNumber}`} · Session ${s.chronologicalPosition?.position ?? s.sessionNumber} of ${s.chronologicalPosition?.total ?? sessionsPurchased ?? "?"} · logged by Esther`
                            : isCancelled
                              ? `Cancelled ${s.chargedFree === "charged" ? "— this used a session" : "— went back into your block"}`
                              : ""}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border", badgeClass)}>
                          {badgeLabel}
                        </span>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5 lg:sticky lg:top-[150px]">
          {/* Message Esther */}
          <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 p-5 pb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(193,131,159,.10)] text-[var(--color-rose)]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.8a2 2 0 0 1 1.7 2Z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Something changed at short notice?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Message Esther before you cancel. A treatment date, a bad flare, a
                  hospital letter — she would rather move the session than see it used.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button type="button" className="w-full min-h-[46px] rounded-[10px] bg-[var(--color-rose)] text-white text-sm font-bold hover:bg-[var(--color-rose-deep)]">
                Message Esther
              </button>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-2.5">
                She usually replies the same day, and always before your next session.
              </p>
            </div>
          </div>

          {/* Block expiry */}
          <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 p-5 pb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(8,126,139,.10)] text-[var(--color-teal)]">
                <IconClock />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Your block&apos;s use-by date</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {expiryLabel ?? "Not set"}
                  {lastExt ? ` — moved from ${lastExt.from} after your treatment break` : ""}.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button type="button" className="w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--hover)]">
                Ask about extending it
              </button>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-2.5">
                Sessions are not lost when the date passes.
                Booking pauses until Esther moves the date, and she extends these routinely.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cancel dialog ── */}
      {cancelSession && (
        <CancelDialog
          session={cancelSession}
          noticeHours={noticeHours}
          sessionLength={sessionLength}
          sessionsRemaining={pot.remaining}
          onClose={() => setCancelSession(null)}
          onConfirm={handleCancel}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className="bg-foreground text-white text-[13.5px] font-semibold px-4 py-3 rounded-[10px] shadow-lg flex items-center gap-2.5 max-w-[380px] leading-relaxed animate-in slide-in-from-bottom-2">
            <svg className="w-4 h-4 shrink-0 text-[var(--color-rose)] mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cancel Dialog ───────────────────────────────────────────────────────

function CancelDialog({
  session,
  noticeHours,
  sessionLength,
  sessionsRemaining,
  onClose,
  onConfirm,
}: {
  session: UpcomingSession;
  noticeHours: number;
  sessionLength: number;
  sessionsRemaining: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const nt = noticeStatus(session.scheduledAt, noticeHours);
  const cal = calendarDate(session.scheduledAt);

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-[70] bg-black/46" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed z-[80] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(540px,calc(100vw-32px))] max-h-[calc(100vh-48px)] overflow-y-auto bg-white rounded-[18px] shadow-[0_24px_70px_rgba(16,24,40,.32)]">
        {/* Header */}
        <div className="px-5 pt-5 pb-3.5 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "var(--serif, Georgia)" }}>Cancel this session?</h2>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            {nt.inside ? "Read the effect on your block before you confirm." : "Nothing changes until you confirm below."}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Session info */}
          <div className="flex items-center gap-3.5 p-3.5 border border-border rounded-[13px] bg-[var(--hover)] mb-4">
            <div className="w-[52px] shrink-0 border border-border rounded-[11px] overflow-hidden text-center">
              <div className="bg-[var(--color-rose)] text-white text-[9.5px] font-extrabold uppercase tracking-[.07em] py-0.5">{cal.month}</div>
              <div className="text-xl font-bold text-foreground py-0.5 leading-tight">{cal.day}</div>
            </div>
            <div>
              <div className="text-[15.5px] font-bold text-foreground">{fmtWhen(session.scheduledAt)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sessionLength} minutes · the studio, Worthing</div>
            </div>
          </div>

          {/* Verdict */}
          <div className={cn(
            "rounded-[14px] p-4 border mb-4",
            nt.inside
              ? "border-[rgba(176,138,62,.26)] bg-[#F7EFDD]"
              : "border-[rgba(8,126,139,.22)] bg-[rgba(8,126,139,.10)]"
          )}>
            <div className="flex items-start gap-2.5 mb-3">
              <span className={nt.inside ? "text-[var(--status-warning)]" : "text-[var(--color-teal)]"}>
                {nt.inside ? <IconWarn /> : <IconCheck />}
              </span>
              <div>
                <div className="text-base font-extrabold text-foreground tracking-tight leading-snug">
                  {nt.inside
                    ? `This is inside the ${noticeHours}-hour notice window`
                    : `You are outside the ${noticeHours}-hour notice window`}
                </div>
                <p className={cn("text-[13.5px] leading-relaxed mt-1", nt.inside && "text-[#7A5A17]")}>
                  {nt.inside
                    ? <>The window closed <b className="text-foreground">{fmtWhenShort(nt.closes.toISOString())}</b>. The slot is now too close to offer to anyone else, so cancelling still uses this session from your block.</>
                    : <>Free to cancel for another <b className="text-foreground">{fmtDur(nt.hoursToClose)}</b>, until <b className="text-foreground">{fmtWhenShort(nt.closes.toISOString())}</b>. The session goes straight back into your block and you can rebook it whenever suits.</>
                  }
                </p>
              </div>
            </div>

            {/* Before/after count */}
            <div className="flex bg-white border border-border rounded-xl overflow-hidden">
              <div className="flex-1 p-3 text-center">
                <div className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Sessions left now</div>
                <div className="text-[30px] font-bold text-foreground leading-tight mt-0.5 tabular-nums">{sessionsRemaining}</div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5">before cancelling</div>
              </div>
              <div className="w-px bg-border" />
              <div className={cn("flex-1 p-3 text-center", nt.inside ? "" : "")}>
                <div className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">After cancelling</div>
                <div className={cn("text-[30px] font-bold leading-tight mt-0.5 tabular-nums flex items-center justify-center gap-1.5", nt.inside ? "text-[var(--status-danger)]" : "text-[var(--color-teal)]")}>
                  {nt.inside ? sessionsRemaining - 1 : sessionsRemaining}
                  {nt.inside && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-6-6 6 6 6-6" /></svg>
                  )}
                </div>
                <div className={cn("text-[11.5px] mt-0.5 font-bold", nt.inside ? "text-[var(--status-danger)]" : "text-[var(--color-teal)]")}>
                  {nt.inside ? "one session used" : "unchanged"}
                </div>
              </div>
            </div>
          </div>

          {/* Escape hatch — only inside window */}
          {nt.inside && (
            <div className="p-3.5 rounded-xl border border-dashed border-[var(--hub-field-border, #AFB5C0)] bg-[var(--hover)] text-[13px] leading-relaxed mb-4">
              <b className="text-foreground">Is this because something changed you could not help?</b>{" "}
              Illness, a treatment date moving, a hospital appointment — Esther would rather hear from you than
              have the session used. She can put it back by hand.
              <button type="button" className="mt-2 w-full rounded-[10px] border border-border bg-white px-3 py-1.5 text-[13px] font-semibold hover:bg-[var(--hover)]">
                Message Esther instead
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-[10px] border border-border bg-white text-foreground text-sm font-bold hover:bg-[var(--hover)]"
            >
              Keep this session
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                "flex-1 min-h-[44px] rounded-[10px] border border-transparent text-sm font-bold text-white",
                nt.inside
                  ? "bg-[var(--status-danger)] hover:bg-[#733F52]"
                  : "bg-[var(--color-rose)] hover:bg-[var(--color-rose-deep)]"
              )}
            >
              {nt.inside ? "Cancel and use the session" : "Cancel and keep the session"}
            </button>
          </div>
          <p className="text-[11.5px] text-muted-foreground leading-relaxed text-center">
            {nt.inside
              ? "Esther is notified either way. If this is illness or a treatment change, message her instead — she can put the session back."
              : "Esther is notified, and the slot is released for somebody else the moment you confirm."}
          </p>
        </div>
      </div>
    </>
  );
}
