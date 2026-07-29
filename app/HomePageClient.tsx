"use client";

import Image from "next/image";
import Link from "next/link";
import ConsultationDialog from "@/components/ConsultationDialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeMotion from "@/components/home/HomeMotion";
import { useConsultationDialog } from "@/hooks/useConsultationDialog";
import { IconAward, IconHeartHandshake } from "@/components/icons";
import "./home.css";

const Arrow = () => (
  <svg className="ico" width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function HomePageClient({ content = {} }: { content?: Record<string, string> }) {
  const { open, setOpen, openDialog } = useConsultationDialog();

  return (
    <div className="efhome">
      <Navbar onBookConsultation={openDialog} />

      {/* HERO */}
      <section id="hero">
        <div className="hero-media">
          <Image
            src="/images/studio-lunge-pair.jpg"
            alt="Esther Fair, laughing on the mats in her private studio in Worthing"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "50% 36%" }}
          />
        </div>
        <div className="hero-copy">
          <div className="h-tag" id="htag">{content.hero_tag ?? "Worthing, West Sussex"}</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(40px, 4.7vw, 64px)", fontWeight: 400, lineHeight: 1.03, letterSpacing: "-.025em", color: "#fff", marginBottom: 22 }}>
            {content.hero_line_1 ?? "One-to-One"} {content.hero_line_2 ?? "Personal Training"}<br /><em style={{ fontStyle: "italic", color: "#fff" }}>{content.hero_line_3 ?? "in Worthing"}</em>
          </h1>
          <p className="h-loc" id="hloc">{content.hero_loc ?? "Private studio. No gym floor. No one watching. Just you, and a plan built around how you actually feel today."}</p>
          <div className="hero-rule" aria-hidden="true" />
          <p className="h-sub" id="hsub">
            {content.hero_subheading ?? "I'm Esther — a personal trainer based in a private studio in Worthing. Every session starts with a conversation: how's your energy, how did you sleep, what's changed since last week. The plan for the day gets set there, not before you walk in."}
          </p>
          <div className="h-btns" id="hbtns">
            <button className="btn btn-rs" onClick={openDialog}>{content.hero_btn_primary ?? "Book a Free Consultation"} <Arrow /></button>
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
              <span className="ti">{content.ticker_4 ?? "Qualified in Cancer & Exercise Rehabilitation"}</span><span className="ti ts">✦</span>
              <span className="ti">{content.ticker_5 ?? "Studio or Online"}</span><span className="ti ts">✦</span>
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
                <Image src="/images/esther-training.jpg" alt="Esther Fair training a client in Worthing" fill sizes="(max-width: 1000px) 100vw, 40vw" style={{ objectFit: "cover" }} />
              </div>
              <div className="wbadge"><div className="wbn">4</div><div className="wbl">{content.badge_title ?? "Level 4 Qualified"}</div></div>
            </div>
            <div>
              <div className="stag stag-r">{content.why_tag ?? "Why Eternal Fitness"}</div>
              <h2 className="D" style={{ marginBottom: 16 }}>Training That Meets<br />You Where You Are</h2>
              {content.why_body && <p className="L">{content.why_body}</p>}
              <div className="wfeats">
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_1_title ?? "Real, sustainable strength and mobility"}</div><div className="wfc">{content.why_feat_1_desc ?? "Building functional strength that improves how you move, day to day."}</div></div></div>
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_2_title ?? "Calm, private, one-to-one training"}</div><div className="wfc">{content.why_feat_2_desc ?? "No gym floor, no other clients, no pressure to perform."}</div></div></div>
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_3_title ?? "Trained to adapt when things change"}</div><div className="wfc">{content.why_feat_3_desc ?? "Qualified in exercise referral and cancer rehabilitation, so if your health picture shifts, I don't have to stop training you."}</div></div></div>
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
            {content.approach_body ?? "I'm always watching, and always adapting. Every session starts with a check-in — energy, pain, sleep, what's changed since last week. The plan for that day gets set then, not before you walk through the door."}
          </p>
          <div className="steps">
            <div className="step">
              <div className="sn">01</div>
              <div className="sc"><h3>{content.approach_step_1_title ?? "Every session adapts to how you feel that day"}</h3><p>{content.approach_step_1_desc ?? "Fatigue, a bad night, a stiff shoulder — I notice and adjust without making a thing of it. You leave having done something worthwhile."}</p></div>
              <div className="si"><Image src="/images/approach-step1.jpg" alt="Esther Fair adapting a training session in Worthing" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover" }} /></div>
            </div>
            <div className="step">
              <div className="sn">02</div>
              <div className="sc"><h3>{content.approach_step_2_title ?? "Private, one-to-one — no gym floor"}</h3><p>{content.approach_step_2_desc ?? "No other clients, no performance pressure, no dress code. Just you and what you need today."}</p></div>
              <div className="si"><Image src="/images/studio-2.jpg" alt="Private personal training studio in Worthing" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover" }} /></div>
            </div>
            <div className="step">
              <div className="sn">03</div>
              <div className="sc"><h3>{content.approach_step_3_title ?? "Progress you can feel, not a number on a scale"}</h3><p>{content.approach_step_3_desc ?? "Climbing stairs with less effort. Sleeping better. Walking further. That's what I build towards."}</p></div>
              <div className="si"><Image src="/images/approach-step3.jpg" alt="Long-term sustainable training in Worthing" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover" }} /></div>
            </div>
          </div>
          <div className="aq-g">
            <div className="aq">
              <div className="aq-ic"><IconAward className="w-5 h-5" /></div>
              <ul className="qual-list">
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Personal Trainer</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Exercise Referral</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Level 4 Cancer and Exercise Rehabilitation</li>
              </ul>
              <h4>{content.approach_box_1_title ?? "Qualified to keep training you if things change"}</h4>
              <p>{content.approach_box_1_desc ?? "I trained as a personal trainer first, then went further: Exercise Referral and Level 4 Cancer and Exercise Rehabilitation. In practice, that means I can adapt safely if your health picture shifts — blood pressure, a new diagnosis, recovery from treatment — without you having to find someone new."}</p>
            </div>
            <div className="aq"><div className="aq-ic"><IconHeartHandshake className="w-5 h-5" /></div><h4>{content.approach_box_2_title ?? "No weigh-ins. No judgement. No agenda."}</h4><p>{content.approach_box_2_desc ?? "No before-and-after framing, no expectations about what fitness should look like. The goal is what matters to you — whether that's managing pain, regaining independence, or simply moving with more confidence."}</p></div>
          </div>
        </div>
      </section>

      {/* WHO + SPECIALIST TRAINING (single dark band, per mockup — replaces
          the old separate dark "who" image-card section and light
          "specialist" text-only section). The mockup's Specialist column
          lists named conditions (heart/blood pressure, bone/joint, visual
          impairment, cancer rehab) — deliberately not ported, since that's
          a direct roll-call the project's own hard rules ban on general
          pages ("No condition roll-calls in copy — generalise"). Flagged
          to Craig, not silently decided. */}
      <section id="specialist" className="sec" style={{ background: "var(--ink)" }}>
        <div className="sin">
          <div className="aq-g" style={{ gap: 56 }}>
            <div>
              <div className="stag stag-w">{content.who_tag ?? "Who I Work With"}</div>
              <p className="L LL" style={{ marginTop: 16, maxWidth: 480, fontFamily: "var(--font-serif)", fontSize: "clamp(19px,1.8vw,23px)", fontWeight: 400, color: "#fff", lineHeight: 1.35 }}>
                {content.who_body_lede ?? "Most of the people I train are just looking for proper one-to-one attention — to get fitter, stronger, feel more like themselves."}
              </p>
              <p className="L LL" style={{ marginTop: 16, maxWidth: 480 }}>
                {content.who_body ?? "Some arrive with more going on: a health condition, recovery from treatment, something that makes them wonder if training is even for them. If that's you, it almost certainly still is — get in touch."}
              </p>
              <div style={{ marginTop: 28 }}>
                <button className="btn btn-ow" onClick={openDialog}>{content.who_cta ?? "Book a Free Consultation"} <Arrow /></button>
              </div>
            </div>
            <div>
              <div className="stag stag-w">{content.specialist_tag ?? "Specialist Training"}</div>
              <p className="L LL" style={{ marginTop: 16, maxWidth: 480 }}>
                {content.specialist_body ?? "If your health picture is more specific, here's more detail on how I work with it."}
              </p>
              <Link href="/personal-training#specialist" className="btn btn-ow" style={{ marginTop: 20 }}>{content.specialist_link ?? "See Specialist Training"} <Arrow /></Link>
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
            <figure style={{ margin: 0 }}>
              <div className="tmark" aria-hidden="true">&ldquo;</div>
              <p className="L" style={{ marginBottom: 0 }}>
                {content.testimonial_1 ?? "She helps me maintain a level of strength, mobility and fitness that I wouldn't have without her... she also adapts routines and exercises to my needs when necessary. I would highly recommend Esther to anyone, of any age and ability."}
              </p>
              <figcaption className="tauth" style={{ marginTop: 20 }}>
                <div className="tav">A</div>
                <div><div className="tnm">Amanda M</div><div className="tlo">Training 5 years</div></div>
              </figcaption>
            </figure>
            <figure style={{ margin: 0 }}>
              <div className="tmark" aria-hidden="true">&ldquo;</div>
              <p className="L" style={{ marginBottom: 0 }}>
                {content.testimonial_2 ?? "She adjusts to her clients' restrictions and individual goals, listens always and creates bespoke plans for every situation."}
              </p>
              <figcaption className="tauth" style={{ marginTop: 20 }}>
                <div className="tav">S</div>
                <div><div className="tnm">Saffron S</div><div className="tlo">Client</div></div>
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
          <h2>{content.cta_heading ?? "The first conversation is free, with no commitment."}</h2>
          <p>{content.cta_body ?? "I work with a small number of clients at a time — so every person gets my full attention."}</p>
          <div className="ctabtns">
            <button className="btn btn-wh" onClick={openDialog}>{content.cta_btn_primary ?? "Book a Free Consultation"}</button>
            <a href="tel:07517658128" className="btn btn-ow">{content.cta_btn_secondary ?? "Call: 07517 658 128"}</a>
          </div>
        </div>
      </section>

      <Footer />

      <HomeMotion />
      <ConsultationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
