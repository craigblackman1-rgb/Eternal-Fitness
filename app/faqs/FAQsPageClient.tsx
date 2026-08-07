"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BOOKINGS_URL } from "@/lib/booking";
import { Section, PageHero, CTABand, Eyebrow, CtaButton } from "@/components/ds";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqGroups = [
  {
    group: "Getting Started",
    faqs: [
      {
        question: "Do I need to be fit or healthy to start?",
        answer:
          "No. Most of my clients haven't exercised in a while, or don't think of themselves as \"gym people.\" You do not need any experience, and you do not need to be at a particular weight. The only starting point is where you are right now.",
      },
      {
        question: "I have never used a personal trainer before. What can I expect?",
        answer:
          "Everything begins with a free consultation — a relaxed conversation about what you want to achieve and what your body is currently dealing with. There is no pressure and no commitment required. From there, I will design a programme specifically for you and walk you through every exercise at a pace that feels comfortable.",
      },
      {
        question: "How often should I train?",
        answer:
          "For most clients, two sessions per week is a good starting point. For those managing health conditions or recovering from illness, one session per week may be more appropriate initially. I will recommend a frequency that is sustainable and effective for your specific situation — never more than your body can handle.",
      },
      {
        question: "Where are sessions held?",
        answer:
          "Sessions take place in a private studio in Worthing, West Sussex. The studio is used exclusively for one-to-one training — there is no public gym floor, no other clients present, and no waiting around. The address is confirmed at the point of booking.",
      },
    ],
  },
  {
    group: "Practicalities",
    faqs: [
      {
        question: "Do you offer short-term programmes?",
        answer:
          "Yes. I believe in the long-term approach, but I offer flexible options too — we'll talk about what's realistic for your goals and your life during the initial consultation.",
      },
      {
        question: "What if my health changes during a programme?",
        answer:
          "This is something I am specifically trained to manage. If your health changes — whether that is a new diagnosis, a flare-up, a change in medication, or simply a difficult period — your programme changes with it. You do not lose sessions and you do not fall behind. You just adapt.",
      },
      {
        question: "Can I bring someone with me to sessions?",
        answer:
          "Of course. If having a carer, family member, or support person there would make you more comfortable, just let me know beforehand and I'll make it work.",
      },
      {
        question: "My question is not answered here. What should I do?",
        answer:
          "Just get in touch. There is no question too small or too complicated. I would always rather speak to someone who is not sure than have them talk themselves out of trying.",
      },
    ],
  },
  {
    group: "Training With a Health Condition or Disability",
    faqs: [
      {
        question: "I have cancer or am going through cancer treatment. Can you still work with me?",
        answer:
          "Yes. I hold a specialist qualification in cancer rehabilitation and have experience working with clients at all stages — during active treatment, in remission, and in long-term recovery. Exercise has a significant evidence base for supporting people through cancer and its treatment. I work closely with your medical team where appropriate and adapt every session to what your body can manage that day.",
      },
      {
        question: "I have a chronic health condition. Can personal training still help me?",
        answer:
          "Almost certainly yes. I am qualified in exercise referral, which means I am specifically trained to work with people who have clinical health conditions. Every programme is adapted to what your body can manage, and adjusted regularly as your health changes.",
      },
      {
        question: "I have a disability. Can I still do personal training?",
        answer:
          "Yes. I have experience working with clients with a wide range of physical disabilities and mobility limitations. Programmes are fully adaptive. If you use a wheelchair or have very limited mobility, that is the starting point — not a barrier. Please get in touch to discuss your specific situation.",
      },
      {
        question: "I have extremely limited mobility. Is there still something I can do?",
        answer:
          "Yes. My approach is to start from where you are, whatever that looks like. Some clients begin with very gentle seated exercises, breathing work, or small range-of-motion movements. Progress looks different for everyone and is always measured against your own baseline — not anyone else's.",
      },
      {
        question: "I am visually impaired or blind. Can you work with me?",
        answer:
          "Yes. I have experience working with visually impaired clients. All exercises are adapted and described verbally in full detail, with complete awareness of sensory needs throughout every session. Please get in touch to discuss your specific situation.",
      },
      {
        question: "My GP has referred me for exercise. Can you help?",
        answer:
          "Yes — I hold the Exercise Referral qualification and I'm experienced working within GP and medical guidance. I don't currently take referrals directly through an NHS scheme, so if your GP or doctor has recommended exercise, message me and we'll work out how to build your training around that guidance together.",
      },
      {
        question: "I have an injury. Is it safe to exercise?",
        answer:
          "In most cases yes, though it depends on the injury and the stage of recovery. I always start with an assessment and will not take on a client if I believe exercise would be harmful. For recent injuries or post-surgical clients, I work within the guidance of physiotherapists and medical teams.",
      },
    ],
  },
  {
    group: "Inclusive Training",
    faqs: [
      {
        question: "Do you work with trans and non-binary clients?",
        answer:
          "Yes, without reservation. I work with clients across the full spectrum of gender identity and expression. You will be addressed and supported in whatever way feels right for you. If you have specific physical goals related to your gender identity, I will work with you on those without judgement.",
      },
      {
        question: "I have always felt uncomfortable or unwelcome in fitness spaces. Is this different?",
        answer:
          "This is the most common thing I hear. The private studio, the one-to-one format, and the complete absence of any mirror-and-performance culture is specifically designed to make it different. There is no dress code, no weigh-in, and no expectation of what fitness should look like. Many of my clients come to me having had negative experiences elsewhere. Most of them stay for years.",
      },
    ],
  },
];

export default function FAQsPageClient({ content = {} }: { content?: Record<string, string> }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
      <PageHero
        image="/images/coaching-plank-client.jpg"
        imageAlt="Esther coaching a client through a floor exercise in the private studio"
        imagePan="126%"
        imageObjectPosition="50% 43%"
        imageObjectPositionWide="50% 24%"
        eyebrow={content?.hero_eyebrow ?? "FAQs"}
        heading={content?.hero_heading ?? <>Frequently Asked <em>Questions</em></>}
        subhead={content?.hero_subhead ?? "If something's stopping you getting in touch, the answer's probably here. And if it's not — just ask."}
        primaryCta={{ label: content?.hero_btn_primary ?? "Book a Free Consultation", href: BOOKINGS_URL, arrow: true }}
        secondaryCta={{ label: content?.hero_btn_secondary ?? "Read the FAQs", href: "#faq" }}
        badge={
          <div className="flex gap-3.5 items-start max-w-[340px] rounded-2xl bg-white/95 backdrop-blur-md shadow-lg p-5">
            <div
              aria-hidden="true"
              style={{
                width: 46, height: 46, borderRadius: "9999px",
                background: "var(--color-rose)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
                <circle cx="12" cy="12" r="9.2" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-.01em", lineHeight: 1.3, margin: 0 }}>
                {content?.badge_label ?? "No question is too small"}
              </p>
              <p style={{ fontSize: "12px", color: "var(--color-muted-text)", lineHeight: 1.45, margin: 0, marginTop: 3 }}>
                {content?.badge_sublabel ?? "Just ask — I would rather you did than talk yourself out of trying."}
              </p>
            </div>
          </div>
        }
      />

      {/* FAQ Section */}
      <Section background="white" id="faq" innerClassName="grid md:grid-cols-[340px_1fr] gap-12 md:gap-20 items-start">

          {/* Left — intro + jump nav */}
          <div className="md:sticky md:top-24">
            <Eyebrow color="rose">{content?.sidebar_eyebrow ?? "Your Questions Answered"}</Eyebrow>
            <h2 className="ds-h2" style={{ margin: "16px 0" }}>
              {content?.sidebar_heading ?? "No question is too complicated"}
            </h2>
            <p className="ds-body" style={{ marginBottom: 16 }}>
              {content?.sidebar_body ?? "Training with me covers a wide range of situations — general fitness, injuries, health conditions, disabilities. If you're wondering whether yours fits, it almost certainly does."}
            </p>
            <nav aria-label="FAQ sections" className="mb-8 mt-7">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-teal mb-3">{content?.sidebar_jump_label ?? "Jump to"}</p>
              <ul>
                {faqGroups.map((group, gi) => (
                  <li key={group.group} className="border-t border-border-warm last:border-b">
                    <a
                      href={`#faq-group-${gi}`}
                      className="flex items-baseline justify-between gap-4 py-3 group"
                    >
                      <span className="font-serif text-lg text-foreground/70 group-hover:text-foreground transition-colors tracking-tight">
                        {content?.[`group_${gi + 1}_name`] ?? group.group}
                      </span>
                      <span className="text-[11px] font-bold text-[var(--rose-text)] tabular-nums">
                        {String(group.faqs.length).padStart(2, "0")}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <CtaButton cta={{ label: content?.sidebar_btn ?? "Book a Free Consultation", href: BOOKINGS_URL, arrow: true }} />
          </div>

          {/* Right — grouped FAQs */}
          <div className="space-y-16">
            {faqGroups.map((group, gi) => (
              <div key={group.group} id={`faq-group-${gi}`} style={{ scrollMarginTop: 110 }}>
                <div className="flex items-baseline gap-4 mb-2 pb-4 border-b border-border-warm">
                  <span className={`text-[11px] font-bold tabular-nums ${gi % 2 === 0 ? "text-teal" : "text-[var(--rose-text)]"}`}>
                    {String(gi + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-2xl md:text-[28px] tracking-tight text-foreground">
                    {content?.[`group_${gi + 1}_name`] ?? group.group}
                  </h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {group.faqs.length} questions
                  </span>
                </div>
                {/*
                  GATE: Chevron vs. plus-to-cross accordion icon.
                  The mockup uses a plus/cross icon; Radix AccordionTrigger
                  hardcodes ChevronDown at components/ui/accordion.tsx:31.
                  Swapping requires either modifying the shared component or
                  rebuilding the trigger, neither is a 5-min change.
                */}
                <Accordion type="single" collapsible className="w-full" defaultValue={gi === 0 ? `${group.group}-0` : undefined}>
                  {group.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`${group.group}-${i}`} className="border-border-warm">
                      <AccordionTrigger className="font-body text-foreground text-left text-[17px] font-medium py-5 hover:no-underline">
                        {content?.[`faq_${gi + 1}_${i + 1}_q`] ?? faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="ef-body text-[15px] leading-relaxed pb-6 max-w-[640px]">
                        {content?.[`faq_${gi + 1}_${i + 1}_a`] ?? faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}

          {/* Still not sure? — contact prompt band */}
          <div
            style={{
              background: "var(--color-cream)",
              border: "1px solid var(--color-border-warm)",
              borderRadius: 18,
              padding: "34px 36px",
              display: "flex",
              gap: 28,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3 style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(23px, 2.1vw, 30px)",
                lineHeight: 1.16,
                letterSpacing: "-.02em",
                color: "var(--color-ink)",
                margin: "0 0 6px",
              }}>
                Still not sure?
              </h3>
              <p style={{
                fontSize: "14.5px",
                lineHeight: 1.6,
                color: "var(--color-body)",
                maxWidth: "44ch",
                margin: 0,
              }}>
                There is no question too small or too complicated. Send a message or call — I would always rather speak to someone who is not sure.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <CtaButton cta={{ label: "Get in touch", href: "/contact", variant: "primary" }} />
              <CtaButton cta={{ label: "Call: 07517 658 128", href: "tel:07517658128", variant: "outline" }} />
            </div>
          </div>

          </div>
      </Section>

      <CTABand
        image="/images/studio-lunge-pair.jpg"
        imagePosition="center 15%"
        eyebrow={content?.cta_eyebrow ?? "Free Consultation"}
        heading={content?.cta_heading ?? "The first conversation is free, with no commitment."}
        body={content?.cta_body ?? "I work with a small number of clients at a time — so every person gets my full attention."}
        primaryCta={{ label: content?.cta_btn_primary ?? "Book a Free Consultation", href: BOOKINGS_URL }}
        secondaryCta={{ label: content?.cta_btn_secondary ?? "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />
      </main>
      <Footer />
    </div>
  );
}
