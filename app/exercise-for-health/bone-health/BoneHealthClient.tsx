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
import { IconClipboardList, IconDumbbell, IconAccessibility } from "@/components/icons";

const approachPoints = [
  {
    title: "Assessment first",
    body: "Before we begin, I need to understand your bone health status — DEXA scan results if you have them, any previous fractures, your current medical guidance, and what your specialist has recommended. This determines what is safe and what is not.",
    icon: IconClipboardList,
  },
  {
    title: "Controlled, progressive loading",
    body: "Bone responds to load. Resistance exercises like squats, lunges, presses, and rows — at the right intensity — stimulate bone density adaptation. I programme loading that challenges bone without exceeding what your skeleton can safely tolerate at your current stage.",
    icon: IconDumbbell,
  },
  {
    title: "Balance and fall prevention",
    body: "Building bone density takes time. Reducing your risk of falling has an immediate effect on fracture risk. Every programme includes balance work, proprioception exercises, and mobility training to keep you steady and confident on your feet.",
    icon: IconAccessibility,
  },
];

const sessionStructure = [
  {
    title: "Mobilisation and activation",
    body: "We start with gentle mobility work and muscle activation to prepare your joints and skeleton for loading. Good movement quality comes before any load is added.",
  },
  {
    title: "Resistance and weight-bearing work",
    body: "The main block focuses on compound resistance exercises — squats, presses, rows, lunges — at controlled loads that stimulate bone without exceeding safe thresholds. Impact is introduced carefully where appropriate.",
  },
  {
    title: "Balance and cool-down",
    body: "Balance exercises to reduce fall risk, followed by a guided cool-down. Proprioception work — your body's awareness of where it is in space — is a key part of fracture prevention and we build it into every session.",
  },
];

const faqs = [
  {
    title: "Is exercise safe if I have osteoporosis?",
    body: "Yes — exercise is clinically recommended for managing osteoporosis and reducing fracture risk. Weight-bearing and resistance exercises strengthen bone, while balance work reduces fall risk. A qualified specialist will know which movements are appropriate for your specific bone health status.",
  },
  {
    title: "What exercises should I avoid with osteoporosis?",
    body: "High-impact activities, uncontrolled twisting of the spine, heavy forward flexion (bending at the waist to touch your toes), and exercises that place excessive load through a fracture-prone area all need careful consideration. I assess your individual risk profile and programme around it.",
  },
  {
    title: "How quickly can exercise improve bone density?",
    body: "Bone adaptation is slower than muscle adaptation — measurable changes on a DEXA scan typically take 6–12 months of consistent training. But improvements in strength, balance, and confidence happen much sooner, and these have an immediate impact on your quality of life and fracture risk.",
  },
  {
    title: "Do I need a recent DEXA scan to start?",
    body: "It helps, but it is not essential. If you have a recent DEXA scan result that gives me your T-score and any fracture history, I can programme more precisely. If you do not have one, I will work with your diagnosis, your symptoms, and your medical guidance to keep you safe.",
  },
];

export default function BoneHealthClient() {
  const { open, setOpen, openDialog } = useConsultationDialog();
  const bookCta = { label: "Book a Free Consultation", onClick: openDialog, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onBookConsultation={openDialog} />

      <main id="main-content">
      <PageHero
        image="/images/studio/studio-rack.jpg"
        imageAlt="Exercise for osteoporosis and bone health in Worthing"
        eyebrow="Bone Health"
        heading={<>Exercise for Osteoporosis and<br />Bone Health in Worthing</>}
        subhead="Weight-bearing and resistance exercise is clinically recommended for maintaining bone density and reducing fracture risk. I programme safe, progressive strength work for people with osteopenia, osteoporosis, and anyone concerned about their bone health as they age."
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
              heading="Your bones respond to the demands you place on them"
            />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>
                Bone is living tissue. It adapts and strengthens when loaded appropriately — just like muscle.
                This is why weight-bearing and resistance exercise is the single most effective
                non-pharmacological intervention for bone density.
              </p>
              <p className="ds-body" style={{ marginBottom: 16 }}>
                But when you have osteoporosis, the margin for error is narrow. Too little loading will not
                stimulate bone adaptation. Too much — or the wrong type of loading — can increase fracture
                risk. Getting it right requires knowing exactly what your skeleton can tolerate and how to
                progress it safely.
              </p>
              <p className="ds-body" style={{ marginBottom: 28 }}>
                With specialist training in exercise referral and clinical populations, I am qualified to
                make these assessments. Your safety is built into every decision I make about loading,
                progression, and exercise selection.
              </p>
              <CtaButton cta={bookCta} />
            </Reveal>
          </div>
          <Reveal y={40} className="ds-split-img">
            <img src="/images/bone-health-split.jpg" alt="Weight-bearing strength training in Worthing for bone health" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div className="ds-art-chip">
              <MotionArcs accent="teal" />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* THE APPROACH */}
      <Section background="white">
        <SectionHeading eyebrow="The Approach" heading="Building Bone Safely" />
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
          intro="Each session is structured around safe loading, balance, and functional movement. Here is the general framework:"
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
          heading="Questions About Exercising With Osteoporosis"
          intro="If your question is not covered here, just ask — I would always rather you did."
          accent="teal"
          cta={bookCta}
          items={faqs}
        />
      </Section>

      <CTABand
        image="/images/studio-overhead-press.jpg"
        heading="Ready to find out if this is right for you?"
        body="The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."
        primaryCta={{ label: "Book a Free Consultation", onClick: openDialog }}
        secondaryCta={{ label: "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      </main>
      <Footer />
      <ConsultationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
