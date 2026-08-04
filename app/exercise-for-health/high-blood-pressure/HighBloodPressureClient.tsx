"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConsultationDialog from "@/components/ConsultationDialog";
import { useConsultationDialog } from "@/hooks/useConsultationDialog";
import {
  Section,
  SectionHeading,
  PageHero,
  FeatureBand,
  StatBadge,
  CTABand,
  Reveal,
  CtaButton,
  ProcessFlow,
  MotionArcs,
  PulseLine,
  FaqSplit,
} from "@/components/ds";
import { IconActivity, IconTarget, IconMessageCircle } from "@/components/icons";

const approachPoints = [
  {
    title: "Pre-session monitoring",
    body: "I take your blood pressure before every session to confirm it is safe to exercise. This gives us a reliable baseline and lets me track how your body responds to training over time — not just session to session, but week to week.",
    icon: IconActivity,
  },
  {
    title: "Adapted intensity management",
    body: "Some blood pressure medications affect your heart rate response, making standard heart rate zone calculations unreliable. I use Rate of Perceived Exertion (RPE) — how hard you feel you are working — alongside heart rate data to set the right intensity for each session.",
    icon: IconTarget,
  },
  {
    title: "Progressive, not aggressive",
    body: "Exercise for hypertension should build capacity gradually. I start with moderate-intensity aerobic work and controlled resistance circuits, then progress as your fitness and blood pressure response allow. There is no rush, and pushing too hard too soon is counterproductive.",
    icon: IconMessageCircle,
  },
];

const sessionStructure = [
  {
    title: "Warm-up and mobilisation",
    body: "Light cardio and mobility work to gradually increase heart rate and blood flow. No sudden starts — we ease into every session.",
  },
  {
    title: "Main exercise block",
    body: "A combination of moderate-intensity cardio and controlled resistance work. I monitor your RPE throughout and adjust intensity immediately if needed.",
  },
  {
    title: "Cool-down and recovery",
    body: "Guided cool-down to bring your heart rate and blood pressure back to baseline gradually. Breathing work and gentle stretching to support recovery.",
  },
];

const faqs = [
  {
    title: "Is exercise safe if I have high blood pressure?",
    body: "Yes — in most cases, exercise is both safe and clinically recommended for managing hypertension. Moderate-intensity exercise has been shown to reduce systolic blood pressure by 5–10 mmHg in some cases. The key is having a qualified specialist who monitors your response and programmes appropriately.",
  },
  {
    title: "What type of exercise helps lower blood pressure?",
    body: "A combination of moderate aerobic exercise and resistance training is most effective. I use steady-state cardio, circuit-style resistance work, and controlled rhythmic movements — all monitored and adapted to your individual response.",
  },
  {
    title: "Can I train if I take blood pressure medication?",
    body: "Yes. Many of my clients take antihypertensives. Some medications affect heart rate response, which is why I use RPE — how hard you feel you are working — alongside heart rate data to guide intensity. I will never push beyond what is safe for your specific situation.",
  },
  {
    title: "How quickly will I see improvements?",
    body: "Many clients notice their blood pressure readings trending lower within 4–6 weeks of consistent training. But the timeframe depends on your starting point, medication, and other health factors. I track your readings session by session so we can see what is working.",
  },
];

export default function HighBloodPressureClient() {
  const { open, setOpen, openDialog } = useConsultationDialog();
  const bookCta = { label: "Book a Free Consultation", onClick: openDialog, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onBookConsultation={openDialog} />

      <PageHero
        image="/images/studio-kettlebell-rack.jpg"
        imageAlt="Exercise for high blood pressure in Worthing"
        imageObjectPosition="50% 30%"
        imageObjectPositionWide="50% 22%"
        eyebrow="High Blood Pressure"
        heading={<>Exercise for High Blood<br />Pressure in Worthing</>}
        subhead="Exercise is clinically recommended for managing hypertension — but doing it safely requires specialist knowledge. I'm qualified in Exercise Referral, so I programme around your blood pressure, your medications, and your capacity, with monitoring built into every session."
        primaryCta={bookCta}
        secondaryCta={{ label: "See Pricing", href: "/pricing", variant: "ghost-white" }}
        badge={<StatBadge variant="rose" value="L4" label="Exercise Referral Specialist" />}
      />

      {/* WHY IT MATTERS */}
      <Section background="cream">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow="Why It Matters"
              eyebrowColor="teal"
              heading="Exercise is one of the most effective interventions for lowering blood pressure"
            />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>
                NICE guidelines and NHS exercise referral schemes consistently show that regular, moderate
                exercise can reduce both systolic and diastolic blood pressure. In some cases, the effect is
                comparable to a single antihypertensive medication.
              </p>
              <p className="ds-body" style={{ marginBottom: 16 }}>
                But doing it safely requires understanding when blood pressure is too high to exercise,
                how different medications affect heart rate and exercise response, what movements can cause
                dangerous pressure spikes, and how to progress without risking a hypertensive response.
              </p>
              <p className="ds-body" style={{ marginBottom: 28 }}>
                I'm qualified in Exercise Referral, which means I'm equipped to make these clinical
                judgments safely.
              </p>
              <CtaButton cta={bookCta} />
            </Reveal>
          </div>
          <Reveal y={40} className="ds-split-img">
            <img src="/images/studio-crouch-stretch.jpg" alt="Blood pressure monitoring during training in Worthing" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div className="ds-art-chip">
              <MotionArcs accent="teal" />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* THE APPROACH */}
      <Section background="white">
        <SectionHeading eyebrow="The Approach" heading="How I Work With Blood Pressure Clients" />
        <Reveal y={40} start="top 80%" style={{ marginTop: 40 }}>
          <FeatureBand
            accent="rose"
            items={approachPoints.map((p) => ({ icon: p.icon, title: p.title, body: p.body }))}
          />
        </Reveal>
      </Section>

      {/* SESSION STRUCTURE */}
      <Section background="cream">
        <SectionHeading
          eyebrow="Session Structure"
          eyebrowColor="teal"
          heading="What Your Sessions Would Look Like"
          intro="Every session starts with a check-in and a blood pressure reading. Then we work through a structured but adaptable programme:"
        />
        <div className="ds-art-divider"><PulseLine accent="rose" /></div>
        <div style={{ marginTop: 48 }}>
          <ProcessFlow steps={sessionStructure} />
        </div>
      </Section>

      {/* FAQ */}
      <Section background="white">
        <FaqSplit
          eyebrow="Common Questions"
          heading="Questions About Exercising With High Blood Pressure"
          intro="If your question is not covered here, just ask — I would always rather you did."
          accent="teal"
          cta={bookCta}
          items={faqs}
        />
      </Section>

      <CTABand
        image="/images/approach-flexible.jpg"
        heading="Ready to find out if this is right for you?"
        body="The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."
        primaryCta={{ label: "Book a Free Consultation", onClick: openDialog }}
        secondaryCta={{ label: "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      <Footer />
      <ConsultationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
