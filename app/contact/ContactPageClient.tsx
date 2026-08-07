"use client";

import { useState } from "react";
import Image from "next/image";
import { IconArrowUpRight, IconPhone, IconMail, IconMapPin, IconCheckCircle } from "@/components/icons";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Section, SectionHeading, PageHero, CTABand } from "@/components/ds";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  agree: boolean;
}

const initialForm: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
  agree: false,
};

export default function ContactPageClient({ content = {} }: { content?: Record<string, string> }) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName.trim()) {
      toast.error("Please enter your first name.");
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
    if (!form.agree) {
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
        image="/images/consultation-warm-chat.jpg"
        imageAlt="Esther talking a client through their next set in the private Worthing studio"
        imagePan="122%"
        imageObjectPosition="50% 18%"
        imageObjectPositionWide="50% 14%"
        eyebrow={content.hero_eyebrow ?? "Contact"}
        heading={content.hero_heading ?? <>Get in <em>Touch</em></>}
        subhead={content.hero_subhead ?? "Whether you have a question, want to learn more, or are ready to book your free consultation — I would love to hear from you."}
        primaryCta={{ label: content.hero_btn_primary ?? "Send a Message", href: "#form", arrow: true }}
        secondaryCta={{ label: content.hero_btn_secondary ?? "Find the Studio", href: "#studio", variant: "outline" }}
        badge={
          <div className="flex gap-3.5 items-start max-w-[340px] rounded-2xl bg-white/95 backdrop-blur-md shadow-lg p-5">
            <div className="w-10 h-10 rounded-full bg-rose/15 flex items-center justify-center shrink-0">
              <IconPhone className="w-5 h-5 text-rose" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink tracking-tight">The first conversation is free</p>
              <p className="text-[13px] text-slate leading-relaxed mt-0.5">No pressure, no commitment — call, email, or send a message.</p>
            </div>
          </div>
        }
      />

      {/* Contact Form + Info */}
      <Section background="white" id="form">
          <SectionHeading align="center" eyebrow={content.form_eyebrow ?? "Contact"} heading={content.form_heading ?? "Send me a message"} />
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto" style={{ marginTop: 48 }}>
            {/* Form Card */}
            <div className="bg-white border border-border-warm rounded-2xl shadow-[0_4px_16px_rgba(30,24,20,.04),0_20px_48px_rgba(30,24,20,.07)] p-9 max-sm:p-7">
              {sent ? (
                <div className="text-center py-6 px-2" role="status">
                  <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-5">
                    <IconCheckCircle className="w-7 h-7 text-teal" />
                  </div>
                  <h3 className="font-serif text-[26px] text-ink mb-2">Thank you — that&apos;s with me.</h3>
                  <p className="text-[14.5px] text-slate leading-relaxed max-w-[36ch] mx-auto">
                    I&apos;ll come back to you within one working day. If it&apos;s urgent, please call 07517 658 128.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1.5">
                        {content.form_firstname_label ?? "First name"} <span className="text-[var(--rose-text)]">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="First name"
                        className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1.5">
                        {content.form_lastname_label ?? "Last name"}
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Last name"
                        className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                        {content.form_email_label ?? "Email"} <span className="text-[var(--rose-text)]">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
                        {content.form_phone_label ?? "Phone"}
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="07xxx xxx xxx"
                        className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
                      {content.form_message_label ?? "Message"} <span className="text-[var(--rose-text)]">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell me a little about what you&apos;re looking for — and anything you&apos;d like me to know before we speak."
                      className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--rose-text)] resize-none"
                    />
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <input
                      id="agree"
                      name="agree"
                      type="checkbox"
                      checked={form.agree}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 rounded border-border-warm accent-rose"
                    />
                    <label htmlFor="agree" className="text-sm ef-body leading-relaxed">
                      I&apos;m happy for Esther to contact me about this enquiry. Nothing is shared with anyone else.{" "}
                      <a href="/privacy-policy" className="text-rose underline hover:text-rose/80 transition-colors">
                        Privacy policy
                      </a>
                      .
                    </label>
                  </div>

                  <button type="submit" disabled={submitting} className="ef-btn ef-btn-primary w-full justify-center mt-1 disabled:opacity-60">
                    {submitting ? "Sending…" : (content.form_submit_btn ?? "Send Message")} <IconArrowUpRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Contact Details */}
            <div>
              <SectionHeading
                eyebrow={content.info_eyebrow ?? "Direct"}
                eyebrowColor="teal"
                heading={content.info_heading ?? "Or reach me directly"}
                className="mb-6"
              />

              <ul className="border-t border-border-warm list-none p-0 m-0">
                {/* Phone */}
                <li className="flex gap-4 py-[22px] border-b border-border-warm items-start">
                  <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 ds-card-ic-rose">
                    <IconPhone className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-[.1em] uppercase text-muted-foreground mb-[5px]">Phone</p>
                    <a href="tel:07517658128" className="text-[17px] font-semibold text-ink leading-[1.35] tracking-[-.015em] hover:text-rose transition-colors">
                      07517 658 128
                    </a>
                  </div>
                </li>

                {/* Email */}
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

                {/* Location */}
                <li className="flex gap-4 py-[22px] border-b border-border-warm items-start">
                  <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 ds-card-ic-warm">
                    <IconMapPin className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-[.1em] uppercase text-muted-foreground mb-[5px]">{content.info_location_heading ?? "Studio location"}</p>
                    <p className="text-[17px] font-semibold text-ink leading-[1.35] tracking-[-.015em]">{content.info_location_body ?? "Worthing, West Sussex"}</p>
                    <p className="text-[13.5px] text-slate leading-[1.55] mt-1">
                      {content.info_location_note ?? "Exact address shared after booking."}
                    </p>
                  </div>
                </li>
              </ul>

              <p className="mt-[26px] p-5 rounded-2xl bg-warm text-[14px] leading-relaxed text-slate">
                Prefer to talk it through? Call and we can have an informal chat — no pressure, no commitment.
              </p>
            </div>
          </div>
      </Section>

      {/* Studio (per mockup — replaces the Maps embed; the studio address is
          deliberately never shown, confirmed at booking only) */}
      <Section background="cream" id="studio">
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
              eyebrowColor="teal"
              heading={content.map_heading ?? "Find the Studio"}
              intro={content.map_intro ?? "Sessions take place in a private studio in Worthing, West Sussex. The studio is used exclusively for one-to-one training — there is no public gym floor, no other clients present, and no waiting around. The address is confirmed at the point of booking."}
            />
            <div className="flex gap-3 flex-wrap" style={{ marginTop: 28 }}>
              <a href="#form" className="ef-btn ef-btn-primary">Send a Message</a>
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
        body={content.cta_body ?? "Send me a message or give me a call and we can have an informal chat \u2014 no pressure, no commitment."}
        primaryCta={{ label: content.cta_btn_primary ?? "Call me now", href: "tel:07517658128" }}
        secondaryCta={{ label: content.cta_btn_secondary ?? "Send a message", href: "#form" }}
      />
      </main>
      <Footer />
    </div>
  );
}
