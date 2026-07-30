"use client";

import LegalDocLayout, { LegalSection, LegalNote } from "@/components/legal/LegalDocLayout";

const tocItems = [
  { id: "who-we-are", label: "Who we are" },
  { id: "services-provided", label: "Services provided" },
  { id: "booking-and-availability", label: "Booking and availability" },
  { id: "health-safety", label: "Health, safety, and your responsibility" },
  { id: "payments", label: "Payments" },
  { id: "cancellations", label: "Cancellations and missed sessions" },
  { id: "packages", label: "Packages, blocks, and expiry" },
  { id: "results", label: "Results and expectations" },
  { id: "studio-rules", label: "Studio rules and conduct" },
  { id: "liability", label: "Liability and assumption of risk" },
  { id: "website-use", label: "Website use" },
];

export default function TermsPageClient() {
  return (
    <LegalDocLayout
      activeSlug="terms"
      title="Terms & Conditions"
      lead="These Terms and Conditions apply to all personal training services provided by Eternal Fitness, and are governed by the laws of England and Wales."
      meta={[
        { label: "Applies to", value: "All training and coaching services" },
        { label: "Provided by", value: "Esther Fair, Worthing" },
        { label: "Governing law", value: "England and Wales" },
        { label: "Questions", value: <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a> },
      ]}
      tocItems={tocItems}
      sideCta={{ label: "Ask a question", href: "/contact" }}
      askHeading="Anything here you want explained?"
      askBody="Terms should not be the thing that puts you off. If a clause is unclear, or your situation does not fit neatly, just ask."
    >
      <LegalSection id="who-we-are" n={1} title="Who we are">
        <p>Eternal Fitness is a private personal training business operated by Esther Fair, based in Worthing, West Sussex. We provide private, one-to-one personal training and related coaching services. Our focus is long-term wellbeing, strength, mobility, confidence in movement, and sustainable progress — for people with a wide range of health conditions, abilities, and backgrounds.</p>
      </LegalSection>

      <LegalSection id="services-provided" n={2} title="Services provided">
        <p>Our services may include, depending on what you book:</p>
        <ol>
          <li>One-to-one personal training sessions</li>
          <li>Assessments and goal setting</li>
          <li>Programme design and progress reviews</li>
          <li>Lifestyle and habit coaching (where agreed)</li>
          <li>Exercise support for wellbeing, mobility, strength, and rehabilitation</li>
        </ol>
        <LegalNote eyebrow="Important">
          We do not provide medical advice, diagnosis, or treatment. If you have a medical condition, injury, or concern, please speak to a qualified healthcare professional before starting. We will always work within our scope of practice and alongside your healthcare team where appropriate.
        </LegalNote>
      </LegalSection>

      <LegalSection id="booking-and-availability" n={3} title="Booking and availability">
        <ol>
          <li>Sessions must be booked in advance and confirmed by Esther.</li>
          <li>Booking confirmations are provided by email or message.</li>
          <li>Availability is discussed and agreed at the point of consultation.</li>
        </ol>
        <p>We may occasionally need to adjust schedules due to unforeseen circumstances and will always aim to provide as much notice as possible.</p>
      </LegalSection>

      <LegalSection id="health-safety" n={4} title="Health, safety, and your responsibility">
        <p>To keep training safe and appropriate for you:</p>
        <ol>
          <li>You agree to provide accurate and up-to-date information about your health, injuries, symptoms, medications, and any changes to your condition.</li>
          <li>You agree to follow Esther&apos;s guidance during sessions and use equipment responsibly.</li>
          <li>If anything feels painful, unsafe, or unusual, you must stop and tell Esther immediately.</li>
          <li>You understand that Esther may ask you to complete a health questionnaire (PAR-Q) before your first session.</li>
        </ol>
        <p>If Esther believes training is not currently safe for you, she may pause or decline to continue services until appropriate medical clearance is provided. This is done with your wellbeing in mind.</p>
      </LegalSection>

      <LegalSection id="payments" n={5} title="Payments">
        <p>Payment terms — including whether sessions are billed individually, in blocks, or on an ongoing basis — are confirmed at booking or following your initial consultation. Prices are quoted in GBP (&pound;). Payments must be made by the agreed due date. Late payment may result in pausing future bookings until the balance is cleared.</p>
      </LegalSection>

      <LegalSection id="cancellations" n={6} title="Cancellations, rescheduling, and missed sessions">
        <p>We understand plans change and aim to be fair and consistent in how we handle this.</p>
        <h3>Client cancellations and rescheduling</h3>
        <ol>
          <li>If you cancel or reschedule with at least 24 hours&apos; notice, your session can be moved to a new time subject to availability.</li>
          <li>If you cancel or reschedule with less than 24 hours&apos; notice, the session may be charged in full.</li>
        </ol>
        <h3>No-shows</h3>
        <ol>
          <li>If you do not attend your session without contacting us, it will be treated as a no-show and charged in full.</li>
        </ol>
        <h3>Late arrival</h3>
        <ol>
          <li>If you arrive late, your session may still end at the scheduled time. The full session fee applies.</li>
        </ol>
        <h3>Cancellations by Eternal Fitness</h3>
        <ol>
          <li>If Esther needs to cancel due to illness, emergency, or unavoidable circumstances, you can choose to reschedule or receive a full refund for that session.</li>
        </ol>
      </LegalSection>

      <LegalSection id="packages" n={7} title="Packages, blocks, and expiry">
        <p>If you purchase a block or package of sessions: packages are personal to you and cannot be transferred to another person unless agreed in writing. Any expiry period will be communicated at the point of purchase. Refunds on partially used packages are handled on a case-by-case basis and may be subject to an administration fee, except where consumer law requires otherwise.</p>
      </LegalSection>

      <LegalSection id="results" n={8} title="Results and expectations">
        <p>Esther provides professional coaching, structure, and support. However:</p>
        <ol>
          <li>Results vary from person to person based on consistency, health history, lifestyle, and many other factors.</li>
          <li>We cannot guarantee specific outcomes.</li>
          <li>Our focus is sustainable, long-term progress — not quick fixes or short-term transformations.</li>
        </ol>
      </LegalSection>

      <LegalSection id="studio-rules" n={9} title="Studio rules and conduct">
        <p>To maintain a calm and safe environment for all clients: please be respectful of Esther, the studio space, and any other clients you may encounter. Follow safety guidance and studio instructions at all times. Use clean indoor footwear if requested. Abusive, threatening, or inappropriate behaviour will result in the immediate end of a session, and future bookings may be refused at Esther&apos;s discretion.</p>
      </LegalSection>

      <LegalSection id="liability" n={10} title="Liability and assumption of risk">
        <ol>
          <li>Exercise involves inherent risk. By choosing to train, you acknowledge that physical activity may carry a risk of injury.</li>
          <li>To the fullest extent permitted by law, Eternal Fitness is not liable for loss, damage, or injury resulting from: inaccurate or withheld information provided by you, failure to follow instructions, or misuse of equipment.</li>
          <li>Nothing in these Terms limits liability where it would be unlawful to do so — including liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation.</li>
        </ol>
      </LegalSection>

      <LegalSection id="website-use" n={11} title="Website use">
        <p>When using this website, you agree not to misuse the site, attempt unauthorised access, or interfere with its security. You may not copy content for commercial use without permission. The site must not be used in any way that breaks applicable laws. We may update, suspend, or remove website content at any time without notice.</p>
        <p>These Terms and Conditions are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        <LegalNote eyebrow="Related">
          How your personal information is handled is set out in our <a href="/privacy-policy">Privacy Policy</a>, and how this site uses cookies in our <a href="/cookies-policy">Cookie Policy</a>.
        </LegalNote>
      </LegalSection>
    </LegalDocLayout>
  );
}
