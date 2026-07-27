"use client";

import Image from "next/image";
import {
  IconAward,
  IconClipboardList,
  IconMessageCircle,
  IconUsers,
} from "@/components/icons";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConsultationDialog from "@/components/ConsultationDialog";
import { useConsultationDialog } from "@/hooks/useConsultationDialog";
import {
  Section,
  SectionHeading,
  PageHero,
  StatBadge,
  CTABand,
  Reveal,
  CtaButton,
  ProcessFlow,
  StatStrip,
  PulseLine,
  MotionArcs,
} from "@/components/ds";

const focusCards = [
  {
    title: "Mobility and joint health",
    desc: "Improving range of motion, reducing stiffness, and moving with less effort and pain day-to-day.",
  },
  {
    title: "Functional strength",
    desc: "Building practical strength for real life — carrying shopping, climbing stairs, getting up from the floor.",
  },
  {
    title: "Balance and stability",
    desc: "Reducing fall risk and building the physical confidence to move through your environment safely.",
  },
  {
    title: "Fatigue management",
    desc: "Learning how to train effectively when energy levels are variable or unpredictable — a common challenge with many health conditions.",
  },
];

const steps = [
  {
    title: "Free Consultation",
    desc: "A relaxed 30-minute conversation with me about your goals, health history, and what has and has not worked before. No pressure, no commitment.",
  },
  {
    title: "Movement Assessment",
    desc: "I check your current mobility, strength, and any limitations before any programme begins — so training starts safely and clearly.",
  },
  {
    title: "Your Programme",
    desc: "A plan built entirely around your body and your life. Session structure, exercises, and intensity are all tailored specifically to you.",
  },
  {
    title: "Ongoing Support",
    desc: "I adjust your programme as your health and capacity change — keeping training sustainable, realistic, and aligned with where you are.",
  },
];

export default function PersonalTrainingClient({ content = {} }: { content?: Record<string, string> }) {
  const { open, setOpen, openDialog } = useConsultationDialog();
  const bookCta = { label: content.hero_btn_primary ?? "Book a Free Consultation", onClick: openDialog, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onBookConsultation={openDialog} />

      <PageHero
        image="/images/pt-hero.jpg"
        imageAlt="Personal training in Worthing"
        eyebrow={content.hero_eyebrow ?? "Personal Training"}
        heading={content.hero_heading ?? "Personal Training in Worthing"}
        subhead={content.hero_subhead ?? "Private, one-to-one sessions — strength, mobility, and a plan that adapts to how you actually feel. Whatever brought you here — wanting to get fitter and stronger, an injury to work around, a health condition to train safely with — sessions are built entirely around you."}
        primaryCta={bookCta}
        secondaryCta={{ label: content.hero_btn_secondary ?? "What Sessions Involve", href: "#what", variant: "ghost-white" }}
        badge={<StatBadge variant="rose" value="L4" label={content.badge_label ?? "Qualified in Cancer & Exercise Rehabilitation"} />}
      />

      {/* What to Expect */}
      <Section background="white" id="what">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={content.what_eyebrow ?? "What to Expect"}
              heading={content.what_heading ?? "What to Expect"}
            />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>
                {content.what_p1 ?? "Training with me isn't about pushing harder or doing more for its own sake. It's about what your body needs right now, and building a sustainable plan around that. Sessions are private, one-to-one, in a small studio in Worthing — no gym floor, no other clients, no comparison to anyone else."}
              </p>
              <p className="ds-body" style={{ marginBottom: 28 }}>
                {content.what_p2 ?? "I'm also trained in exercise referral and cancer rehabilitation, so if your health changes — a new condition, a GP referral, recovery from treatment — I can adapt rather than you having to start again with someone new."}
              </p>
              <CtaButton cta={bookCta} />
            </Reveal>
          </div>
          <Reveal y={40} className="ds-split-img">
            <Image src="/images/strength-tasks.jpg" alt="Strength training for health and function" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          </Reveal>
        </div>
      </Section>

      {/* What We Work On */}
      <Section background="white">
        <div className="ds-split">
          <Reveal y={40} className="ds-split-img">
            <Image src="/images/dumbbell-training.jpg" alt="Mobility and functional training" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
            <div className="ds-art-chip">
              <MotionArcs accent="teal" />
            </div>
          </Reveal>
          <div>
            <SectionHeading
              eyebrow={content.focus_eyebrow ?? "What I Work On"}
              eyebrowColor="teal"
              heading={content.focus_heading ?? "What We Work On"}
              intro={content.focus_intro ?? "Strength, mobility, endurance, and capability for real life — not aesthetics, not a number on a scale. Practical things: carrying the shopping, getting up off the floor, climbing stairs without thinking about it, sleeping better, feeling more like yourself."}
            />
            <div className="ds-featlist">
              {focusCards.map((c, i) => (
                <div key={c.title} className="ds-feat">
                  <span className="ds-feat-dot" />
                  <div>
                    <div className="ds-feat-t">{content[`focus_${i + 1}_title`] ?? c.title}</div>
                    <div className="ds-feat-c">{content[`focus_${i + 1}_desc`] ?? c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* How It Works */}
      <Section background="cream">
        <SectionHeading align="center" eyebrow={content.process_eyebrow ?? "The Process"} heading={content.process_heading ?? "How It Works"} />
        <div className="ds-art-divider">
          <PulseLine accent="rose" />
        </div>
        <div style={{ marginTop: 48 }}>
          <ProcessFlow steps={steps.map((s, i) => ({ title: content[`step_${i + 1}_title`] ?? s.title, body: content[`step_${i + 1}_desc`] ?? s.desc }))} />
        </div>
        <div style={{ textAlign: "center", marginTop: 44 }}>
          <CtaButton cta={bookCta} />
        </div>
      </Section>

      {/* Credentials */}
      <Section background="cream">
        <StatStrip
          background="ink"
          stats={[
            { icon: IconAward, value: "L4", label: content.stat_1_label ?? "Qualified in Cancer & Exercise Rehabilitation" },
            { icon: IconUsers, value: "1:1", label: content.stat_2_label ?? "Private one-to-one sessions only" },
            { icon: IconMessageCircle, value: "30 min", label: content.stat_3_label ?? "Free, no-pressure consultation" },
            { icon: IconClipboardList, value: "Worthing", label: content.stat_4_label ?? "Private studio, West Sussex" },
          ]}
        />
      </Section>

      <CTABand
        image="/images/studio-1.jpg"
        heading={content.cta_heading ?? "Ready to find out if this is right for you?"}
        body={content.cta_body ?? "The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."}
        primaryCta={{ label: content.cta_btn_primary ?? "Book a Free Consultation", onClick: openDialog }}
        secondaryCta={{ label: content.cta_btn_secondary ?? "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      <Footer />
      <ConsultationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
