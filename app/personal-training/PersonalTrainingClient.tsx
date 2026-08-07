"use client";

import Image from "next/image";
import {
  IconRefreshCw,
  IconMove,
  IconDumbbell,
  IconTarget,
  IconClock,
} from "@/components/icons";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BOOKINGS_URL } from "@/lib/booking";
import {
  Section,
  SectionHeading,
  PageHero,
  CTABand,
  Reveal,
  CtaButton,
  ProcessFlow,
  Callout,
  PulseLine,
} from "@/components/ds";

const focusCards = [
  {
    title: "Mobility and joint health",
    desc: "Improving range of motion, reducing stiffness, and moving with less effort and pain day to day.",
    icon: IconMove,
  },
  {
    title: "Functional strength",
    desc: "Building practical strength for real life — carrying shopping, climbing stairs, getting up from the floor.",
    icon: IconDumbbell,
  },
  {
    title: "Balance and stability",
    desc: "Reducing fall risk and building physical confidence to move through your environment safely.",
    icon: IconTarget,
  },
  {
    title: "Fatigue management",
    desc: "Training effectively when energy levels are variable or unpredictable.",
    icon: IconClock,
  },
];

const steps = [
  {
    title: "Free Consultation",
    desc: "A relaxed 30-minute conversation about your goals, history, and what has and hasn't worked before.",
  },
  {
    title: "Movement Assessment",
    desc: "Checking your current mobility, strength, and any limitations, so the plan starts from where you actually are.",
  },
  {
    title: "Your Programme",
    desc: "A plan built around your body and your life.",
  },
  {
    title: "Ongoing Support",
    desc: "Adjusted as your health, energy, and capacity change — because they will.",
  },
];

export default function PersonalTrainingClient({ content = {} }: { content?: Record<string, string> }) {
  const bookCta = { label: content.hero_btn_primary ?? "Book a Free Consultation", href: BOOKINGS_URL, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
      <PageHero
        image="/images/coaching-plank-client.jpg"
        imageAlt="Esther coaching a client through a supported plank, adjusting the movement as they go"
        imagePan="126%"
        imageObjectPosition="50% 43%"
        imageObjectPositionWide="50% 24%"
        eyebrow={content.hero_eyebrow ?? "Personal Training"}
        heading={content.hero_heading ?? "Personal Training in Worthing"}
        subhead={content.hero_lead ?? "Private, one-to-one sessions focusing on strength, mobility, and a plan that adapts to how you actually feel today."}
        belowLead={<p>{content.hero_intro ?? "Whatever brought you here — getting fitter and stronger, working around an old injury, training safely with a health condition — sessions are built entirely around you. Private studio, one-to-one, no gym floor."}</p>}
        belowLeadVariant="plain"
        primaryCta={bookCta}
        secondaryCta={{ label: content.hero_btn_secondary ?? "What Sessions Involve", href: "#what", variant: "ghost-white" }}
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
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 26 }}>
                {content.what_p1 ?? "Training with me isn't about pushing harder or doing more for its own sake. It's about what your body needs today, and building something sustainable from there. Sessions are private, one-to-one, in a small studio in Worthing — no gym floor, no other clients, no comparing yourself to anyone else."}
              </p>
              <Callout
                icon={IconRefreshCw}
                title={content.what_callout_title ?? "If your health changes, the plan changes — not the trainer"}
                body={content.what_p2 ?? "I'm also trained in exercise referral and cancer rehabilitation, so if something in your health picture changes — a new diagnosis, a GP referral, recovery from treatment — I can adapt the plan rather than you having to start again with someone new."}
                accent="teal"
              />
              <div style={{ marginTop: 28 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
          <Reveal y={40} className="ds-split-img">
            <Image src="/images/strength-tasks.jpg" alt="Strength training for health and function" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          </Reveal>
        </div>
      </Section>

      {/* What We Work On (4-card icon grid, per mockup) */}
      <Section background="cream" id="focus">
        <SectionHeading
          align="center"
          eyebrow={content.focus_eyebrow ?? "What I Work On"}
          eyebrowColor="teal"
          heading={content.focus_heading ?? "What We Work On"}
          intro={content.focus_intro ?? "Strength, mobility, endurance, and capability for daily life — not aesthetics, not a number on the scales. Practical things: carrying the shopping, getting up off the floor, climbing the stairs without thinking about it, sleeping better, feeling more like yourself."}
        />
        <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" stagger={0.1} y={30} start="top 85%" style={{ marginTop: 40 }}>
          {focusCards.map((c, i) => (
            <div key={c.title} className="bg-white border border-border-warm rounded-2xl p-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${i % 2 === 0 ? "ds-card-ic-rose" : "ds-card-ic-teal"}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <div className="text-[15px] font-bold text-ink tracking-tight mb-2">{content[`focus_${i + 1}_title`] ?? c.title}</div>
              <div className="text-[13.5px] text-slate leading-relaxed">{content[`focus_${i + 1}_desc`] ?? c.desc}</div>
            </div>
          ))}
        </Reveal>
        <figure className="ds-quote-card" style={{ marginTop: 40 }}>
          <div className="ds-quote-card-mark" aria-hidden="true">&ldquo;</div>
          <p className="ds-quote-card-body">
            {content.testimonial_1 ?? "As a 50+ woman on a strength and fitness journey I thank my lucky stars I met Esther... I would never have achieved the level of fitness and wellbeing I have without her."}
          </p>
          <figcaption className="ds-quote-card-by">
            <span className="ds-quote-card-av" aria-hidden="true">EA</span>
            <span>
              <span className="ds-quote-card-name" style={{ display: "block" }}>{content.testimonial_1_name ?? "Emma A"}</span>
              <span className="ds-quote-card-meta" style={{ display: "block" }}>{content.testimonial_1_meta ?? "Training 5 years"}</span>
            </span>
          </figcaption>
        </figure>
      </Section>

      {/* How It Works */}
      <Section background="white">
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

      {/* Specialist Training (dark band, per mockup). Condition list restored
          per Craig's explicit go-ahead (2026-07-29) after being flagged as a
          possible conflict with the "no condition roll-calls" hard rule —
          worth Esther's confirmation since it's her brand rule, but not
          blocking on it. Still linking to /contact rather than the mockup's
          /exercise-for-health — that page currently redirects to Home
          (disabled per the 2026-07-27 launch-scope decision), so the
          mockup's own literal link would send a visitor straight back to
          the homepage. */}
      <Section background="ink" id="specialist">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={content.specialist_eyebrow ?? "Specialist Training"}
              heading={content.specialist_heading ?? "Some clients need more specific support"}
              light
            />
            <Reveal y={24}>
              <p className="ds-body ds-body-light" style={{ marginTop: 20, marginBottom: 28, maxWidth: "52ch" }}>
                {content.specialist_intro ?? "As a Level 4 Specialist and GP Referral Trainer, I bridge the gap between medical treatment and everyday functional strength. I provide expert, safe guidance if you are managing specific health pictures, including:"}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <CtaButton cta={{ label: content.specialist_link ?? "Get in Touch", href: "/contact", arrow: true }} />
                <CtaButton cta={{ label: "Read the FAQs", href: "/faqs", variant: "ghost-white" }} />
              </div>
            </Reveal>
          </div>
          <Reveal y={24}>
            <ul className="ds-spec-list">
              <li><strong>Cardiovascular Care:</strong>&nbsp;Support for heart health and blood pressure management.</li>
              <li><strong>Musculoskeletal Strength:</strong>&nbsp;Targeted exercise for bone and joint health.</li>
              <li><strong>Inclusive Training:</strong>&nbsp;Tailored physical coaching for visual impairment.</li>
              <li><strong>Cancer Rehabilitation:</strong>&nbsp;Gentle, progressive recovery training during or after treatment.</li>
              <li><strong>Active Ageing:</strong>&nbsp;Specialised mobility coaching for older adults, focusing on balance, mobility, and joint stability.</li>
            </ul>
          </Reveal>
        </div>
      </Section>

      <CTABand
        image="/images/studio-1.jpg"
        imagePosition="center 20%"
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
