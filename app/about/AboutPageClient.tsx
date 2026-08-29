"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BOOKINGS_URL } from "@/lib/booking";
import { useBookingModal } from "@/components/BookingModal";
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

export default function AboutPageClient() {
  const { openBookingModal } = useBookingModal();
  const qualifications = [
    { title: "Personal Training", desc: "Individualised coaching to build a lasting foundation for your everyday strength and fitness." },
    { title: "Exercise Referral", desc: "Specialist programming to safely manage clinical conditions, injuries, and GP-referred health requirements, focusing heavily on Balance, Mobility, and Joint Stability Support." },
    { title: "Level 4 Cancer and Exercise Rehabilitation", desc: "Expert physical coaching to safely support your body before, during, and after cancer treatment." },
  ];

  const studioCards = [
    { title: "Designed for All Abilities", desc: "Studio set up for disabilities, mobility limitations, and complex health needs — with equipment chosen for real-life movement, not performance aesthetics.", icon: IconAccessibility },
    { title: "Equipment That Serves You", desc: "Resistance bands, mobility tools, adaptive kit. Nothing intimidating.", icon: IconDumbbell },
    { title: "A Calm Environment", desc: "Quiet, private, one-to-one. Because progress needs calm, not noise.", icon: IconLeaf },
  ];

  const longTermCards = [
    { title: "The Power of Consistency", desc: "Small, steady actions repeated over time create lasting, real-world change. We focus on building manageable habits, completely avoiding extreme or restrictive routines.", image: "/images/approach-consistency.jpg", href: undefined },
    { title: "Adapting When Things Change", desc: "Life is unpredictable, and your body changes daily. Your programme adapts alongside your energy levels and circumstances, ensuring progress never stops—it just looks different.", image: "/images/mobility-movement.jpg", href: undefined },
    { title: "Real Outcomes, Not Aesthetics", desc: "We measure success by how you feel, move, and live outside the studio. True fitness means becoming stronger, more capable, and comfortable in your own skin.", image: "/images/mind-body.jpg", href: undefined },
  ];

  const bookCta = { label: "Book a Free Consultation", href: BOOKINGS_URL, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
      <PageHero
        layout="split"
        image="/images/about-hero-esther-portrait.png"
        imageAlt="Esther standing against the plywood wall of the private Worthing studio with one hand on her hip, smiling straight at the camera, the kettlebells racked in weight order on the shelf beside her."
        imagePan="108%"
        imageObjectPosition="56% 35%"
        imageObjectPositionWide="56% 22%"
        eyebrow={"About Esther"}
        heading={"About Esther Fair"}
        subhead={"Personal trainer. Private studio, Worthing."}
        primaryCta={bookCta}
        secondaryCta={{ label: "My Story", href: "#story", variant: "outline" }}
        belowLead={<>I specialise in adaptive fitness. I design personalised training programmes that accommodate injuries, limitations, and unique goals that standard routines leave behind.</>}
      />

      {/* Story */}
      <Section background="white" id="story">
        <div className="ds-split">
          <Reveal y={40}>
            <figure style={{ margin: 0, position: "relative" }}>
              <div className="ds-split-img">
                <Image src="/images/about-story-deadlift.jpg" alt="A client hinged over a loaded barbell in the private Worthing studio taking his grip, with Esther standing a step back so she can see the whole lift rather than leaning in." fill sizes="(max-width: 1000px) 100vw, 45vw" style={{ objectFit: "cover", objectPosition: "54% 50%" }} />
                <details className="ef-desc">
                  <summary>Describe this image</summary>
                  <p>A one-to-one session at the barbell, a beat after the setup. The client is hinged over the bar with both hands on it; the plates are marked 5 KG in large white figures. Esther has stepped back a pace so she can see the whole lift, hands at her sides, and is not touching him. Resistance bands hang from the wall on the right; the floor around the bar is clear.</p>
                </details>
              </div>
              <figcaption className="ds-figcaption">The private studio, Worthing</figcaption>
            </figure>
          </Reveal>
          <div>
            <SectionHeading eyebrow={"My Story"} heading={"How Eternal Fitness Came to Be"} />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>{"I started working in fitness because I wanted to help people move well and feel good, but I quickly realised my heart lay in making exercise accessible to absolutely everyone—regardless of the challenges or health issues they might be facing. I loved finding ways to make movement work for people who felt left out by standard gym routines, which led me to set up and run a dedicated GP Exercise Referral scheme within a busy public leisure centre."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{"When Covid closed gym doors in 2020, everything shifted. I began training clients outdoors and simultaneously joined a clinical trial, delivering online exercise sessions for people undergoing cancer treatment. Saying \"yes\" to these opportunities redefined my purpose. It proved just how much people benefit from a trainer who adapts dynamically, rather than relying on one-size-fits-all routines."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{"I chose to step away from the typical weight-loss and body transformation focus of the fitness industry and launched Eternal Fitness in 2020. I wanted to deliver thoughtful, highly individualised coaching centred on real-world fitness, health, and longevity."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{"My clients range from everyday people looking to get fitter and feel like themselves again, to individuals navigating complex medical needs, through to athletes who require deep, calculated thought built into their programming."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{"To best serve this diverse community, I am committed to continuous education. I regularly add advanced qualifications to my toolkit to make sure that my training methods remain safe, progressive, and highly effective—no matter who is walking through my door."}</p>
              <p className="ds-body" style={{ marginBottom: 16 }}>{"I train my clients out of my private studio in Worthing. Success here is not measured by numbers on a scale, but by real-world confidence and strength."}</p>
              <p className="ds-body" style={{ marginBottom: 0 }}>{"The proof is in the results: the vast majority of my clients choose to stay and train with me for a number of years. That is the kind of trusted, lasting partnership I offer to every person I work with."}</p>
              <div style={{ marginTop: 30 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Qualifications + Experience */}
      <Section background="cream" id="qualifications">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={"Qualifications"}
              heading={"My Qualifications & Expertise"}
              intro={"Beyond standard personal training credentials, I hold advanced specialisms in Exercise Referral and Level 4 Cancer and Exercise Rehabilitation. In practice, this means your training never has to reset if your health changes. Whether you face fluctuating blood pressure, a new diagnosis, or recovery from medical treatment, I adapt your movements safely. You get to keep training with the personal trainer who already knows your body, without the stress of searching for someone new."}
            />
          </div>
          <Reveal y={40}>
            <div className="ds-split-img" style={{ aspectRatio: "4/3" }}>
              <Image src="/images/about-quals-barbell-hands.jpg" alt="A client setting his grip on a bare barbell stood upright on its end, with Esther holding the same bar with both hands just below his so it stays still while he finds the position by feel." fill sizes="(max-width: 1000px) 100vw, 45vw" style={{ objectFit: "cover", objectPosition: "50% 45%" }} />
              <details className="ef-desc">
                <summary>Describe this image</summary>
                <p>A close-in moment before a set. A bare barbell is stood upright on the floor on one end. The client has one hand around it at chest height; Esther holds the same bar with both hands just below his, keeping it completely still while he finds his grip. Both are looking down at the bar. Nothing is loaded on it yet.</p>
              </details>
            </div>
          </Reveal>
        </div>

        <div className="ds-qual-cards-row" style={{ marginTop: 48 }}>
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

        <div className="ds-exp ds-split" style={{ marginTop: 64 }}>
          <Reveal y={40}>
            <div className="ds-split-img" style={{ aspectRatio: "4/3" }}>
              <Image src="/images/about-experience-coaching.png" alt="A client seated on the upright bench in the private Worthing studio pressing two dumbbells overhead, with Esther standing behind the bench and a hand under each of his elbows through the whole movement." fill sizes="(max-width: 1000px) 100vw, 45vw" style={{ objectFit: "cover", objectPosition: "50% 35%" }} />
              <details className="ef-desc">
                <summary>Describe this image</summary>
                <p>A one-to-one session at the bench, seen from behind. The client presses two dumbbells up from shoulder height, sitting back against the upright bench. Esther stands behind him with a hand under each elbow all the way up and all the way down, so he knows where the support is without having to look for it. The studio door and the window are ahead of them; the floor behind the bench is clear.</p>
              </details>
            </div>
          </Reveal>
          <div>
            <p className="ds-body" style={{ fontWeight: 600, color: "var(--color-ink)", marginBottom: 12 }}>{"A Wide Range of Experience"}</p>
            <p className="ds-body" style={{ marginBottom: 16 }}>{"My clients train with me for premium, one-to-one fitness, strength, and conditioning. Alongside everyday training, I design custom programmes for individuals managing chronic conditions, recovering from surgery, adjusting to physical changes, or living with a disability."}</p>
            <p className="ds-body" style={{ marginBottom: 22 }}>{"If you are wondering whether your situation is too complicated for personal training, it almost certainly is not."}</p>
            <Link href="/contact" className="ef-btn ef-btn-outline">Get in touch</Link>
            <p style={{ marginTop: 20, fontSize: 12.5, color: "var(--color-muted-text)", letterSpacing: "0.02em" }}>
              {"As featured in"}{" — "}
              <a
                href="https://www.fitpro.com/blog/training-blind-or-partially-sighted-clients/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 700, color: "var(--color-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                {"FitPro"}
              </a>
              {" "}{"— on training blind and partially sighted clients"}
            </p>
          </div>
        </div>
      </Section>

      {/* Philosophy (dark band, per mockup) */}
      <Section background="ink" id="philosophy">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={"Philosophy"}
              heading={"The Philosophy"}
              light
            />
            <Reveal y={24}>
              <p className="ds-body ds-body-light" style={{ marginTop: 20, marginBottom: 16 }}>{"Eternal Fitness is not a generic weight-loss or body transformation service. Training here is never about forcing your body to fit an artificial standard—it is about discovering what you are capable of right now, and building sustainably from there."}</p>
              <p className="ds-body ds-body-light" style={{ marginBottom: 28 }}>{"Real physical progress cannot be rushed or forced into a six-week trend. True success means climbing stairs with ease, sleeping deeper, and moving through daily life with lasting confidence. Achieving this requires time, consistency, and a coach who knows exactly how to adapt your programming when your body's needs change. That is my focus."}</p>
              <div style={{ marginTop: 28 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
          <Reveal y={40}>
            <Callout
              icon={IconHeartHandshake}
              accent="rose"
              title={"More Than a Workout"}
              body={"There are no generic weigh-ins or before-and-after photos here. I remove the pressure to look a certain way, focusing entirely on steady, meaningful progress relative to your personal baseline."}
              className="ds-callout-dark"
            />
          </Reveal>
        </div>
      </Section>

      {/* Studio */}
      <Section background="white">
        <SectionHeading
          align="center"
          eyebrow={"Studio"}
          heading={"A Private Space in Worthing"}
          intro={"Sessions take place in a small, private studio. No public gym floor. No other clients watching. No ambient pressure of what anyone else around you is doing."}
        />
        <Reveal className="ds-grid-2" stagger={0.12} y={40} start="top 82%" >
          <div className="ds-split-img" style={{ aspectRatio: "16/10" }}>
            <Image src="/images/about-studio-band-stretch.jpg" alt="Esther and a client facing each other across the studio floor with one long resistance band held between them, Esther down in the same half-squat she is asking the client to hold." fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover", objectPosition: "50% 40%" }} />
            <details className="ef-desc">
              <summary>Describe this image</summary>
              <p>Two people facing each other across the studio floor with a single long resistance band stretched between them, one end each. Esther holds her end in at her chest and sits down into a half-squat &mdash; the same position the client is working in &mdash; so the shape is being shown rather than described. The kettlebell shelves, the whiteboard and the suspension straps are along the wall behind.</p>
            </details>
          </div>
          <div className="ds-split-img" style={{ aspectRatio: "16/10" }}>
            <Image src="/images/about-studio-kettlebells.jpg" alt="Esther and a client on the blue mats side by side, both in the same half-kneeling rotation with one hand planted on the mat and the other arm reaching straight up, each following their own raised hand with their eyes." fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover", objectPosition: "50% 45%" }} />
            <details className="ef-desc">
              <summary>Describe this image</summary>
              <p>Two people on the blue mats, one mat each, both in the same half-kneeling rotation: one hand planted on the mat, the other arm reaching straight up, eyes following the raised hand. Esther is doing the movement alongside the client rather than watching it. The plyo boxes and the dumbbell tree stand against the wall behind; the mats are padded and the floor around them is clear.</p>
            </details>
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
          eyebrow={"Long-Term Progress"}
          eyebrowColor="teal"
          heading={"Why the Long-Term Approach Matters"}
          intro={"Quick fixes do not work. Sustainable change does — and Eternal Fitness is built around that belief."}
        />
        <div className="ds-art-divider"><PulseLine accent="teal" /></div>
        <div style={{ marginTop: 48 }}>
          <ProcessFlow steps={longTermCards.map((c) => ({ title: c.title, body: c.desc }))} />
        </div>
        <figure className="ds-quote-card">
          <div className="ds-quote-card-mark" aria-hidden="true">&ldquo;</div>
          <p className="ds-quote-card-body">
            {"Esther is a friendly and easy going person to get along with and copes well with my limited ability, and occasional lack of concentration. I would highly recommend her as a careful and insightful trainer."}
          </p>
          <figcaption className="ds-quote-card-by">
            <span className="ds-quote-card-av" aria-hidden="true">I</span>
            <span>
              <span className="ds-quote-card-name" style={{ display: "block" }}>{"Ian"}</span>
              <span className="ds-quote-card-meta" style={{ display: "block" }}>{"Training 7 years"}</span>
            </span>
          </figcaption>
        </figure>
        <div className="ds-about-foot">
          <button
            type="button"
            onClick={openBookingModal}
            className="ef-btn ef-btn-primary"
            style={{ gap: 8 }}
          >
            Book a Free Consultation
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </Section>

      <CTABand
        layout="split"
        image="/images/studio-kettlebell-shelf.jpg"
        imageAlt="The kettlebell shelves in the private Worthing studio: two steel tiers holding the bells in weight order, the lighter ones marked with coloured bands on the top shelf and the heavier ones printed with their weight below, with the aerobic steps stacked underneath and the floor in front clear."
        imagePosition="center 45%"
        eyebrow={"Free Consultation"}
        heading={"The first conversation is free, with no commitment."}
        body={"I work with a small number of clients at a time \u2014 so every person gets my full attention."}
        primaryCta={{ label: "Book a Free Consultation", href: BOOKINGS_URL }}
        secondaryCta={{ label: "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
        imageDescription={"Two tiers of steel shelving against the studio&rsquo;s plywood wall. The kettlebells stand in a row in weight order &mdash; the lighter bells along the top shelf, each marked with a coloured band, the heavier ones on the shelf below with their weights printed in large figures on the side. Aerobic steps are stacked in the space under the bottom shelf, and the rubber floor in front of the shelves is clear."}
      />
      </main>
      <Footer />
    </div>
  );
}
