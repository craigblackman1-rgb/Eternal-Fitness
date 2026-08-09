"use client";

import Link from "next/link";
import { IconArrowUpRight, IconCheck, IconTarget, IconAward, IconEye, IconAlertCircle } from "@/components/icons";
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
      pitch: content.plan_2_pitch ?? "Our most popular entry point.",
      description: content.plan_2_desc ?? "Provides the ideal momentum to build consistency and real-world functional strength.",
      features: [
        content.plan_2_feat_1 ?? "12 × 60-minute, fully private one-to-one sessions",
        content.plan_2_feat_2 ?? "Continuous programme review and dynamic adjustments included",
        content.plan_2_feat_3 ?? "Valid for 120 days from the date of purchase",
      ],
      cta: content.plan_2_cta ?? "Book a Free Consultation",
      depositLabel: content.plan_2_deposit_label ?? "£100 deposit",
      depositRest: content.plan_2_deposit_rest ?? " — non-refundable, it secures your regular time slots and is fully deducted from your first block payment.",
    },
    {
      name: content.plan_3_name ?? "Block of 24",
      price: "£840",
      per: "£35 per session",
      save: content.plan_3_save ?? "Best value — save £120",
      popular: false,
      pitch: content.plan_3_pitch ?? "Our best value choice.",
      description: content.plan_3_desc ?? "Designed for longer-term progress, specific athletic milestones, or managing complex health and rehabilitation needs.",
      features: [
        content.plan_3_feat_1 ?? "24 × 60-minute one-to-one sessions",
        content.plan_3_feat_2 ?? "Continuous programme review and dynamic adjustments included",
        content.plan_3_feat_3 ?? "Valid for 240 days from the date of purchase",
      ],
      cta: content.plan_3_cta ?? "Book a Free Consultation",
    },
  ];
  const monthlyPlan = {
    name: content.plan_b_name ?? "Ongoing Monthly Training",
    rate: content.plan_b_price ?? "Contact for monthly rates",
    unit: content.plan_b_unit ?? "Payments due every 4 weeks",
    description: content.plan_b_desc ?? "Commit to your long-term health with a structured, rolling arrangement that secures your ongoing priority slots.",
    features: [
      content.plan_b_feat_1 ?? "Minimum initial term of 3 months (12 weeks) to establish real, sustainable change",
      content.plan_b_feat_2 ?? "One calendar month's written notice required for cancellation after the initial term",
      content.plan_b_feat_3 ?? "Includes priority scheduling and continuous, seamless programme management",
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
            <div key={c.title} className="ds-card">
              <div className={`ds-card-ic ds-card-ic-${c.accent}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <h4 className="ds-card-title">{c.title}</h4>
              <p className="ds-card-body">{c.body}</p>
            </div>
          ))}
        </Reveal>
        <p className="ds-invest-note">
          {content.value_body ?? "The first conversation is always free. After that, I'll recommend the block that actually fits your goals — not the most expensive option."}
        </p>
        <div className="ds-invest-cta">
          <button type="button" onClick={openBookingModal} className="ef-btn ef-btn-outline">Book a Free Consultation</button>
        </div>
      </Section>

      {/* Pricing Cards */}
      <Section background="white" id="pricing">
        <div className="ds-head">
          <p className="ds-eyebrow ds-eyebrow-rose">{content.pricing_eyebrow ?? "Pricing"}</p>
          <h2 className="ds-h2" style={{ marginBottom: 14 }}>{content.pricing_heading ?? "Choose your training structure"}</h2>
          <p className="ds-body">{content.pricing_intro ?? "Two ways to work together. All sessions are 60 minutes, one-to-one — in the private studio in Worthing, or live online."}</p>
        </div>

        <div className="ds-opt" style={{ marginTop: 52 }}>
          <div className="ds-opt-mark" aria-hidden="true">A</div>
          <div>
            <div className="ds-opt-kicker">Option A</div>
            <h3 className="ds-opt-title">{content.pricing_option_a_title ?? "Fixed Session Blocks"}</h3>
            <p className="ds-opt-desc">{content.pricing_option_a_desc ?? "Perfect for those who want a structured runway to build momentum, or individuals navigating specific health boundaries at a set pace."}</p>
          </div>
        </div>

        <Reveal className="ds-plans" stagger={0.13} y={48} start="top 82%">
          {plans.map((plan) => (
            <div key={plan.name} className={`ds-plan${plan.popular ? " ds-plan-featured" : ""}`}>
              {plan.popular && <span className="ds-plan-chip">{content.plan_2_popular ?? "Most popular"}</span>}
              <div className="ds-plan-name">{plan.name}</div>
              <div className="ds-plan-price">
                <span className="ds-plan-fig">{plan.price}</span>
                <span className="ds-plan-unit">{plan.per}</span>
              </div>
              {plan.save && <span className="ds-plan-save">{plan.save}</span>}
              <p className="ds-plan-pitch">{plan.pitch}</p>
              <p className="ds-plan-sub">{plan.description}</p>
              <ul className="ds-plan-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <IconCheck className="w-3.5 h-3.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.depositLabel && (
                <p className="ds-plan-note">
                  <IconAlertCircle className="w-3.5 h-3.5" />
                  <span><b>{plan.depositLabel}</b>{plan.depositRest}</span>
                </p>
              )}
              <button type="button" onClick={openBookingModal} className={`ef-btn justify-center w-full ${plan.popular ? "ef-btn-primary" : "ef-btn-teal"}`}>
                {plan.cta}
                <IconArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </Reveal>

        <div className="ds-opt" style={{ marginTop: 64 }}>
          <div className="ds-opt-mark" aria-hidden="true">B</div>
          <div>
            <div className="ds-opt-kicker">Option B</div>
            <h3 className="ds-opt-title">{content.pricing_option_b_title ?? "Rolling Monthly Contracts"}</h3>
            <p className="ds-opt-desc">{content.pricing_option_b_desc ?? "Designed for clients looking for long-term consistency, continuous care, and predictable scheduling over time."}</p>
          </div>
        </div>

        <Reveal y={40} start="top 82%">
          <div className="ds-monthly">
            <div className="ds-monthly-main">
              <div className="ds-plan-name">{monthlyPlan.name}</div>
              <p className="ds-monthly-rate">{monthlyPlan.rate}</p>
              <p className="ds-monthly-unit">{monthlyPlan.unit}</p>
              <p className="ds-monthly-desc">{monthlyPlan.description}</p>
              <button type="button" onClick={openBookingModal} className="ef-btn ef-btn-outline">
                {monthlyPlan.cta}
                <IconArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="ds-monthly-side">
              <div className="ds-plan-name">Terms</div>
              <ul className="ds-plan-list">
                {monthlyPlan.features.map((feature) => (
                  <li key={feature}>
                    <IconCheck className="w-3.5 h-3.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <p className="ds-plans-note">{content.pricing_footnote ?? "Every option is one-to-one, 60 minutes, in the studio in Worthing or live online."}</p>
      </Section>

      {/* Not Sure Which to Choose? (standalone dark band, per mockup) —
          linking to /personal-training rather than the mockup's
          /exercise-for-health, which currently redirects to Home
          (disabled per the 2026-07-27 launch-scope decision); flagged,
          not silently decided. */}
      <Section background="ink" className="ds-sec-tight" id="unsure">
        <div className="ds-unsure">
          <div>
            <p className="ds-eyebrow ds-eyebrow-white">Not Sure Which to Choose?</p>
            <p className="ds-body ds-body-light" style={{ fontSize: 19, fontWeight: 600, color: "#fff", lineHeight: 1.4, marginBottom: 16 }}>
              {content.pricing_note_body ?? "Start with the free consultation. I'll give you an honest recommendation based on your situation — not the most expensive option."}
            </p>
            <button type="button" onClick={openBookingModal} className="ef-btn ef-btn-primary">
              Book a Free Consultation <IconArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="ds-unsure-links">
            <Link href="/personal-training" className="ds-link-row">{content.pricing_link_areas ?? "See Specialist Training"} <IconArrowUpRight className="w-3.5 h-3.5" /></Link>
            <Link href="/faqs" className="ds-link-row">{content.pricing_link_faqs ?? "Read the FAQs"} <IconArrowUpRight className="w-3.5 h-3.5" /></Link>
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
