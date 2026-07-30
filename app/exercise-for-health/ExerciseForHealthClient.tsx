"use client";

import Image from "next/image";
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
  MotionArcs,
  PulseLine,
  IndexList,
  FaqSplit,
} from "@/components/ds";
import {
  IconHeart,
  IconBloodPressure,
  IconBone,
  IconDiabetes,
  IconLungs,
  IconEye,
  IconAccessibility,
  IconMove,
} from "@/components/icons";

export default function ExerciseForHealthClient({ content = {} }: { content?: Record<string, string> }) {
  const { open, setOpen, openDialog } = useConsultationDialog();
  const bookCta = { label: content.hero_btn_primary ?? "Book a Free Consultation", onClick: openDialog, arrow: true };

  const conditions = [
    {
      icon: IconBloodPressure,
      title: content.cond_1_title ?? "High Blood Pressure",
      slug: "high-blood-pressure",
      desc: content.cond_1_desc ?? "Exercise is one of the most effective ways to lower blood pressure — when it is done safely and progressively. I am qualified in exercise referral for hypertension.",
      available: true,
    },
    {
      icon: IconDiabetes,
      title: content.cond_2_title ?? "Type 2 Diabetes",
      slug: "type-2-diabetes",
      desc: content.cond_2_desc ?? "Structured exercise improves insulin sensitivity and blood sugar management. Sessions are planned around your medication timing and monitoring needs.",
      available: false,
    },
    {
      icon: IconBone,
      title: content.cond_3_title ?? "Bone Health & Osteoporosis",
      slug: "bone-health",
      desc: content.cond_3_desc ?? "Weight-bearing and resistance exercise is clinically recommended to slow bone density loss and reduce fracture risk. Safe, load-managed progression.",
      available: true,
    },
    {
      icon: IconEye,
      title: content.cond_4_title ?? "Visual Impairment",
      slug: "visual-impairment",
      desc: content.cond_4_desc ?? "Adapted training for people who are blind or partially sighted. Sessions built around clear verbal instruction, consistent equipment placement, and a familiar environment.",
      available: true,
    },
    {
      icon: IconLungs,
      title: content.cond_5_title ?? "COPD & Breathing Conditions",
      slug: "copd",
      desc: content.cond_5_desc ?? "Exercise is recommended for people with COPD to improve function and quality of life. Sessions respect breathing capacity and build gradually.",
      available: false,
    },
    {
      icon: IconHeart,
      title: content.cond_6_title ?? "Heart Conditions",
      slug: "heart-conditions",
      desc: content.cond_6_desc ?? "Post-cardiac rehabilitation and ongoing heart condition management. I work within the guidance of your cardiologist or GP.",
      available: false,
    },
    {
      icon: IconMove,
      title: content.cond_7_title ?? "Chronic Pain & Fibromyalgia",
      slug: "chronic-pain",
      desc: content.cond_7_desc ?? "Gentle, progressive movement that works with pain rather than against it. Sessions adapt to your energy and pain levels on the day.",
      available: false,
    },
    {
      icon: IconAccessibility,
      title: content.cond_8_title ?? "Physical Disability & Adaptive Training",
      slug: "adaptive-training",
      desc: content.cond_8_desc ?? "Exercise programmes built entirely around your body and your goals — not a template. Wheelchair users, amputees, and neurological conditions welcome.",
      available: false,
    },
  ];

  const steps = [
    {
      title: content.step_1_title ?? "Free consultation first",
      body: content.step_1_body ?? "We start with a conversation — no commitment, no obligation. I want to understand your condition, your history, and your goals before we do anything else.",
    },
    {
      title: content.step_2_title ?? "Check-in at the start of every session",
      body: content.step_2_body ?? "How are you feeling today? Energy, pain, sleep, any changes. The session plan is finalised then — because what works one week may not be right the next.",
    },
    {
      title: content.step_3_title ?? "Progress that adapts to you",
      body: content.step_3_body ?? "There is no fixed template. Programmes are built around your body, your condition, and your goals — and adjusted as those things change.",
    },
  ];

  const faqs = [
    {
      title: content.faq_1_title ?? "Can I exercise if I have a health condition?",
      body: content.faq_1_body ?? "In most cases, yes — and the evidence strongly supports it. Exercise is clinically recommended for a wide range of conditions. The key is having a qualified specialist who understands your specific condition and can programme safely around it.",
    },
    {
      title: content.faq_2_title ?? "Do I need a GP referral?",
      body: content.faq_2_body ?? "No. A GP referral is welcome but not required. Many clients come independently. I will ask about your medical history and may recommend checking with your GP if there are specific contraindications to consider first.",
    },
    {
      title: content.faq_3_title ?? "How is this different from a regular personal trainer?",
      body: content.faq_3_body ?? "A standard Level 3 PT is not trained to work with clinical populations. As a Level 4 Exercise Referral Specialist, I understand contraindicated exercises, medication effects, fatigue management, and how conditions affect capacity from one session to the next.",
    },
    {
      title: content.faq_4_title ?? "What if I am having a bad day when I come in?",
      body: content.faq_4_body ?? "That is what the check-in is for. I adapt the session to how you actually feel — not how the plan says you should feel. You will always leave having done something genuinely useful, even on the difficult days.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar onBookConsultation={openDialog} />

      <PageHero
        image="/images/who-health.jpg"
        imageAlt="Personal training for health conditions in Worthing"
        imageObjectPosition="50% 38%"
        imageObjectPositionWide="50% 35%"
        eyebrow={content.hero_eyebrow ?? "Exercise for Health"}
        heading={<>Personal Training for<br />Health Conditions</>}
        subhead={content.hero_subhead ?? "Exercise is one of the most evidence-based interventions for managing a wide range of health conditions. The key is having a qualified specialist who understands your condition and programmes safely around it — not a standard PT working outside their training."}
        primaryCta={bookCta}
        secondaryCta={{ label: content.hero_btn_secondary ?? "See Conditions Covered", href: "#conditions", variant: "ghost-white" }}
        badge={<StatBadge variant="rose" value="L4" label={content.badge_label ?? "Exercise Referral Specialist"} />}
      />

      {/* THE APPROACH */}
      <Section background="white">
        <div className="ds-split">
          <Reveal y={40} className="ds-split-img">
            <Image
              src="/images/studio-kneel-stretch.jpg"
              alt="Esther Fair — Exercise for health conditions specialist in Worthing"
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
              heading={content.approach_heading ?? "Exercise for health is different from exercise for fitness"}
            />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>
                {content.approach_p1 ?? "Think of it like seeing a physiotherapist rather than a personal trainer. The goal is not weight loss, not aesthetics, and not performance. The goal is health — managing your condition, building functional strength, improving quality of life."}
              </p>
              <p className="ds-body" style={{ marginBottom: 16 }}>
                {content.approach_p2 ?? "I work the same way a physio or an osteopath does — targeting conditions, not demographics. Every session starts with a check-in. The plan for that day is set then, based on how you actually feel — not how you felt last week."}
              </p>
              <p className="ds-body" style={{ marginBottom: 28 }}>
                {content.approach_p3 ?? "As a Level 4 Personal Trainer and Exercise Referral Specialist, I am qualified to work with clinical populations that a standard Level 3 PT is not trained for. That distinction matters."}
              </p>
              <CtaButton cta={bookCta} />
            </Reveal>
          </div>
        </div>
      </Section>

      {/* CONDITIONS INDEX */}
      <Section background="cream" id="conditions">
        <SectionHeading
          eyebrow={content.cond_eyebrow ?? "Conditions Covered"}
          heading={content.cond_heading ?? "Who I Work With"}
          intro={content.cond_intro ?? "If your condition is not listed here, please still get in touch. The answer is almost always yes."}
        />
        <Reveal y={40} start="top 80%" style={{ marginTop: 40 }}>
          <IndexList
            accent="rose"
            panelEyebrow={content.cond_panel_eyebrow ?? "Conditions covered"}
            items={conditions.map(({ icon, title, slug, desc, available }) => ({
              icon,
              title,
              body: desc,
              cta: available
                ? { label: content.cond_cta_learn ?? "Learn more", href: `/exercise-for-health/${slug}` }
                : { label: content.cond_cta_book ?? "Book a consultation", onClick: openDialog },
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
          heading={content.faq_heading ?? "Questions About Exercising With a Health Condition"}
          intro={content.faq_intro ?? "If your question is not covered here, just ask — I would always rather you did."}
          accent="rose"
          cta={bookCta}
          items={faqs}
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
