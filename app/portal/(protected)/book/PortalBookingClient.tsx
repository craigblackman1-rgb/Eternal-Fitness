"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SessionPotBreakdown } from "@/lib/session-pot";

// ─── Types ──────────────────────────────────────────────────────────────

interface Settings {
  session_length: number;
  gap_after: number;
  notice_hours: number;
  lead_hours: number;
  horizon_weeks: number;
}

interface DerivedSlot {
  startLocal: string;
  endLocal: string;
  date: string;
  dayOfWeek: number;
}

interface DerivedDay {
  date: string;
  dayOfWeek: number;
  dayName: string;
  dayShort: string;
  dayNum: number;
  monthShort: string;
  slots: DerivedSlot[];
  state: "open" | "past" | "full" | "off" | "closed";
  reason?: string;
}

interface WeekData {
  label: string;
  range: string;
  days: DerivedDay[];
}

interface PickedSlot {
  key: string;
  time: string;
  dayShort: string;
  dayNum: number;
  monthShort: string;
  fullDay: string;
  weekIdx: number;
  dayIdx: number;
  endLocal: string;
}

interface PortalBookingClientProps {
  clientName: string;
  pot: SessionPotBreakdown;
  blockExpiry: string | null;
  blockExpiryExtensions: { from: string; to: string; at: string; reason?: string }[];
  sessionsPurchased: number | null;
  settings: Settings | null;
  bookedSlots: string[];
  clientId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmtDateLong(d: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────────────────

export function PortalBookingClient({
  clientName,
  pot,
  blockExpiry,
  blockExpiryExtensions,
  sessionsPurchased,
  settings,
  bookedSlots: initialBooked,
  clientId,
}: PortalBookingClientProps) {
  const sessionLen = settings?.session_length ?? 60;
  const noticeHours = settings?.notice_hours ?? 24;
  const free = pot.remaining;

  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);
  const [picked, setPicked] = useState<PickedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch availability
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const monday = new Date(today);
        const day = monday.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        monday.setDate(monday.getDate() + diff);
        const fromStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;

        const res = await fetch(
          `/api/availability/slots?from=${fromStr}&weeks=8&booked=${encodeURIComponent(JSON.stringify(initialBooked))}`
        );
        if (!res.ok) throw new Error("Failed to load availability");
        const data = await res.json();
        setWeeks(data.weeks ?? []);

        // Auto-select first open day
        if (data.weeks?.length) {
          for (let w = 0; w < data.weeks.length; w++) {
            for (let d = 0; d < data.weeks[w].days.length; d++) {
              if (data.weeks[w].days[d].state === "open" && data.weeks[w].days[d].slots.length > 0) {
                setWeekIdx(w);
                setDayIdx(d);
                setLoading(false);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load availability:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [initialBooked]);

  // Find first open day in current week
  const findFirstOpen = useCallback(
    (w: number) => {
      if (!weeks[w]) return 0;
      for (let d = 0; d < weeks[w].days.length; d++) {
        if (weeks[w].days[d].state === "open" && weeks[w].days[d].slots.length > 0) return d;
      }
      return 0;
    },
    [weeks]
  );

  const setWeek = useCallback(
    (w: number) => {
      setWeekIdx(w);
      setDayIdx(findFirstOpen(w));
    },
    [findFirstOpen]
  );

  const toggleSlot = useCallback(
    (slot: DerivedSlot) => {
      const key = `${weekIdx}|${dayIdx}|${slot.startLocal}`;
      setPicked((prev) => {
        const exists = prev.find((p) => p.key === key);
        if (exists) return prev.filter((p) => p.key !== key);
        if (prev.length >= free) return prev;

        const day = weeks[weekIdx]?.days[dayIdx];
        return [
          ...prev,
          {
            key,
            time: slot.startLocal,
            dayShort: day?.dayShort ?? "",
            dayNum: day?.dayNum ?? 0,
            monthShort: day?.monthShort ?? "",
            fullDay: day ? fmtDateLong(new Date(day.date)) : "",
            weekIdx,
            dayIdx,
            endLocal: slot.endLocal,
          },
        ];
      });
    },
    [weekIdx, dayIdx, weeks, free]
  );

  const removePicked = useCallback((key: string) => {
    setPicked((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const handleBook = useCallback(async () => {
    if (!picked.length) return;
    setBooking(true);
    try {
      const res = await fetch("/api/portal/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          slots: picked.map((p) => ({
            startLocal: p.time,
            date: weeks[p.weekIdx]?.days[p.dayIdx]?.date,
          })),
        }),
      });
      if (!res.ok) throw new Error("Booking failed");
      setPicked([]);
      setToast(`${picked.length} session${picked.length > 1 ? "s" : ""} booked — confirmation sent`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error("Booking failed:", err);
      setToast("Something went wrong — please try again");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setBooking(false);
    }
  }, [picked, weeks, clientId]);

  const currentWeek = weeks[weekIdx];
  const currentDay = currentWeek?.days[dayIdx];
  const capped = picked.length >= free;
  const remainingAfter = free - picked.length;

  // ── Expiry display ──
  const expiryDate = blockExpiry ? new Date(blockExpiry) : null;
  const expiryLabel = expiryDate
    ? expiryDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;
  const lastExt = blockExpiryExtensions.length > 0 ? blockExpiryExtensions[blockExpiryExtensions.length - 1] : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Book your next sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose as many times as you have sessions left. Everything you pick comes straight out of the
          block you have already paid for — there is nothing further to pay here.
        </p>
      </div>

      {/* ── THE POT ── */}
      <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-start gap-5 p-5">
          {/* Figure */}
          <div className="min-w-[184px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-muted-foreground">Sessions left</p>
            <p className="text-5xl font-bold tracking-[-.035em] text-foreground mt-1 tabular-nums" style={{ fontFamily: "var(--serif, Georgia)" }}>
              {pot.remaining}
            </p>
            <p className="text-sm text-body mt-0.5">
              of your <b className="text-foreground">{pot.purchased}-session block</b>
            </p>
          </div>

          {/* Pips */}
          <div className="flex-1 min-w-0 self-center">
            <div className="flex gap-1.5 mb-3" role="img" aria-label={`${pot.completed} sessions used, ${pot.chargedCancellations + pot.freeCancellations} cancellations, ${free} free to book`}>
              {Array.from({ length: pot.purchased }, (_, i) => {
                const cls = i < pot.completed ? "" : i < pot.completed + (pot.chargedCancellations) ? "bg-[var(--color-rose)]" : i < pot.used ? "bg-[var(--color-rose)]" : "bg-white border-2 border-[var(--color-rose)]";
                return <i key={i} className={cn("h-[34px] flex-1 min-w-[9px] rounded-[5px]", cls)} />;
              })}
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-body">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-3 h-3 rounded shrink-0 bg-[#CFD3DA]" />
                {pot.completed} done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-3 h-3 rounded shrink-0 bg-[var(--color-rose)]" />
                {pot.chargedCancellations + (pot.totalInBlock - pot.completed - pot.chargedCancellations - pot.freeCancellations - pot.unreviewedCancellations)} already booked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-3 h-3 rounded shrink-0 bg-white border-2 border-[var(--color-rose)]" />
                <b>{free} free to book</b>
              </span>
            </div>
          </div>

          {/* Badge */}
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-[rgba(193,131,159,.10)] text-[#94566F] border border-[rgba(193,131,159,.22)]">
              Block in progress
            </span>
          </div>
        </div>

        {/* Expiry */}
        {expiryLabel && (
          <div className="flex gap-3 items-start px-5 py-3.5 border-t border-border bg-[var(--hover)] text-[13px] leading-relaxed">
            <svg className="w-[17px] h-[17px] text-[var(--color-teal)] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <b className="text-foreground">Use these by {expiryLabel}</b>
                {lastExt && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[rgba(8,126,139,.10)] text-[var(--color-teal)] border border-[rgba(8,126,139,.22)]">
                    Extended by Esther
                  </span>
                )}
              </div>
              <div>
                {lastExt
                  ? `Originally ${lastExt.from}. Esther moved it${lastExt.reason ? ` ${lastExt.reason}` : ""}, and she is happy to move it again if you need.`
                  : "This is the latest date your sessions can be used by."}{" "}
                <button type="button" className="font-bold text-foreground underline underline-offset-[3px] hover:underline-offset-2">
                  Just ask
                </button>
                . Nothing disappears without a conversation first.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── PICKER + BASKET ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* Picker */}
        <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 p-5 pb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(193,131,159,.10)] text-[var(--color-rose)]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">When would you like to come in?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Esther&apos;s live studio hours. Tap as many times as you want — you can
                book up to <b className="text-foreground">{free}</b> right now.
              </p>
            </div>
          </div>

          <div className="px-5 pb-5">
            {/* Week nav */}
            <div className="flex items-center gap-2.5 mb-3.5">
              <button
                type="button"
                disabled={weekIdx === 0}
                onClick={() => setWeek(weekIdx - 1)}
                className="w-10 h-10 shrink-0 rounded-[10px] border border-border bg-white grid place-items-center disabled:text-[#B9BEC6] disabled:cursor-not-allowed hover:bg-[var(--hover)]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div className="flex-1 text-center">
                <b className="block text-[15px] font-bold text-foreground">{currentWeek?.label ?? "Loading…"}</b>
                <span className="block text-xs text-muted-foreground">{currentWeek?.range ?? ""}</span>
              </div>
              <button
                type="button"
                disabled={weekIdx >= weeks.length - 1}
                onClick={() => setWeek(weekIdx + 1)}
                className="w-10 h-10 shrink-0 rounded-[10px] border border-border bg-white grid place-items-center disabled:text-[#B9BEC6] disabled:cursor-not-allowed hover:bg-[var(--hover)]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>

            {/* Day rail */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {currentWeek?.days.map((d, i) => {
                const open = d.state === "open" && d.slots.length > 0;
                const hasMine = false; // TODO: show client's own booked slots
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={!open && !hasMine}
                    aria-pressed={i === dayIdx}
                    onClick={() => setDayIdx(i)}
                    className={cn(
                      "rounded-xl border-[1.5px] border-border bg-white py-2 px-0.5 text-center transition-colors",
                      i === dayIdx && "bg-foreground border-foreground",
                      !open && !hasMine && "bg-[var(--hover)] cursor-not-allowed"
                    )}
                  >
                    <span className={cn("block text-[10.5px] font-bold uppercase tracking-[.07em]", i === dayIdx ? "text-white" : "text-muted-foreground")}>
                      {d.dayShort}
                    </span>
                    <span className={cn("block text-[19px] font-bold leading-tight tabular-nums", i === dayIdx ? "text-white" : "text-foreground")}>
                      {d.dayNum}
                    </span>
                    <span className={cn("block text-[10.5px] font-bold mt-px", i === dayIdx ? "text-[var(--color-rose)]" : open ? "text-[var(--color-teal)]" : "text-muted-foreground font-semibold")}>
                      {d.state === "open" ? `${d.slots.length} free` : d.state === "full" ? "Full" : d.state === "past" ? "Gone" : "Closed"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slots */}
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading availability…</div>
            ) : currentDay && currentDay.state === "open" && currentDay.slots.length > 0 ? (
              <div className="border border-border rounded-xl p-4 bg-[var(--hover)]">
                <p className="text-[14.5px] font-bold text-foreground mb-0.5">{currentDay.dayName} {currentDay.dayNum} {currentDay.monthShort}</p>
                <p className="text-xs text-muted-foreground mb-3.5">
                  {currentDay.slots.length} {currentDay.slots.length === 1 ? "time" : "times"} free · {sessionLen}-minute session
                </p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(122px,1fr))] gap-2">
                  {currentDay.slots.map((slot) => {
                    const key = `${weekIdx}|${dayIdx}|${slot.startLocal}`;
                    const isSelected = picked.some((p) => p.key === key);
                    const disabled = capped && !isSelected;
                    return (
                      <button
                        key={slot.startLocal}
                        type="button"
                        disabled={disabled}
                        aria-pressed={isSelected}
                        onClick={() => toggleSlot(slot)}
                        className={cn(
                          "min-h-[56px] rounded-[11px] border-[1.5px] border-border bg-white text-foreground text-[15px] font-bold tabular-nums flex flex-col items-center justify-center gap-px transition-colors",
                          isSelected && "bg-[var(--color-rose)] border-[var(--color-rose)] text-white",
                          !isSelected && !disabled && "hover:border-[var(--color-rose)] hover:bg-[rgba(193,131,159,.10)]",
                          disabled && "bg-[var(--hover)] text-[#9AA0A8] border-dashed cursor-not-allowed"
                        )}
                      >
                        {slot.startLocal}
                        <small className={cn("text-[11px] font-semibold", isSelected ? "text-white/88" : disabled ? "text-[#9AA0A8]" : "text-muted-foreground")}>
                          {isSelected ? "Selected" : disabled ? "No sessions left" : `to ${slot.endLocal}`}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : currentDay ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <p className="font-bold text-foreground mb-1">{currentDay.dayName} {currentDay.dayNum} {currentDay.monthShort}</p>
                <p>{currentDay.reason ?? "No free slots on this day."}</p>
              </div>
            ) : null}

            {/* Capacity note */}
            {capped && picked.length > 0 && (
              <div className="flex gap-2.5 items-start mt-3.5 p-3 rounded-[11px] bg-[#F7EFDD] border border-[rgba(176,138,62,.26)] text-xs leading-relaxed text-[#7A5A17]">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-[var(--status-warning)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </svg>
                <div>
                  <b className="text-foreground">That is everything in this block.</b> Remove one of your choices to swap it for a
                  different time, or ask Esther about your next block — she can add sessions before you
                  run out so there is no gap.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── BASKET ── */}
        <aside className="lg:sticky lg:top-[150px]">
          <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 pb-3 border-b border-border">
              <b className="block text-sm font-bold text-foreground">
                {picked.length === 0 ? "Nothing selected yet" : `${picked.length} session${picked.length > 1 ? "s" : ""} selected`}
              </b>
              <span className="block text-xs text-muted-foreground">
                Nothing is confirmed until you press the button.
              </span>
            </div>

            <ul className="list-none m-0 p-0">
              {picked.length === 0 ? (
                <li className="p-6 text-center text-xs text-muted-foreground leading-relaxed">
                  <b className="block text-sm text-foreground mb-0.5">Pick a time to get started</b>
                  Your choices collect here so you can check them before anything is booked.
                </li>
              ) : (
                picked.map((p) => (
                  <li key={p.key} className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
                    <div className="w-[34px] shrink-0 border border-border rounded-[9px] overflow-hidden text-center">
                      <div className="bg-[var(--color-rose)] text-white text-[8.5px] font-extrabold uppercase tracking-[.06em] py-px">{p.monthShort}</div>
                      <div className="text-[15px] font-bold text-foreground py-px leading-tight">{p.dayNum}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-foreground">{p.dayShort} {p.dayNum} {p.monthShort}, {p.time}</div>
                      <div className="text-[11.5px] text-muted-foreground">{sessionLen} minutes · the studio</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePicked(p.key)}
                      className="w-8 h-8 shrink-0 rounded-[8px] border border-border bg-white grid place-items-center text-muted-foreground hover:bg-[rgba(138,78,99,.10)] hover:border-[rgba(138,78,99,.22)] hover:text-[var(--status-danger)]"
                      aria-label={`Remove ${p.fullDay} at ${p.time}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-[var(--hover)]">
              <span className="text-xs font-semibold text-body">Left in your block afterwards</span>
              <span className="text-xl font-bold text-foreground tabular-nums">{remainingAfter}</span>
            </div>

            {remainingAfter === 0 && picked.length > 0 && (
              <div className="px-4 py-3 border-b border-border bg-[#F7EFDD] text-xs leading-relaxed text-[#7A5A17]">
                <b className="text-foreground">This uses the last session in your block.</b> Esther will talk to you about the next one
                at your final session — nothing stops in the meantime.
              </div>
            )}

            <div className="p-4">
              <button
                type="button"
                disabled={picked.length === 0 || booking}
                onClick={handleBook}
                className={cn(
                  "w-full min-h-[46px] rounded-[10px] border border-transparent text-[14.5px] font-bold transition-colors",
                  picked.length > 0
                    ? "bg-[var(--color-rose)] text-white hover:bg-[var(--color-rose-deep)]"
                    : "bg-[#DDE1E6] text-[#7C838C] cursor-not-allowed"
                )}
              >
                {picked.length === 0
                  ? "Choose a time first"
                  : `Book ${picked.length} session${picked.length > 1 ? "s" : ""}`}
              </button>
              <p className="text-[12px] leading-relaxed text-muted-foreground mt-3">
                <b className="text-foreground">Free to cancel</b> up to {noticeHours} hours before a session. Cancel inside those
                {noticeHours} hours and the session still comes out of your block — you will always be shown which
                applies before you confirm.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className="bg-foreground text-white text-[13.5px] font-semibold px-4 py-3 rounded-[10px] shadow-lg flex items-center gap-2.5 max-w-[340px] animate-in slide-in-from-bottom-2">
            <svg className="w-4 h-4 shrink-0 text-[var(--color-rose)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
