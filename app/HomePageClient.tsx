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
        <div className="hlp">
          <div className="h-tag" id="htag">{content.hero_tag ?? "Worthing, West Sussex"}</div>
          <h1 style={{ marginBottom: 24 }}>
            <div className="hw"><span className="hl hl-t" id="hl1">{content.hero_line_1 ?? "Personal"}</span></div>
            <div className="hw"><span className="hl hl-b" id="hl2">{content.hero_line_2 ?? "Training"}</span></div>
            <div className="hw"><span className="hl hl-t" id="hl3">{content.hero_line_3 ?? "in Worthing"}</span></div>
          </h1>
          <p className="h-loc" id="hloc">{content.hero_loc ?? "Private one-to-one personal training in Worthing"}</p>
          <p className="h-sub" id="hsub">
            {content.hero_subheading ?? "Every session starts with a conversation — how's your energy, how did you sleep, what's changed since last week. The plan for the day gets set there, not before you walk in. I'm also qualified to keep training you if your health ever changes."}
          </p>
          <div className="h-btns" id="hbtns">
            <button className="btn btn-dk" onClick={openDialog}>{content.hero_btn_primary ?? "Book a Free Consultation"} <Arrow /></button>
            <a href="#why" className="btn btn-ol">{content.hero_btn_secondary ?? "Find Out How It Works"}</a>
          </div>
        </div>
        <div className="hrp" style={{ padding: 0 }}>
          <Image
            src="/images/esther-main.jpg"
            alt="Esther Fair — Level 4 Personal Trainer, Worthing"
            fill
            priority
            sizes="(max-width: 1000px) 100vw, 45vw"
            style={{ objectFit: "cover", objectPosition: "center top" }}
          />
          <div className="h-badge" id="hbadge">
            <div className="hbc">4</div>
            <div>
              <div className="hbt">{content.badge_title ?? "Level 4 Qualified"}</div>
              <div className="hbs">{content.badge_sub ?? "In Cancer & Exercise Rehabilitation"}</div>
            </div>
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
                <Image src="/images/esther-training.jpg" alt="Training for complex health conditions in Worthing" fill sizes="(max-width: 1000px) 100vw, 40vw" style={{ objectFit: "cover" }} />
              </div>
              <div className="wbadge"><div className="wbn">GP</div><div className="wbl">Referred Clients Welcome</div></div>
            </div>
            <div>
              <div className="stag stag-r">{content.why_tag ?? "Why Eternal Fitness"}</div>
              <h2 className="D" style={{ marginBottom: 16 }}>Training That Meets<br />You Where You Are</h2>
              <p className="L">
                {content.why_body ?? "I'm Esther — a personal trainer based in a private studio in Worthing. Every session starts with a check-in, and the plan adapts to how you actually feel that day. I'm also qualified in exercise referral and cancer and exercise rehabilitation, so if your health ever changes, I don't have to stop training you."}
              </p>
              <div className="wfeats">
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_1_title ?? "Strength and mobility for real life"}</div><div className="wfc">{content.why_feat_1_desc ?? "Building functional strength that improves everyday movement, independence, and confidence."}</div></div></div>
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_2_title ?? "Calm, private, one-to-one training"}</div><div className="wfc">{content.why_feat_2_desc ?? "A private studio with no gym floor, no other clients, no pressure to look or perform."}</div></div></div>
                <div className="wf"><div className="wfd" /><div><div className="wft">{content.why_feat_3_title ?? "Trained to adapt when things change"}</div><div className="wfc">{content.why_feat_3_desc ?? "Qualified in exercise referral and cancer and exercise rehabilitation, so if your health picture shifts, I can adjust rather than you needing to find someone new."}</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO */}
      <section id="who" className="sec" style={{ background: "var(--ink)" }}>
        <div className="sin">
          <div className="stag stag-w">{content.who_tag ?? "Who This Is For"}</div>
          <h2 className="D DL" style={{ maxWidth: 700 }}>Wherever You're Starting<br />From, There's a Way In</h2>
          <p className="L LL" style={{ marginTop: 16, maxWidth: 540 }}>
            {content.who_body ?? "Most of the people I train are just looking for proper one-to-one attention — to get fitter, stronger, and feel more like themselves. Some arrive with more going on: a health condition, recovery from treatment, or something that's made them wonder if training is even for them. If that's you, it almost certainly still is."}
          </p>
          <div className="who-g">
            <div className="wc">
              <div className="wci"><Image src="/images/who-health.jpg" alt="Training with health conditions in Worthing" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} /></div>
              <div className="wcb">
                <h3>{content.who_card_1_title ?? "If your health picture is more specific"}</h3>
                <p>{content.who_card_1_desc ?? "High blood pressure, a GP referral, recovery from treatment — I'm trained to work with it safely, and to adjust as things change."}</p>
                <Link href="/personal-training" className="btn btn-rs" style={{ fontSize: "13.5px", padding: "11px 20px" }}>{content.who_card_1_link ?? "Learn More"} <Arrow /></Link>
              </div>
            </div>
            <div className="wc">
              <div className="wci"><Image src="/images/who-mobility.jpg" alt="Inclusive personal training in Worthing" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} /></div>
              <div className="wcb">
                <h3>{content.who_card_2_title ?? "New to training, or it's been a while"}</h3>
                <p>{content.who_card_2_desc ?? "Whether you've never worked with a trainer before or just haven't been consistent in a while, the private one-to-one format means no dress code and no comparison to anyone else — just a plan built around where you're starting from."}</p>
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
            {content.approach_body ?? "I am always watching and always adapting. Every session starts with a check-in — energy levels, pain, sleep, what's changed since last week. The plan for that day is set then, not before you walk through the door."}
          </p>
          <div className="steps">
            <div className="step">
              <div className="sn">01</div>
              <div className="sc"><h3>{content.approach_step_1_title ?? "Every session adapts to how you feel that day"}</h3><p>{content.approach_step_1_desc ?? "Fatigue, flares, bad nights, medication changes — I notice and adjust without drawing attention to it. You always leave feeling you've done something worthwhile."}</p></div>
              <div className="si"><Image src="/images/approach-step1.jpg" alt="Esther Fair adapting a training session in Worthing" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover" }} /></div>
            </div>
            <div className="step">
              <div className="sn">02</div>
              <div className="sc"><h3>{content.approach_step_2_title ?? "Private 1-to-1 studio — no gym floor"}</h3><p>{content.approach_step_2_desc ?? "No other clients. No performance pressure. No dress code. A calm, private space where the only focus is you and what you need today."}</p></div>
              <div className="si"><Image src="/images/studio-2.jpg" alt="Private personal training studio in Worthing" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover" }} /></div>
            </div>
            <div className="step">
              <div className="sn">03</div>
              <div className="sc"><h3>{content.approach_step_3_title ?? "Functional progress — not transformation"}</h3><p>{content.approach_step_3_desc ?? "Climbing stairs with less pain. Better sleep. More energy. Walking further. These are the outcomes that matter to the people I work with — and they're the ones I build towards."}</p></div>
              <div className="si"><Image src="/images/approach-step3.jpg" alt="Long-term sustainable training in Worthing" fill sizes="(max-width: 1000px) 100vw, 360px" style={{ objectFit: "cover" }} /></div>
            </div>
          </div>
          <div className="aq-g">
            <div className="aq"><div className="aq-ic"><IconAward className="w-5 h-5" /></div><h4>{content.approach_box_1_title ?? "Qualified to adapt when things change"}</h4><p>{content.approach_box_1_desc ?? "Trained in Exercise Referral and Level 4 Cancer and Exercise Rehabilitation, alongside my personal training qualification — so if your health picture shifts, I can adjust safely rather than you needing to find someone new."}</p></div>
            <div className="aq"><div className="aq-ic"><IconHeartHandshake className="w-5 h-5" /></div><h4>{content.approach_box_2_title ?? "No weigh-ins. No judgement. No agenda."}</h4><p>{content.approach_box_2_desc ?? "No before-and-after framing, no expectations about what fitness should look like. The goal is what matters to you — whether that's managing pain, regaining independence, or simply moving with more confidence."}</p></div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="sec" style={{ background: "var(--teal)" }}>
        <div className="sin">
          <div className="twrap">
            <div className="tmark">&ldquo;</div>
            <p className="tquote">
              {content.testimonial_1 ?? "She helps me maintain a level of strength, mobility and fitness that I wouldn't have without her... she also adapts routines and exercises to my needs when necessary. I would highly recommend Esther to anyone, of any age and ability."}
            </p>
            <div className="tauth"><div className="tav">A</div><div><div className="tnm">Amanda M</div><div className="tlo">Training 5 years</div></div></div>
            <div className="tdiv" />
            <div className="tsec">
              <p>{content.testimonial_2 ?? "\u201CAs someone who has dealt with chronic pain for years, I was sceptical that exercise could help. The personalised approach at Eternal Fitness has genuinely changed my quality of life. I cannot recommend it enough.\u201D"}</p>
              <div className="tsec-a">Saffron S · Worthing</div>
            </div>
            <div style={{ marginTop: 52 }}>
              <div className="stag stag-w" style={{ justifyContent: "center", marginBottom: 14 }}>{content.testimonial_heading ?? "Client Stories"}</div>
              <p className="L LL" style={{ maxWidth: 520, margin: "0 auto 26px", textAlign: "center" }}>
                {content.testimonial_body ?? "Progress looks different for everyone. For some it is lifting more, for others it is walking without pain, sleeping better, or simply feeling at home in their own body."}
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Link href="/faqs" className="btn btn-ow">{content.testimonial_link ?? "Read the FAQs"} <Arrow /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta">
        <div className="ctabg"><Image src="/images/studio-1.jpg" alt="Eternal Fitness private studio in Worthing" fill sizes="100vw" style={{ objectFit: "cover" }} /></div>
        <div className="ctac">
          <div className="stag stag-w" style={{ marginBottom: 16 }}>{content.cta_tag ?? "Free Consultation"}</div>
          <h2>{content.cta_heading ?? "Ready to find out if this is right for you?"}</h2>
          <p>{content.cta_body ?? "The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."}</p>
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
