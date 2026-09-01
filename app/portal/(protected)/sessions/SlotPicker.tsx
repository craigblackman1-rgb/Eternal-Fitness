"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PortalBookingSession } from "@/lib/portal-data";
import styles from "./sessions.module.css";

interface Slot {
  startUtc: string;
  endUtc: string;
}

interface DaySlots {
  date: Date;
  label: string;
  slots: Slot[];
}

interface SlotPickerProps {
  sessions: PortalBookingSession[];
  sessionsReadyToBook: number;
  blockFocusLabel: string;
  onBookingConfirmed?: () => void;
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function formatWeekRange(monday: Date): string {
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  return `${monday.toLocaleDateString("en-GB", opts)} \u2013 ${friday.toLocaleDateString("en-GB", opts)}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const end = new Date(d.getTime() + 60 * 60 * 1000);
  const endTime = end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}\u2013${endTime}`;
}

function formatSlotTime(startUtc: string, endUtc: string): string {
  const start = new Date(startUtc);
  const end = new Date(endUtc);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" });
  return `${fmt(start)}\u2013${fmt(end)}`;
}

function groupSlotsByDay(slots: Slot[]): DaySlots[] {
  const byDay = new Map<string, DaySlots>();
  for (const slot of slots) {
    const start = new Date(slot.startUtc);
    const key = start.toISOString().slice(0, 10);
    if (!byDay.has(key)) {
      byDay.set(key, {
        date: start,
        label: formatDateLong(start),
        slots: [],
      });
    }
    byDay.get(key)!.slots.push(slot);
  }
  return Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function SlotPicker({
  sessions,
  sessionsReadyToBook,
  blockFocusLabel,
  onBookingConfirmed,
}: SlotPickerProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bookingSession, setBookingSession] = useState<PortalBookingSession | null>(null);
  const [mode, setMode] = useState<"book" | "reschedule">("book");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [weekLabel, setWeekLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [daySlots, setDaySlots] = useState<DaySlots[]>([]);
  const [emptyMessage, setEmptyMessage] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [slotTaken, setSlotTaken] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const resetPicker = useCallback(() => {
    setSelectedSlot(null);
    setSelectedDayLabel("");
    setSlotTaken(false);
    setError("");
  }, []);

  const fetchSlots = useCallback(async (monday: Date) => {
    setLoading(true);
    setDaySlots([]);
    setEmptyMessage("");
    resetPicker();

    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 5);
    friday.setHours(17, 0, 0, 0);

    try {
      const params = new URLSearchParams({
        start: monday.toISOString(),
        end: friday.toISOString(),
      });
      const res = await fetch(`/api/booking-availability?${params}`);
      if (!res.ok) {
        const data = await res.json();
        setEmptyMessage(data.error || "Couldn\u2019t check availability. Try again in a moment.");
        setDaySlots([]);
        return;
      }
      const data = await res.json();
      const slots: Slot[] = data.slots ?? [];
      const grouped = groupSlotsByDay(slots);
      setDaySlots(grouped);
      if (grouped.length === 0) {
        setEmptyMessage("No free slots this week.");
      }
    } catch {
      setEmptyMessage("Couldn\u2019t check availability. Try again in a moment.");
      setDaySlots([]);
    } finally {
      setLoading(false);
    }
  }, [resetPicker]);

  const openSheet = useCallback(
    (sess: PortalBookingSession, isReschedule: boolean) => {
      setBookingSession(sess);
      setMode(isReschedule ? "reschedule" : "book");
      setWeekStart(getMonday(new Date()));
      setSheetOpen(true);
      setResult(null);
      resetPicker();
      document.documentElement.style.overflow = "hidden";
    },
    [resetPicker],
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    document.documentElement.style.overflow = "";
    resetPicker();
  }, [resetPicker]);

  // Fetch slots when week changes and sheet is open.
  useEffect(() => {
    if (sheetOpen) {
      setWeekLabel(formatWeekRange(weekStart));
      fetchSlots(weekStart);
    }
  }, [sheetOpen, weekStart, fetchSlots]);

  // Focus trap.
  useEffect(() => {
    if (sheetOpen) {
      setTimeout(() => closeBtnRef.current?.focus(), 30);
    }
  }, [sheetOpen, closeBtnRef]);

  // Escape key to close.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && sheetOpen) {
        closeSheet();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [sheetOpen, closeSheet]);

  const handleConfirm = useCallback(async () => {
    if (!selectedSlot || !bookingSession) return;
    setConfirming(true);
    setError("");
    setSlotTaken(false);

    try {
      const res = await fetch("/api/portal/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: bookingSession.id,
          startUtc: selectedSlot.startUtc,
          endUtc: selectedSlot.endUtc,
        }),
      });

      if (res.ok) {
        const label = `Session ${bookingSession.session_number}`;
        const detail = mode === "reschedule"
          ? `${label} is now booked for ${selectedDayLabel}. Your previous time has been released.`
          : `${label} is now booked for ${selectedDayLabel}.`;
        setResult({ success: true, message: detail });
        onBookingConfirmed?.();
      } else if (res.status === 409) {
        setSlotTaken(true);
        fetchSlots(weekStart);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }, [selectedSlot, bookingSession, mode, selectedDayLabel, weekStart, fetchSlots, onBookingConfirmed]);

  const navCount = sessionsReadyToBook;

  return (
    <section aria-labelledby="sessions-title">
      <h2 className="text-xl font-semibold text-foreground" id="sessions-title">Your sessions this block</h2>
      <p className="text-muted-foreground mt-1 mb-5 max-w-[40rem]">
        Booked sessions can be moved. Sessions that aren&apos;t booked yet are yours to choose
        &mdash; pick whatever day and time suits you.
      </p>

      <ul className="space-y-3">
        {sessions.map((sess) => {
          const isBooked = !!sess.scheduled_at;
          const bookedLabel = isBooked ? formatSessionDate(sess.scheduled_at!) : null;
          const dueLabel = !isBooked && sess.week ? `w/c week ${sess.week}` : null;

          return (
            <li
              key={sess.id}
              className={`flex gap-4 border rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
                !isBooked ? "" : ""
              }`}
            >
              {/* Icon */}
              <span className="w-10 h-10 rounded-xl bg-warm border border-border flex items-center justify-center shrink-0 text-foreground" aria-hidden="true">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
                  <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
                </svg>
              </span>

              {/* Main content */}
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-foreground m-0">
                  Session {sess.session_number}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5 m-0">
                  {isBooked
                    ? <>Booked for {bookedLabel} &middot; The studio, Worthing.</>
                    : <>Not booked yet. Choose any time that works for you.</>
                  }
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                  {dueLabel && <span>Due <strong className="text-foreground">{dueLabel}</strong></span>}
                  {sess.focus_label && (
                    <span>Focus: <strong className="text-foreground">{sess.focus_label}</strong></span>
                  )}
                </div>
              </div>

              {/* Side — badge + button */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {isBooked ? (
                  <span className="inline-flex items-center gap-1.5 border border-teal rounded-full px-2.5 py-0.5 text-xs font-bold bg-teal/10 text-foreground whitespace-nowrap">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    Booked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 border border-border rounded-full px-2.5 py-0.5 text-xs font-bold bg-rose/10 text-foreground whitespace-nowrap">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7.5v5.5l3.5 2" />
                    </svg>
                    Ready to book
                  </span>
                )}

                {isBooked ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 min-h-[3rem] px-6 rounded-full border border-border bg-white text-foreground text-sm font-bold hover:bg-warm transition-colors"
                    onClick={() => openSheet(sess, true)}
                  >
                    Reschedule
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 min-h-[3rem] px-6 rounded-full bg-rose text-foreground text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    onClick={() => openSheet(sess, false)}
                  >
                    Choose a time
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {sessions.length > 0 && (
        <p className="text-sm text-muted-foreground mt-5">
          Additional sessions will appear here as they open &mdash; usually about three weeks before they&apos;re due.
        </p>
      )}

      {/* ── Slot picker sheet ───────────────────────────────────────── */}
      {sheetOpen && (
        <div
          ref={overlayRef}
          className={styles.overlay}
          onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}
          onKeyDown={(e) => { if (e.key === "Escape") closeSheet(); }}
        >
          <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="slotsheet-title">
            {/* Head */}
            <div className={styles.sheetHead}>
              <div>
                <p className={styles.eyebrow}>{mode === "reschedule" ? "Reschedule" : "Book"}</p>
                <h2 id="slotsheet-title" className={styles.sheetTitle}>
                  {mode === "reschedule" ? "Move " : "Choose a time for "}
                  Session {bookingSession?.session_number}
                </h2>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                className={styles.iconBtn}
                aria-label="Close"
                onClick={closeSheet}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className={styles.sheetBody}>
              {/* Current booking alert (reschedule mode) */}
              {mode === "reschedule" && bookingSession?.scheduled_at && (
                <div className={`${styles.alert} ${styles.alertInfo}`}>
                  <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7.5v5.5l3.5 2" />
                  </svg>
                  <div className={styles.alertBody}>
                    <h3>Currently booked</h3>
                    <p className="m-0">
                      Currently booked for {formatSessionDate(bookingSession.scheduled_at)}.
                      Choosing a new time below moves this session &mdash; your current time
                      is only released once the new one is confirmed.
                    </p>
                  </div>
                </div>
              )}

              {/* Slot taken alert */}
              {slotTaken && (
                <div className={`${styles.alert} ${styles.alertDanger}`} role="alert">
                  <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4.5M12 16v.01" />
                  </svg>
                  <div className={styles.alertBody}>
                    <h3>That time was just taken</h3>
                    <p className="m-0">
                      Someone booked it moments before you &mdash; sorry about that.
                      Please pick another time below.
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className={`${styles.alert} ${styles.alertDanger}`} role="alert">
                  <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4.5M12 16v.01" />
                  </svg>
                  <div className={styles.alertBody}>
                    <h3>Something went wrong</h3>
                    <p className="m-0">{error}</p>
                  </div>
                </div>
              )}

              {/* Week navigation */}
              <div className={styles.weekNav}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Previous week"
                  onClick={() => { setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
                </button>
                <p className={styles.weekLabel} aria-live="polite">{weekLabel}</p>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Next week"
                  onClick={() => { setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div className={styles.slotLoading}>
                  <span className={styles.spinner} aria-hidden="true" />
                  <p className="m-0">Checking Esther&apos;s diary&hellip;</p>
                </div>
              )}

              {/* Empty state */}
              {!loading && daySlots.length === 0 && emptyMessage && (
                <div className={styles.empty}>
                  <h3>No slots free this week</h3>
                  <p>{emptyMessage}</p>
                  <p className="mt-4 m-0">
                    <a href="tel:07517658128" className="inline-flex items-center justify-center gap-2 min-h-[3rem] px-6 rounded-full border border-border bg-white text-foreground text-sm font-bold hover:bg-warm transition-colors">
                      Call the studio
                    </a>
                  </p>
                </div>
              )}

              {/* Day blocks with slot choices */}
              {!loading && daySlots.map((day) => (
                <fieldset key={day.label} className={styles.dayBlock}>
                  <legend className={styles.dayTitle}>{day.label}</legend>
                  {day.slots.length === 0 ? (
                    <p className={styles.dayEmpty}>Esther&apos;s fully booked this day.</p>
                  ) : (
                    <div className={styles.choices}>
                      {day.slots.map((slot) => {
                        const timeLabel = formatSlotTime(slot.startUtc, slot.endUtc);
                        const isSelected =
                          selectedSlot?.startUtc === slot.startUtc &&
                          selectedSlot?.endUtc === slot.endUtc;
                        return (
                          <label
                            key={slot.startUtc}
                            className={`${styles.choice} ${isSelected ? styles.choiceChecked : ""}`}
                          >
                            <input
                              type="radio"
                              name="slot-time"
                              className={styles.choiceInput}
                              checked={isSelected}
                              onChange={() => {
                                setSelectedSlot(slot);
                                setSelectedDayLabel(`${day.label}, ${timeLabel}`);
                                setSlotTaken(false);
                              }}
                            />
                            <span className={styles.choiceText}>
                              {timeLabel}
                              <span className={styles.choiceNote}>1 hour, one-to-one</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              ))}
            </div>

            {/* Foot */}
            {!result && (
              <div className={styles.sheetFoot}>
                <p className={styles.slotSelected} aria-live="polite">
                  {selectedSlot ? `${selectedDayLabel} selected.` : "Pick a time to continue."}
                </p>
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 min-h-[3rem] px-6 rounded-full border border-body bg-transparent text-foreground text-sm font-bold hover:bg-white transition-colors"
                    onClick={closeSheet}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center gap-2 min-h-[3rem] px-6 rounded-full text-sm font-bold transition-all ${
                      selectedSlot && !confirming
                        ? "bg-rose text-foreground hover:shadow-lg hover:-translate-y-0.5"
                        : "bg-warm text-muted-foreground cursor-not-allowed"
                    }`}
                    disabled={!selectedSlot || confirming}
                    onClick={handleConfirm}
                  >
                    {confirming ? "Booking\u2026" : "Confirm this time"}
                  </button>
                </div>
              </div>
            )}

            {/* Success result */}
            {result && (
              <div className={styles.slotResult}>
                <span className={`${styles.resultIcon} ${styles.resultIconSuccess}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                </span>
                <h3>{mode === "reschedule" ? "Session moved" : "Session booked"}</h3>
                <p>{result.message}</p>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 min-h-[3rem] px-6 rounded-full bg-rose text-foreground text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all mt-6"
                  onClick={closeSheet}
                >
                  Back to your sessions
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
