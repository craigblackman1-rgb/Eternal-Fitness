"use client";

import { useState } from "react";
import Image from "next/image";
import { IconArrowUpRight, IconPhone, IconMail, IconMapPin, IconCheckCircle, IconCalendar } from "@/components/icons";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Section, SectionHeading, PageHero, CTABand } from "@/components/ds";
import { useBookingModal } from "@/components/BookingModal";

interface FormData {
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  consent: boolean;
}

const initialForm: FormData = {
  name: "",
  email: "",
  phone: "",
  topic: "A general question",
  message: "",
  consent: false,
};

const TOPIC_OPTIONS = [
  "A general question",
  "Training with an injury or health condition",
  "Prices and packages",
  "Online training",
  "Something else",
];

const ASK_HINTS = [
  "Any injuries, surgery or health conditions I should know about",
  "What you would like to be able to do again, or do more easily",
  "Days and times that generally work for you",
  "Anything you are unsure or nervous about — no question is too small",
];

export default function ContactPageClient({ content = {} }: { content?: Record<string, string> }) {
  const { openBookingModal } = useBookingModal();
  const [form, setForm] = useState<FormData>(initialForm);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    if (!form.consent) {
      toast.error("Please agree before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "contact_form", ...form }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Something went wrong sending your message. Please call or email directly.");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Something went wrong sending your message. Please call or email directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
      <PageHero
        image="/images/who-mobility.jpg"
        imageAlt="Two clients working through adapted mobility work in the private Worthing studio"
        imagePan="122%"
        imageObjectPosition="50% 47%"
        eyebrow={content.hero_eyebrow ?? "Contact & Booking"}
        heading={content.hero_heading ?? <>Let&apos;s Talk About <em>Where You Are Starting From</em></>}
        subhead={content.hero_subhead ?? "There is no question too small or too complicated. Whether you are looking to get fitter, navigating an injury, or managing a health condition, let's have a relaxed, no-obligation conversation."}
        primaryCta={{ label: content.hero_btn_primary ?? "Book a Free Consultation", href: "#form", arrow: true }}
        secondaryCta={{ label: content.hero_btn_secondary ?? "Find the Studio", href: "#studio", variant: "outline" }}
        badge={
          <div className="flex gap-3.5 items-start max-w-[340px] rounded-2xl bg-white/95 backdrop-blur-md shadow-lg p-5">
            <div className="w-10 h-10 rounded-full bg-rose/15 flex items-center justify-center shrink-0">
              <IconPhone className="w-5 h-5 text-rose" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink tracking-tight">The first conversation is free</p>
              <p className="text-[13px] text-slate leading-relaxed mt-0.5">No pressure, no commitment — book online, call, or email.</p>
            </div>
          </div>
        }
      />

      {/* Book Online + Direct Contact */}
      <Section background="white" id="form">
        <div className="grid md:grid-cols-[1.15fr_.85fr] gap-16 items-start">
          {/* Book online */}
          <div>
            <SectionHeading
              eyebrow={content.booking_eyebrow ?? "Book Online"}
              heading={content.booking_heading ?? "Book your free consultation"}
              intro={content.booking_intro ?? "Choose a day and time that works for you — your first conversation is always free."}
            />
            <div className="bg-white border border-border-warm rounded-2xl shadow-[0_4px_16px_rgba(30,24,20,.04),0_20px_48px_rgba(30,24,20,.07)] p-9 max-sm:p-7" style={{ marginTop: 28 }}>
              <button
                type="button"
                onClick={openBookingModal}
                className="block w-full border-[1.5px] border-dashed border-border-warm rounded-xl bg-warm px-6 py-12 text-center hover:bg-warm/70 transition-colors"
              >
                <span className="w-10 h-10 rounded-full bg-rose/15 flex items-center justify-center mx-auto mb-3.5">
                  <IconCalendar className="w-5 h-5 text-rose" />
                </span>
                <p className="text-[15px] font-bold text-ink tracking-tight">Open the booking calendar</p>
                <p className="text-[12.5px] text-muted-foreground mt-1.5">Microsoft Bookings</p>
              </button>
              <div className="mt-[22px] pt-5 border-t border-border-warm">
                <p className="text-[11px] font-bold tracking-[.1em] uppercase text-muted-foreground mb-[5px]">Primary service</p>
                <p className="text-[15.5px] font-semibold text-ink">Initial Consult — 30 mins, new customers only</p>
              </div>
            </div>
          </div>

          {/* Direct contact */}
          <div>
            <SectionHeading
              eyebrow={content.direct_eyebrow ?? "Direct"}
              eyebrowColor="teal"
              heading={content.direct_heading ?? "Prefer to book directly?"}
              intro={content.direct_intro ?? "If you use a screen reader and find the calendar grid above cumbersome to navigate, you do not have to use it. You can skip the booking widget entirely and schedule your free 30-minute consultation by contacting me directly. Let me know what days or times suit you, and I will lock your appointment in manually."}
            />

            <ul className="border-t border-border-warm list-none p-0 m-0" style={{ marginTop: 24 }}>
              <li className="flex gap-4 py-[22px] border-b border-border-warm items-start">
                <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 ds-card-ic-rose">
                  <IconPhone className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[.1em] uppercase text-muted-foreground mb-[5px]">Call or WhatsApp</p>
                  <a href="tel:07517658128" className="text-[17px] font-semibold text-ink leading-[1.35] tracking-[-.015em] hover:text-rose transition-colors">
                    07517 658 128
                  </a>
                </div>
              </li>

              <li className="flex gap-4 py-[22px] border-b border-border-warm items-start">
                <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 ds-card-ic-teal">
                  <IconMail className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[.1em] uppercase text-muted-foreground mb-[5px]">Email</p>
                  <a href="mailto:esther.fair@eternal-fitness.co.uk" className="text-[15.5px] font-semibold text-ink leading-[1.35] tracking-[-.015em] hover:text-teal transition-colors break-all">
                    esther.fair@eternal-fitness.co.uk
                  </a>
                </div>
              </li>
            </ul>

            <p className="mt-[26px] p-5 rounded-2xl bg-warm text-[14px] leading-relaxed text-slate">
              Prefer to talk it through first? Call and we can have an informal chat — no pressure, no commitment.
              If you would rather put it in writing, <a href="#message" className="underline underline-offset-4 hover:text-rose transition-colors">send a message instead</a>.
            </p>
          </div>
        </div>
      </Section>

      {/* Contact form */}
      <Section background="cream" id="message">
        <div className="grid md:grid-cols-[.85fr_1.15fr] gap-16 items-start">
          <div>
            <SectionHeading
              eyebrow={content.message_eyebrow ?? "By Email"}
              eyebrowColor="teal"
              heading={content.message_heading ?? "Rather send a message?"}
              intro={content.message_intro ?? "If you are not ready to put something in the diary yet, write to me here instead. It comes straight through to my inbox and I answer it myself — usually within one working day."}
            />
            <ul className="list-none p-0 grid gap-[11px]" style={{ marginTop: 22 }}>
              {ASK_HINTS.map((hint) => (
                <li key={hint} className="relative pl-5 text-[14.5px] leading-relaxed text-slate">
                  <span className="absolute left-0 top-[9px] w-1.5 h-1.5 rounded-full bg-rose" aria-hidden="true" />
                  {hint}
                </li>
              ))}
            </ul>
            <p className="mt-[26px] p-5 rounded-2xl bg-white text-[14px] leading-relaxed text-slate">
              Nothing you write is shared with anyone else. If you would rather speak than type, call or WhatsApp{" "}
              <a href="tel:07517658128" className="underline underline-offset-4 hover:text-rose transition-colors">07517 658 128</a>.
            </p>
          </div>

          <div className="bg-white border border-border-warm rounded-2xl shadow-[0_4px_16px_rgba(30,24,20,.04),0_20px_48px_rgba(30,24,20,.07)] p-9 max-sm:p-7">
            {sent ? (
              <div className="text-center py-6 px-2" role="status">
                <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-5">
                  <IconCheckCircle className="w-7 h-7 text-teal" />
                </div>
                <h3 className="font-serif text-[26px] text-ink mb-2">Thank you — that&apos;s with me.</h3>
                <p className="text-[14.5px] text-slate leading-relaxed max-w-[36ch] mx-auto">
                  I read every message myself and will come back to you within one working day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ct-name" className="block text-sm font-medium text-foreground mb-1.5">
                      Your name <span className="text-[var(--rose-text)]">*</span>
                    </label>
                    <input
                      id="ct-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="ct-phone" className="block text-sm font-medium text-foreground mb-1.5">
                      Phone <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                    </label>
                    <input
                      id="ct-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="07xxx xxx xxx"
                      className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ct-email" className="block text-sm font-medium text-foreground mb-1.5">
                    Email <span className="text-[var(--rose-text)]">*</span>
                  </label>
                  <input
                    id="ct-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)]"
                  />
                </div>

                <div>
                  <label htmlFor="ct-topic" className="block text-sm font-medium text-foreground mb-1.5">
                    What is your message about?
                  </label>
                  <select
                    id="ct-topic"
                    name="topic"
                    value={form.topic}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)]"
                  >
                    {TOPIC_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ct-message" className="block text-sm font-medium text-foreground mb-1.5">
                    Your message <span className="text-[var(--rose-text)]">*</span>
                  </label>
                  <textarea
                    id="ct-message"
                    name="message"
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell me a little about where you are starting from."
                    className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)] resize-none"
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    id="ct-consent"
                    name="consent"
                    type="checkbox"
                    checked={form.consent}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-border-warm accent-rose"
                  />
                  <label htmlFor="ct-consent" className="text-sm ef-body leading-relaxed">
                    I am happy for Esther to reply to me by email or phone about this enquiry.
                  </label>
                </div>

                <button type="submit" disabled={submitting} className="ef-btn ef-btn-primary w-full justify-center mt-1 disabled:opacity-60">
                  {submitting ? "Sending…" : "Send message"} <IconArrowUpRight className="w-4 h-4" />
                </button>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  Fields marked <span className="text-[var(--rose-text)]">*</span> are required. Your details are used only to reply to you — never shared, never added to a mailing list.
                </p>
              </form>
            )}
          </div>
        </div>
      </Section>

      {/* Studio (the studio address is deliberately never shown, confirmed at booking only) */}
      <Section background="white" id="studio">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <figure className="m-0">
            <div className="rounded-3xl overflow-hidden aspect-[4/3] relative">
              <Image src="/images/mobility-hip-flexor-stretch.jpg" alt="Esther and a client working through a kneeling hip stretch on the mats in the private Worthing studio" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
            </div>
            <figcaption className="ds-figcaption">Private studio, Worthing — one client at a time</figcaption>
          </figure>
          <div>
            <SectionHeading
              eyebrow={content.map_eyebrow ?? "Location"}
              heading={content.map_heading ?? "Studio location details"}
              intro={content.map_intro ?? "If you have successfully booked your slot via the calendar above, your appointment is confirmed. Sessions take place in a private studio in Worthing, West Sussex, used exclusively for one-to-one training — there is no public gym floor, no other clients present, and no waiting around."}
            />
            <ul className="border-t border-border-warm list-none p-0 m-0" style={{ marginTop: 22 }}>
              <li className="flex gap-4 py-[22px] border-b border-border-warm items-start">
                <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 ds-card-ic-warm">
                  <IconMapPin className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[.1em] uppercase text-muted-foreground mb-[5px]">Location</p>
                  <p className="text-[17px] font-semibold text-ink leading-[1.35] tracking-[-.015em]">Private Studio, Worthing, West Sussex</p>
                </div>
              </li>
            </ul>
            <p className="mt-[26px] p-5 rounded-2xl bg-warm text-[14px] leading-relaxed text-slate">
              Note: the exact studio address and parking details will be shared with you immediately via email after booking.
            </p>
            <div className="flex gap-3 flex-wrap" style={{ marginTop: 28 }}>
              <button type="button" onClick={openBookingModal} className="ef-btn ef-btn-primary">
                Book a Free Consultation
              </button>
              <a href="/faqs" className="ef-btn ef-btn-outline">Read the FAQs</a>
            </div>
          </div>
        </div>
      </Section>

      <CTABand
        image="/images/esther-headshot-smile.jpg"
        imageAlt="Esther Fair smiling"
        imagePosition="center 30%"
        eyebrow={content.cta_eyebrow ?? "Not Sure Where to Start?"}
        heading={content.cta_heading ?? "That is completely normal."}
        body={content.cta_body ?? "Book online or give me a call and we can have an informal chat — no pressure, no commitment."}
        primaryCta={{ label: content.cta_btn_primary ?? "Call me now", href: "tel:07517658128" }}
        secondaryCta={{ label: content.cta_btn_secondary ?? "Book online", href: "#form" }}
      />
      </main>
      <Footer />
    </div>
  );
}
