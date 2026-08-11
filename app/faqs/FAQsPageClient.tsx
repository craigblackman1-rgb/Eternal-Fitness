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
          "No. Most of my clients haven't exercised in a while, or don't think of themselves as \"gym people.\" You do not need any previous experience, and there are no artificial physical standards to meet. The only starting point is where you are right now.",
      },
      {
        question: "I have never used a personal trainer before. What can I expect?",
        answer:
          "Everything begins with a free consultation—a relaxed conversation about what you want to achieve and what your body is currently dealing with. There is no pressure and no commitment required. From there, I will design a programme specifically for you and guide you through every movement at a pace that feels completely comfortable.",
      },
      {
        question: "How often should I train?",
        answer:
          "For most clients, two sessions per week is a good starting point to build momentum. For those managing health conditions or recovering from illness, one session per week may be more appropriate initially. I will always recommend a frequency that is sustainable and effective for your specific situation—never more than your body can handle.",
      },
      {
        question: "Where are sessions held?",
        answer:
          "Sessions take place in my private studio in Worthing, West Sussex. The space is used exclusively for one-to-one training—there is no busy gym floor, no other clients are present, and there is no audience. The exact address is confirmed immediately upon booking.",
      },
    ],
  },
  {
    group: "Practicalities",
    faqs: [
      {
        question: "Do you offer short-term programmes?",
        answer:
          "No. I believe true progress requires a consistent, long-term approach, which is why training is structured in blocks of 12 or 24 sessions. We will discuss exactly what is realistic for your goals, your lifestyle, and your body during your initial consultation.",
      },
      {
        question: "What happens if my health changes during a block?",
        answer:
          "If you experience a medical setback, injury, or flare-up, your sessions do not simply disappear. While blocks have fixed validity periods (120 or 240 days), I offer a medical suspension framework. We can safely hold your unused sessions on account and resume training the moment your body is ready.",
      },
      {
        question: "What is your session cancellation policy?",
        answer:
          "Sessions must be cancelled or rescheduled with at least 24 hours' notice. Sessions cancelled with less than 24 hours' notice are forfeited. If you are running late for a session, the appointment will still end at its scheduled time to protect the next client's booking slot.",
      },
      {
        question: "Do you offer flexible or rolling packages?",
        answer:
          "Yes. Alongside our fixed session blocks, we offer structured Rolling Monthly Contracts. These require a minimum initial term of 3 months (12 weeks) to establish real consistency, followed by a one-calendar-month written notice period if you ever choose to cancel.",
      },
      {
        question: "Do you offer refunds on unused sessions?",
        answer:
          "Because I strictly limit the number of clients I work with at any one time to ensure full attention, I do not issue refunds for unused sessions due to relocation, illness, or lifestyle changes. However, through our medical suspension framework, we will always find a safe timeframe to help you complete your block.",
      },
      {
        question: "Can I bring someone with me to sessions?",
        answer:
          "Of course. If having a partner, family member, or support person present helps you feel more comfortable and confident in the space, they are very welcome. Just let me know beforehand so I can prepare the studio.",
      },
      {
        question: "My question is not answered here. What should I do?",
        answer:
          "Just get in touch. There is no question too small or too complicated. I would always rather speak directly to someone who is not sure than have them talk themselves out of trying.",
      },
    ],
  },
  {
    group: "Training With a Health Condition or Disability",
    faqs: [
      {
        question: "I have cancer or am going through cancer treatment. Can you still work with me?",
        answer:
          "Yes. I hold a Level 4 specialist qualification in cancer rehabilitation and have experience working with clients at all stages—during active treatment, in remission, and in long-term recovery. Controlled exercise has a significant evidence base for supporting your body through treatment and recovery. I work safely within the boundaries of any guidance from your medical team, and I dynamically adapt every single session to what your body can manage that day.",
      },
      {
        question: "I have a chronic health condition. Can personal training still help me?",
        answer:
          "Almost certainly yes. I am qualified in exercise referral, which means I am specifically trained to design exercise for individuals with chronic health conditions. Every programme is built entirely around what your body can tolerate, with a heavy focus on Balance, Mobility, and Joint Stability Support. Your sessions are adjusted dynamically as your energy levels and health change day to day.",
      },
      {
        question: "I have a disability. Can I still do personal training?",
        answer:
          "Yes. I am highly experienced in adapting training for individuals with physical disabilities and mobility limitations. While my studio is not fully wheelchair accessible due to an uneven access road, clients can be dropped off directly at the studio gate if needed. We focus entirely on your specific capabilities—your physical baseline is our starting point, never a barrier. Please get in touch so we can chat through any practical requirements.",
      },
      {
        question: "I have extremely limited mobility. Is there still something I can do?",
        answer:
          "Yes. My approach is always to start from where you are, whatever that looks like. We can easily begin with very gentle seated exercises, mobility work, or small range-of-motion movements. Progress looks completely different for everyone, and it is always measured against your own personal baseline—never anyone else's.",
      },
      {
        question: "I am partially sighted or blind. Can you work with me?",
        answer:
          "Yes. I am experienced in delivering inclusive physical coaching, guiding techniques, and precise verbal movement correction for blind and partially sighted clients. In my fully private studio, there are no public gym floor distractions. We keep the music low so verbal cues are clear, ensure equipment and benches stay in consistent positions, and keep the floor clear of obstacles. We focus on building your independent navigation, confidence, and autonomy at a pace that is entirely yours. Please get in touch to discuss your specific situation.",
      },
      {
        question: "My GP has referred me for exercise. Can you help?",
        answer:
          "Yes. I am a fully qualified GP Exercise Referral Trainer and experienced in working within medical guidance, focusing heavily on Balance, Mobility, and Joint Stability Support. While I do not take referrals directly through an NHS scheme, if your GP or doctor has recommended exercise, please get in touch. We will review their guidance together and build a safe, structured plan tailored to your body.",
      },
      {
        question: "I have an injury. Is it safe to exercise?",
        answer:
          "In most cases, yes, though it depends entirely on the type of injury and your current stage of recovery. An injury rarely means you have to stop moving altogether; it simply means we train intelligently by carefully adapting your range of motion and loading to protect the area while keeping the rest of your body strong and active. For recent injuries or post-surgical recovery, I work safely within the boundaries of any guidance provided by your physiotherapist or medical team.",
      },
    ],
  },
  {
    group: "Visual Impairment & Access",
    faqs: [
      {
        question: "How do I navigate into the studio?",
        answer:
          "I never presume to know what help you want — I will always ask. If you prefer to have a sighted guide, I can meet you outside or act as a guide on the walk into/around the studio.",
      },
      {
        question: "Is there public transport or parking nearby?",
        answer:
          "Yes. The studio is located exceptionally close to main local bus stop routes, making travel straightforward. If you are arriving by car or being dropped off, free on-street parking is available. Please note that the direct access road is uneven, but you can be dropped off directly at the main gate.",
      },
      {
        question: "Are guide dogs welcome?",
        answer:
          "Absolutely, without reservation. If you travel with a guide dog, they are incredibly welcome to rest safely in the private studio during your session. If you prefer to have a support person or family member sit in on your sessions, the space is entirely yours.",
      },
    ],
  },
  {
    group: "Inclusive Training",
    faqs: [
      {
        question: "Do you work with trans and non-binary clients?",
        answer:
          "Yes, without reservation. I work with clients across the full spectrum of gender identity and expression. You will be addressed and supported in whatever way feels right for you. If you have specific physical goals related to your gender identity, we will work together on a targeted plan to build that strength and capability without judgment.",
      },
      {
        question: "I have always felt uncomfortable or unwelcome in fitness spaces. Is this different?",
        answer:
          "This is the most common thing I hear. The fully private studio, the one-to-one format, and the complete absence of a traditional gym culture are specifically designed to make it different. There is no dress code, no forced weigh-in, and no expectation of what fitness \"should\" look like. Many of my clients arrive having had negative experiences elsewhere, and the vast majority choose to stay and train with me for a number of years because they finally feel at home.",
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
        image="/images/consultation-warm-chat.jpg"
        imageAlt="Esther chatting warmly with a client in the private Worthing studio"
        imageObjectPosition="50% 38%"
        imageObjectPositionWide="50% 28%"
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
              {content?.sidebar_body ?? "Training with me covers a wide range of baselines—from general fitness and athletic milestones to injuries, chronic health conditions, and disabilities. If you are wondering whether your specific situation fits here, it almost certainly does."}
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
        image="/images/coaching-deadlift-setup.jpg"
        imageAlt="Esther coaching a client through a deadlift setup"
        imagePosition="center 55%"
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
