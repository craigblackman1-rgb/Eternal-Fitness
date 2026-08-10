"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BOOKINGS_URL } from "@/lib/booking";
import { Section, SectionHeading, PageHero, CTABand, Reveal } from "@/components/ds";

/**
 * SHELL PAGE — created 2026-08-10, content pending.
 *
 * This page exists so the third specialism is routable and nav-linked. The copy
 * below is deliberately minimal and generic; it is NOT finished content. The
 * page is set to noindex in page.tsx until real copy lands — an indexed thin
 * page is worse than no page.
 *
 * ── CLAIMS THAT ARE NOT YET SAFE TO MAKE ──────────────────────────────────
 * Esther's falls qualification is not yet confirmed or completed. Until it is:
 *   • Do NOT use "FaME", "Postural Stability Instructor", "PSI", or imply
 *     NHS / local-authority commissioned status. PSI/FaME (via Later Life
 *     Training) is the de facto standard commissioners look for, and claiming
 *     it unqualified repeats the site's own "Level 4" overclaim history.
 *   • Do NOT claim exercise "prevents falls" or cite FaME/Otago percentage
 *     reductions as outcomes for her clients — that is a medical-efficacy
 *     claim under ASA/CAP. "May help reduce your risk", sourced, is the ceiling.
 *   • Do NOT imply a relationship with Adur & Worthing Wellbeing or West Sussex
 *     County Council unless one genuinely exists.
 *
 * ── COPY GUIDANCE ────────────────────────────────────────────────────────
 * Older adults reject "elderly", "frail", and "falls risk" as identity labels.
 * Lead with independence, confidence and staying steady. "Falls prevention" is
 * fine in headings (it is the term people search) but should be softened in
 * body copy and CTAs.
 *
 * Note: a significant share of this audience is reached via adult children
 * searching on a parent's behalf ("my mum keeps falling") — the finished page
 * should speak to both readers.
 */
export default function FallsPreventionClient() {
  const bookCta = { label: "Book a Free Consultation", href: BOOKINGS_URL, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
        {/* Provisional image — swap once the real photography for this page exists. */}
        <PageHero
          image="/images/active-ageing-step-up.jpg"
          imageAlt="Strength and balance training for older adults in Worthing"
          imageObjectPosition="50% 40%"
          imageObjectPositionWide="50% 35%"
          eyebrow="Specialist Training"
          heading={<>Strength, Balance<br />&amp; Staying Steady</>}
          subhead="One-to-one strength and balance training for older adults in Worthing — built around staying confident, capable and independent on your own terms."
          primaryCta={bookCta}
        />

        <Section background="white">
          <SectionHeading
            eyebrow="Coming Soon"
            eyebrowColor="teal"
            heading="This page is being written"
          />
          <Reveal y={24}>
            <p className="ds-body" style={{ marginTop: 20, marginBottom: 16 }}>
              Esther is currently completing further training in strength and balance
              work for older adults. Full details of what these sessions involve will
              be published here shortly.
            </p>
            <p className="ds-body" style={{ marginBottom: 16 }}>
              In the meantime, if you — or someone in your family — have been feeling
              less steady than you used to, or have had a fall and lost some
              confidence, the first conversation is free and there is no obligation.
            </p>
          </Reveal>
        </Section>

        <CTABand
          image="/images/studio-1.jpg"
          imageAlt="Eternal Fitness private studio in Worthing"
          heading="Not sure if this is right for you?"
          body="The first conversation is free, with no commitment — and I would always rather tell you honestly whether I'm the right person to help."
          primaryCta={{ label: "Book a Free Consultation", href: BOOKINGS_URL }}
          secondaryCta={{ label: "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
        />
      </main>
      <Footer />
    </div>
  );
}
