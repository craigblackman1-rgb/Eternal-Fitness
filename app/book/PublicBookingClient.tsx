"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────

interface SessionType {
  id: string;
  title: string;
  tag?: string;
  duration: string;
  location: string;
  length: number;
  description: string;
  note?: string;
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

// ─── Session types ──────────────────────────────────────────────────────

const SESSION_TYPES: SessionType[] = [
  {
    id: "call",
    title: "Free 20-minute call",
    duration: "20 minutes",
    location: "By phone",
    length: 20,
    description:
      "A conversation, nothing more. Useful if you are not yet sure whether exercise is safe for you, or you would rather ask about your condition first.",
  },
  {
    id: "assessment",
    title: "Initial assessment",
    tag: "Most people start here",
    duration: "60 minutes",
    location: "The studio, Worthing",
    length: 60,
    description:
      "A full health screen and movement assessment, taken at your pace. You leave knowing what is realistic and what a first block of sessions would look like.",
    note: "Nothing is taken today. Fees and block sizes are agreed with you after the assessment, once we both know what you actually need.",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function fmtDateFull(d: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── Component ──────────────────────────────────────────────────────────

export function PublicBookingClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<SessionType | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DerivedSlot | null>(null);
  const [selectedDay, setSelectedDay] = useState<DerivedDay | null>(null);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [weekIdx, setWeekIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [about, setAbout] = useState("");
  const [referral, setReferral] = useState("");
  const [access, setAccess] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const typeRef = useRef<HTMLDivElement>(null);
  const whenRef = useRef<HTMLDivElement>(null);
  const youRef = useRef<HTMLDivElement>(null);

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

        const res = await fetch(`/api/availability/slots?from=${fromStr}&weeks=8`);
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
  }, []);

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

  const selectType = useCallback((type: SessionType) => {
    setSelectedType(type);
    setStep(2);
    setTimeout(() => whenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  const selectSlot = useCallback(
    (slot: DerivedSlot, day: DerivedDay) => {
      setSelectedSlot(slot);
      setSelectedDay(day);
      setStep(3);
      setTimeout(() => youRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    },
    []
  );

  const validate = useCallback(() => {
    const errs: Record<string, boolean> = {};
    if (name.trim().length <= 1) errs.name = true;
    if (phone.replace(/\D/g, "").length < 9) errs.phone = true;
    if (!/.+@.+\..+/.test(email)) errs.email = true;
    if (!consent) errs.consent = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstErr = document.querySelector(".f-invalid");
      firstErr?.scrollIntoView({ block: "center" });
    }
    return Object.keys(errs).length === 0;
  }, [name, phone, email, consent]);

  const handleSubmit = useCallback(() => {
    if (!selectedType || !selectedSlot) return;
    if (!validate()) return;
    setSubmitted(true);
  }, [selectedType, selectedSlot, validate]);

  const ready = !!selectedType && !!selectedSlot;
  const currentWeek = weeks[weekIdx];
  const currentDay = currentWeek?.days[dayIdx];

  if (submitted && selectedType && selectedSlot && selectedDay) {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream, #FCF8F4)" }}>
        {/* Top bar */}
        <header className="sticky top-0 z-[60] bg-white/93 backdrop-blur-[10px] border-b border-[var(--warm-bd, #E4DDD7)]">
          <div className="max-w-[1180px] mx-auto px-5 flex items-center gap-3.5 min-h-[62px]">
            <EFLogo />
            <div className="ml-auto flex items-center gap-1">
              <a href="/" className="text-[13.5px] font-semibold text-[var(--charcoal, #2D3436)] no-underline px-3 py-2.5 rounded-full hover:bg-[var(--warm, #F5EFEA)]">
                Back to the site
              </a>
              <a href="/portal/login" className="text-[13.5px] font-semibold text-[var(--charcoal, #2D3436)] no-underline px-3 py-2.5 rounded-full hover:bg-[var(--warm, #F5EFEA)]">
                Already a client? Sign in
              </a>
            </div>
          </div>
        </header>

        {/* Confirmed */}
        <section className="py-10 px-5">
          <div className="max-w-[1180px] mx-auto">
            <div className="max-w-[680px] mx-auto">
              <div className="bg-white border border-[var(--warm-bd, #E4DDD7)] rounded-[18px] shadow-[0_4px_16px_rgba(30,24,20,.04),0_20px_48px_rgba(30,24,20,.07)] overflow-hidden">
                <div className="bg-[var(--teal, #087E8B)] text-white py-7 px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-white/18 grid place-items-center mx-auto mb-3">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight m-0" style={{ fontFamily: "var(--serif)" }}>That time is yours.</h2>
                  <p className="text-sm mt-1.5 text-white/88">A confirmation is on its way to you now.</p>
                </div>
                <div className="p-6">
                  <div className="flex gap-3.5 items-start pb-4 border-b border-[var(--warm-bd, #E4DDD7)] mb-4">
                    <div className="w-[58px] shrink-0 border border-[var(--warm-bd, #E4DDD7)] rounded-xl overflow-hidden text-center">
                      <div className="bg-[var(--rose, #C1839F)] text-white text-[10.5px] font-extrabold uppercase tracking-[.08em] py-0.5">{selectedDay.monthShort}</div>
                      <div className="text-2xl font-bold text-[var(--ink, #131313)] py-1 leading-tight">{selectedDay.dayNum}</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[var(--ink, #131313)]">{fmtDateFull(new Date(selectedDay.date))}, {selectedSlot.startLocal}</div>
                      <div className="text-sm text-[var(--muted, #7E8088)] mt-0.5">{selectedType.title} · {selectedType.duration} · {selectedType.location}</div>
                    </div>
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-[.11em] text-[var(--charcoal, #2D3436)] mb-3">What happens next</p>
                  <ol className="list-none m-0 p-0 counter-reset-[n]">
                    {[
                      <li key="1"><b>A confirmation email arrives</b> with the studio address, where to park, and what to wear. Nothing special — ordinary clothes you can move in.</li>,
                      <li key="2"><b>A short health form</b> follows a day or two later. It takes about five minutes, and it means Esther can prepare rather than ask you everything on the day.</li>,
                      <li key="3"><b>A reminder</b> the day before, with a link to change the time if you need to.</li>,
                    ].map((li, i) => (
                      <li key={i} className="relative pl-10 pb-3.5 text-[14.5px] leading-relaxed last:pb-0">
                        <span className="absolute left-0 top-0.5 w-[26px] h-[26px] rounded-full bg-[rgba(193,131,159,.10)] border border-[rgba(193,131,159,.30)] text-[#94566F] grid place-items-center text-xs font-extrabold">
                          {i + 1}
                        </span>
                        {li}
                      </li>
                    ))}
                  </ol>

                  <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-[var(--warm-bd, #E4DDD7)]">
                    <a href="/portal/login" className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-[var(--ink, #131313)] text-white text-sm font-bold no-underline hover:bg-[#2E2E2E]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" /></svg>
                      Add to my calendar
                    </a>
                  </div>

                  <p className="mt-4 p-3.5 rounded-[14px] bg-[var(--warm, #F5EFEA)] text-[13.5px] leading-relaxed">
                    <b className="text-[var(--ink, #131313)]">Changing your mind is fine.</b> Use the link in your email, or
                    call the studio, any time up to <b className="text-[var(--ink, #131313)]">24 hours</b> before. There is no charge for a first
                    assessment or a call, whenever you cancel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--cream, #FCF8F4)", paddingBottom: "96px" }}>
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-[60] bg-white/93 backdrop-blur-[10px] border-b border-[var(--warm-bd, #E4DDD7)]">
        <div className="max-w-[1180px] mx-auto px-5 flex items-center gap-3.5 min-h-[62px]">
          <EFLogo />
          <div className="ml-auto flex items-center gap-1">
            <a href="/" className="hidden sm:inline text-[13.5px] font-semibold text-[var(--muted, #7E8088)] no-underline px-3 py-2.5 rounded-full hover:bg-[var(--warm, #F5EFEA)] hover:text-[var(--ink, #131313)]">
              Back to the site
            </a>
            <a href="/portal/login" className="text-[13.5px] font-semibold text-[var(--charcoal, #2D3436)] no-underline px-3 py-2.5 rounded-full hover:bg-[var(--warm, #F5EFEA)]">
              Already a client? Sign in
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-[var(--ink, #131313)] text-white py-10 sm:py-[72px] sm:pb-16 relative overflow-hidden">
        <div className="absolute right-[-100px] top-[-90px] w-[340px] h-[340px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, rgba(193,131,159,.30), transparent 68%)" }} />
        <div className="max-w-[1180px] mx-auto px-5 relative z-10">
          <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[.11em] text-white/72 mb-3.5">
            <span className="w-[26px] h-0.5 bg-[var(--rose, #C1839F)] rounded-full shrink-0" />
            Book a session
          </p>
          <h1 className="text-4xl sm:text-[50px] font-bold leading-[1.07] tracking-[-.03em] m-0 mb-3.5 max-w-[26ch]" style={{ fontFamily: "var(--serif)" }}>
            Start with a <em className="not-italic" style={{ color: "var(--rose, #C1839F)" }}>conversation</em>, not a contract.
          </h1>
          <p className="text-[15.5px] sm:text-lg leading-[1.62] text-white/68 font-light m-0 max-w-[56ch]">
            Everyone begins the same way — we talk about where you are now, what you have been told,
            and what you would like to be able to do again. Then we decide together whether training
            here is right for you.
          </p>
          <div className="flex flex-wrap gap-2 mt-5.5">
            {[
              "Private studio, Worthing",
              "One-to-one only, never a class",
              "GP and exercise referrals welcome",
            ].map((chip) => (
              <span key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-white/17 px-3.5 py-[7px] text-[12.5px] font-semibold text-white/87">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stepper ── */}
      <nav className="bg-[var(--warm, #F5EFEA)] border-b border-[var(--warm-bd, #E4DDD7)] sticky top-[62px] z-50">
        <div className="max-w-[1180px] mx-auto px-5 flex gap-1 overflow-x-auto py-2.5 scrollbar-none">
          {[
            { n: 1, label: "What you need", ref: typeRef },
            { n: 2, label: "Pick a time", ref: whenRef },
            { n: 3, label: "Your details", ref: youRef },
          ].map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => s.ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className={cn(
                "inline-flex items-center gap-2.5 flex-shrink-0 border-0 rounded-full px-3.5 py-[7px] cursor-pointer text-[13px] font-semibold transition-colors",
                step === s.n
                  ? "text-[var(--ink, #131313)] bg-white shadow-[0_1px_3px_rgba(30,24,20,.08)]"
                  : step > s.n
                    ? "text-[var(--charcoal, #2D3436)] bg-transparent"
                    : "text-[var(--muted, #7E8088)] bg-transparent hover:bg-white/75"
              )}
            >
              <span
                className={cn(
                  "w-[23px] h-[23px] rounded-full shrink-0 grid place-items-center text-[11.5px] font-extrabold",
                  step >= s.n
                    ? "bg-[var(--rose, #C1839F)] border border-[var(--rose, #C1839F)] text-white"
                    : "bg-white border border-[var(--warm-bd, #E4DDD7)] text-[var(--muted, #7E8088)]"
                )}
              >
                {s.n}
              </span>
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Flow canvas ── */}
      <main className="py-7 sm:py-9">
        <div className="max-w-[1180px] mx-auto px-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-9 items-start">

            <div className="space-y-5">
              {/* ══ STEP 1: Session type ══ */}
              <section ref={typeRef} className="bg-white border border-[var(--warm-bd, #E4DDD7)] rounded-[18px] shadow-[0_4px_16px_rgba(30,24,20,.04),0_20px_48px_rgba(30,24,20,.07)] p-5 sm:p-7 scroll-mt-[120px]">
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[.11em] text-[var(--charcoal, #2D3436)] mb-2">Step one</p>
                  <h2 className="text-[25px] sm:text-[32px] font-bold tracking-tight m-0 mb-2 max-w-[30ch] leading-tight" style={{ fontFamily: "var(--serif)" }}>What would you like to book?</h2>
                  <p className="m-0 text-[15px] max-w-[60ch] text-[var(--body, #525A61)]">
                    Both options are with Esther Fair, a Level 4 trainer specialising in cancer
                    rehabilitation, exercise referral and complex conditions. Neither commits you to anything.
                  </p>
                </div>

                <div className="grid gap-3">
                  {SESSION_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => selectType(type)}
                      className={cn(
                        "relative w-full text-left bg-white border-[1.5px] rounded-[14px] px-4 py-4 pl-[50px] cursor-pointer transition-colors",
                        selectedType?.id === type.id
                          ? "border-[var(--rose, #C1839F)] bg-[rgba(193,131,159,.10)]"
                          : "border-[var(--warm-bd, #E4DDD7)] hover:border-[var(--rose, #C1839F)] hover:bg-[var(--cream, #FCF8F4)]"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-4 top-[19px] w-5 h-5 rounded-full border-2 transition-colors",
                          selectedType?.id === type.id
                            ? "border-[var(--rose, #C1839F)] border-[6px]"
                            : "border-[#CBC2BB] bg-white"
                        )}
                      />
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-[17.5px] font-bold text-[var(--ink, #131313)] tracking-tight leading-tight">{type.title}</span>
                        {type.tag && (
                          <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] bg-[var(--rose, #C1839F)] text-white rounded-full px-2.5 py-[3px] whitespace-nowrap">
                            {type.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5 text-[12.5px] text-[var(--charcoal, #2D3436)] font-semibold">
                        <span>{type.duration}</span>
                        <span>·</span>
                        <span>{type.location}</span>
                      </div>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--body, #525A61)] m-0">{type.description}</p>
                      {type.note && (
                        <p className="mt-2.5 text-[13px] text-[var(--charcoal, #2D3436)] bg-[var(--warm, #F5EFEA)] rounded-[10px] px-3 py-2.5 leading-relaxed m-0">{type.note}</p>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 mt-4 p-3.5 rounded-[14px] bg-[rgba(8,126,139,.09)] border border-[rgba(8,126,139,.22)] text-sm leading-relaxed">
                  <svg className="w-[19px] h-[19px] text-[var(--teal, #087E8B)] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
                  <div>
                    <b className="text-[var(--ink, #131313)] block mb-0.5">If neither quite fits, say so.</b>
                    Fatigue, treatment cycles and mobility all change what is possible on a given day.
                    Book the call and we will work around it — you will not be asked to fit a template.
                  </div>
                </div>
              </section>

              {/* ══ STEP 2: Availability ══ */}
              <section ref={whenRef} className="bg-white border border-[var(--warm-bd, #E4DDD7)] rounded-[18px] shadow-[0_4px_16px_rgba(30,24,20,.04),0_20px_48px_rgba(30,24,20,.07)] p-5 sm:p-7 scroll-mt-[120px]">
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[.11em] text-[var(--charcoal, #2D3436)] mb-2">Step two</p>
                  <h2 className="text-[25px] sm:text-[32px] font-bold tracking-tight m-0 mb-2 max-w-[30ch] leading-tight" style={{ fontFamily: "var(--serif)" }}>Pick a time that suits you</h2>
                  <p className="m-0 text-[15px] max-w-[60ch] text-[var(--body, #525A61)]">
                    These are Esther&apos;s genuine studio hours, straight from her diary. Choosing a slot holds
                    it immediately — no waiting to find out whether it was still free.
                  </p>
                </div>

                {/* Week nav */}
                <div className="flex items-center gap-2.5 mb-3">
                  <button
                    type="button"
                    disabled={weekIdx === 0}
                    onClick={() => { const w = weekIdx - 1; setWeekIdx(w); setDayIdx(findFirstOpen(w)); }}
                    className="w-11 h-11 shrink-0 rounded-full border border-[var(--warm-bd, #E4DDD7)] bg-white grid place-items-center disabled:text-[#C6BEB8] disabled:cursor-not-allowed hover:bg-[var(--warm, #F5EFEA)]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  </button>
                  <div className="flex-1 text-center">
                    <b className="block text-[15.5px] font-bold text-[var(--ink, #131313)]">{currentWeek?.label ?? "Loading…"}</b>
                    <span className="block text-[12.5px] text-[var(--muted, #7E8088)]">{currentWeek?.range ?? ""}</span>
                  </div>
                  <button
                    type="button"
                    disabled={weekIdx >= weeks.length - 1}
                    onClick={() => { const w = weekIdx + 1; setWeekIdx(w); setDayIdx(findFirstOpen(w)); }}
                    className="w-11 h-11 shrink-0 rounded-full border border-[var(--warm-bd, #E4DDD7)] bg-white grid place-items-center disabled:text-[#C6BEB8] disabled:cursor-not-allowed hover:bg-[var(--warm, #F5EFEA)]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                </div>

                <p className="flex items-start gap-2 text-[12.5px] text-[var(--muted, #7E8088)] font-medium leading-relaxed mb-4">
                  <svg className="w-3.5 h-3.5 text-[var(--teal, #087E8B)] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
                  All times are UK time and update the moment Esther changes her diary. You can book up to eight weeks ahead.
                </p>

                {/* Day rail */}
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4 sm:grid sm:grid-cols-7 sm:gap-2.5 sm:overflow-visible">
                  {currentWeek?.days.map((d, i) => {
                    const open = d.state === "open" && d.slots.length > 0;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        disabled={!open}
                        aria-pressed={i === dayIdx && open}
                        onClick={() => { setDayIdx(i); setSelectedSlot(null); }}
                        className={cn(
                          "flex-shrink-0 w-[68px] sm:w-auto rounded-[14px] border-[1.5px] border-[var(--warm-bd, #E4DDD7)] bg-white py-2.5 px-1 text-center cursor-pointer transition-colors",
                          i === dayIdx && open ? "bg-[var(--ink, #131313)] border-[var(--ink, #131313)]" : "",
                          !open && "bg-[var(--warm, #F5EFEA)] cursor-not-allowed"
                        )}
                      >
                        <span className={cn("block text-[11px] font-bold uppercase tracking-[.07em]", i === dayIdx && open ? "text-white" : "text-[var(--muted, #7E8088)]")}>{d.dayShort}</span>
                        <span className={cn("block text-xl font-bold leading-tight tabular-nums", i === dayIdx && open ? "text-white" : "text-[var(--ink, #131313)]")}>{d.dayNum}</span>
                        <span className={cn("block text-[11px] font-bold mt-0.5", i === dayIdx && open ? "text-[var(--rose, #C1839F)]" : open ? "text-[var(--teal, #087E8B)]" : "text-[var(--muted, #7E8088)] font-semibold")}>
                          {d.state === "open" ? `${d.slots.length} slots` : d.state === "full" ? "Full" : d.state === "past" ? "Gone" : "Closed"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Slots */}
                <div className="bg-[var(--cream, #FCF8F4)] border border-[var(--warm-bd, #E4DDD7)] rounded-[14px] p-4">
                  {loading ? (
                    <div className="text-center py-6 text-sm text-[var(--muted, #7E8088)]">Loading availability…</div>
                  ) : currentDay && currentDay.state === "open" && currentDay.slots.length > 0 ? (
                    <>
                      <p className="text-[15px] font-bold text-[var(--ink, #131313)] m-0 mb-0.5">{currentDay.dayName} {currentDay.dayNum} {currentDay.monthShort}</p>
                      <p className="text-[13px] text-[var(--muted, #7E8088)] m-0 mb-3.5">
                        {currentDay.slots.length} {currentDay.slots.length === 1 ? "time" : "times"} free
                        {selectedType ? ` · ${selectedType.title}, ${selectedType.duration}` : ""}
                        {" "}· every session ends on time, with a gap after it
                      </p>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
                        {currentDay.slots.map((slot) => {
                          const isSelected = selectedSlot?.startLocal === slot.startLocal && selectedSlot?.date === slot.date;
                          return (
                            <button
                              key={slot.startLocal}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => selectSlot(slot, currentDay)}
                              className={cn(
                                "min-h-[54px] rounded-xl border-[1.5px] border-[var(--warm-bd, #E4DDD7)] bg-white text-[var(--ink, #131313)] text-[15px] font-bold tabular-nums flex flex-col items-center justify-center gap-px transition-colors",
                                isSelected
                                  ? "bg-[var(--rose, #C1839F)] border-[var(--rose, #C1839F)] text-white"
                                  : "hover:border-[var(--rose, #C1839F)] hover:bg-[rgba(193,131,159,.10)]"
                              )}
                            >
                              {slot.startLocal}
                              <small className={cn("text-[11px] font-semibold", isSelected ? "text-white/88" : "text-[var(--muted, #7E8088)]")}>
                                to {slot.endLocal}
                              </small>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : currentDay ? (
                    <div className="text-center py-6">
                      <p className="text-[16.5px] font-bold text-[var(--ink, #131313)] m-0 mb-1">{currentDay.dayName} {currentDay.dayNum} {currentDay.monthShort}</p>
                      <p className="text-sm text-[var(--muted, #7E8088)] m-0">{currentDay.reason ?? "No free slots on this day."}</p>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* ══ STEP 3: Details form ══ */}
              <section ref={youRef} className="bg-white border border-[var(--warm-bd, #E4DDD7)] rounded-[18px] shadow-[0_4px_16px_rgba(30,24,20,.04),0_20px_48px_rgba(30,24,20,.07)] p-5 sm:p-7 scroll-mt-[120px]">
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[.11em] text-[var(--charcoal, #2D3436)] mb-2">Step three</p>
                  <h2 className="text-[25px] sm:text-[32px] font-bold tracking-tight m-0 mb-2 max-w-[30ch] leading-tight" style={{ fontFamily: "var(--serif)" }}>A little about you</h2>
                  <p className="m-0 text-[15px] max-w-[60ch] text-[var(--body, #525A61)]">
                    Only what Esther needs in order to prepare properly. Your answers go straight into your
                    client record, so you will not be asked them again.
                  </p>
                </div>

                <div className="grid gap-4">
                  <FormField label="Your name" required error={errors.name}>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" className={cn(formInputClass, errors.name && "border-[var(--danger, #8A4E63)]")} />
                  </FormField>
                  <FormField label="Phone" required error={errors.phone}>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="07…" className={cn(formInputClass, errors.phone && "border-[var(--danger, #8A4E63)]")} />
                  </FormField>
                  <FormField label="Email" required error={errors.email} hint="Your confirmation, your reminder, and any change to the time all go here." className="sm:col-span-2">
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className={cn(formInputClass, errors.email && "border-[var(--danger, #8A4E63)]")} />
                  </FormField>
                  <FormField label="What would you like help with?" className="sm:col-span-2">
                    <textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="In your own words — a diagnosis, surgery you are recovering from, pain that stops you doing something, or simply that you have been told exercise is not for you." className={cn(formInputClass, "min-h-[106px] resize-y")} />
                    <span className="text-[12.5px] text-[var(--muted, #7E8088)] leading-relaxed">As much or as little as you like. Nothing written here is shared outside the studio.</span>
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="How did you come to us?">
                      <select value={referral} onChange={(e) => setReferral(e.target.value)} className={formInputClass}>
                        <option>Please choose</option>
                        <option>GP or exercise referral</option>
                        <option>Cancer rehabilitation referral</option>
                        <option>Recommended by someone</option>
                        <option>Found Eternal Fitness online</option>
                        <option>Prefer not to say</option>
                      </select>
                    </FormField>
                    <FormField label="Anything about access we should know?">
                      <input value={access} onChange={(e) => setAccess(e.target.value)} placeholder="Steps, parking, a chaperone, hearing loop…" className={formInputClass} />
                    </FormField>
                  </div>
                  <div className={cn("sm:col-span-2", errors.consent && "f-invalid")}>
                    <label className="flex gap-2.5 items-start cursor-pointer text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="w-[21px] h-[21px] min-h-0 shrink-0 mt-0.5 accent-[var(--rose, #C1839F)]"
                      />
                      <span>
                        Esther may contact me about this booking by phone, text or email. She will not
                        add me to a mailing list, and there is no marketing.
                      </span>
                    </label>
                    {errors.consent && <span className="text-[12.5px] font-semibold text-[var(--danger, #8A4E63)] mt-1 block">Please tick this so Esther is able to confirm your booking.</span>}
                  </div>
                </div>
              </section>
            </div>

            {/* ── Summary rail (desktop) ── */}
            <aside className="hidden lg:block sticky top-[134px]">
              <div className="bg-[var(--ink, #131313)] text-white rounded-[18px] p-5 shadow-[0_8px_32px_rgba(0,0,0,.14)]">
                <h3 className="text-[23px] font-bold m-0 mb-4 tracking-tight" style={{ fontFamily: "var(--serif)" }}>Your booking</h3>

                <div className="flex gap-3 py-3 border-t border-white/11 first:border-t-0 first:pt-0">
                  <svg className="w-4 h-4 text-[var(--rose, #C1839F)] shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[.08em] text-white/48">Session</div>
                    <div className={cn("text-[14.5px] font-semibold leading-snug", selectedType ? "text-white" : "text-white/46 italic font-normal")}>
                      {selectedType ? `${selectedType.title} · ${selectedType.duration}` : "Not chosen yet"}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 py-3 border-t border-white/11">
                  <svg className="w-4 h-4 text-[var(--rose, #C1839F)] shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[.08em] text-white/48">Date and time</div>
                    <div className={cn("text-[14.5px] font-semibold leading-snug", selectedSlot && selectedDay ? "text-white" : "text-white/46 italic font-normal")}>
                      {selectedSlot && selectedDay ? `${selectedDay.dayName} ${selectedDay.dayNum} ${selectedDay.monthShort}, ${selectedSlot.startLocal}` : "Not chosen yet"}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 py-3 border-t border-white/11">
                  <svg className="w-4 h-4 text-[var(--rose, #C1839F)] shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[.08em] text-white/48">Where</div>
                    <div className={cn("text-[14.5px] font-semibold leading-snug", selectedType ? "text-white" : "text-white/46 italic font-normal")}>
                      {selectedType ? selectedType.location : "Set by the session type"}
                    </div>
                  </div>
                </div>

                <p className="text-[12.5px] leading-relaxed text-white/64 mt-4 pt-4 border-t border-white/11">
                  <b className="text-white">Free to change or cancel</b> up to 24 hours before. There is no
                  charge for a first assessment or a call, whenever you cancel.
                </p>

                <button
                  type="button"
                  disabled={!ready}
                  onClick={handleSubmit}
                  className={cn(
                    "w-full mt-4 min-h-[48px] rounded-full border-0 text-[15px] font-bold cursor-pointer transition-colors",
                    ready
                      ? "bg-[var(--rose, #C1839F)] text-white hover:bg-[var(--rose-deep, #B0728F)]"
                      : "bg-[#DAD2CC] text-[#6F6A66] cursor-not-allowed"
                  )}
                >
                  {!selectedType ? "Choose a session type" : !selectedSlot ? "Choose a time" : "Confirm this booking"}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* ── Mobile confirm bar ── */}
      <div className="fixed left-0 right-0 bottom-0 z-[70] bg-white/97 backdrop-blur-[10px] border-t border-[var(--warm-bd, #E4DDD7)] px-4 py-2.5 flex items-center gap-3 shadow-[0_-6px_24px_rgba(30,24,20,.09)] sm:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--muted, #7E8088)]">
            {!selectedType ? "Nothing chosen yet" : ready ? selectedType.title : "Choose a time"}
          </div>
          <div className="text-sm font-bold text-[var(--ink, #131313)] truncate">
            {selectedSlot && selectedDay
              ? `${selectedDay.dayShort} ${selectedDay.dayNum} ${selectedDay.monthShort}, ${selectedSlot.startLocal}`
              : selectedType
                ? selectedType.title
                : "Pick a session and a time"}
          </div>
        </div>
        <button
          type="button"
          disabled={!ready}
          onClick={handleSubmit}
          className={cn(
            "shrink-0 min-h-[44px] px-4 rounded-full border-0 text-sm font-bold cursor-pointer",
            ready
              ? "bg-[var(--rose, #C1839F)] text-white"
              : "bg-[#DAD2CC] text-[#6F6A66] cursor-not-allowed"
          )}
        >
          {ready ? "Confirm" : "Next"}
        </button>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-[var(--warm, #F5EFEA)] border-t border-[var(--warm-bd, #E4DDD7)] py-9 px-5">
        <div className="max-w-[1180px] mx-auto grid gap-6">
          <div className="grid gap-6 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-[var(--charcoal, #2D3436)] m-0 mb-2.5">Eternal Fitness</h4>
              <p className="text-[14.5px] leading-[1.7] m-0 text-[var(--body, #525A61)]">
                A private one-to-one studio in Worthing, West Sussex, run by Esther Fair — Level 4
                personal trainer, cancer rehabilitation and exercise referral.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-[var(--charcoal, #2D3436)] m-0 mb-2.5">The studio</h4>
              <p className="text-[14.5px] leading-[1.7] m-0 text-[var(--body, #525A61)]">
                Worthing, West Sussex<br />Full address arrives with your confirmation
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-[.11em] text-[var(--charcoal, #2D3436)] m-0 mb-2.5">Already training here?</h4>
              <a href="/portal/login" className="block text-[14.5px] leading-[1.7] text-[var(--body, #525A61)] no-underline hover:text-[var(--ink, #131313)] hover:underline">Sign in and book from your block</a>
            </div>
          </div>
          <p className="text-[12.5px] text-[var(--muted, #7E8088)] leading-relaxed pt-4 border-t border-[var(--warm-bd, #E4DDD7)]">
            Booked here, held here. No third-party booking service, and your health
            information never leaves Eternal Fitness.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function EFLogo() {
  return (
    <svg height="30" viewBox="0 0 142 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 29.5C10.5 23.8 4.5 18.5 4.5 12.8C4.5 8.3 7.9 5.3 11.8 5.3C14.4 5.3 16.8 6.8 18 9.2C19.2 6.8 21.6 5.3 24.2 5.3C28.1 5.3 31.5 8.3 31.5 12.8C31.5 18.5 25.5 23.8 18 29.5Z" fill="#C1839F" transform="translate(3,6) scale(0.78)" />
      <text x="42" y="17" fontFamily="'DM Sans', Arial, sans-serif" fontWeight="800" fontSize="15" letterSpacing="4.3" fill="#131313">ETERNAL</text>
      <text x="42" y="34" fontFamily="'DM Sans', Arial, sans-serif" fontWeight="500" fontSize="10.5" letterSpacing="8.67" fill="#C1839F">FITNESS</text>
    </svg>
  );
}

function FormField({
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[12.5px] font-bold text-[var(--charcoal, #2D3436)]">
        {label} {required && <span className="text-[#94566F]">*</span>}
      </label>
      {children}
      {hint && <span className="text-[12.5px] text-[var(--muted, #7E8088)] leading-relaxed">{hint}</span>}
    </div>
  );
}

const formInputClass =
  "w-full min-h-[48px] border border-[#D6CEC7] rounded-xl px-3.5 py-3 text-[15.5px] bg-white text-[var(--ink, #131313)] leading-[1.5] focus:outline-none focus:border-[var(--rose, #C1839F)] focus:shadow-[0_0_0_3px_rgba(193,131,159,.30)]";
