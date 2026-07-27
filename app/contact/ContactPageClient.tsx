"use client";

import { useState } from "react";
import { IconArrowUpRight, IconPhone, IconMail, IconMapPin, IconMessageCircle } from "@/components/icons";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialIcon from "@/components/SocialIcons";
import { Section, SectionHeading, PageHero, StatBadge, CTABand } from "@/components/ds";

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
      toast.error("Please agree to the privacy policy before submitting.");
      return;
    }

    toast.success("Message sent! I will be in touch soon.");
    setForm(initialForm);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <PageHero
        image="/images/contact-hero.jpg"
        imageAlt="Contact Eternal Fitness in Worthing"
        eyebrow={content.hero_eyebrow ?? "Contact"}
        heading={content.hero_heading ?? "Get in Touch"}
        subhead={content.hero_subhead ?? "Whether you have a question, want to learn more, or are ready to book your free consultation — I would love to hear from you."}
        primaryCta={{ label: content.hero_btn_primary ?? "Send a Message", href: "#form", arrow: true }}
        secondaryCta={{ label: content.hero_btn_secondary ?? "Find the Studio", href: "#map", variant: "ghost-white" }}
        badge={<StatBadge value={content.badge_value ?? "Free"} label={content.badge_label ?? "First conversation"} sublabel={content.badge_sublabel ?? "No pressure, no commitment"} />}
      />

      {/* Contact Form + Info */}
      <Section background="white" id="form">
          <SectionHeading align="center" eyebrow={content.form_eyebrow ?? "Contact"} heading={content.form_heading ?? "Send Me a Message"} />
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto" style={{ marginTop: 48 }}>
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1.5">
                    {content.form_firstname_label ?? "First Name"} <span className="text-rose">*</span>
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
                    {content.form_lastname_label ?? "Last Name"}
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
                  placeholder="Tell me a bit about yourself and what you are looking for..."
                  className="w-full px-4 py-3 rounded-xl border border-border-warm bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-rose/30 resize-none"
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="agree"
                  name="agree"
                  type="checkbox"
                  checked={form.agree}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-border-warm accent-rose"
                />
                <label htmlFor="agree" className="text-sm ef-body">
                  I agree to the{" "}
                  <a href="/terms" className="text-rose underline hover:text-rose/80 transition-colors">
                    privacy policy
                  </a>{" "}
                  and consent to being contacted about my enquiry. <span className="text-rose">*</span>
                </label>
              </div>

              <button type="submit" className="ef-btn ef-btn-primary w-full justify-center">
                {content.form_submit_btn ?? "Send Message"} <IconArrowUpRight className="w-4 h-4" />
              </button>
            </form>

            {/* Contact Info */}
            <div className="space-y-8">
              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center">
                  <IconPhone className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-bold tracking-tight mb-1">{content.info_phone_heading ?? "Phone"}</h3>
                  <a href="tel:07517658128" className="ef-body hover:text-teal transition-colors">
                    07517 658 128
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center">
                  <IconMail className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-bold tracking-tight mb-1">{content.info_email_heading ?? "Email"}</h3>
                  <a href="mailto:esther.fair@eternal-fitness.co.uk" className="ef-body hover:text-teal transition-colors">
                    esther.fair@eternal-fitness.co.uk
                  </a>
                </div>
              </div>

              {/* Studio Location */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center">
                  <IconMapPin className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-bold tracking-tight mb-1">{content.info_location_heading ?? "Studio Location"}</h3>
                  <p className="ef-body">{content.info_location_body ?? "Worthing, West Sussex"}</p>
                  <p className="ef-body text-sm mt-1 opacity-70">
                    {content.info_location_note ?? "Exact address shared after booking confirmation."}
                  </p>
                </div>
              </div>

              {/* Not sure where to start? */}
              <div className="bg-cream rounded-2xl p-6 border border-warm/60">
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

              {/* Social Icons */}
              <div>
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

      {/* Map */}
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
        heading={content.cta_heading ?? "Ready to find out if this is right for you?"}
        body={content.cta_body ?? "The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."}
        primaryCta={{ label: content.cta_btn_primary ?? "Send a Message", href: "#form" }}
        secondaryCta={{ label: content.cta_btn_secondary ?? "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      <Footer />
    </div>
  );
}
