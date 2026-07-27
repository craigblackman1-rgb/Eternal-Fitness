"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConsultationDialog from "@/components/ConsultationDialog";
import { useConsultationDialog } from "@/hooks/useConsultationDialog";
import {
  Section,
  SectionHeading,
  PageHero,
  FeatureBand,
  AccreditationStrip,
  StatBadge,
  Callout,
  CTABand,
  Reveal,
  CtaButton,
  ProcessFlow,
  PulseLine,
  JourneyPath,
} from "@/components/ds";
import { IconAccessibility, IconDumbbell, IconLeaf, IconHeartHandshake, IconUsers } from "@/components/icons";

export default function AboutPageClient({ content = {} }: { content?: Record<string, string> }) {
  const { open, setOpen, openDialog } = useConsultationDialog();

  const qualifications = [
    { title: content?.qual_1_title ?? "Personal Training", desc: content?.qual_1_desc ?? "The foundation everything else builds on." },
    { title: content?.qual_2_title ?? "Exercise Referral", desc: content?.qual_2_desc ?? "Qualified to work with GP-referred clients and clinical conditions requiring adapted programmes." },
    { title: content?.qual_3_title ?? "Level 4 Cancer and Exercise Rehabilitation", desc: content?.qual_3_desc ?? "Specialist training to support people during and after cancer treatment." },
  ];

  const studioCards = [
    { title: content?.studio_card_1_title ?? "Designed for All Abilities", desc: content?.studio_card_1_desc ?? "Studio set up for disabilities, mobility limitations, and complex health needs — with equipment chosen for real-life movement, not performance aesthetics.", icon: IconAccessibility },
    { title: content?.studio_card_2_title ?? "Equipment That Serves You", desc: content?.studio_card_2_desc ?? "Resistance bands, mobility tools, adaptive kit. Nothing intimidating.", icon: IconDumbbell },
    { title: content?.studio_card_3_title ?? "A Calm Environment", desc: content?.studio_card_3_desc ?? "Quiet, private, one-to-one. Because progress needs calm, not noise.", icon: IconLeaf },
  ];

  const longTermCards = [
    { title: content?.long_card_1_title ?? "The Power of Consistency", desc: content?.long_card_1_desc ?? "Small, steady actions repeated over time create lasting change, without extremes.", image: "/images/approach-consistency.jpg", href: undefined },
    { title: content?.long_card_2_title ?? "Adapting When Things Change", desc: content?.long_card_2_desc ?? "Your programme adapts with you, so progress never stops, it just looks different.", image: "/images/mobility-movement.jpg", href: undefined },
    { title: content?.long_card_3_title ?? "Real Outcomes, Not Aesthetics", desc: content?.long_card_3_desc ?? "Stronger, more capable, more comfortable in your body. These are the outcomes that actually matter.", image: "/images/mind-body.jpg", href: undefined },
  ];

  const bookCta = { label: content?.hero_btn_primary ?? "Book a Free Consultation", onClick: openDialog, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onBookConsultation={openDialog} />

      <PageHero
        image="/images/about-hero.jpg"
        imageAlt="Esther Fair, personal trainer in Worthing"
        eyebrow={content?.hero_eyebrow ?? "About Esther"}
        heading={content?.hero_heading ?? "About Esther Fair"}
        subhead={content?.hero_subhead ?? "Personal trainer. Private studio, Worthing."}
        primaryCta={bookCta}
        secondaryCta={{ label: content?.hero_btn_secondary ?? "My Story", href: "#story", variant: "ghost-white" }}
        badge={<StatBadge value="L4" label={content?.badge_label ?? "Level 4 Qualified"} sublabel={content?.badge_sublabel ?? "In Cancer & Exercise Rehabilitation"} />}
      />

      {/* Story */}
      <Section background="white" id="story">
        <div className="ds-split">
          <Reveal y={40} className="ds-split-img" >
            <Image src="/images/esther-about.jpg" alt="Esther Fair, personal trainer at Eternal Fitness Worthing" fill sizes="(max-width: 1000px) 100vw, 45vw" style={{ objectFit: "cover" }} />
            <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 3 }}>
              <StatBadge variant="rose" value="L4" label="Qualified" />
            </div>
            <div className="ds-art-chip">
              <JourneyPath accent="rose" milestones={3} />
            </div>
          </Reveal>
          <div>
            <SectionHeading eyebrow={content?.story_eyebrow ?? "My Story"} heading={content?.story_heading ?? "How Eternal Fitness Came to Be"} />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>{content?.story_p1 ?? "After qualifying, I took a job in a leisure centre first — I wanted the security of employment before doing anything on my own."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{content?.story_p2 ?? "Covid changed that. When leisure centres closed, some of my more vulnerable clients asked if I could keep training them outdoors. Around the same time, I joined a clinical trial delivering online exercise sessions for people going through cancer treatment. I said yes to a few things, and it worked out okay. So I said yes to a few more."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{content?.story_p3 ?? "I didn't want to build a generic weight-loss business. I wanted to work with people who had real physical and mental health needs — people finding their way back to fitness after cancer treatment, older adults, visually impaired clients, athletes — and measure it in confidence, independence and how people actually feel, not just numbers."}</p>
              <p className="ds-body" style={{ marginBottom: 28 }}>{content?.story_p4 ?? "I train from a converted garage studio now, and I've built my working hours around the life I actually want, not the other way round. My first client stayed with me for around seven years — that's the kind of relationship I'm after. I still get imposter syndrome some days. It hasn't stopped me building something I'm proud of."}</p>
              <CtaButton cta={bookCta} />
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Qualifications */}
      <Section background="cream">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={content?.quals_eyebrow ?? "Qualifications"}
              heading={content?.quals_heading ?? "What I'm Qualified For"}
              intro={content?.quals_intro ?? "I trained as a personal trainer first, then went further: Exercise Referral, and Level 4 Cancer and Exercise Rehabilitation. In practice, that means I'm equipped to keep working with you if your health changes — a new diagnosis, a GP referral, recovery from treatment — without you needing to find someone new."}
            />
            <div className="ds-featlist">
              {qualifications.map((q) => (
                <div key={q.title} className="ds-feat">
                  <span className="ds-feat-dot" />
                  <div>
                    <div className="ds-feat-t">{q.title}</div>
                    <div className="ds-feat-c">{q.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Reveal y={40} className="ds-split-img">
            <Image src="/images/esther-training.jpg" alt="Esther Fair, personal trainer at Eternal Fitness Worthing" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          </Reveal>
        </div>
        <Reveal y={24} start="top 88%" style={{ marginTop: 56 }}>
          <AccreditationStrip />
        </Reveal>
      </Section>

      {/* Experience */}
      <Section background="white">
        <SectionHeading
          align="center"
          eyebrow={content?.exp_eyebrow ?? "Experience"}
          eyebrowColor="teal"
          heading={content?.exp_heading ?? "A Wide Range of Experience"}
        />
        <Reveal y={24} className="ds-head-center" >
          <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>{content?.exp_p1 ?? "Over the years I've worked with people managing chronic conditions, recovering from surgery, adjusting to a new diagnosis, or living with a disability — alongside the majority of my clients, who are just looking for proper one-to-one training."}</p>
          <p className="ds-body">{content?.exp_p2 ?? "If you're wondering whether your situation is too complicated, it almost certainly isn't — get in touch."}</p>
        </Reveal>
        <div style={{ maxWidth: 640, margin: "40px auto 0" }}>
          <Callout
            icon={IconUsers}
            accent="teal"
            title={content?.exp_callout_title ?? "Not sure if you qualify?"}
            body={<>If you're wondering whether your situation means you can't train — <Link href="/contact" className="text-teal hover:underline">please get in touch</Link>. The answer is almost always yes, I can help. That's exactly what I <Link href="/personal-training" className="text-teal hover:underline">specialise in</Link>.</>}
          />
        </div>
      </Section>

      {/* Philosophy */}
      <Section background="cream" id="philosophy">
        <div className="ds-split">
          <div>
            <SectionHeading eyebrow={content?.phil_eyebrow ?? "Philosophy"} heading={content?.phil_heading ?? "The Philosophy"} />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>{content?.phil_p1 ?? "Eternal Fitness isn't a weight-loss service. It's not about transforming your body into something it isn't. It's about finding out what your body can do right now, and building steadily from there."}</p>
              <p className="ds-body" style={{ marginBottom: 28 }}>{content?.phil_p2 ?? "The goal isn't a six-week result. It's climbing stairs with less effort. Sleeping better. Moving through life with more ease and confidence than before. That takes time, consistency, and someone who adjusts when things change. That's what I do."}</p>
              <Callout
                icon={IconHeartHandshake}
                accent="rose"
                title={content?.phil_callout_title ?? "More Than a Workout"}
                body={content?.phil_callout_body ?? "No weigh-ins. No before-and-after photos. No pressure to look a certain way. Just steady progress, measured against your own baseline."}
              />
              <div style={{ marginTop: 28 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
          <Reveal y={40} className="ds-split-img">
            <Image src="/images/about-philosophy.jpg" alt="Personal training philosophy at Eternal Fitness Worthing" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          </Reveal>
        </div>
      </Section>

      {/* Studio */}
      <Section background="white">
        <SectionHeading
          align="center"
          eyebrow={content?.studio_eyebrow ?? "Studio"}
          heading={content?.studio_heading ?? "A Private Space in Worthing"}
          intro={content?.studio_intro ?? "Sessions take place in a small, private, fully equipped studio. No public gym floor. No other clients watching. No ambient pressure of what anyone else around you is doing."}
        />
        <Reveal className="ds-grid-2" stagger={0.12} y={40} start="top 82%" >
          <div className="ds-split-img" style={{ aspectRatio: "16/10" }}>
            <Image src="/images/studio/studio-rack.jpg" alt="The real Eternal Fitness studio in Worthing — squat rack, free weights, and mirror wall" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          </div>
          <div className="ds-split-img" style={{ aspectRatio: "16/10" }}>
            <Image src="/images/studio/studio-neon.jpg" alt="Inside the Eternal Fitness studio — Consistency is Key" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          </div>
        </Reveal>
        <Reveal y={40} start="top 82%" style={{ marginTop: 48 }}>
          <FeatureBand
            accent="teal"
            items={studioCards.map((c) => ({ icon: c.icon, title: c.title, body: c.desc }))}
          />
        </Reveal>
      </Section>

      {/* Long-Term */}
      <Section background="cream">
        <SectionHeading
          eyebrow={content?.long_eyebrow ?? "Long-Term Progress"}
          eyebrowColor="teal"
          heading={content?.long_heading ?? "Why the Long-Term Approach Matters"}
          intro={content?.long_intro ?? "Quick fixes do not work. Sustainable change does — and Eternal Fitness is built around that belief."}
        />
        <div className="ds-art-divider"><PulseLine accent="teal" /></div>
        <div style={{ marginTop: 48 }}>
          <ProcessFlow steps={longTermCards.map((c) => ({ title: c.title, body: c.desc }))} />
        </div>
        <div style={{ maxWidth: 640, margin: "48px auto 0", textAlign: "center" }}>
          <p className="ds-body" style={{ fontStyle: "italic" }}>
            {content?.testimonial_1 ?? "“Esther has really helped me wonderfully over the past 7 years with my fitness and flexibility.”"}
          </p>
          <p className="ds-body" style={{ marginTop: 8, fontWeight: 600 }}>{content?.testimonial_1_author ?? "Colin F, training 7 years"}</p>
        </div>
      </Section>

      <CTABand
        image="/images/studio-1.jpg"
        imagePosition="center 20%"
        heading={content?.cta_heading ?? "Ready to find out if this is right for you?"}
        body={content?.cta_body ?? "The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."}
        primaryCta={{ label: content?.cta_btn_primary ?? "Book a Free Consultation", onClick: openDialog }}
        secondaryCta={{ label: content?.cta_btn_secondary ?? "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      <Footer />
      <ConsultationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
