"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BOOKINGS_URL } from "@/lib/booking";
import {
  Section,
  SectionHeading,
  PageHero,
  StatBadge,
  CTABand,
  Reveal,
  CtaButton,
  ProcessFlow,
  MotionArcs,
  PulseLine,
  IndexList,
  FaqSplit,
} from "@/components/ds";
import { IconEye, IconRibbon, IconMove } from "@/components/icons";

/**
 * Specialist Training hub — the index for the three specialisms the business
 * targets (2026-08-10 restructure). Replaces the old /exercise-for-health hub,
 * which advertised 8 conditions of which only 3 were ever built.
 *
 * Claims discipline: Esther holds Exercise Referral AND the Level 4 Cancer and
 * Exercise Rehabilitation (CanRehab) qualification. She is NOT a "Level 4
 * Personal Trainer", and Exercise Referral is NOT the Level 4 — the retired
 * hub's schema conflated the two. Keep them distinct here.
 */
export default function SpecialistTrainingClient({ content = {} }: { content?: Record<string, string> }) {
  const bookCta = { label: content.hero_btn_primary ?? "Book a Free Consultation", href: BOOKINGS_URL, arrow: true };

  const specialisms = [
    {
      icon: IconEye,
      title: content.spec_1_title ?? "Blind & Partially Sighted",
      href: "/visual-impairment",
      desc: content.spec_1_desc ?? "Training built around clear verbal instruction rather than visual demonstration, with consistent equipment placement and time to get familiar with the space.",
    },
    {
      icon: IconRibbon,
      title: content.spec_2_title ?? "Cancer Rehabilitation",
      href: "/cancer-rehabilitation",
      desc: content.spec_2_desc ?? "Support during treatment, after surgery, and into remission — from a trainer holding the Level 4 Cancer and Exercise Rehabilitation qualification.",
    },
    {
      icon: IconMove,
      title: content.spec_3_title ?? "Strength, Balance & Falls",
      href: "/falls-prevention",
      desc: content.spec_3_desc ?? "One-to-one strength and balance work for older adults who want to stay steady, confident and independent on their own terms.",
    },
  ];

  const steps = [
    {
      title: content.step_1_title ?? "Free consultation first",
      body: content.step_1_body ?? "We start with a conversation — no commitment, no obligation. I want to understand your circumstances, your history, and your goals before we do anything else.",
    },
    {
      title: content.step_2_title ?? "Check-in at the start of every session",
      body: content.step_2_body ?? "How are you feeling today? Energy, pain, sleep, any changes. The session plan is finalised then — because what works one week may not be right the next.",
    },
    {
      title: content.step_3_title ?? "Progress that adapts to you",
      body: content.step_3_body ?? "There is no fixed template. Programmes are built around your body and your goals — and adjusted as those things change.",
    },
  ];

  const faqs = [
    {
      title: content.faq_1_title ?? "Do I need a GP referral?",
      body: content.faq_1_body ?? "No. A GP referral is welcome but not required. I will ask about your medical history, and for some circumstances I may ask you to check with your GP or specialist team before we begin.",
    },
    {
      title: content.faq_2_title ?? "How is this different from a regular personal trainer?",
      body: content.faq_2_body ?? "I'm qualified in Exercise Referral, and hold the Level 4 Cancer and Exercise Rehabilitation qualification. That means I understand contraindicated movements, medication effects, fatigue management, and how capacity changes from one session to the next.",
    },
    {
      title: content.faq_3_title ?? "What if my situation isn't one of the three?",
      body: content.faq_3_body ?? "Please still get in touch. These three are where my training and experience are deepest, but the first conversation is free and I would always rather tell you honestly whether I'm the right person.",
    },
    {
      title: content.faq_4_title ?? "What if I am having a bad day when I come in?",
      body: content.faq_4_body ?? "That is what the check-in is for. I adapt the session to how you actually feel — not how the plan says you should feel. You will always leave having done something genuinely useful, even on the difficult days.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
        <PageHero
          image="/images/who-health.jpg"
          imageAlt="Specialist personal training in Worthing"
          imageObjectPosition="50% 38%"
          imageObjectPositionWide="50% 35%"
          eyebrow={content.hero_eyebrow ?? "Specialist Training"}
          heading={<>Specialist<br />Personal Training</>}
          subhead={content.hero_subhead ?? "Most personal training assumes a body that works in a predictable way. Mine does not. I work with three groups of people whose needs are routinely designed around rather than designed for."}
          primaryCta={bookCta}
          secondaryCta={{ label: content.hero_btn_secondary ?? "See the Three Areas", href: "#specialisms", variant: "ghost-white" }}
          badge={<StatBadge variant="rose" value="L4" label={content.badge_label ?? "Cancer & Exercise Rehab"} />}
        />

        {/* THE APPROACH */}
        <Section background="white">
          <div className="ds-split">
            <Reveal y={40} className="ds-split-img">
              <Image
                src="/images/studio-kneel-stretch.jpg"
                alt="Esther Fair coaching a client in the Eternal Fitness studio in Worthing"
                fill
                sizes="(max-width: 1000px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
              />
              <div className="ds-art-chip">
                <MotionArcs accent="rose" />
              </div>
            </Reveal>
            <div>
              <SectionHeading
                eyebrow={content.approach_eyebrow ?? "The Approach"}
                eyebrowColor="teal"
                heading={content.approach_heading ?? "Specialist training is not general training done gently"}
              />
              <Reveal y={24}>
                <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>
                  {content.approach_p1 ?? "The goal is not weight loss, not aesthetics, and not performance. The goal is capability — building strength that translates into the things you actually want to do, and confidence in a body whose circumstances have changed."}
                </p>
                <p className="ds-body" style={{ marginBottom: 16 }}>
                  {content.approach_p2 ?? "Every session starts with a check-in. The plan for that day is set then, based on how you actually feel — not how you felt last week."}
                </p>
                <p className="ds-body" style={{ marginBottom: 28 }}>
                  {content.approach_p3 ?? "Sessions are one-to-one in a private studio. There is no gym floor to navigate, no crowd, and no audience — which matters more than people expect."}
                </p>
                <CtaButton cta={bookCta} />
              </Reveal>
            </div>
          </div>
        </Section>

        {/* THE THREE SPECIALISMS */}
        <Section background="cream" id="specialisms">
          <SectionHeading
            eyebrow={content.spec_eyebrow ?? "Where I Specialise"}
            heading={content.spec_heading ?? "Three Areas, In Depth"}
            intro={content.spec_intro ?? "I would rather do three things properly than ten things approximately. If your situation sits outside these, please still ask."}
          />
          <Reveal y={40} start="top 80%" style={{ marginTop: 40 }}>
            <IndexList
              accent="rose"
              panelEyebrow={content.spec_panel_eyebrow ?? "Specialist areas"}
              items={specialisms.map(({ icon, title, href, desc }) => ({
                icon,
                title,
                body: desc,
                cta: { label: content.spec_cta_learn ?? "Learn more", href },
              }))}
            />
          </Reveal>
        </Section>

        {/* HOW IT WORKS */}
        <Section background="white">
          <SectionHeading eyebrow={content.how_eyebrow ?? "How It Works"} eyebrowColor="teal" heading={content.how_heading ?? "What to Expect from Your Sessions"} />
          <div className="ds-art-divider"><PulseLine accent="teal" /></div>
          <div style={{ marginTop: 48 }}>
            <ProcessFlow steps={steps} />
          </div>
        </Section>

        {/* FAQ */}
        <Section background="cream">
          <FaqSplit
            eyebrow={content.faq_eyebrow ?? "Common Questions"}
            heading={content.faq_heading ?? "Questions About Specialist Training"}
            intro={content.faq_intro ?? "If your question is not covered here, just ask — I would always rather you did."}
            accent="rose"
            cta={bookCta}
            items={faqs}
          />
        </Section>

        <CTABand
          image="/images/studio-1.jpg"
          imageAlt="Eternal Fitness private studio in Worthing"
          heading={content.cta_heading ?? "Ready to find out if this is right for you?"}
          body={content.cta_body ?? "The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."}
          primaryCta={{ label: content.cta_btn_primary ?? "Book a Free Consultation", href: BOOKINGS_URL }}
          secondaryCta={{ label: content.cta_btn_secondary ?? "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
        />
      </main>
      <Footer />
    </div>
  );
}
