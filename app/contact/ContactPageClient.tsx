"use client";

import { useState } from "react";
import { IconArrowUpRight, IconPhone, IconMail, IconMapPin, IconMessageCircle, IconCheckCircle } from "@/components/icons";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialIcon from "@/components/SocialIcons";
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <PageHero
        image="/images/who-mobility.jpg"
        imageAlt="Two clients working through adapted mobility work in the private Worthing studio"
        imagePan="122%"
        imageObjectPosition="50% 47%"
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
                        {content.form_firstname_label ?? "First name"} <span className="text-rose">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="First name"
                        className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-rose/30"
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
                        className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-rose/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                        {content.form_email_label ?? "Email"} <span className="text-rose">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-rose/30"
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
                        className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-rose/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
                      {content.form_message_label ?? "Message"} <span className="text-rose">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell me a little about what you&apos;re looking for — and anything you&apos;d like me to know before we speak."
                      className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-rose/30 resize-none"
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

                  <button type="submit" className="ef-btn ef-btn-primary w-full justify-center mt-1">
                    {content.form_submit_btn ?? "Send Message"} <IconArrowUpRight className="w-4 h-4" />
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
                  <div className="w-[42px] h-[42px] rounded-full bg-rose/10 flex items-center justify-center shrink-0">
                    <IconPhone className="w-[18px] h-[18px] text-rose" />
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
                  <div className="w-[42px] h-[42px] rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                    <IconMail className="w-[18px] h-[18px] text-teal" />
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
                  <div className="w-[42px] h-[42px] rounded-full bg-warm flex items-center justify-center shrink-0">
                    <IconMapPin className="w-[18px] h-[18px] text-ink/60" />
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

              {/* GATE: "Not Sure Where to Start?" sidebar card — partially duplicates the closing CTA band; no mockup equivalent for the sidebar version. */}
              {/* GATE: "Follow Me" social row — no mockup equivalent. Keep both while decision is pending. */}

              <div className="bg-cream rounded-2xl p-6 border border-warm/60 mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose/15 flex items-center justify-center shrink-0 mt-0.5">
                    <IconMessageCircle className="w-5 h-5 text-rose" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-base font-bold tracking-tight mb-1">{content.help_heading ?? "Not Sure Where to Start?"}</h3>
                    <p className="text-[14.5px] text-slate leading-relaxed mb-4">
                      {content.help_body ?? "That is completely normal. Send me a message or give me a call and we can have an informal chat — no pressure, no commitment. I will help you figure out whether personal training is the right next step."}
                    </p>
                    <a
                      href="tel:07517658128"
                      className="inline-flex items-center gap-2 text-rose font-semibold text-sm hover:underline"
                    >
                      {content.help_cta ?? "Call me now"} <IconArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-foreground text-sm font-bold tracking-tight mb-3">{content.social_heading ?? "Follow Me"}</h3>
                <div className="flex items-center gap-3">
                  <a
                    href="https://www.facebook.com/profile.php?id=61576413498498"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-rose/10 flex items-center justify-center text-rose hover:bg-rose hover:text-white transition-colors"
                    aria-label="Facebook"
                  >
                    <SocialIcon name="facebook" />
                  </a>
                  <span
                    className="w-10 h-10 rounded-full bg-border-warm/50 flex items-center justify-center text-muted-foreground/40 cursor-default"
                    title="Instagram — coming soon"
                    aria-label="Instagram — coming soon"
                  >
                    <SocialIcon name="instagram" />
                  </span>
                  <span
                    className="w-10 h-10 rounded-full bg-border-warm/50 flex items-center justify-center text-muted-foreground/40 cursor-default"
                    title="YouTube — coming soon"
                    aria-label="YouTube — coming soon"
                  >
                    <SocialIcon name="youtube" />
                  </span>
                  <span
                    className="w-10 h-10 rounded-full bg-border-warm/50 flex items-center justify-center text-muted-foreground/40 cursor-default"
                    title="TikTok — coming soon"
                    aria-label="TikTok — coming soon"
                  >
                    <SocialIcon name="tiktok" />
                  </span>
                </div>
              </div>
            </div>
          </div>
      </Section>

      {/* GATE: Studio/Location section — mockup has a studio photo + "no public gym floor" copy + "Read the FAQs" button; live has a Google Maps iframe instead. Real functionality trade-off — do not delete the map, just leave a GATE comment on whether to add the mockup's content alongside it or replace it. */}
      <Section background="cream" id="map">
          <SectionHeading
            align="center"
            eyebrow={content.map_eyebrow ?? "Location"}
            eyebrowColor="teal"
            heading={content.map_heading ?? "Find the Studio"}
            intro={content.map_intro ?? "Based in Worthing, West Sussex. The private studio is easily accessible by car and public transport."}
          />
          <div className="rounded-3xl overflow-hidden border border-border-warm shadow-sm" style={{ marginTop: 48 }}>
            <iframe
              title="Eternal Fitness location in Worthing, West Sussex"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d40625.88654390968!2d-0.4005!3d50.8148!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4875a3a3a3a3a3a3%3A0x0!2sWorthing%2C+West+Sussex!5e0!3m2!1sen!2suk!4v1700000000000!5m2!1sen!2suk"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
      </Section>

      <CTABand
        image="/images/esther-headshot-smile.jpg"
        imagePosition="center 30%"
        eyebrow={content.cta_eyebrow ?? "Not Sure Where to Start?"}
        heading={content.cta_heading ?? "That is completely normal."}
        body={content.cta_body ?? "Send me a message or give me a call and we can have an informal chat \u2014 no pressure, no commitment."}
        primaryCta={{ label: content.cta_btn_primary ?? "Call me now", href: "tel:07517658128" }}
        secondaryCta={{ label: content.cta_btn_secondary ?? "Send a message", href: "#form" }}
      />
      <Footer />
    </div>
  );
}
