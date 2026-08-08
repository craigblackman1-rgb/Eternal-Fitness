"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeMotion from "@/components/home/HomeMotion";
import { useBookingModal } from "@/components/BookingModal";
import { IconAward } from "@/components/icons";
import "./home.css";

const Arrow = () => (
  <svg className="ico" width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function HomePageClient({ content = {} }: { content?: Record<string, string> }) {
  const { openBookingModal } = useBookingModal();
  return (
    <div className="efhome">
      <Navbar />

      <main id="main-content">
      {/* HERO */}
      <section id="hero">
        <div className="hero-media">
          <Image
            src="/images/studio-lunge-pair.jpg"
            alt="Esther Fair, laughing on the mats in her private studio in Worthing"
            fill
            priority
            sizes="100vw"
            // object-position itself lives in home.css (`--hero-pos`/`--hero-pos-wide`) —
            // the fixed-height hero crops much further into Esther's head at 4K/ultrawide
            // than at a normal desktop width, so the crop point has to change above
            // 1600px, which an inline style can't be conditioned on.
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="hero-copy">
          <div className="h-tag" id="htag">{content.hero_tag ?? "Worthing, West Sussex"}</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(40px, 4.7vw, 64px)", fontWeight: 400, lineHeight: 1.03, letterSpacing: "-.025em", color: "#fff", marginBottom: 22 }}>
            {content.hero_line_1 ?? "One-to-One"} {content.hero_line_2 ?? "Personal Training"}<br /><em style={{ fontStyle: "italic", color: "#fff" }}>{content.hero_line_3 ?? "in Worthing"}</em>
          </h1>
          <p className="h-loc" id="hloc">{content.hero_loc ?? "Private studio. No busy gym floors. No one watching. Just you, and a tailored plan built around how your body actually feels today."}</p>
          <div className="hero-rule" aria-hidden="true" />
          <p className="h-sub" id="hsub">
            {content.hero_subheading ?? "I am Esther—a Level 4 Specialist Personal Trainer based in a private studio in Worthing. Because I am trained beyond the industry standard, whatever is going on with your health, your plan adapts instead of stopping."}
          </p>
          <div className="h-btns" id="hbtns">
            <button type="button" className="btn btn-rs" onClick={openBookingModal}>{content.hero_btn_primary ?? "Book a Free Consultation"} <Arrow /></button>
            <a href="#approach" className="btn btn-ol">{content.hero_btn_secondary ?? "See How It Works"}</a>
          </div>
        </div>
        <div className="h-badge">
          <div className="hbc"><b>L4</b><span className="hbc-s">Qualified</span></div>
          <div>
            <div className="hbt">Cancer &amp; Exercise Rehabilitation</div>
            <div className="hbs">Level 4 qualified, plus Exercise Referral — so training can carry on if your health picture changes.</div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="tstrip">
        <div className="ttrack">
          {[0, 1].map((dup) => (
            <span key={dup} style={{ display: "flex" }}>
              <span className="ti">{content.ticker_1 ?? "Private One-to-One Personal Training"}</span><span className="ti ts">✦</span>
              <span className="ti">{content.ticker_2 ?? "No Gym Floor"}</span><span className="ti ts">✦</span>
              <span className="ti">{content.ticker_3 ?? "Blocks of 12 or 24 Sessions"}</span><span className="ti ts">✦</span>
              <span className="ti">{content.ticker_4 ?? "Level 4 Cancer & Exercise Rehabilitation"}</span><span className="ti ts">✦</span>
              <span className="ti">{content.ticker_5 ?? "Private Studio or Live Online"}</span><span className="ti ts">✦</span>
              <span className="ti">{content.ticker_6 ?? "Based in Worthing"}</span><span className="ti ts">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* WHY */}
      <section id="why" className="sec" style={{ background: "var(--white)" }}>
        <div className="sin">
          <div className="why-g">
            <div className="wic">
              <div className="wimg">
                <Image src="/images/esther-barbell-squat.jpg" alt="Esther Fair under a barbell in the squat rack at her Worthing studio" fill sizes="(max-width: 1000px) 100vw, 40vw" style={{ objectFit: "cover", objectPosition: "62% 50%" }} />
              </div>
              <div className="wbadge"><div className="wbn">4</div><div className="wbl">{content.badge_title ?? "Level 4 Qualified"}</div></div>
            </div>
            <div>
              <div className="stag stag-r">{content.why_tag ?? "Why Eternal Fitness"}</div>
              <h2 className="D" style={{ marginBottom: 16 }}>Training That Meets<br />You Where You Are</h2>
              {content.why_body && <p className="L">{content.why_body}</p>}
              <div className="wfeats">
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_1_title ?? "Strength Training for Active Longevity"}</div><div className="wfc">{content.why_feat_1_desc ?? "Building functional strength that improves how you move every single day."}</div></div></div>
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_2_title ?? "Calm, private, one-to-one training"}</div><div className="wfc">{content.why_feat_2_desc ?? "No crowded gym floor, no other people, and absolutely no pressure to perform."}</div></div></div>
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_3_title ?? "Trained to adapt when things change"}</div><div className="wfc">{content.why_feat_3_desc ?? "Specialised in exercise referral and cancer rehabilitation. If your health picture shifts, your training adapts instead of stopping."}</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APPROACH */}
      <section id="approach" className="sec" style={{ background: "var(--cream)" }}>
        <div className="sin">
          <div style={{ maxWidth: 640, marginBottom: 12 }}>
            <div className="stag stag-f">{content.approach_tag ?? "The Approach"}</div>
            <h2 className="D">How I Actually<br />Train You</h2>
          </div>
          <p className="L" style={{ maxWidth: 560 }}>
            {content.approach_body ?? "Effective training cannot be rigid. Your workouts are structured in advance, but because bodies change daily, I never force you through a session that does not fit your energy. I am always observing and adjusting to ensure you get the safest, most effective workout every single time."}
          </p>
          <div className="steps">
            <div className="step">
              <div className="sn">01</div>
              <div className="sc"><h3>{content.approach_step_1_title ?? "Every session adapts to how you feel that day"}</h3><p>{content.approach_step_1_desc ?? "Structured planning, dynamically tailored to you. It is the perfect balance of consistent progress and expert flexibility. If you are facing fatigue, a bad night, or a stiff shoulder, I notice and adjust without making a thing of it."}</p></div>
              <div className="si"><Image src="/images/consultation-programme-review.jpg" alt="Esther talking a client through their session plan mid-workout, notes in hand" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover" }} /></div>
            </div>
            <div className="step">
              <div className="sn">02</div>
              <div className="sc"><h3>{content.approach_step_2_title ?? "Private, one-to-one — no gym floor"}</h3><p>{content.approach_step_2_desc ?? "No other clients, no performance pressure, and no dress code. Just you and exactly what you need today."}</p></div>
              <div className="si"><Image src="/images/studio-kneel-stretch.jpg" alt="A relaxed stretch session in the private Eternal Fitness studio in Worthing" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover" }} /></div>
            </div>
            <div className="step">
              <div className="sn">03</div>
              <div className="sc"><h3>{content.approach_step_3_title ?? "Progress you can feel, not a number on a scale"}</h3><p>{content.approach_step_3_desc ?? "Climbing stairs with less effort. Sleeping better. Walking further. That is the real-world strength we build together."}</p></div>
              <div className="si"><Image src="/images/active-ageing-step-up.jpg" alt="Esther supporting an older client through a step-up — the everyday strength that makes stairs easier" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover", objectPosition: "50% 45%" }} /></div>
            </div>
          </div>
          <aside className="cred-band">
            <div>
              <div className="cred-ic"><IconAward className="w-5 h-5" /></div>
              <ul className="qual-list">
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Personal Trainer</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Exercise Referral</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Level 4 Cancer & Exercise Rehabilitation</li>
              </ul>
            </div>
            <div>
              <h3>{content.approach_box_1_title ?? "My Qualifications & Trust"}</h3>
              <p>{content.approach_box_1_desc ?? "I trained as a personal trainer first, then advanced my credentials to specialise in clinical exercise delivery. In practice, this means your fitness journey never has to reset if your medical picture shifts. Whether you face fluctuating blood pressure, a new diagnosis, or recovery from medical treatment, I adapt your movements safely. You get to keep training with the coach who already knows your body, without the stress of searching for someone new."}</p>
            </div>
          </aside>
        </div>
      </section>

      {/* WHO + SPECIALIST TRAINING (single dark band, per mockup — replaces
          the old separate dark "who" image-card section and light
          "specialist" text-only section). Condition list restored per
          Craig's explicit go-ahead (2026-07-29) after being flagged as a
          possible conflict with the "no condition roll-calls" hard rule —
          worth Esther's confirmation since it's her brand rule, but not
          blocking on it. */}
      <section id="specialist" className="sec" style={{ background: "var(--ink)" }}>
        <div className="sin">
          <div className="aq-g" style={{ gap: 56 }}>
            <div>
              <div className="stag stag-w">{content.who_tag ?? "Who I Work With"}</div>
              <p className="L LL" style={{ marginTop: 16, maxWidth: 480, fontFamily: "var(--font-serif)", fontSize: "clamp(19px,1.8vw,23px)", fontWeight: 400, color: "#fff", lineHeight: 1.35 }}>
                {content.who_body_lede ?? "Most of the people I train are simply looking for focused, one-to-one attention. Whether you want to get fitter, build strength, or feel more like yourself, my sessions are tailored entirely to you."}
              </p>
              <p className="L LL" style={{ marginTop: 16, maxWidth: 480 }}>
                {content.who_body ?? "Some arrive with more going on: a health condition, recovery from treatment, something that makes them wonder if training is even for them. If that's you, it almost certainly still is — get in touch."}
              </p>
              <div style={{ marginTop: 28 }}>
                <button type="button" className="btn btn-ow" onClick={openBookingModal}>{content.who_cta ?? "Book a Free Consultation"} <Arrow /></button>
              </div>
            </div>
            <div>
              <div className="stag stag-w">{content.specialist_tag ?? "Specialist Training"}</div>
              <p className="L LL" style={{ marginTop: 16, maxWidth: 480, marginBottom: 0 }}>
                {content.specialist_body ?? "As a Level 4 Specialist and GP Referral Trainer, I bridge the gap between medical treatment and everyday functional strength. I provide expert, safe guidance if you are managing specific health pictures, including:"}
              </p>
              <ul className="spec-list">
                <li><span><strong>Cardiovascular Care:</strong> Support for heart health and blood pressure management.</span></li>
                <li><span><strong>Musculoskeletal Strength:</strong> Targeted exercise for bone density and joint health.</span></li>
                <li><span><strong>Inclusive Training:</strong> Tailored physical coaching and movement correction for partially sighted people.</span></li>
                <li><span><strong>Cancer Rehabilitation:</strong> Gentle, progressive recovery training before, during, or after clinical treatment.</span></li>
                <li><span><strong>Active Ageing:</strong> Specialised mobility coaching for older adults, focusing on balance, agility, and joint stability.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (two equal-weight cards on white, per mockup — replaces
          the single-spotlight teal layout) */}
      <section id="testimonials" className="sec" style={{ background: "var(--white)" }}>
        <div className="sin">
          <div className="stag stag-r">{content.testimonial_heading ?? "Client Stories"}</div>
          <h2 className="D" style={{ marginBottom: 16 }}>What Clients Say</h2>
          <div className="aq-g" style={{ marginTop: 40 }}>
            <figure className="quote" style={{ margin: 0 }}>
              <div className="quote-mark" aria-hidden="true">&ldquo;</div>
              <p className="quote-p">
                {content.testimonial_1 ?? "She helps me maintain a level of strength, mobility and fitness that I wouldn't have without her... she also adapts routines and exercises to my needs when necessary. I would highly recommend Esther to anyone, of any age and ability."}
              </p>
              <figcaption className="quote-by">
                <div className="avatar">A</div>
                <div><div className="quote-n">Amanda M</div><div className="quote-m">Training 5 years</div></div>
              </figcaption>
            </figure>
            <figure className="quote" style={{ margin: 0 }}>
              <div className="quote-mark" aria-hidden="true">&ldquo;</div>
              <p className="quote-p">
                {content.testimonial_2 ?? "She adjusts to her clients' restrictions and individual goals, listens always and creates bespoke plans for every situation."}
              </p>
              <figcaption className="quote-by">
                <div className="avatar">S</div>
                <div><div className="quote-n">Saffron S</div><div className="quote-m">Client</div></div>
              </figcaption>
            </figure>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 44 }}>
            <Link href="/faqs" className="btn btn-ol">{content.testimonial_link ?? "Read the FAQs"} <Arrow /></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta">
        <div className="ctabg"><Image src="/images/studio-1.jpg" alt="Eternal Fitness private studio in Worthing" fill sizes="100vw" style={{ objectFit: "cover" }} /></div>
        <div className="ctac">
          <div className="stag stag-w" style={{ marginBottom: 16 }}>{content.cta_tag ?? "Free Consultation"}</div>
          <h2>{content.cta_heading ?? "Your first conversation is free, with absolutely no commitment."}</h2>
          <p>{content.cta_body ?? "I work with a small number of clients at any one time. This ensures you always receive my full, undivided attention."}</p>
          <div className="ctabtns">
            <button type="button" className="btn btn-wh" onClick={openBookingModal}>{content.cta_btn_primary ?? "Book a Free Consultation"}</button>
            <a href="tel:07517658128" className="btn btn-ow">{content.cta_btn_secondary ?? "Call: 07517 658 128"}</a>
          </div>
        </div>
      </section>

      </main>

      <Footer />

      <HomeMotion />
    </div>
  );
}
