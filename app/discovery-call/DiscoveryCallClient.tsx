"use client";

import { useState, useRef, useCallback, type FormEvent } from "react";

/**
 * DiscoveryCallClient — the real, wired-up discovery-call booking flow.
 *
 * Markup and CSS are 1:1 with the OpenDesign mockup (discovery-call-booking.html).
 * Only the JavaScript is replaced: mock setTimeout → real fetch, buildMockSlots →
 * GET /api/booking-availability, confirm click → POST /api/discovery-call.
 */

type Panel = "details" | "loading" | "slots" | "error" | "confirmed";

interface Slot {
  startUtc: string;
  endUtc: string;
}

interface DayGroup {
  date: Date;
  slots: Slot[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Date formatting helpers ────────────────────────────────────────────────

function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeLabel(startUtc: string): string {
  const d = new Date(startUtc);
  return d
    .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", timeZone: "Europe/London" })
    .replace(":00", "");
}

function formatConfirmWhen(startUtc: string): string {
  const d = new Date(startUtc);
  return (
    d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/London",
    }) +
    " at " +
    d
      .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", timeZone: "Europe/London" })
      .replace(":00", "")
  );
}

// ─── Group slots by day ─────────────────────────────────────────────────────

function groupByDay(slots: Slot[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const slot of slots) {
    const d = new Date(slot.startUtc);
    // Use UK date for grouping so midnight UTC dates align with UK calendar days
    const ukDateStr = d.toLocaleDateString("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Create a date object for the UK calendar day (for display)
    const [dd, mm, yyyy] = ukDateStr.split("/").map(Number);
    const dayKey = `${yyyy}-${mm}-${dd}`;
    if (!map.has(dayKey)) {
      map.set(dayKey, { date: new Date(yyyy, mm - 1, dd), slots: [] });
    }
    map.get(dayKey)!.slots.push(slot);
  }
  return Array.from(map.values());
}

// ─── ICS download helper ────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toICSDate(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

// ─── SVG icon components (inline, matching mockup exactly) ──────────────────

function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 11L11 3M11 3H5M11 3v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path
        d="M11 3 3 11M3 11h6M3 11V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function IconWarningSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconCalendarBig() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z" />
    </svg>
  );
}

function IconShieldBig() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z" />
    </svg>
  );
}

function IconCheckSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7.5 5.5 10.5 11.5 3.5" />
    </svg>
  );
}

function Logo({ fillText = "#131313" }: { fillText?: string }) {
  return (
    <svg className="logo" viewBox="0 0 142 40" role="img" aria-label="Eternal Fitness">
      <path
        d="M18 29.5 C10.5 23.8 4.5 18.5 4.5 12.8 C4.5 8.3 7.9 5.3 11.8 5.3 C14.4 5.3 16.8 6.8 18 9.2 C19.2 6.8 21.6 5.3 24.2 5.3 C28.1 5.3 31.5 8.3 31.5 12.8 C31.5 18.5 25.5 23.8 18 29.5 Z"
        fill="#c1839f"
        transform="translate(3,6) scale(0.78)"
      />
      <text x="42" y="17" fontFamily="'DM Sans',Arial,sans-serif" fontWeight="800" fontSize="15" letterSpacing="4.3" fill={fillText}>
        ETERNAL
      </text>
      <text x="42" y="34" fontFamily="'DM Sans',Arial,sans-serif" fontWeight="500" fontSize="10.5" letterSpacing="8.67" fill="#c1839f">
        FITNESS
      </text>
    </svg>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function DiscoveryCallClient() {
  const [panel, setPanel] = useState<Panel>("details");
  const [announcer, setAnnouncer] = useState("");
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirmWhen, setConfirmWhen] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [showReselect, setShowReselect] = useState(false);
  const [slotTakenId, setSlotTakenId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [goals, setGoals] = useState("");
  const [activity, setActivity] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [health, setHealth] = useState("");
  const [notes, setNotes] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Loading / submitting states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const flowCardRef = useRef<HTMLDivElement>(null);

  const showPanel = useCallback(
    (p: Panel, announce?: string) => {
      setPanel(p);
      if (announce) setAnnouncer(announce);
    },
    []
  );

  // ── Validate intake form ───────────────────────────────────────────────

  const validateIntake = useCallback((): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!name.trim()) newErrors.name = true;
    if (!phone.trim()) newErrors.phone = true;
    if (!email.trim() || !EMAIL_RE.test(email.trim())) newErrors.email = true;
    if (!goals.trim()) newErrors.goals = true;
    if (!activity) newErrors.activity = true;
    if (!contactMethod) newErrors["contact-method"] = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Focus first error field
      const firstKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[data-field="${firstKey}"] input, [data-field="${firstKey}"] textarea, [data-field="${firstKey}"] select`) as HTMLElement | null;
      if (el) el.focus();
      setAnnouncer("Please check the highlighted fields.");
      return false;
    }
    return true;
  }, [name, phone, email, goals, activity, contactMethod]);

  // ── Load availability from real API ────────────────────────────────────

  const loadAvailability = useCallback(async () => {
    showPanel("loading", "Checking availability.");

    // Fetch next 3 weeks of availability (Mon-Fri only, server filters)
    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() + 1);
    rangeStart.setHours(9, 0, 0, 0);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 21);

    try {
      const res = await fetch(
        `/api/booking-availability?start=${encodeURIComponent(rangeStart.toISOString())}&end=${encodeURIComponent(rangeEnd.toISOString())}`
      );

      if (!res.ok) {
        showPanel("error", "Could not load availability. You can try again or call Esther.");
        return;
      }

      const data = await res.json();
      const slots: Slot[] = data.slots ?? [];

      if (slots.length === 0) {
        showPanel("error", "No available times found in the next few weeks. Please try again or call Esther.");
        return;
      }

      setDayGroups(groupByDay(slots));
      setSelectedSlot(null);
      setShowReselect(false);
      setSlotTakenId(null);
      showPanel("slots", "Available times loaded.");
    } catch {
      showPanel("error", "Could not load availability. You can try again or call Esther.");
    }
  }, [showPanel]);

  // ── Form submit → load availability ────────────────────────────────────

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!validateIntake()) return;
      loadAvailability();
    },
    [validateIntake, loadAvailability]
  );

  // ── Select a slot ──────────────────────────────────────────────────────

  const handleSlotClick = useCallback(
    (slot: Slot) => {
      if (slot.startUtc === slotTakenId) return;
      setSelectedSlot(slot);
      setShowReselect(false);
      setAnnouncer(`Selected ${dayLabel(new Date(slot.startUtc))} at ${timeLabel(slot.startUtc)}.`);
    },
    [slotTakenId]
  );

  // ── Confirm booking via real API ───────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!selectedSlot) {
      setShowReselect(true);
      setAnnouncer("That time was just taken. Please choose another.");
      return;
    }

    setIsConfirming(true);

    try {
      const res = await fetch("/api/discovery-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          goals: goals.trim(),
          activity,
          contactMethod,
          health: health.trim(),
          notes: notes.trim(),
          slotStartUtc: selectedSlot.startUtc,
          slotEndUtc: selectedSlot.endUtc,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Slot was taken — mark it and refresh
        setSlotTakenId(selectedSlot.startUtc);
        setSelectedSlot(null);
        setShowReselect(true);
        setAnnouncer("That time was just taken. Please choose another.");
        // Refresh availability
        await loadAvailability();
        setIsConfirming(false);
        return;
      }

      if (!res.ok) {
        showPanel("error", data.error || "Something went wrong. Please try again or call Esther.");
        setIsConfirming(false);
        return;
      }

      // Success
      setConfirmWhen(formatConfirmWhen(selectedSlot.startUtc));
      setConfirmName(name.trim() || "you");
      showPanel("confirmed", `Booking confirmed for ${formatConfirmWhen(selectedSlot.startUtc)}.`);
    } catch {
      showPanel("error", "Something went wrong. Please try again or call Esther.");
    } finally {
      setIsConfirming(false);
    }
  }, [selectedSlot, name, phone, email, goals, activity, contactMethod, health, notes, showPanel, loadAvailability]);

  // ── Add to calendar (.ics download — client-side, same as mockup) ──────

  const handleAddToCalendar = useCallback(() => {
    if (!selectedSlot) return;
    const start = new Date(selectedSlot.startUtc);
    const end = new Date(start.getTime() + 30 * 60000);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Eternal Fitness//Discovery Call//EN",
      "BEGIN:VEVENT",
      `UID:ef-discovery-${start.getTime()}@eternal-fitness.co.uk`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      "SUMMARY:Discovery call with Eternal Fitness",
      `DESCRIPTION:Free discovery call with Esther Fair, Eternal Fitness. Call ${phone || ""} if you need to reach her.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eternal-fitness-discovery-call.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedSlot, phone]);

  // ── Derived state ──────────────────────────────────────────────────────

  const fieldClass = (key: string) => `field${errors[key] ? " has-error" : ""}`;

  return (
    <>
      <style>{mockupCSS}</style>

      <a className="skip" href="#booking-flow">
        Skip to booking form
      </a>

      {/* ── Minimal nav ──────────────────────────────────────────────── */}
      <header className="nav">
        <a href="/" aria-label="Eternal Fitness home">
          <Logo />
        </a>
        <p className="nav-call">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span className="nav-call-label">Prefer to talk first?</span>
          <a href="tel:07517658128">07517 658 128</a>
        </p>
      </header>

      <main id="main">
        {/* ── Intro band ──────────────────────────────────────────────── */}
        <section className="sec intro">
          <div className="intro-inner">
            <p className="eyebrow eyebrow-c">Discovery call</p>
            <h1 className="h1">Let&apos;s start with a conversation</h1>
            <p className="intro-sub">
              Tell me a little about yourself and pick a time that suits you. It&apos;s free, there&apos;s no
              obligation, and however experienced you are or wherever you&apos;re starting from, this
              first call is just about listening and working out what&apos;s possible together.
            </p>
            <p className="intro-note">
              <IconShield />
              Everything you share here is just for Esther, to help her prepare for your call.
            </p>
          </div>
        </section>

        {/* ── Flow + Aside ────────────────────────────────────────────── */}
        <section className="sec" style={{ paddingTop: 56 }}>
          <div className="wrap">
            <div className="flow-grid">
              {/* ─── Flow card ──────────────────────────────────────── */}
              <div className="flow-card" id="booking-flow" ref={flowCardRef}>
                <div aria-live="polite" className="sr-only">
                  {announcer}
                </div>

                {/* STEP 1 — Details */}
                <div className={`panel${panel === "details" ? " is-active" : ""}`} data-panel="details">
                  <p className="flow-step-label">
                    <b>Step 1</b> of 2 — Your details
                  </p>
                  <h2 className="flow-title">A little about you</h2>
                  <p className="flow-sub">
                    Just enough for Esther to prepare — this isn&apos;t a full health questionnaire, that comes later if you decide to join.
                  </p>

                  <form className="form-grid" ref={formRef} noValidate onSubmit={handleFormSubmit}>
                    {/* Honeypot — hidden from real users */}
                    <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0, overflow: "hidden" }} aria-hidden="true">
                      <label htmlFor="f-website">Website</label>
                      <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                    </div>

                    <div className="row2">
                      <div className={fieldClass("name")} data-field="name">
                        <label htmlFor="f-name">
                          Your name <span className="req" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="f-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                        <span className="field-error">Please add your name.</span>
                      </div>
                      <div className={fieldClass("phone")} data-field="phone">
                        <label htmlFor="f-phone">
                          Phone <span className="req" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="f-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                        <span className="field-error">Please add a phone number.</span>
                      </div>
                    </div>

                    <div className={fieldClass("email")} data-field="email">
                      <label htmlFor="f-email">
                        Email <span className="req" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="f-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <span className="field-error">Please add a valid email address.</span>
                    </div>

                    <div className={fieldClass("goals")} data-field="goals">
                      <label htmlFor="f-goals">
                        What would you like to work towards? <span className="req" aria-hidden="true">*</span>
                      </label>
                      <textarea
                        id="f-goals"
                        name="goals"
                        required
                        placeholder="In your own words — there's no wrong answer here."
                        style={{ minHeight: 76 }}
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                      />
                      <span className="field-error">Let Esther know a little about what you&apos;d like to achieve.</span>
                    </div>

                    <div className={fieldClass("activity")} data-field="activity">
                      <label htmlFor="f-activity">
                        Current activity level <span className="req" aria-hidden="true">*</span>
                      </label>
                      <select
                        id="f-activity"
                        name="activity"
                        required
                        value={activity}
                        onChange={(e) => setActivity(e.target.value)}
                      >
                        <option value="" disabled>
                          Select one
                        </option>
                        <option value="not-active">Not currently active</option>
                        <option value="a-little">A little active</option>
                        <option value="regularly">Regularly active</option>
                      </select>
                      <span className="field-error">Please choose the option closest to you.</span>
                    </div>

                    <div className={fieldClass("contact-method")} data-field="contact-method">
                      <label id="f-contact-label">
                        Preferred contact method <span className="req" aria-hidden="true">*</span>
                      </label>
                      <div className="radiogroup" role="radiogroup" aria-labelledby="f-contact-label">
                        <label className="radio-chip">
                          <input
                            type="radio"
                            name="contactMethod"
                            value="phone"
                            required
                            checked={contactMethod === "phone"}
                            onChange={(e) => setContactMethod(e.target.value)}
                          />
                          <span>Phone call</span>
                        </label>
                        <label className="radio-chip">
                          <input
                            type="radio"
                            name="contactMethod"
                            value="text"
                            checked={contactMethod === "text"}
                            onChange={(e) => setContactMethod(e.target.value)}
                          />
                          <span>Text message</span>
                        </label>
                        <label className="radio-chip">
                          <input
                            type="radio"
                            name="contactMethod"
                            value="email"
                            checked={contactMethod === "email"}
                            onChange={(e) => setContactMethod(e.target.value)}
                          />
                          <span>Email</span>
                        </label>
                      </div>
                      <span className="field-error">Please choose how you&apos;d like to be contacted.</span>
                    </div>

                    <div className="field" data-field="health">
                      <label htmlFor="f-health">
                        Anything I should know before we speak?{" "}
                        <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(optional)</span>
                      </label>
                      <textarea
                        id="f-health"
                        name="health"
                        placeholder="Any injuries, health conditions or anything else that would help Esther prepare."
                        style={{ minHeight: 76 }}
                        value={health}
                        onChange={(e) => setHealth(e.target.value)}
                      />
                      <span className="hint">Totally optional, and only ever seen by Esther.</span>
                    </div>

                    <div className="field" data-field="notes">
                      <label htmlFor="f-notes">
                        Anything else to add?{" "}
                        <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(optional)</span>
                      </label>
                      <textarea
                        id="f-notes"
                        name="notes"
                        style={{ minHeight: 60 }}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      style={{ marginTop: 6 }}
                      disabled={isSubmitting}
                    >
                      Continue to available times
                      <IconArrowRight />
                    </button>
                    <p className="form-foot">
                      No account or login needed — this is a one-off form just to get your call booked in.
                    </p>
                  </form>
                </div>

                {/* STEP 1.5 — Loading availability */}
                <div className={`panel${panel === "loading" ? " is-active" : ""}`} data-panel="loading">
                  <p className="flow-step-label">
                    <b>Step 2</b> of 2 — Pick a time
                  </p>
                  <div className="loading-wrap">
                    <div className="spinner" role="status" />
                    <p className="loading-t">Checking Esther&apos;s availability&hellip;</p>
                    <p className="loading-s">
                      Pulling her genuinely free times, so nothing here can double-book.
                    </p>
                  </div>
                  <div className="skeleton-days" aria-hidden="true">
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row" />
                  </div>
                </div>

                {/* STEP 2 — Slot picker */}
                <div className={`panel${panel === "slots" ? " is-active" : ""}`} data-panel="slots">
                  <button
                    type="button"
                    className="flow-back"
                    onClick={() => showPanel("details", "Back to your details.")}
                  >
                    <IconArrowLeft />
                    Back to your details
                  </button>
                  <p className="flow-step-label">
                    <b>Step 2</b> of 2 — Pick a time
                  </p>
                  <h2 className="flow-title">Choose a time that suits you</h2>
                  <p className="flow-sub">
                    These are Esther&apos;s genuinely free slots — pulled live from her calendar, so nothing here clashes with a client session or anything else she&apos;s already got on.
                  </p>

                  <p className="tz-note">
                    <IconClock />
                    Times shown in UK time (Europe/London)
                  </p>

                  <div className={`reselect-banner${showReselect ? " is-visible" : ""}`}>
                    <IconWarningSmall />
                    <span>
                      <span className="reselect-banner-t">That time was just taken</span>
                      <span className="reselect-banner-s">
                        Someone else booked it a moment before you — sorry about that. Please pick another time below.
                      </span>
                    </span>
                  </div>

                  <div>
                    {dayGroups.map((group) => (
                      <div className="day-group" key={group.date.toISOString()}>
                        <p className="day-label">{dayLabel(group.date)}</p>
                        <div className="slot-row">
                          {group.slots.map((slot) => {
                            const isTaken = slot.startUtc === slotTakenId;
                            const isSelected = selectedSlot?.startUtc === slot.startUtc;
                            let cls = "slot";
                            if (isTaken) cls += " is-taken";
                            else if (isSelected) cls += " is-selected";
                            return (
                              <button
                                key={slot.startUtc}
                                type="button"
                                className={cls}
                                disabled={isTaken}
                                aria-pressed={isSelected}
                                onClick={() => handleSlotClick(slot)}
                              >
                                {timeLabel(slot.startUtc)}
                                {isTaken && <span className="slot-taken-tag">Just taken</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`selection-bar${selectedSlot && !showReselect ? " is-visible" : ""}`}>
                    <p>
                      <span className="selection-bar-t">Selected —</span>
                      <br />
                      <span className="selection-bar-v">
                        {selectedSlot
                          ? `${dayLabel(new Date(selectedSlot.startUtc))} at ${timeLabel(selectedSlot.startUtc)}`
                          : ""}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirm}
                      disabled={isConfirming}
                    >
                      {isConfirming ? "Confirming…" : "Confirm booking"}
                      <IconCheckSmall />
                    </button>
                  </div>
                </div>

                {/* STATE — Error loading calendar */}
                <div className={`panel${panel === "error" ? " is-active" : ""}`} data-panel="error">
                  <div className="state-center">
                    <div className="state-ic state-ic-error">
                      <IconWarning />
                    </div>
                    <h2 className="state-t">Couldn&apos;t load Esther&apos;s calendar</h2>
                    <p className="state-s">
                      This is on our end, not yours — your details are safe and nothing&apos;s been lost. Please try again, or reach Esther directly below.
                    </p>
                    <div className="state-actions">
                      <button type="button" className="btn btn-primary" onClick={loadAvailability}>
                        Try again
                      </button>
                      <a className="btn btn-outline" href="tel:07517658128">
                        Call Esther instead
                      </a>
                    </div>
                  </div>
                </div>

                {/* STATE — Confirmed */}
                <div className={`panel${panel === "confirmed" ? " is-active" : ""}`} data-panel="confirmed">
                  <div className="state-center">
                    <div className="state-ic state-ic-ok">
                      <IconCheck />
                    </div>
                    <h2 className="state-t">You&apos;re booked in</h2>
                    <p className="state-s">
                      Look forward to speaking with you — there&apos;s nothing else you need to do before then.
                    </p>

                    <div className="confirm-card">
                      <div className="confirm-row">
                        <IconCalendar />
                        <div>
                          <p className="confirm-l">When</p>
                          <p className="confirm-v">{confirmWhen || "—"}</p>
                        </div>
                      </div>
                      <div className="confirm-row">
                        <IconPhone />
                        <div>
                          <p className="confirm-l">Discovery call for</p>
                          <p className="confirm-v">{confirmName || "—"}</p>
                        </div>
                      </div>
                    </div>

                    <ul className="next-list">
                      <li>Esther will reach out using the contact method you chose, shortly before your call</li>
                      <li>You&apos;ll also get a confirmation by email — do check your spam folder just in case</li>
                      <li>Need to change or cancel? Just call or email — no account needed</li>
                    </ul>

                    <div className="state-actions">
                      <button type="button" className="btn btn-outline" onClick={handleAddToCalendar}>
                        <IconCalendarBig />
                        Add to calendar
                      </button>
                      <a className="btn btn-text" href="/">
                        Back to the homepage
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Aside ──────────────────────────────────────────── */}
              <aside>
                <div className="aside-card">
                  <h3>What to expect on the call</h3>
                  <ul className="expect-list">
                    <li>We&apos;ll talk about what you want to achieve, and how you&apos;re feeling about getting started</li>
                    <li>No pressure and no obligation to book anything afterwards</li>
                    <li>Bring any questions — there&apos;s no such thing as a silly one</li>
                  </ul>
                </div>

                <div className="aside-card aside-callout">
                  <IconShieldBig />
                  <p>
                    What you share on this form is private — it goes straight to Esther, just to help her prepare for your call, and nowhere else.
                  </p>
                </div>

                <div className="aside-card">
                  <h3>Esther is qualified in</h3>
                  <ul className="aside-quals">
                    <li>Personal Training</li>
                    <li>Exercise Referral</li>
                    <li>Level 4 Cancer &amp; Exercise Rehabilitation</li>
                  </ul>
                </div>

                <div className="aside-card aside-direct">
                  <h3>Rather talk first?</h3>
                  <p>If filling in a form isn&apos;t your thing, that&apos;s completely fine.</p>
                  <a href="tel:07517658128">07517 658 128</a>
                  <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <Logo fillText="#ffffff" />
          <p className="footer-line">Private, one-to-one personal training in Worthing, West Sussex.</p>
          <div className="footer-links">
            <a href="/privacy-policy">Privacy policy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
          </div>
          <p className="footer-copy">&copy; 2026 Eternal Fitness &middot; Worthing, West Sussex</p>
        </div>
      </footer>
    </>
  );
}

// ─── Mockup CSS (verbatim from discovery-call-booking.html) ─────────────────
// eslint-disable-next-line no-useless-concat
const mockupCSS = `
:root{
  --white:#ffffff;
  --ink:#131313;
  --rose:#c1839f;
  --warm:#f5efea;
  --muted:#7e8088;
  --border:#e4ddd7;
  --teal:#087e8b;

  --cream:      color-mix(in oklab, var(--warm) 42%, var(--white));
  --body:       color-mix(in oklab, var(--ink) 80%, var(--white));
  --rose-tint:  color-mix(in oklab, var(--rose) 13%, var(--white));
  --teal-tint:  color-mix(in oklab, var(--teal) 11%, var(--white));
  --amber-tint: color-mix(in oklab, #b08a3e 14%, var(--white));
  --amber:      #b08a3e;
  --amber-ic:   color-mix(in oklab, #b08a3e 78%, var(--ink));
  --on-dark:    color-mix(in srgb, var(--white) 66%, transparent);
  --on-dark-lo: color-mix(in srgb, var(--white) 44%, transparent);
  --hair-dark:  color-mix(in srgb, var(--white) 12%, transparent);
  --shadow:     0 4px 16px color-mix(in srgb, var(--ink) 5%, transparent),
                0 20px 48px color-mix(in srgb, var(--ink) 8%, transparent);
  --shadow-lift:0 8px 20px color-mix(in srgb, var(--ink) 7%, transparent),
                0 28px 60px color-mix(in srgb, var(--ink) 12%, transparent);

  --serif:'DM Serif Display', Georgia, 'Times New Roman', serif;
  --sans:'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --max:1320px;
  --r:18px;
  --ease:cubic-bezier(.4,0,.2,1);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;font-family:var(--sans);font-size:16px;line-height:1.68;
  color:var(--body);background:var(--white);-webkit-font-smoothing:antialiased;overflow-x:hidden;
}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
button{font-family:var(--sans);cursor:pointer;border:none;background:none}
h1,h2,h3,h4{margin:0}
p{margin:0}
ul,ol{margin:0}
:focus-visible{outline:2px solid var(--rose);outline-offset:3px;border-radius:4px}
.skip{position:absolute;left:-999px;top:8px;z-index:100;background:var(--ink);color:var(--white);padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600}
.skip:focus{left:16px}

.h1{font-family:var(--serif);font-weight:400;font-size:clamp(34px,4vw,52px);line-height:1.08;letter-spacing:-.025em;color:var(--ink)}
.h2{font-family:var(--serif);font-weight:400;font-size:clamp(24px,2.4vw,30px);line-height:1.15;letter-spacing:-.02em;color:var(--ink)}
.eyebrow{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--rose);margin-bottom:16px}
.eyebrow::before{content:'';display:block;width:26px;height:2px;background:var(--rose);border-radius:2px;flex:none}
.eyebrow-c{justify-content:center}

.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:9px;
  min-height:48px;padding:13px 26px;border-radius:999px;
  font-size:14.5px;font-weight:600;letter-spacing:-.01em;
  transition:background .2s var(--ease),color .2s var(--ease),border-color .2s var(--ease),box-shadow .2s var(--ease),transform .2s var(--ease);
}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn svg{flex:none}
.btn-primary{background:var(--rose);color:var(--white);box-shadow:0 2px 6px color-mix(in srgb, var(--rose) 32%, transparent),0 10px 24px color-mix(in srgb, var(--rose) 26%, transparent)}
.btn-primary:hover:not(:disabled){background:color-mix(in oklab, var(--rose) 82%, var(--ink));transform:translateY(-1px);box-shadow:0 4px 10px color-mix(in srgb, var(--rose) 34%, transparent),0 14px 32px color-mix(in srgb, var(--rose) 30%, transparent)}
.btn-outline{background:transparent;color:var(--ink);border:1.5px solid var(--border)}
.btn-outline:hover{border-color:var(--ink);background:var(--cream)}
.btn-text{min-height:auto;padding:4px 2px;color:var(--rose);font-weight:600;font-size:14px}
.btn-text:hover{text-decoration:underline;text-underline-offset:3px}
.btn-full{width:100%}

.wrap{max-width:var(--max);margin:0 auto;padding:0 80px}
.sec{padding:64px 80px}
@media (max-width:1000px){ .wrap{padding:0 24px} .sec{padding:48px 24px} }

.nav{
  display:flex;align-items:center;justify-content:space-between;gap:20px;
  padding:20px 80px;border-bottom:1px solid var(--border);
}
.logo{height:30px;width:auto}
.nav-call{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--body)}
.nav-call svg{color:var(--rose);flex:none}
.nav-call a:hover{color:var(--rose)}
@media (max-width:640px){
  .nav{padding:16px 20px}
  .nav-call .nav-call-label{display:none}
}

.intro{background:var(--cream);text-align:center}
.intro-inner{max-width:640px;margin:0 auto}
.intro .h1{margin-bottom:16px}
.intro-sub{font-size:16.5px;color:var(--body);line-height:1.7}
.intro-note{margin-top:26px;display:inline-flex;align-items:center;gap:9px;font-size:13px;color:var(--muted);background:var(--white);border:1px solid var(--border);border-radius:999px;padding:9px 18px}
.intro-note svg{color:var(--teal);flex:none}

.flow-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:start}
@media (max-width:1000px){ .flow-grid{grid-template-columns:1fr;gap:36px} }

.flow-card{
  background:var(--white);border:1px solid var(--border);border-radius:var(--r);
  box-shadow:var(--shadow);padding:40px 40px 36px;min-height:420px;
}
@media (max-width:640px){ .flow-card{padding:28px 22px} }

.flow-step-label{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.flow-step-label b{color:var(--rose)}
.flow-title{font-family:var(--serif);font-weight:400;font-size:24px;color:var(--ink);letter-spacing:-.02em;line-height:1.2;margin-bottom:6px}
.flow-sub{font-size:14.5px;color:var(--body);line-height:1.6;margin-bottom:28px}
.flow-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:18px}
.flow-back:hover{color:var(--rose)}
.flow-back svg{flex:none}

.panel{display:none}
.panel.is-active{display:block;animation:panelIn .4s var(--ease) both}
@keyframes panelIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){ .panel.is-active{animation:none} }

.form-grid{display:grid;gap:16px}
.field label{display:block;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.field .hint{display:block;font-size:12.5px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted);margin-top:5px}
.field input,.field textarea,.field select{
  width:100%;font-family:var(--sans);font-size:15px;color:var(--ink);
  padding:12px 14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);
  transition:border-color .18s var(--ease),box-shadow .18s var(--ease);
}
.field select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%237e8088' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:38px}
.field input:focus,.field textarea:focus,.field select:focus{outline:none;border-color:var(--rose);box-shadow:0 0 0 4px color-mix(in srgb, var(--rose) 18%, transparent)}
.field textarea{resize:vertical;min-height:84px;font-family:var(--sans)}
.field.has-error input,.field.has-error textarea,.field.has-error select{border-color:color-mix(in oklab, var(--rose) 70%, var(--ink))}
.field-error{display:none;font-size:12.5px;color:color-mix(in oklab, var(--rose) 70%, var(--ink));margin-top:6px}
.field.has-error .field-error{display:block}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:520px){ .row2{grid-template-columns:1fr} }
.req{color:color-mix(in oklab, var(--rose) 78%, var(--ink))}

.radiogroup{display:flex;flex-wrap:wrap;gap:10px}
.radio-chip{position:relative}
.radio-chip input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}
.radio-chip span{
  display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;
  border:1.5px solid var(--border);font-size:14px;font-weight:600;color:var(--ink);
  transition:border-color .18s var(--ease),background .18s var(--ease),color .18s var(--ease);
}
.radio-chip input:checked + span{border-color:var(--rose);background:var(--rose-tint);color:color-mix(in oklab, var(--rose) 60%, var(--ink))}
.radio-chip input:focus-visible + span{outline:2px solid var(--rose);outline-offset:2px}

.form-foot{margin-top:22px;font-size:12.5px;color:var(--muted);line-height:1.55}

.loading-wrap{padding:24px 0 12px;text-align:center}
.spinner{width:38px;height:38px;border-radius:999px;border:3px solid var(--border);border-top-color:var(--rose);margin:0 auto 20px;animation:spin 900ms linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){ .spinner{animation-duration:2000ms} }
.loading-t{font-size:15.5px;font-weight:600;color:var(--ink);margin-bottom:6px}
.loading-s{font-size:13.5px;color:var(--muted)}
.skeleton-days{display:grid;gap:14px;margin-top:28px}
.skeleton-row{height:52px;border-radius:12px;background:linear-gradient(90deg, var(--cream) 25%, var(--warm) 37%, var(--cream) 63%);background-size:400% 100%;animation:shimmer 1.6s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
@media (prefers-reduced-motion:reduce){ .skeleton-row{animation:none} }

.tz-note{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted);margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)}
.tz-note svg{color:var(--teal);flex:none}
.day-group{margin-bottom:22px}
.day-group:last-child{margin-bottom:0}
.day-label{font-size:13.5px;font-weight:700;color:var(--ink);margin-bottom:10px;letter-spacing:-.01em}
.slot-row{display:flex;flex-wrap:wrap;gap:10px}
.slot{
  min-height:44px;padding:10px 18px;border-radius:999px;border:1.5px solid var(--border);
  background:var(--white);font-size:14px;font-weight:600;color:var(--ink);
  transition:border-color .18s var(--ease),background .18s var(--ease),color .18s var(--ease),transform .18s var(--ease);
}
.slot:hover:not(:disabled):not(.is-taken){border-color:var(--rose);background:var(--rose-tint)}
.slot.is-selected{background:var(--rose);border-color:var(--rose);color:var(--white)}
.slot.is-taken{background:var(--cream);border-color:var(--border);color:var(--muted);text-decoration:line-through;cursor:not-allowed;opacity:.7}
.slot:disabled{cursor:not-allowed}
.slot-taken-tag{display:block;font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-top:2px;text-decoration:none}

.reselect-banner{
  display:none;align-items:flex-start;gap:12px;background:var(--amber-tint);
  border:1px solid color-mix(in srgb, var(--amber) 30%, transparent);border-radius:14px;padding:16px 18px;margin-bottom:20px;
}
.reselect-banner.is-visible{display:flex}
.reselect-banner svg{color:var(--amber-ic);flex:none;margin-top:1px}
.reselect-banner-t{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px}
.reselect-banner-s{font-size:13px;color:var(--body);line-height:1.5}

.selection-bar{
  display:none;align-items:center;justify-content:space-between;gap:16px;
  margin-top:26px;padding-top:22px;border-top:1px solid var(--border);flex-wrap:wrap;
}
.selection-bar.is-visible{display:flex}
.selection-bar-t{font-size:13.5px;color:var(--muted)}
.selection-bar-v{font-size:15px;font-weight:700;color:var(--ink)}

.state-center{text-align:center;padding:20px 0}
.state-ic{width:56px;height:56px;border-radius:999px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
.state-ic-error{background:var(--amber-tint);color:var(--amber-ic)}
.state-ic-ok{background:var(--teal-tint);color:var(--teal)}
.state-t{font-family:var(--serif);font-weight:400;font-size:24px;color:var(--ink);margin-bottom:8px;letter-spacing:-.02em}
.state-s{font-size:14.5px;color:var(--body);line-height:1.6;max-width:38ch;margin:0 auto 24px}
.state-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

.confirm-card{background:var(--cream);border:1px solid var(--border);border-radius:14px;padding:20px 22px;margin:0 auto 24px;max-width:400px;text-align:left}
.confirm-row{display:flex;gap:12px;align-items:flex-start;padding:10px 0}
.confirm-row + .confirm-row{border-top:1px solid var(--border)}
.confirm-row svg{color:var(--rose);flex:none;margin-top:2px}
.confirm-l{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
.confirm-v{font-size:15px;font-weight:600;color:var(--ink);line-height:1.3}
.next-list{list-style:none;padding:0;margin:0 auto 28px;max-width:380px;text-align:left;display:grid;gap:12px}
.next-list li{position:relative;padding-left:22px;font-size:14px;color:var(--body);line-height:1.6}
.next-list li::before{content:"";position:absolute;left:0;top:8px;width:6px;height:6px;border-radius:999px;background:var(--teal)}

.aside-card{border:1px solid var(--border);border-radius:var(--r);padding:28px 26px;margin-bottom:20px}
.aside-card h3{font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-.01em;margin-bottom:14px}
.expect-list{list-style:none;padding:0;margin:0;display:grid;gap:13px}
.expect-list li{position:relative;padding-left:20px;font-size:14px;color:var(--body);line-height:1.6}
.expect-list li::before{content:"";position:absolute;left:0;top:9px;width:6px;height:6px;border-radius:999px;background:var(--rose)}
.aside-callout{background:var(--cream);display:flex;gap:14px;align-items:flex-start}
.aside-callout svg{color:var(--teal);flex:none;margin-top:2px}
.aside-callout p{font-size:13.5px;color:var(--body);line-height:1.6}
.aside-quals{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
.aside-quals li{font-size:12px;font-weight:600;color:var(--ink);border:1px solid var(--border);border-radius:999px;padding:7px 13px;display:flex;align-items:center;gap:7px}
.aside-quals li::before{content:"";width:5px;height:5px;border-radius:999px;background:var(--rose);flex:none}
.aside-direct{border:none;background:var(--warm)}
.aside-direct a{display:block;font-size:14.5px;font-weight:600;color:var(--ink);margin-top:4px}
.aside-direct a:hover{color:var(--rose)}
.aside-direct p{font-size:13.5px;color:var(--body);line-height:1.6}

.footer{background:var(--ink);color:var(--white);padding:44px 80px 28px}
@media (max-width:1000px){ .footer{padding:40px 24px 24px} }
.footer-inner{max-width:var(--max);margin:0 auto;display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px}
.footer .logo text:first-child{fill:var(--white)}
.footer-line{font-size:13.5px;color:var(--on-dark)}
.footer-links{display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
.footer-links a{font-size:12.5px;color:var(--on-dark-lo)}
.footer-links a:hover{color:var(--white)}
.footer-copy{font-size:12px;color:var(--on-dark-lo);margin-top:6px}

.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;
