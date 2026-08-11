"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BOOKINGS_URL } from "@/lib/booking";
import {
  Section,
  SectionHeading,
  PageHero,
  StatBadge,
  Reveal,
  CtaButton,
  Eyebrow,
  FaqSplit,
} from "@/components/ds";
import { IconArrowUpRight } from "@/components/icons";
import "./vi.css";

/* Same article FeaturedReviewedBand links to — Esther's published FitPro
 * feature on training blind and partially sighted clients. */
const FITPRO_URL = "https://www.fitpro.com/blog/training-blind-or-partially-sighted-clients/";

const studioFeats = [
  {
    title: "A Fully Private Studio",
    body: "No public gym floor, no other clients in the room, and zero performance pressure. You have the space entirely to yourself for the hour.",
  },
  {
    title: "A Predictable Environment",
    body: "Benches and equipment stay in the same positions, and the floor is kept clear of obstacles to ensure safe, independent navigation.",
  },
  {
    title: "Focused Navigation Support",
    body: "I keep the training music low so my voice is always clear, and use tactile markers to help you orient yourself easily.",
  },
];

const accessFaqs = [
  {
    title: "How do I navigate into the studio?",
    body: "I never presume to know what help you want — I will always ask. If you prefer to have a sighted guide, I can meet you outside or act as a guide on the walk into the studio.",
  },
  {
    title: "Is there public transport or parking nearby?",
    body: "Yes. The studio is located exceptionally close to main local bus stop routes, making travel straightforward. If you are arriving by car or being dropped off, free on-street parking is available nearby. Please note that the direct access road is uneven, but you can be dropped off directly at the main gate.",
  },
  {
    title: "Are guide dogs welcome?",
    body: "Absolutely, without reservation. If you travel with a guide dog, they are incredibly welcome to rest safely in the private studio during your session. If you prefer to have a support person or family member sit in on your sessions, the space is entirely yours.",
  },
  {
    title: "Do I need specialist kit?",
    body: "No. If you truly focus on muscle contractions and listen to the teaching cues, you do not need heavy weights or complex machinery. We use highly effective resistance bands, mobility tools, and free weights to build lasting, real-world strength.",
  },
];

export default function VisualImpairmentClient() {
  const bookCta = { label: "Book a Free Consultation", href: BOOKINGS_URL, arrow: true };

  return (
    <div className="min-h-screen bg-background vi-page">
      <Navbar />

      <main id="main-content">
        <PageHero
          image="/images/hero-vi-kettlebell-rack.jpg"
          imageAlt="Esther standing at the kettlebell rack in the private Worthing studio, smiling towards the camera with one hand resting on a bell that is racked in its usual place"
          imageObjectPosition="62% 18%"
          eyebrow="Personal Training"
          heading={
            <>
              VI-Inclusive <em>Coaching</em>
            </>
          }
          subhead="Accessible, one-to-one strength and movement coaching in a private Worthing studio."
          belowLead="If you have ever been told to sit out of physical activity, or felt left behind by inaccessible gym environments, you are not alone. If you have a visual impairment, it is not unusual to feel like standard fitness spaces just aren't built for you."
          belowLeadVariant="plain"
          primaryCta={bookCta}
          secondaryCta={{ label: "What Makes This Space Different", href: "#space", variant: "ghost-white" }}
          badge={
            <StatBadge
              value="BBS"
              label="British Blind Sport & UK Coaching"
              sublabel="Professional development in adapting gym environments, safety, and sight loss awareness."
            />
          }
        />

        {/* OPENING STATEMENT */}
        <Section background="white">
          <Reveal y={24} className="vi-open">
            <Eyebrow color="rose">Training That Meets You Where You Are</Eyebrow>
            <p style={{ marginTop: 16 }}>Over time, the belief sets in that training simply isn&rsquo;t an option.</p>
            <p className="vi-open-say">I am here to tell you that it is.</p>
            <p>
              Training together is not about fitting you into a rigid template. I am here to listen, adapt, and build
              real-world functionality on your own terms. Whether you want to improve your everyday functional
              strength, work toward a specific personal milestone, focus on moving with better posture and alignment,
              or train for elite-level sports — your baseline is my starting point, never a barrier.
            </p>
            <div className="vi-open-foot">
              <CtaButton cta={bookCta} />
            </div>
          </Reveal>
        </Section>

        {/* WHAT MAKES THIS SPACE DIFFERENT */}
        <Section background="cream" id="space">
          <div className="ds-split">
            <div>
              <SectionHeading
                eyebrow="The Studio"
                eyebrowColor="teal"
                heading="What Makes This Space Different"
              />
              <Reveal y={24}>
                <p className="ds-body vi-space-lead" style={{ marginTop: 18 }}>
                  Traditional public gym floors can be overwhelming, unpredictable, and chaotic. My private studio in
                  Worthing is designed specifically to remove those barriers so you can train with absolute peace of
                  mind.
                </p>
                <div className="ds-featlist" style={{ marginTop: 0 }}>
                  {studioFeats.map((f) => (
                    <div key={f.title} className="ds-feat">
                      <div className="ds-feat-dot" aria-hidden="true" />
                      <div>
                        <div className="ds-feat-t">{f.title}</div>
                        <div className="ds-feat-c">{f.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
            <Reveal y={40}>
              <figure style={{ margin: 0 }}>
                <div className="vi-plate">
                  <Image
                    src="/images/studio-fixed-positions.jpg"
                    alt="The studio between sessions: an adjustable bench standing clear of the wall, three barbells racked on fixed wall brackets at set heights, and bare matting on the floor with nothing left out on it"
                    fill
                    sizes="(max-width: 1000px) 100vw, 50vw"
                    style={{ objectFit: "cover" }}
                  />
                  <span className="vi-ticks" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <div className="vi-cap">Fixed positions, clear floor — the studio between sessions</div>
                </div>
                <details className="vi-desc">
                  <summary>Describe this image</summary>
                  <p>
                    A corner of the private studio with no one in it. An adjustable bench stands on the left with a
                    clear metre of floor around it. Three barbells sit on fixed wall brackets at three set heights, so
                    the same bar is always in the same place. The floor is bare rubber matting — no loose plates, no
                    dumbbells left out, nothing to walk into.
                  </p>
                </details>
              </figure>
            </Reveal>
          </div>
        </Section>

        {/* MY COACHING APPROACH */}
        <Section background="white">
          <div className="ds-split vi-split-r">
            <Reveal y={24} className="vi-coach">
              <Eyebrow color="rose">Communication</Eyebrow>
              <h2 className="ds-h2" style={{ margin: "16px 0 20px" }}>
                My Coaching Approach
              </h2>
              <p>
                Communication is at the heart of my coaching. Everyone responds to a different way of coaching —
                regardless of whether you are sighted, blind, or partially sighted. I will work directly with you to
                find the style that clicks.
              </p>
              <p>
                This might mean using detailed, layered verbal cues, or it could mean using light tactile feedback and
                guiding to help you safely feel your posture and alignment. I am always learning, completely flexible,
                and always happy to adapt my methods to make training you as comfortable and effective as possible.
              </p>
              {/* Published-work note. The mockup carries the FitPro membership badge
                  here, but the framing is "FitPro published her" — per the press/member
                  distinction documented in FeaturedReviewedBand, that context takes the
                  editorial press mark. */}
              <div className="vi-fitpro">
                <img className="vi-fitpro-mark" src="/images/accreditations/fitpro-press.png" alt="FitPro" />
                <div>
                  <p>
                    I recently wrote about these adaptive coaching methods for FitPro magazine. If you would like to
                    read the full feature article, you can find it here:
                  </p>
                  <a className="vi-fitpro-link" href={FITPRO_URL} target="_blank" rel="noopener noreferrer">
                    Read my FitPro feature article
                    <IconArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </Reveal>
            <Reveal y={40}>
              <figure style={{ margin: 0 }}>
                <div className="vi-tech" style={{ ["--fx" as string]: "35%", ["--fy" as string]: "51%" }}>
                  <Image
                    src="/images/coaching-plank-lowback-cue.jpg"
                    alt="Esther kneeling beside a client holding a forearm plank on the studio mats, resting a flat hand on his lower back to show him where the line of his body should sit"
                    fill
                    sizes="(max-width: 1000px) 100vw, 42vw"
                    style={{ objectFit: "cover" }}
                  />
                  <span className="vi-veil" aria-hidden="true" />
                  <svg className="vi-arc" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="46" transform="rotate(-46 50 50)" />
                  </svg>
                  <div className="vi-pin">
                    <span className="vi-dot" aria-hidden="true" /> Flat hand on the low back — a cue you can feel
                  </div>
                </div>
                <figcaption className="ds-figcaption" style={{ textAlign: "left" }}>
                  Tactile feedback is always by agreement, never assumed
                </figcaption>
                <details className="vi-desc">
                  <summary>Describe this image</summary>
                  <p>
                    A one-to-one session on the studio mats. The client holds a forearm plank. Esther kneels alongside
                    him and rests one flat, open hand on his lower back, so he can feel where his hips should sit
                    rather than being shown it in a mirror. Her other hand stays clear of him. Behind them the room is
                    quiet — racked resistance bands on one wall, a foam roller, nothing on the floor.
                  </p>
                </details>
              </figure>
            </Reveal>
          </div>
        </Section>

        {/* TAILORED COACHING (dark band) */}
        <Section background="ink">
          <Reveal y={24}>
            <div className="vi-dual">
              <div>
                <Eyebrow color="white">Inclusive Programming</Eyebrow>
                <h2 className="ds-h2 ds-h2-light" style={{ marginTop: 16 }}>
                  Tailored Coaching for All Baselines
                </h2>
              </div>
              <div>
                <p className="vi-statement">
                  My inclusive programming is built for all levels of fitness. A visual impairment is simply another
                  programming variable.
                </p>
                <p className="ds-body ds-body-light">
                  Every person who trains with me gets a custom plan built for their exact baseline, whether you are a
                  sports player with sight loss or looking to build functional strength for daily life, giving you the
                  knowledge to move safely and powerfully.
                </p>
              </div>
            </div>
          </Reveal>
        </Section>

        {/* PROFESSIONAL TRAINING */}
        <Section background="cream">
          <div className="ds-split">
            <Reveal y={40}>
              <figure style={{ margin: 0 }}>
                <div className="vi-mount">
                  <div className="vi-mount-win">
                    <Image
                      src="/images/esther-portrait-studio.jpg"
                      alt="Esther Fair smiling in the private Worthing studio"
                      fill
                      sizes="(max-width: 1000px) 100vw, 430px"
                      style={{ objectFit: "cover", objectPosition: "50% 22%" }}
                    />
                  </div>
                  <div className="vi-mount-mat">
                    <b>Esther Fair</b>
                    <span>British Blind Sport &amp; UK Coaching trained, personal trainer in Worthing.</span>
                  </div>
                </div>
                <details className="vi-desc" style={{ maxWidth: 430 }}>
                  <summary>Describe this image</summary>
                  <p>A head-and-shoulders portrait of Esther, smiling, standing against the studio&rsquo;s plywood wall.</p>
                </details>
              </figure>
            </Reveal>
            <div>
              <SectionHeading eyebrow="Credentials" eyebrowColor="teal" heading="Professional Training" />
              <Reveal y={24}>
                <p className="ds-body" style={{ marginTop: 16 }}>
                  Adapting a session well is a skill, and it is one I have been taught by the people who know it best.
                </p>
                <ul className="vi-prof">
                  <li>
                    <div className="vi-prof-t">British Blind Sport &amp; UK Coaching</div>
                    <p>
                      Completed specialised professional development training in adapting gym environments, safety, and
                      sight loss awareness.
                    </p>
                  </li>
                  <li>
                    <div className="vi-prof-t">Paralympic Insights</div>
                    <p>
                      Practical, hands-on training delivered by British Blind Sport specialists and Paralympians with
                      lived experience of sight loss — providing the knowledge, confidence, and practical skills
                      required to support people with VI in a fitness environment.
                    </p>
                  </li>
                </ul>
              </Reveal>
            </div>
          </div>
        </Section>

        {/* ACCESS & LOCATION QUESTIONS */}
        <Section background="white">
          <FaqSplit
            eyebrow="Practical Detail"
            heading="Access & Location Questions You Might Have"
            intro="If something you need to know isn't here, just ask — I would always rather you did."
            accent="rose"
            items={accessFaqs}
          />
        </Section>

        {/* CTA — closing band with direct-contact card */}
        <section className="ds-cta" id="cta">
          <div className="ds-cta-bg">
            <Image
              src="/images/studio-lunge-pair.jpg"
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "50% 42%" }}
            />
          </div>
          <div className="ds-cta-inner">
            <Reveal y={24}>
              <div className="vi-cta-grid">
                <div>
                  <p className="ds-eyebrow ds-eyebrow-white">Free Consultation</p>
                  <h2>Let&rsquo;s Talk About Where You Are Starting From</h2>
                  <p>
                    Your first conversation is completely free, confidential, and carries absolutely no obligation. We
                    can chat over the phone or book a live online video slot to discuss your specific goals and
                    practical requirements.
                  </p>
                  <div className="ds-cta-btns">
                    <CtaButton cta={{ label: "Book a Free Consultation", href: BOOKINGS_URL, variant: "white", arrow: true }} />
                  </div>
                </div>
                <div className="vi-direct">
                  <h3>Prefer to Book Directly?</h3>
                  <p>
                    If you use a screen reader and find automated calendar grids cumbersome to navigate, you do not
                    have to use them. Skip the widgets entirely and reach out to me directly via phone, text, or email:
                  </p>
                  <div className="vi-direct-row">
                    <span className="vi-lbl">Call or WhatsApp</span>
                    <a href="tel:07517658128">07517 658 128</a>
                  </div>
                  <div className="vi-direct-row vi-is-email">
                    <span className="vi-lbl">Email</span>
                    <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
