"use client";

import Image from "next/image";
import {
  IconActivity,
  IconAward,
  IconBloodPressure,
  IconClipboardList,
  IconHeart,
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
  IndexList,
  FeatureBand,
} from "@/components/ds";

const specialistAreas = [
  {
    title: "GP-referred exercise",
    desc: "I am qualified in exercise referral and experienced in working alongside medical guidance from GPs and healthcare teams.",
    image: "/images/services-training.jpg",
    href: "/exercise-for-health",
  },
  {
    title: "Chronic health conditions",
    desc: "A wide range of ongoing conditions — every session adapts to what your body can manage that day.",
    image: "/images/specialise-2.jpg",
    href: "/exercise-for-health",
  },
  {
    title: "Injury recovery & rehabilitation",
    desc: "Post-surgical, post-fracture, and musculoskeletal conditions. I work within the guidance of your physiotherapist or consultant.",
    image: "/images/mobility-movement.jpg",
  },
  {
    title: "Disability & adaptive training",
    desc: "Physical disabilities, significant mobility limitations, and sensory impairments including visual impairment. Programmes are built around your body, not a template.",
    image: "/images/specialise-3.jpg",
    href: "/exercise-for-health/visual-impairment",
  },
  {
    title: "Neurological conditions",
    desc: "Conditions affecting balance, coordination, or mobility. Gentle, progressive, and always adapted.",
    image: "/images/mind-body.jpg",
  },
  {
    title: "Cancer & cancer rehabilitation",
    desc: "During active treatment, in remission, or post-surgery. I am qualified in cancer and exercise rehabilitation and adapt to wherever you are in your journey.",
    image: "/images/specialise-1.jpg",
    href: "/cancer-rehabilitation",
  },
];

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

const specialistPages = [
  { href: "/exercise-for-health", title: "Exercise for Health", desc: "Training for high blood pressure, type 2 diabetes, osteoporosis, COPD, heart conditions, chronic pain and more.", image: "/images/coaching-plank-client.jpg", imageAlt: "Exercise for Health" },
  { href: "/cancer-rehabilitation", title: "Cancer Rehabilitation", desc: "Training during active treatment, in remission, or post-surgery. Qualified and experienced in cancer rehabilitation.", image: "/images/spec-card-cancer.jpg", imageAlt: "Cancer Rehabilitation" },
  { href: "/exercise-for-health/visual-impairment", title: "Visual Impairment", desc: "Adapted training for people who are blind or partially sighted. Verbal instruction, consistent environment, tactile guidance.", image: "/images/who-blind-sport.jpg", imageAlt: "Visual Impairment" },
];

const relatedArticles = [
  {
    href: "/blog/exercise-illness",
    title: "Exercise & Illness",
    desc: "Understanding how to stay active during health challenges and what's safe when managing chronic conditions.",
    icon: IconActivity,
  },
  {
    href: "/blog/why-bmi-doesnt-matter-with-health-conditions",
    title: "Why BMI Doesn't Matter With Health Conditions",
    desc: "Why a single number on a chart misses the point for anyone training with a chronic condition, and what to focus on instead.",
    icon: IconHeart,
  },
  {
    href: "/blog/myth-buster-does-resistance-training-cause-high-blood-pressure",
    title: "Resistance Training & Blood Pressure",
    desc: "Safety considerations for people managing cardiovascular health and how resistance training can be part of a healthy approach.",
    icon: IconBloodPressure,
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

      {/* Specialist Training */}
      <Section background="cream" id="specialist-areas">
        <SectionHeading
          eyebrow={content.spec_eyebrow ?? "Specialist Training"}
          heading={content.spec_heading ?? "If Your Health Picture Is More Specific"}
          intro={content.spec_intro ?? "Some clients need more specific support — a health condition, an injury, adapting for a disability. If your situation is not listed here, please still get in touch — the answer is almost always yes."}
        />
        <Reveal y={40} start="top 80%" style={{ marginTop: 40 }}>
          <IndexList
            accent="rose"
            panelEyebrow={content.spec_panel_eyebrow ?? "Specialist areas"}
            items={specialistAreas.map((a, i) => ({
              title: content[`area_${i + 1}_title`] ?? a.title,
              body: content[`area_${i + 1}_desc`] ?? a.desc,
              cta: a.href
                ? { label: content.spec_cta_learn ?? "Learn more", href: a.href }
                : { label: content.spec_cta_book ?? "Book a consultation", onClick: openDialog },
            }))}
          />
        </Reveal>
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

      {/* Specialist Pages */}
      <Section background="white">
        <SectionHeading
          align="center"
          eyebrow={content.pages_eyebrow ?? "Specialist Training"}
          eyebrowColor="teal"
          heading={content.pages_heading ?? "More on Specific Conditions"}
          intro={content.pages_intro ?? "Each specialist area has a dedicated page with more detail about how I work with it."}
        />
        <Reveal y={40} start="top 82%" style={{ marginTop: 40 }}>
          <FeatureBand
            accent="teal"
            items={specialistPages.map((p, i) => ({ title: content[`page_${i + 1}_title`] ?? p.title, body: content[`page_${i + 1}_desc`] ?? p.desc, href: p.href, linkLabel: "Read more" }))}
          />
        </Reveal>
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

      {/* Related Articles */}
      <Section background="white">
        <SectionHeading
          align="center"
          eyebrow={content.blog_eyebrow ?? "Learn More"}
          heading={content.blog_heading ?? "Related Articles"}
          intro={content.blog_intro ?? "Read more about training with health conditions, recovery strategies, and what makes specialist personal training different."}
        />
        <Reveal y={40} start="top 82%" style={{ marginTop: 40 }}>
          <FeatureBand
            accent="rose"
            items={relatedArticles.map((a, i) => ({ icon: a.icon, title: content[`article_${i + 1}_title`] ?? a.title, body: content[`article_${i + 1}_desc`] ?? a.desc, href: a.href, linkLabel: content.blog_link_label ?? "Read article" }))}
          />
        </Reveal>
        <div style={{ textAlign: "center", marginTop: 44 }}>
          <CtaButton cta={{ label: content.blog_btn ?? "View All Articles", href: "/blog", variant: "outline", arrow: true }} />
        </div>
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
