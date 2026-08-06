"use client";

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
  StatBadge,
  CTABand,
  Callout,
  Reveal,
  CtaButton,
  StatStrip,
  PulseLine,
  JourneyPath,
  FaqSplit,
} from "@/components/ds";
import { IconRibbon } from "@/components/icons";







export default function CancerRehabClient({ content = {} }: { content?: Record<string, string> }) {
  const { open, setOpen, openDialog } = useConsultationDialog();

  const stages = [
    { title: content?.stage_1_title ?? "During active treatment", body: content?.stage_1_body ?? "Chemotherapy and radiotherapy significantly affect energy, immune function, and physical capacity — and those effects are unpredictable from week to week. Sessions during active treatment are lower intensity, shorter, and built around your current treatment schedule. Every session begins with a check-in." },
    { title: content?.stage_2_title ?? "In remission", body: content?.stage_2_body ?? "Remission brings its own challenges — rebuilding fitness that has been lost, managing ongoing fatigue or side effects, and navigating the physical and emotional after-effects of treatment. Sessions progress gradually, respecting the timeline your body needs." },
    { title: content?.stage_3_title ?? "Post-surgery", body: content?.stage_3_body ?? "Whether mastectomy, colostomy, lymph node removal, or another procedure — post-surgical return to exercise requires careful, staged progression. I work within the guidance of your surgical team and will not progress any movement without appropriate medical clearance." },
  ];

  const considerations = [
    { title: content?.cons_1_title ?? "Cancer-related fatigue is different", body: content?.cons_1_body ?? "Cancer-related fatigue (CRF) does not respond to rest the way ordinary tiredness does. It is physiologically distinct — and training must account for it. I will never push through CRF or interpret it as effort avoidance." },
    { title: content?.cons_2_title ?? "Lymphoedema awareness", body: content?.cons_2_body ?? "For clients with or at risk of lymphoedema, I monitor for signs of swelling, avoid tight compression, and follow safe exercise guidelines. Exercise can actually help manage lymphoedema when programmed correctly." },
    { title: content?.cons_3_title ?? "Bone density", body: content?.cons_3_body ?? "Some cancer treatments (particularly certain hormonal therapies) accelerate bone density loss. Weight-bearing and resistance exercise is clinically recommended — but load and progression must be managed carefully." },
    { title: content?.cons_4_title ?? "GP or oncologist sign-off", body: content?.cons_4_body ?? "Before beginning any structured exercise programme during or shortly after treatment, I ask for GP or oncologist clearance. This is non-negotiable — not because I am being cautious, but because it is the right clinical standard." },
  ];

  const faqs = [
    { title: content?.faq_1_title ?? "Is it safe to exercise during cancer treatment?", body: content?.faq_1_body ?? "Evidence now strongly supports exercise during cancer treatment — at the right intensity and with the right guidance. The programme must account for your specific treatment, side effects, and current capacity. I will always ask for GP or oncologist sign-off before beginning." },
    { title: content?.faq_2_title ?? "What is cancer-related fatigue and how do you account for it?", body: content?.faq_2_body ?? "Cancer-related fatigue (CRF) is physiologically different from ordinary tiredness — it does not improve with rest in the same way. I am trained to recognise CRF and programme around it. Sessions may be shorter or lower in intensity on harder days. That is not failure — it is appropriate clinical management." },
    { title: content?.faq_3_title ?? "When can I start exercising after surgery?", body: content?.faq_3_body ?? "This depends entirely on the type of surgery and your recovery. I work with the guidance of your surgical team and will not progress any movement without appropriate medical clearance." },
    { title: content?.faq_4_title ?? "Do you work with people during active treatment?", body: content?.faq_4_body ?? "Yes. I work with people during active chemotherapy or radiotherapy, people in remission, and those who have finished treatment but are rebuilding. Each stage requires a different approach — the programme is built around where you are right now." },
  ];

  const bookCta = { label: content?.hero_btn_primary ?? "Book a Free Consultation", onClick: openDialog, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onBookConsultation={openDialog} />

      <main id="main-content">
      <PageHero
        image="/images/studio-lunge-pair.jpg"
        imageAlt="Esther Fair — Cancer Rehabilitation Specialist in Worthing"
        imageObjectPosition="50% 36%"
        imageObjectPositionWide="50% 6%"
        eyebrow={content.hero_eyebrow ?? "Cancer Rehabilitation"}
        heading={<>Personal Training for<br />Cancer Rehabilitation</>}
        subhead={content.hero_subhead ?? "Specialist one-to-one support during treatment, in remission, and post-surgery. Exercise is now strongly evidenced as beneficial throughout the cancer journey — with the right guidance, at the right intensity, from someone qualified to provide it."}
        primaryCta={bookCta}
        secondaryCta={{ label: content.hero_btn_secondary ?? "See Pricing", href: "/pricing", variant: "ghost-white" }}
        badge={<StatBadge variant="rose" value="L4" label={content.badge_label ?? "Cancer Rehab Specialist"} />}
      />

      {/* THE EVIDENCE */}
      <Section background="white">
        <div className="ds-split">
          <div>
            <SectionHeading
              eyebrow={content.evidence_eyebrow ?? "The Evidence"}
              eyebrowColor="teal"
              heading={content.evidence_heading ?? "Why exercise matters during the cancer journey"}
            />
            <Reveal y={24}>
              <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>
                {content.evidence_p1 ?? "Exercise during and after cancer treatment is no longer considered risky — the evidence now strongly supports it. Research shows that appropriate exercise during chemotherapy is associated with reduced fatigue, better mood, improved immune function, and faster recovery."}
              </p>
              <p className="ds-body" style={{ marginBottom: 16 }}>
                {content.evidence_p2 ?? "After treatment, structured exercise has been shown to improve overall survival rates in some cancer types, reduce the risk of recurrence, and significantly improve quality of life."}
              </p>
              <p className="ds-body" style={{ marginBottom: 28 }}>
                {content.evidence_p3 ?? "The qualifier is \u201Cappropriate.\u201D The intensity, type of exercise, and how it adapts to treatment side effects matters enormously — and that is where specialist training is essential."}
              </p>
              <Callout
                icon={IconRibbon}
                accent="rose"
                title={content.evidence_callout_title ?? "Cancer Rehabilitation Specialist qualification"}
                body={content.evidence_callout_body ?? "Trained at Level 4 to work with people during and after cancer treatment. This is a specialist qualification, not standard personal training."}
              />
              <div style={{ marginTop: 28 }}>
                <CtaButton cta={bookCta} />
              </div>
            </Reveal>
          </div>
          <Reveal y={40} className="ds-split-img">
            <Image
              src="/images/esther-about.jpg"
              alt="Esther Fair — Cancer Rehabilitation Specialist in Worthing"
              fill
              sizes="(max-width: 1000px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          </Reveal>
        </div>
      </Section>

      {/* STAGES */}
      <Section background="cream">
        <SectionHeading eyebrow={content.stages_eyebrow ?? "When I Can Help"} heading={content.stages_heading ?? "Support at Every Stage"} />
        <div className="ds-art-divider"><JourneyPath accent="rose" milestones={3} /></div>
        <Reveal y={40} start="top 80%" style={{ marginTop: 40 }}>
          <FeatureBand
            accent="rose"
            items={stages.map((s) => ({ title: s.title, body: s.body }))}
          />
        </Reveal>
      </Section>

      {/* CLINICAL CONSIDERATIONS */}
      <Section background="white">
        <div className="ds-split">
          <div>
            <SectionHeading eyebrow={content.clin_eyebrow ?? "Clinical Considerations"} eyebrowColor="teal" heading={content.clin_heading ?? "What I Know and How I Work"} />
            <div className="ds-featlist">
              {considerations.map((c) => (
                <div key={c.title} className="ds-feat">
                  <span className="ds-feat-dot" />
                  <div>
                    <div className="ds-feat-t">{c.title}</div>
                    <div className="ds-feat-c">{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Reveal y={40} className="ds-split-img">
            <Image src="/images/testimonials-bg.jpg" alt="Esther Fair — cancer rehabilitation specialist" fill sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
            <div className="ds-art-chip" style={{ width: 210, padding: "16px 14px" }}>
              <PulseLine accent="teal" />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* CREDENTIALS */}
      <Section background="cream">
        <StatStrip
          background="ink"
          stats={[
            { value: "L4", label: content.stat_1_label ?? "Cancer rehabilitation qualified" },
            { value: "1:1", label: content.stat_2_label ?? "Private one-to-one sessions only" },
            { value: "30 min", label: content.stat_3_label ?? "Free, no-pressure consultation" },
            { value: "Worthing", label: content.stat_4_label ?? "Private studio, West Sussex" },
          ]}
        />
      </Section>

      {/* FAQ */}
      <Section background="white">
        <FaqSplit
          eyebrow={content.faq_eyebrow ?? "Common Questions"}
          heading={content.faq_heading ?? "Common Questions About Cancer Rehabilitation"}
          intro={content.faq_intro ?? "If your question is not covered here, just ask — I would always rather you did."}
          accent="rose"
          cta={bookCta}
          items={faqs}
        />
      </Section>

      <CTABand
        image="/images/studio-kettlebell-playful.jpg"
        heading={content.cta_heading ?? "Ready to find out if this is right for you?"}
        body={content.cta_body ?? "The first conversation is free, with no commitment. I work with a small number of clients at a time — so every person gets my full attention."}
        primaryCta={{ label: content.cta_btn_primary ?? "Book a Free Consultation", onClick: openDialog }}
        secondaryCta={{ label: content.cta_btn_secondary ?? "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      </main>
      <Footer />
      <ConsultationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
