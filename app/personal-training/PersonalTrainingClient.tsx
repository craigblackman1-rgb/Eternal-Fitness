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
    desc: "Improving your range of motion, reducing daily stiffness, and helping you move with less effort and discomfort day to day.",
    icon: IconMove,
  },
  {
    title: "Functional strength",
    desc: "Building practical strength for the things that matter: carrying shopping, climbing stairs without thinking about it, and getting up off the floor with ease.",
    icon: IconDumbbell,
  },
  {
    title: "Balance and stability",
    desc: "Staying steady on your feet and building the deep physical confidence you need to move through your environment safely.",
    icon: IconTarget,
  },
  {
    title: "Fatigue management",
    desc: "Learning how to train effectively and safely when your energy levels are variable, unpredictable, or recovering from medical treatment.",
    icon: IconClock,
  },
];

const steps = [
  {
    title: "Free Consultation",
    desc: "A relaxed, no-obligation 30-minute conversation about your goals, health history, and what has or hasn't worked for you in the past.",
  },
  {
    title: "Movement Assessment",
    desc: "A gentle check of your current mobility, strength, and any physical limitations, ensuring your plan starts exactly where you are today.",
  },
  {
    title: "Your Custom Programme",
    desc: "A thoughtful, highly individualised fitness strategy built around your unique body, lifestyle, and goals.",
  },
  {
    title: "Ongoing Adaptive Support",
    desc: "Your sessions are dynamically adjusted in real time as your health, energy, and daily capacity change—because life happens.",
  },
];

export default function PersonalTrainingClient({ content = {} }: { content?: Record<string, string> }) {
  const bookCta = { label: content.hero_btn_primary ?? "Book a Free Consultation", href: BOOKINGS_URL, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
      <PageHero
        image="/images/coaching-bench-press-spot.jpg"
        imageAlt="Esther spotting a client through a barbell bench press in her private Worthing studio"
        imagePan="126%"
        imageObjectPosition="50% 45%"
        imageObjectPositionWide="50% 56%"
        eyebrow={content.hero_eyebrow ?? "Personal Training"}
        heading={content.hero_heading ?? "Personal Training in Worthing"}
        subhead={content.hero_lead ?? "Private, one-to-one sessions focusing on strength, mobility, and a plan that adapts to how you actually feel today."}
        belowLead={
          content.hero_intro ? (
            <p>{content.hero_intro}</p>
          ) : (
            <>
              <p style={{ marginBottom: 14 }}>Whatever brought you here—whether you want to get fitter and stronger, need a highly calculated plan to navigate an athletic goal, or want to work safely around an injury or long-term health condition—your sessions are built entirely around you.</p>
              <p>There are no crowded spaces, no audience, and no busy gym floors. Just dedicated support in a fully private studio environment.</p>
            </>
          )
        }
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
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 14 }}>
                {content.what_p1 ?? "Training with me is never about pushing harder or doing more for its own sake. It is about what your body needs today, and building something sustainable from there."}
              </p>
              <p className="ds-body" style={{ marginBottom: 26 }}>
                {content.what_p1b ?? <><strong>Privacy</strong> Every session is strictly one-to-one in a private studio in Worthing. There are no other clients in the space, meaning zero performance pressure and absolutely no comparing yourself to anyone else.</>}
              </p>
              <Callout
                icon={IconRefreshCw}
                title={content.what_callout_title ?? "Continuous Care"}
                body={content.what_p2 ?? "Because I'm advanced-qualified in Exercise Referral and Level 4 Cancer and Exercise Rehabilitation, your training never has to reset if your health picture shifts — a new diagnosis, a GP referral, or recovery from treatment. I adapt your movements safely, so you get to keep training with the coach who already knows your body, without the stress of searching for someone new."}
                accent="teal"
              />
              <div style={{ marginTop: 28 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
          <Reveal y={40} className="ds-split-img">
            <Image src="/images/consultation-programme-notes.jpg" alt="Esther going through the session plan with a client before they start" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover", objectPosition: "58% 50%" }} />
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
          intro={content.focus_intro ?? "Our primary focus is on how your body performs. We focus on building strength, mobility, endurance, and capability for daily life. While changes to your body shape or weight often happen as a natural by-product of consistent training, this is a fantastic bonus—real-world capability is what we build towards."}
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
              <span className="ds-quote-card-meta" style={{ display: "block" }}>{content.testimonial_1_meta ?? "(Training with Esther for 5 years)"}</span>
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
              heading={content.specialist_heading ?? "Specialist Training Support"}
              light
            />
            <Reveal y={24}>
              <p className="ds-body ds-body-light" style={{ marginTop: 20, marginBottom: 28, maxWidth: "52ch" }}>
                {content.specialist_intro ?? "If your health picture requires more specific clinical attention, I focus on making exercise completely accessible, regardless of the challenges or health issues you might be facing. I provide expert, safe guidance across these dedicated pillars:"}
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
              <li><strong>Musculoskeletal Strength:</strong>&nbsp;Targeted exercise for bone density and joint health.</li>
              <li><strong>Inclusive Training:</strong>&nbsp;Tailored physical coaching and movement correction for visual impairment.</li>
              <li><strong>Cancer Rehabilitation:</strong>&nbsp;Gentle, progressive recovery training before, during, or after clinical treatment.</li>
              <li><strong>Active Ageing:</strong>&nbsp;Specialised mobility coaching for older adults, focusing on balance, agility, and joint stability.</li>
            </ul>
          </Reveal>
        </div>
      </Section>

      <CTABand
        image="/images/studio-slam-balls-rack.jpg"
        imagePosition="center 55%"
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
