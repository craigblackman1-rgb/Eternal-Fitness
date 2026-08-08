"use client";

import Link from "next/link";
import { IconArrowUpRight, IconCheck } from "@/components/icons";
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
  const plans = [
    {
      name: content.plan_2_name ?? "Block of 12",
      price: "£480",
      per: "£40 per session",
      popular: true,
      description: content.plan_2_desc ?? "The most popular choice. Enough sessions to build real momentum.",
      features: [
        content.plan_2_feat_1 ?? "12 x 60-minute one-to-one sessions",
        content.plan_2_feat_2 ?? "Programme review and adjustment included",
        content.plan_2_feat_3 ?? "Private studio in Worthing, or live online",
        content.plan_2_feat_4 ?? "Sessions used at your pace — no expiry pressure",
      ],
      cta: content.plan_2_cta ?? "Book a Free Consultation",
    },
    {
      name: content.plan_3_name ?? "Block of 24",
      price: "£840",
      per: "£35 per session",
      popular: false,
      description: content.plan_3_desc ?? "Best value. For longer-term progress or more complex needs.",
      features: [
        content.plan_3_feat_1 ?? "24 x 60-minute one-to-one sessions",
        content.plan_3_feat_2 ?? "Save £5 per session vs. Block of 12",
        content.plan_3_feat_3 ?? "Ongoing programme management, priority scheduling",
        content.plan_3_feat_4 ?? "Private studio in Worthing, or live online",
      ],
      cta: content.plan_3_cta ?? "Book a Free Consultation",
    },
  ];

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

      {/* What You're Investing In (per mockup — short statement + CTA, not a card grid) */}
      <Section background="cream" id="investing">
        <div className="ds-split">
          <div>
            <p className="ds-eyebrow ds-eyebrow-teal">{content.value_eyebrow ?? "What You're Investing In"}</p>
            <p className="ds-body" style={{ fontSize: 19, fontWeight: 600, color: "var(--color-ink)", lineHeight: 1.4 }}>
              {content.value_heading ?? "One person. One trainer. Full attention, every session. Your programme is built around you and adjusted as things change — not a fixed template."}
            </p>
          </div>
          <div>
            <p className="ds-body">
              {content.value_body ?? "The first conversation is always free. After that, I'll recommend the block that actually fits your goals — not the most expensive option."}
            </p>
            <div style={{ marginTop: 24 }}>
              <button type="button" onClick={openBookingModal} className="ef-btn ef-btn-outline">Book a Free Consultation</button>
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing Cards */}
      <Section background="cream" id="pricing">
        <SectionHeading
          eyebrow={content.pricing_eyebrow ?? "Pricing"}
          heading={content.pricing_heading ?? "Choose what works for you"}
          intro={content.pricing_intro ?? "All sessions are 60 minutes, one-to-one — in the private studio in Worthing, or live online."}
        />
        <Reveal className="ds-grid-2" stagger={0.13} y={48} start="top 82%" style={{ maxWidth: 760, margin: "0 auto" }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="ds-card"
              style={{ display: "flex", flexDirection: "column", position: "relative", ...(plan.popular ? { border: "2px solid var(--color-rose)" } : {}) }}
            >
              {plan.popular && (
                <span style={{ position: "absolute", top: -13, left: 34, background: "var(--color-rose)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 16px", borderRadius: 999, whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                  {content.plan_2_popular ?? "Most Popular"}
                </span>
              )}
              <div style={{ marginBottom: 12 }}>
                <p className="ds-card-body" style={{ marginBottom: 8 }}>{plan.name}</p>
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
              <button type="button" onClick={openBookingModal} className={`ef-btn justify-center w-full ${plan.popular ? "ef-btn-primary" : "ef-btn-outline"}`}>
                {plan.cta}
                <IconArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
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
