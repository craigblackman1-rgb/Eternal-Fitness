"use client";

import Link from "next/link";
import { IconArrowUpRight, IconCheck, IconTarget, IconAward, IconEye } from "@/components/icons";
import Navbar from "@/components/Navbar";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import { BOOKINGS_URL } from "@/lib/booking";
import { useBookingModal } from "@/components/BookingModal";
import {
  Section,
  SectionHeading,
  PageHero,
  CTABand,
  Reveal,
} from "@/components/ds";

export default function PricingPageClient({ content = {} }: { content?: Record<string, string> }) {
  const { openBookingModal } = useBookingModal();
  const investingCards = [
    {
      title: content.value_card_1_title ?? "Undivided Attention",
      body: content.value_card_1_body ?? "One person. One trainer. Your programme is entirely custom-built and dynamically adjusted to how your body feels each day — never a generic template.",
      icon: IconTarget,
      accent: "rose" as const,
    },
    {
      title: content.value_card_2_title ?? "True Professional Specialism",
      body: content.value_card_2_body ?? "As a Level 4 Specialist and GP Referral Coach, you are investing in advanced expertise. If your health picture shifts, your training adapts safely so you can keep moving forward.",
      icon: IconAward,
      accent: "teal" as const,
    },
    {
      title: content.value_card_3_title ?? "Honest, Transparent Terms",
      body: content.value_card_3_body ?? "Everything is laid out clearly upfront. No hidden costs, no unexpected changes, and an honest recommendation on the best framework for your life.",
      icon: IconEye,
      accent: "rose" as const,
    },
  ];
  const plans = [
    {
      name: content.plan_2_name ?? "Block of 12",
      price: "£480",
      per: "£40 per session",
      popular: true,
      description: content.plan_2_desc ?? "Our most popular entry point. Provides the ideal momentum to build consistency and real-world functional strength.",
      features: [
        content.plan_2_feat_1 ?? "12 x 60-minute, fully private one-to-one sessions.",
        content.plan_2_feat_2 ?? "Continuous programme review and dynamic adjustments included.",
        content.plan_2_feat_3 ?? "Valid for 120 days from the date of purchase.",
      ],
      cta: content.plan_2_cta ?? "Book a Free Consultation",
      depositNote: content.plan_2_deposit_note ?? "Note: A £100 non-refundable deposit is required to secure your regular time slots, which is fully deducted from your first block payment.",
    },
    {
      name: content.plan_3_name ?? "Block of 24",
      price: "£840",
      per: "£35 per session — Save £120",
      popular: false,
      description: content.plan_3_desc ?? "Our best value choice. Designed for longer-term progress, specific athletic milestones, or managing complex health and rehabilitation needs.",
      features: [
        content.plan_3_feat_1 ?? "24 x 60-minute one-to-one sessions",
        content.plan_3_feat_2 ?? "Continuous programme review and dynamic adjustments included.",
        content.plan_3_feat_3 ?? "Valid for 240 days from the date of purchase.",
      ],
      cta: content.plan_3_cta ?? "Book a Free Consultation",
    },
  ];
  const monthlyPlan = {
    name: content.plan_b_name ?? "Ongoing Monthly Training",
    price: content.plan_b_price ?? "Contact for Monthly Rates",
    description: content.plan_b_desc ?? "Commit to your long-term health with a structured, rolling arrangement. Payments are due every 4 weeks to secure your ongoing priority slots.",
    features: [
      content.plan_b_feat_1 ?? "Minimum initial term of 3 months (12 weeks) to establish real, sustainable change.",
      content.plan_b_feat_2 ?? "One calendar month's written notice required for cancellation after the initial term.",
      content.plan_b_feat_3 ?? "Includes priority scheduling and continuous, seamless programme management.",
    ],
    cta: content.plan_b_cta ?? "Book a Free Consultation",
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
        imageObjectPositionWide="50% 44%"
        eyebrow={content.hero_eyebrow ?? "Pricing"}
        heading={content.hero_heading ?? <>Simple, <em>Straightforward</em> Pricing</>}
        subhead={content.hero_subhead ?? "One-to-one training, in blocks of 12 or 24 sessions — in the studio or online. I start with a free consultation, so you only book what you actually need."}
        primaryCta={{ label: content.hero_btn_primary ?? "Book a Free Consultation", href: BOOKINGS_URL, arrow: true }}
        secondaryCta={{ label: content.hero_btn_secondary ?? "See Pricing", href: "#pricing" }}
      />

      {/* What You're Investing In (3-item benefit grid) */}
      <Section background="cream" id="investing">
        <div className="ds-head">
          <p className="ds-eyebrow ds-eyebrow-teal">{content.value_eyebrow ?? "What You're Investing In"}</p>
        </div>
        <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-5" stagger={0.12} y={40} style={{ marginTop: 24 }}>
          {investingCards.map((c) => (
            <div key={c.title} className="ds-card" style={{ border: "2px solid var(--color-teal)" }}>
              <div className={`ds-card-ic ds-card-ic-${c.accent}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <h4 className="ds-card-title">{c.title}</h4>
              <p className="ds-card-body">{c.body}</p>
            </div>
          ))}
        </Reveal>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button type="button" onClick={openBookingModal} className="ef-btn ef-btn-primary">Book a Free Consultation</button>
        </div>
        <p className="ds-body" style={{ textAlign: "center", marginTop: 24, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
          {content.value_body ?? "The first conversation is always free. After that, I'll recommend the block that actually fits your goals — not the most expensive option."}
        </p>
      </Section>

      {/* Pricing Cards */}
      <Section background="cream" id="pricing">
        <SectionHeading
          eyebrow={content.pricing_eyebrow ?? "Pricing"}
          heading={content.pricing_heading ?? "Choose Your Training Structure"}
        />
        <div style={{ maxWidth: 760, margin: "0 auto 32px" }}>
          <p className="ds-card-title" style={{ marginBottom: 8 }}>{content.pricing_option_a_label ?? "Option A: Fixed Session Blocks"}</p>
          <p className="ds-body">{content.pricing_option_a_desc ?? "Perfect for those who want a structured runway to build momentum, or individuals navigating specific health boundaries at a set pace."}</p>
        </div>
        <Reveal className="ds-grid-2" stagger={0.13} y={48} start="top 82%" style={{ maxWidth: 760, margin: "0 auto" }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="ds-card"
              style={{ display: "flex", flexDirection: "column", position: "relative", border: "2px solid var(--color-rose)" }}
            >
              {plan.popular && (
                <span style={{ position: "absolute", top: -13, left: 34, background: "var(--color-rose)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 16px", borderRadius: 999, whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                  {content.plan_2_popular ?? "Most Popular"}
                </span>
              )}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.02em", marginBottom: 8 }}>{plan.name}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.02em" }}>{plan.price}</span>
                </div>
                <p className="ds-card-body">{plan.per}</p>
              </div>
              <p className="ds-card-body" style={{ marginBottom: 24 }}>{plan.description}</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, flex: 1 }}>
                {plan.features.map((feature) => (
                  <li key={feature} className="ds-card-body" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <IconCheck className="w-4 h-4" style={{ color: plan.popular ? "var(--color-teal)" : "var(--color-rose)", flexShrink: 0, marginTop: 2 }} />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.depositNote && (
                <p className="ds-card-body" style={{ fontSize: 13, color: "var(--color-body)", marginBottom: 16 }}>{plan.depositNote}</p>
              )}
              <button type="button" onClick={openBookingModal} className="ef-btn justify-center w-full ef-btn-primary">
                {plan.cta}
                <IconArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </Reveal>

        <div style={{ maxWidth: 760, margin: "56px auto 0" }}>
          <p className="ds-card-title" style={{ marginBottom: 8 }}>{content.pricing_option_b_label ?? "Option B: Rolling Monthly Contracts"}</p>
          <p className="ds-body">{content.pricing_option_b_desc ?? "Designed for clients looking for long-term consistency, continuous care, and predictable scheduling over time."}</p>
        </div>
        <Reveal y={40} start="top 82%" style={{ maxWidth: 400, margin: "24px auto 0" }}>
          <div className="ds-card" style={{ display: "flex", flexDirection: "column", border: "2px solid var(--color-rose)" }}>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.02em", marginBottom: 8 }}>{monthlyPlan.name}</p>
              <span className="ds-card-body">{monthlyPlan.price}</span>
            </div>
            <p className="ds-card-body" style={{ marginBottom: 24 }}>{monthlyPlan.description}</p>
            <ul style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, flex: 1 }}>
              {monthlyPlan.features.map((feature) => (
                <li key={feature} className="ds-card-body" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <IconCheck className="w-4 h-4" style={{ color: "var(--color-teal)", flexShrink: 0, marginTop: 2 }} />
                  {feature}
                </li>
              ))}
            </ul>
            <button type="button" onClick={openBookingModal} className="ef-btn justify-center w-full ef-btn-primary">
              {monthlyPlan.cta}
              <IconArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Reveal>
      </Section>

      {/* Not Sure Which to Choose? (standalone dark band, per mockup) —
          linking to /personal-training rather than the mockup's
          /exercise-for-health, which currently redirects to Home
          (disabled per the 2026-07-27 launch-scope decision); flagged,
          not silently decided. */}
      <Section background="ink">
        <div className="ds-split">
          <div>
            <p className="ds-eyebrow ds-eyebrow-white">Not Sure Which to Choose?</p>
            <p className="ds-body ds-body-light" style={{ fontSize: 19, fontWeight: 600, color: "#fff", lineHeight: 1.4, marginBottom: 16 }}>
              {content.pricing_note_body ?? "Start with the free consultation. I'll give you an honest recommendation based on your situation — not the most expensive option."}
            </p>
            <button type="button" onClick={openBookingModal} className="ef-btn ef-btn-primary">
              Book a Free Consultation <IconArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
            <Link href="/personal-training" style={{ color: "#fff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>{content.pricing_link_areas ?? "See Specialist Training"} <IconArrowUpRight className="w-3.5 h-3.5" /></Link>
            <Link href="/faqs" style={{ color: "#fff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>{content.pricing_link_faqs ?? "Read the FAQs"} <IconArrowUpRight className="w-3.5 h-3.5" /></Link>
          </div>
        </div>
      </Section>

      <FAQSection />

      <CTABand
        image="/images/pricing-studio.jpg"
        imageAlt="Eternal Fitness private studio in Worthing"
        eyebrow={content.cta_eyebrow ?? "Free Consultation"}
        heading={content.cta_heading ?? "The first conversation is free, with no commitment."}
        body={content.cta_body ?? "I work with a small number of clients at a time — so every person gets my full attention."}
        primaryCta={{ label: content.cta_btn_primary ?? "Book a Free Consultation", href: BOOKINGS_URL }}
        secondaryCta={{ label: content.cta_btn_secondary ?? "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      </main>
      <Footer />
    </div>
  );
}
