"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BOOKINGS_URL } from "@/lib/booking";
import {
  Section,
  SectionHeading,
  PageHero,
  FeatureBand,
  StatBadge,
  StatStrip,
  CompareDiagram,
  CTABand,
  Callout,
  Reveal,
  CtaButton,
  FaqSplit,
} from "@/components/ds";
import {
  IconEye,
  IconCheckCircle,
  IconMessageCircle,
  IconAccessibility,
  IconTarget,
  IconClipboardList,
  IconClock,
  IconHeartHandshake,
  IconAward,
  IconUsers,
} from "@/components/icons";

const adaptations = [
  {
    title: "Clear verbal instruction",
    body: "Every movement is described with precise, detailed verbal instruction — not demonstration. I explain what should happen in your body, what you should feel, and what to listen for rather than what to watch.",
    icon: IconMessageCircle,
  },
  {
    title: "Consistent equipment placement",
    body: "Equipment is always placed in the same position so you know exactly where to find it. The studio layout stays consistent so you can build spatial confidence and familiarity over time.",
    icon: IconClipboardList,
  },
  {
    title: "Tactile guidance where welcome",
    body: "Where it is helpful and consented to, I use gentle physical guidance to support movement positioning. This is always your choice — we will discuss what works best for you.",
    icon: IconHeartHandshake,
  },
  {
    title: "Time to familiarise",
    body: "Sessions for new clients include extra time to learn the space, the equipment, and the movement patterns before progressing. There is no rush. Confidence in the environment comes first.",
    icon: IconClock,
  },
  {
    title: "Private, stable environment",
    body: "The private studio means no other people to navigate around, no unexpected noise or movement from other clients, and a calm, predictable space every session.",
    icon: IconAccessibility,
  },
  {
    title: "Sport-specific programming",
    body: "I work with partially sighted clients engaged in showdown and other adapted sports. If you have a sport-specific goal, sessions can be built around the demands of that activity.",
    icon: IconTarget,
  },
];

const faqs = [
  {
    title: "Can I do personal training if I am blind or partially sighted?",
    body: "Yes. Personal training is very achievable for partially sighted people with the right approach. Sessions rely on verbal instruction, consistent environment, and tactile guidance — not visual demonstration.",
    icon: IconCheckCircle,
  },
  {
    title: "How do you describe exercises without showing me?",
    body: "I describe what should happen in your body — which muscles should be working, what you should feel in your joints, what the movement should feel like at different points. Many clients find this produces a more aware and connected training experience than watching someone else.",
    icon: IconMessageCircle,
  },
  {
    title: "I have some remaining vision — does that matter?",
    body: "We will work with whatever you have. Sessions are adapted to your specific visual situation — whether that is complete blindness, significant partial sight, or anything in between. Your experience, not a label, guides the approach.",
    icon: IconAccessibility,
  },
  {
    title: "Do you have experience with showdown or other VIP sports?",
    body: "Yes. I currently work with clients engaged in showdown and I am actively developing my knowledge and approach in this area. If you have a sport-specific goal, that can absolutely inform your training programme.",
    icon: IconTarget,
  },
];

export default function VisualImpairmentClient() {
  const bookCta = { label: "Book a Free Consultation", href: BOOKINGS_URL, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
      <PageHero
        image="/images/studio-2.jpg"
        imageAlt="Personal training for partially sighted people in Worthing"
        eyebrow="Partially Sighted"
        heading={<>Personal Training for<br />Partially Sighted People</>}
        subhead="One-to-one training adapted for people who are blind or partially sighted. Sessions are built entirely around clear verbal instruction, consistent environment, and your specific goals — whether that is general fitness, a specific health condition, or sport."
        primaryCta={bookCta}
        secondaryCta={{ label: "See Pricing", href: "/pricing", variant: "ghost-white" }}
        badge={<StatBadge variant="rose" value="L4" label="Adaptive Training Specialist" />}
      />

      {/* THE APPROACH */}
      <Section background="white">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow="The Approach"
              eyebrowColor="teal"
              heading="Training that works without sight"
            />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>
                Most personal training relies heavily on visual demonstration — watch me, do what I do. That does not
                work for VIP clients, and attempting it is both ineffective and exclusionary.
              </p>
              <p className="ds-body" style={{ marginBottom: 16 }}>
                My approach for partially sighted clients is built around precise verbal instruction, proprioceptive
                awareness, and a consistent, predictable environment. You learn to feel the movement correctly rather
                than see it — which, for many people, produces a more mindful and connected training experience anyway.
              </p>
              <p className="ds-body" style={{ marginBottom: 28 }}>
                The private studio format is particularly suited to VIP training — no crowds, no unexpected movement,
                no pressure to navigate a busy gym floor. Just you, me, and a focused session.
              </p>
              <Callout
                icon={IconEye}
                accent="teal"
                title="Actively working with VIP clients"
                body="I currently work with partially sighted clients in Worthing, including people engaged in showdown — a competitive sport for blind and partially sighted people. This is an area I am actively developing."
              />
              <div style={{ marginTop: 28 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
          <Reveal y={40} className="ds-split-img">
            <Image
              src="/images/who-blind-sport.jpg"
              alt="Esther with a British Blind Sport contact — active involvement in the VIP sport community"
              fill
              sizes="(max-width: 1000px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          </Reveal>
        </div>
      </Section>

      {/* WHY IT'S DIFFERENT — comparison diagram */}
      <Section background="cream">
        <SectionHeading
          align="center"
          eyebrow="Why It's Different"
          heading="Built Around Sound and Feel, Not Sight"
          intro="Conventional training leans on watching and copying. Adapted training removes that dependency entirely."
        />
        <div style={{ marginTop: 48 }}>
          <CompareDiagram
            negative={{
              label: "Conventional training",
              items: [
                "Relies on visual demonstration — watch me, do what I do",
                "Busy gym floor with unexpected movement and noise",
                "Pressure to navigate a space built for sighted people",
              ],
            }}
            positive={{
              label: "My adapted approach",
              items: [
                "Precise, detailed verbal instruction",
                "Proprioceptive awareness — you feel the movement",
                "A consistent, predictable, private environment",
              ],
            }}
          />
        </div>
      </Section>

      {/* ADAPTATIONS */}
      <Section background="white">
        <SectionHeading eyebrow="How Sessions Are Adapted" heading="What Makes VIP Training Different" />
        <Reveal y={40} start="top 80%" style={{ marginTop: 40 }}>
          <FeatureBand
            accent="rose"
            items={adaptations.map((a) => ({ icon: a.icon, title: a.title, body: a.body }))}
          />
        </Reveal>
      </Section>

      {/* CREDENTIALS STRIP */}
      <Section background="cream">
        <StatStrip
          background="ink"
          stats={[
            { icon: IconAward, value: "L4", label: "Level 4 Cancer & Exercise Rehab" },
            { icon: IconUsers, value: "1:1", label: "Private sessions only" },
            { icon: IconMessageCircle, value: "Verbal", label: "Led instruction, not demonstration" },
            { icon: IconTarget, value: "Showdown", label: "Adapted-sport experience" },
          ]}
        />
      </Section>

      {/* FAQ */}
      <Section background="white">
        <FaqSplit
          eyebrow="Common Questions"
          heading="Questions About VIP Personal Training"
          intro="If your question is not covered here, just ask — I would always rather you did."
          accent="teal"
          cta={bookCta}
          items={faqs}
        />
      </Section>

      <CTABand
        image="/images/blind-sport-team.jpg"
        imageAlt="A visually impaired sports team training together"
        heading="Ready to find out if this is right for you?"
        body="The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."
        primaryCta={{ label: "Book a Free Consultation", href: BOOKINGS_URL }}
        secondaryCta={{ label: "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      </main>
      <Footer />
    </div>
  );
}
