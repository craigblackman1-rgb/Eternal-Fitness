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

export default function PersonalTrainingClient() {
  const bookCta = { label: "Book a Free Consultation", href: BOOKINGS_URL, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
      <PageHero
        layout="split"
        image="/images/coaching-bench-press-spot.jpg"
        imageAlt="A client lying back on the adjustable bench in the private Worthing studio pressing a single dumbbell, with Esther crouched down beside the bench at the client&#x2019;s eye level rather than standing over her, both of them laughing."
        imagePan="126%"
        imageObjectPosition="50% 45%"
        imageObjectPositionWide="50% 56%"
        eyebrow={"Personal Training"}
        heading={"Personal Training in Worthing"}
        subhead={"Private, one-to-one sessions focusing on strength, mobility, and a plan that adapts to how you actually feel today."}
        belowLead={
          <>
            <p style={{ marginBottom: 14 }}>Whatever brought you here—whether you want to get fitter and stronger, need a highly calculated plan to navigate an athletic goal, or want to work safely around an injury or long-term health condition—your sessions are built entirely around you.</p>
            <p>There are no crowded spaces, no audience, and no busy gym floors. Just dedicated support in a fully private studio environment.</p>
          </>
        }
        belowLeadVariant="plain"
        primaryCta={bookCta}
        secondaryCta={{ label: "What Sessions Involve", href: "#what", variant: "ghost-white" }}
        imageDescription={"A one-to-one session at the bench. The client lies back on the adjustable bench and presses a single selector dumbbell; her other hand is open and free above her. Esther has crouched right down beside the bench so that she is at the client\u2019s eye level rather than standing over her, one hand on her own knee and neither hand on the client. The kettlebell shelves, a water bottle and a phone are on the wall shelf behind them."}
      />

      {/* What to Expect */}
      <Section background="white" id="what">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={"What to Expect"}
              heading={"What to Expect"}
            />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 14 }}>
                {"Training with me is never about pushing harder or doing more for its own sake. It is about what your body needs today, and building something sustainable from there."}
              </p>
              <p className="ds-body" style={{ marginBottom: 26 }}>
                {<><strong>Privacy</strong> Every session is strictly one-to-one in a private studio in Worthing. There are no other clients in the space, meaning zero performance pressure and absolutely no comparing yourself to anyone else.</>}
              </p>
              <Callout
                icon={IconRefreshCw}
                title={"Continuous Care"}
                body={"Because I'm advanced-qualified in Exercise Referral and Level 4 Cancer and Exercise Rehabilitation, your training never has to reset if your health picture shifts — a new diagnosis, a GP referral, or recovery from treatment. I adapt your movements safely, so you get to keep training with the coach who already knows your body, without the stress of searching for someone new."}
                accent="teal"
              />
              <div style={{ marginTop: 28 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
          <figure className="ef-figure">
            <Reveal y={40} className="ds-split-img" style={{ aspectRatio: "3/2" }}>
              <Image src="/images/consultation-programme-notes.jpg" alt="Esther and a client sitting facing each other at the same height in the private Worthing studio, Esther with the printed programme and a pen on her lap and the client on the bench with a 10 kg dumbbell in each hand." fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover", objectPosition: "42% 50%" }} />
            </Reveal>
            <details className="ef-desc">
              <summary>Describe this image</summary>
              <p>A one-to-one session, paused. The client sits on the bench holding a 10 kg dumbbell in each hand, the weights printed in large figures on the ends. Esther sits opposite him on a plyo box at the same height, the printed programme on her lap and a pen in her hand, talking it through at eye level rather than standing over him. The kettlebells are on their shelf behind them.</p>
            </details>
          </figure>
        </div>
      </Section>

      {/* What We Work On (4-card icon grid, per mockup) */}
      <Section background="cream" id="focus">
        <SectionHeading
          align="center"
          eyebrow={"What I Work On"}
          eyebrowColor="teal"
          heading={"What We Work On"}
          intro={"Our primary focus is on how your body performs. We focus on building strength, mobility, endurance, and capability for daily life. While changes to your body shape or weight often happen as a natural by-product of consistent training, this is a fantastic bonus—real-world capability is what we build towards."}
        />
        <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" stagger={0.1} y={30} start="top 85%" style={{ marginTop: 40 }}>
          {focusCards.map((c, i) => (
            <div key={c.title} className="bg-white border border-border-warm rounded-2xl p-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${i % 2 === 0 ? "ds-card-ic-rose" : "ds-card-ic-teal"}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <div className="text-[15px] font-bold text-ink tracking-tight mb-2">{c.title}</div>
              <div className="text-[13.5px] text-slate leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </Reveal>
        <figure className="ds-quote-card" style={{ marginTop: 40 }}>
          <div className="ds-quote-card-mark" aria-hidden="true">&ldquo;</div>
          <p className="ds-quote-card-body">
            {"As a 50+ woman on a strength and fitness journey I thank my lucky stars I met Esther... I would never have achieved the level of fitness and wellbeing I have without her."}
          </p>
          <figcaption className="ds-quote-card-by">
            <span className="ds-quote-card-av" aria-hidden="true">E</span>
            <span>
              <span className="ds-quote-card-name" style={{ display: "block" }}>{"Emma"}</span>
              <span className="ds-quote-card-meta" style={{ display: "block" }}>{"Training with Esther for 5 years"}</span>
            </span>
          </figcaption>
        </figure>
      </Section>

      {/* How It Works */}
      <Section background="white">
        <SectionHeading align="center" eyebrow={"The Process"} heading={"How It Works"} />
        <div className="ds-art-divider">
          <PulseLine accent="rose" />
        </div>
        <div style={{ marginTop: 48 }}>
          <ProcessFlow steps={steps.map((s) => ({ title: s.title, body: s.desc }))} />
        </div>
        <div style={{ textAlign: "center", marginTop: 44 }}>
          <CtaButton cta={bookCta} />
        </div>
      </Section>

      {/* Specialist Training (dark band, per mockup). Condition list restored
          per Craig's explicit go-ahead (2026-07-29) after being flagged as a
          possible conflict with the "no condition roll-calls" hard rule —
          worth Esther's confirmation since it's her brand rule, but not
          blocking on it.

          NEEDS ESTHER'S REWRITE (2026-08-10): the five pillars listed below
          (Cardiovascular Care, Musculoskeletal Strength, Inclusive Training,
          Cancer Rehabilitation, Active Ageing) predate the restructure that
          narrowed the business to three specialisms — blind/partially sighted,
          cancer rehabilitation, and strength/balance for older adults. Two of
          these pillars no longer have a page behind them. Left as-is rather
          than silently rewritten, because this is her brand copy. */}
      <Section background="ink" id="specialist">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={"Specialist Training"}
              heading={"Specialist Training Support"}
              light
            />
            <Reveal y={24}>
              <p className="ds-body ds-body-light" style={{ marginTop: 20, marginBottom: 28, maxWidth: "52ch" }}>
                {"If your health picture requires more specific clinical attention, I focus on making exercise completely accessible, regardless of the challenges or health issues you might be facing. I provide expert, safe guidance across these dedicated pillars:"}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <CtaButton cta={{ label: "Get in Touch", href: "/contact", arrow: true }} />
                <CtaButton cta={{ label: "Read the FAQs", href: "/faqs", variant: "ghost-white" }} />
              </div>
            </Reveal>
          </div>
          <Reveal y={24}>
            <ul className="ds-spec-list">
              <li><span><strong>Cardiovascular Care:</strong> Support for heart health and blood pressure management.</span></li>
              <li><span><strong>Musculoskeletal Strength:</strong> Targeted exercise for bone density and joint health.</span></li>
              <li><span><strong>Inclusive Training:</strong> Tailored physical coaching and movement correction for partially sighted people.</span></li>
              <li><span><strong>Cancer Rehabilitation:</strong> Gentle, progressive recovery training before, during, or after clinical treatment.</span></li>
              <li><span><strong>Active Ageing:</strong> Specialised mobility coaching for older adults, focusing on balance, agility, and joint stability.</span></li>
            </ul>
          </Reveal>
        </div>
      </Section>

      <CTABand
        layout="split"
        image="/images/studio-slam-balls-rack.jpg"
        imageAlt="The slam balls in the private Worthing studio stored on a wall rack in a vertical stack with the heaviest at the bottom and its weight printed on the side, and the battle rope coiled on the floor at the foot of the rack."
        imagePosition="center 55%"
        eyebrow={"Free Consultation"}
        heading={"The first conversation is free, with no commitment."}
        body={"I work with a small number of clients at a time \u2014 so every person gets my full attention."}
        primaryCta={{ label: "Book a Free Consultation", href: BOOKINGS_URL }}
        secondaryCta={{ label: "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
        imageDescription={"A corner of the studio with nothing in use. Four slam balls sit on a wall-mounted rack in a vertical stack, one above another, heaviest at the bottom and marked 15 KG. The battle rope is coiled on the floor at the foot of the rack \u2014 the one thing in this corner that is down at floor level. Behind it the weight plates are on the rack\u2019s own pegs and the bench is pushed in under the frame."}
      />
      </main>
      <Footer />
    </div>
  );
}
