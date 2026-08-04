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
  Callout,
  CTABand,
  Reveal,
  CtaButton,
  ProcessFlow,
  PulseLine,
} from "@/components/ds";
import { IconAccessibility, IconDumbbell, IconLeaf, IconHeartHandshake } from "@/components/icons";

export default function AboutPageClient({ content = {} }: { content?: Record<string, string> }) {
  const { open, setOpen, openDialog } = useConsultationDialog();

  const qualifications = [
    { title: content?.qual_1_title ?? "Personal Training", desc: content?.qual_1_desc ?? "Individualised coaching to build the foundation for your strength and fitness." },
    { title: content?.qual_2_title ?? "Exercise Referral", desc: content?.qual_2_desc ?? "Specialist programming to safely manage clinical conditions, injuries, and GP-referred health requirements." },
    { title: content?.qual_3_title ?? "Level 4 Cancer and Exercise Rehabilitation", desc: content?.qual_3_desc ?? "Specialist training to safely support your body during and after cancer treatment." },
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
        image="/images/studio-kneel-stretch.jpg"
        imageAlt="Esther Fair and a client stretching together on the mats in her private studio in Worthing"
        imagePan="108%"
        imageObjectPosition="50% 46%"
        imageObjectPositionWide="50% 34%"
        eyebrow={content?.hero_eyebrow ?? "About Esther"}
        heading={content?.hero_heading ?? "About Esther Fair"}
        subhead={content?.hero_subhead ?? "Personal trainer. Private studio, Worthing."}
        primaryCta={bookCta}
        secondaryCta={{ label: content?.hero_btn_secondary ?? "My Story", href: "#story", variant: "outline" }}
        belowLead={<>I specialize in adaptive fitness. I design personalized training programs that accommodate injuries, limitations, and unique goals that standard routines leave behind.</>}
      />

      {/* Story */}
      <Section background="white" id="story">
        <div className="ds-split">
          <Reveal y={40}>
            <figure style={{ margin: 0, position: "relative" }}>
              <div className="ds-split-img">
                <Image src="/images/esther-training.jpg" alt="Esther Fair in her private studio in Worthing" fill sizes="(max-width: 1000px) 100vw, 45vw" style={{ objectFit: "cover", objectPosition: "50% 20%" }} />
              </div>
              <figcaption className="ds-figcaption">The private studio, Worthing</figcaption>
            </figure>
          </Reveal>
          <div>
            <SectionHeading eyebrow={content?.story_eyebrow ?? "My Story"} heading={content?.story_heading ?? "How Eternal Fitness Came to Be"} />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>{content?.story_p1 ?? "I started working in fitness because I wanted to help people move well and feel good, but I quickly realized my heart lay in making exercise accessible to absolutely everyone—regardless of the challenges or health issues they might be facing. I loved finding ways to make movement work for people who felt left out by standard gym routines, which led me to set up and run a dedicated GP Exercise Referral scheme within a busy public leisure centre."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{content?.story_p2 ?? "When Covid-19 closed gym doors in 2020, everything shifted. I began training clients outdoors and simultaneously joined a clinical trial, delivering online exercise sessions for people undergoing cancer treatment. Saying \"yes\" to these opportunities redefined my purpose. It proved just how much people benefit from a coach who adapts dynamically, rather than relying on one-size-fits-all routines."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{content?.story_p3 ?? "Driven by this new purpose, I established Eternal Fitness in 2020. I chose to step away from the typical weight-loss and body transformation focus of the fitness industry. Instead, I wanted to deliver thoughtful, highly individualized coaching centered on real-world fitness, health, and longevity."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{content?.story_p3b ?? "My clients range from everyday people looking to get fitter and feel like themselves again, to individuals navigating complex medical recovery, through to athletes who require deep, calculated thought built into their programming."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{content?.story_p3c ?? "To best serve this diverse community, I am deeply committed to continuous education. I regularly add advanced qualifications to my toolkit to ensure that my training methods remain safe, progressive, and highly effective—no matter who is walking through my door."}</p>
              <p className="ds-body" style={{ marginBottom: 0 }}>{content?.story_p4 ?? "Today, I train clients out of my private studio in Worthing. Success here is not measured by numbers on a scale, but by real-world confidence and strength. The proof is in the results: the vast majority of my clients choose to stay and train with me for a number of years. That is the kind of trusted, lasting partnership I offer to every person I work with."}</p>
              <div style={{ marginTop: 30 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Qualifications + Experience */}
      <Section background="cream" id="qualifications">
        <div className="ds-qual-grid">
          <div>
            <SectionHeading
              eyebrow={content?.quals_eyebrow ?? "Qualifications"}
              heading={content?.quals_heading ?? "My Qualifications & Expertise"}
              intro={content?.quals_intro ?? "Beyond standard personal training credentials, I hold advanced specialisms in Exercise Referral and Level 4 Cancer and Exercise Rehabilitation. In practice, this means your training never has to pause if your health circumstances change. Whether navigating a new medical diagnosis, managing a GP referral, or recovering from clinical treatment, I have the specialist expertise to adapt your program safely—meaning you never have to look for a new trainer."}
            />
            <div className="ds-exp">
              <p className="ds-body" style={{ fontWeight: 600, color: "var(--color-ink)", marginBottom: 12 }}>{content?.exp_heading ?? "A Wide Range of Experience"}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{content?.exp_p1 ?? "The majority of my clients train with me for premium, one-to-one fitness, strength, and conditioning. Alongside standard training, I regularly design programs for individuals managing chronic conditions, recovering from surgery, adjusting to physical changes, or living with a disability."}</p>
              <p className="ds-body" style={{ marginBottom: 22 }}>{content?.exp_p2 ?? "If you're wondering whether your situation is too complicated, it almost certainly isn't — get in touch."}</p>
              <Link href="/contact" className="ef-btn ef-btn-outline">Get in touch</Link>
            </div>
          </div>
          <div className="ds-qual-cards">
            {qualifications.map((q, i) => (
              <div key={q.title} className="ds-qual-card">
                <div className="ds-qual-n">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div className="ds-qual-t">{q.title}</div>
                  <div className="ds-qual-d">{q.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Philosophy (dark band, per mockup) */}
      <Section background="ink" id="philosophy">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={content?.phil_eyebrow ?? "Philosophy"}
              heading={content?.phil_heading ?? "The Philosophy"}
              light
            />
            <Reveal y={24}>
              <p className="ds-body ds-body-light" style={{ marginTop: 20, marginBottom: 16 }}>{content?.phil_p1 ?? "Eternal Fitness is not a generic weight-loss service. Training here is not about forcing your body to fit an artificial standard—it is about discovering what your body is capable of right now, and building sustainably from there."}</p>
              <p className="ds-body ds-body-light" style={{ marginBottom: 28 }}>{content?.phil_p2 ?? "Real physical progress cannot be rushed into a six-week trend. True success means climbing stairs with ease, sleeping better, and moving through daily life with lasting confidence. Achieving this requires time, consistency, and a coach who knows exactly how to adapt your programming when your needs change. That is my focus."}</p>
              <div style={{ marginTop: 28 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
          <Reveal y={40}>
            <Callout
              icon={IconHeartHandshake}
              accent="rose"
              title={content?.phil_callout_title ?? "More Than a Workout"}
              body={content?.phil_callout_body ?? "There are no generic weigh-ins or before-and-after photos here. I remove the pressure to look a certain way, focusing entirely on steady, measurable progress relative to your personal baseline."}
              className="ds-callout-dark"
            />
          </Reveal>
        </div>
      </Section>

      {/* Studio */}
      <Section background="white">
        <SectionHeading
          align="center"
          eyebrow={content?.studio_eyebrow ?? "Studio"}
          heading={content?.studio_heading ?? "A Private Space in Worthing"}
          intro={content?.studio_intro ??
            "Sessions take place in a small, private studio. No public gym floor. No other clients watching. No ambient pressure of what anyone else around you is doing."}
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
        <figure className="ds-quote-card">
          <div className="ds-quote-card-mark" aria-hidden="true">&ldquo;</div>
          <p className="ds-quote-card-body">
            {content?.testimonial_1 ?? "Esther has really helped me wonderfully over the past 7 years with my fitness and flexibility."}
          </p>
          <figcaption className="ds-quote-card-by">
            <span className="ds-quote-card-av" aria-hidden="true">CF</span>
            <span>
              <span className="ds-quote-card-name" style={{ display: "block" }}>{content?.testimonial_1_name ?? "Colin F"}</span>
              <span className="ds-quote-card-meta" style={{ display: "block" }}>{content?.testimonial_1_meta ?? "Training 7 years"}</span>
            </span>
          </figcaption>
        </figure>
        <div className="ds-about-foot">
          <button
            type="button"
            onClick={openDialog}
            className="ef-btn ef-btn-primary"
            style={{ gap: 8 }}
          >
            Book a Free Consultation
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </Section>

      <CTABand
        image="/images/studio-1.jpg"
        imagePosition="center 20%"
        eyebrow={content?.cta_eyebrow ?? "Free Consultation"}
        heading={content?.cta_heading ?? "The first conversation is free, with no commitment."}
        body={content?.cta_body ?? "I work with a small number of clients at a time — so every person gets my full attention."}
        primaryCta={{ label: content?.cta_btn_primary ?? "Book a Free Consultation", onClick: openDialog }}
        secondaryCta={{ label: content?.cta_btn_secondary ?? "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      <Footer />
      <ConsultationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
