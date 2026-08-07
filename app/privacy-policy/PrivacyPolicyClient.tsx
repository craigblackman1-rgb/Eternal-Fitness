"use client";

import LegalDocLayout, { LegalSection, LegalNote, LegalTable } from "@/components/legal/LegalDocLayout";

const tocItems = [
  { id: "who-we-are", label: "Who we are" },
  { id: "information-collect", label: "What information do we collect?" },
  { id: "health-data", label: "Health information (special category data)" },
  { id: "lawful-basis", label: "Our lawful basis for using your information" },
  { id: "use-information", label: "How do we use your information?" },
  { id: "information-shared", label: "Who do we share your information with?" },
  { id: "international-transfers", label: "International transfers" },
  { id: "cookies-tracking", label: "Cookies and tracking technologies" },
  { id: "keep-information", label: "How long do we keep your information?" },
  { id: "information-safe", label: "How do we keep your information safe?" },
  { id: "minors", label: "Children's information" },
  { id: "privacy-rights", label: "Your rights" },
  { id: "policy-updates", label: "Updates to this policy" },
  { id: "contact-us", label: "How can you contact us?" },
];

export default function PrivacyPolicyClient() {
  return (
    <LegalDocLayout
      activeSlug="privacy"
      title="Privacy Policy"
      lead="This policy explains what personal information Eternal Fitness collects, why, how it's used, who it's shared with, and the rights you have over it under UK GDPR and the Data Protection Act 2018."
      meta={[
        { label: "Last updated", value: "7 August 2026" },
        { label: "Data controller", value: "Esther Fair, trading as Eternal Fitness" },
        { label: "Based in", value: "Worthing, West Sussex" },
        { label: "Questions", value: <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a> },
      ]}
      tocItems={tocItems}
      sideCta={{ label: "Ask a question", href: "/contact" }}
      askHeading="Want a copy of what we hold?"
      askBody="Ask and I will send it. If you would rather have the conversation on the phone than in writing, that is fine too."
    >
      <LegalSection id="who-we-are" n={1} title="Who we are">
        <p>Eternal Fitness is a private, one-to-one personal training business operated by Esther Fair as a sole trader, based in Worthing, West Sussex. Esther is the data controller responsible for your personal information — the person who decides why and how it is used. The exact studio address is shared only with clients at the point of booking, to keep a private, single-occupant training space secure; general correspondence should go to the email address above.</p>
        <p>We don't have a formal Data Protection Officer — the law doesn't require one at this scale — but Esther is personally responsible for how your data is handled and is who to contact with any question or concern.</p>
      </LegalSection>

      <LegalSection id="information-collect" n={2} title="What information do we collect?">
        <h3>Information you give us directly</h3>
        <ul>
          <li><strong>Enquiries and messages.</strong> When you use the contact form, your name, email address, phone number (if given), and the content of your message.</li>
          <li><strong>Booking a free consultation.</strong> The "Book a Free Consultation" button on this site takes you to our Microsoft Bookings calendar, hosted by Microsoft, to choose a time. Booking there means you're giving your name, email, phone number, and any notes directly to that booking system — see <a href="#information-shared">who we share your information with</a> below for how that works.</li>
          <li><strong>Becoming a client.</strong> If you go ahead with training, we collect the details needed to deliver the service safely and keep proper records: your name, contact details, emergency contact, health/PAR-Q information (see below), signed agreements and consent forms, session notes, and training programme data.</li>
          <li><strong>Client portal.</strong> If you're given access to the client portal, we hold your login details, session history, exercise logs, and any documents shared through it.</li>
        </ul>
        <h3>Information collected automatically</h3>
        <p>The public website itself doesn't run any analytics or advertising trackers, so beyond standard web server/hosting logs (kept briefly for security and abuse prevention, not used to build a profile of you) we don't automatically collect browsing data about visitors to the public pages. The staff hub and client portal — both password-protected — use essential session cookies to keep you logged in; see our <a href="/cookies-policy">Cookie Policy</a> for the full, accurate list.</p>
        <h3>What we don't collect</h3>
        <p>We don't take payment directly through this website, so we don't collect or store card numbers or other payment instrument details ourselves. Payment for training is arranged directly with Esther.</p>
      </LegalSection>

      <LegalSection id="health-data" n={3} title="Health information (special category data)">
        <p>Before your first session, we ask you to complete a PAR-Q (Physical Activity Readiness Questionnaire) covering things like diagnosed medical conditions, medications, implanted medical devices, and recent surgeries or hospital admissions. Under UK GDPR this counts as <strong>"special category data"</strong> — information about your health — which the law treats with extra care.</p>
        <p>We only collect this because it's genuinely necessary: without knowing about a condition, medication, or recent surgery, a session could be programmed unsafely. We ask for your <strong>explicit consent</strong> to hold and use this information for that purpose when you complete the form, and it is only ever used to plan and adapt your training safely — never for marketing, never sold, and never shared beyond what's described in this policy.</p>
        <p>If your PAR-Q answers indicate that medical clearance is needed before training can begin, we'll ask you to get a signed letter from your GP or relevant consultant, and no session will go ahead until that's received.</p>
      </LegalSection>

      <LegalSection id="lawful-basis" n={4} title="Our lawful basis for using your information">
        <p>UK GDPR requires us to have a valid legal reason ("lawful basis") for every use of your personal information. Depending on the situation, we rely on:</p>
        <ul>
          <li><strong>Contract.</strong> Where we need your information to provide the training service you've booked — e.g. contact details, scheduling, session records.</li>
          <li><strong>Consent.</strong> Especially for health/PAR-Q information (see above), and for anything else where we ask you directly and you can withdraw that consent at any time without it affecting other services.</li>
          <li><strong>Legitimate interests.</strong> For things like responding to a general enquiry, keeping basic records for insurance purposes, and the day-to-day administration of running the business — always balanced against your right to privacy.</li>
          <li><strong>Legal obligation.</strong> Where we're required to keep or disclose information — for example, financial records for HMRC.</li>
        </ul>
      </LegalSection>

      <LegalSection id="use-information" n={5} title="How do we use your information?">
        <ul>
          <li><strong>Delivering training safely.</strong> Programming, adapting, and running your sessions around your goals and health information.</li>
          <li><strong>Communicating with you.</strong> Replying to enquiries, session scheduling, and — for clients — progress updates and reminders.</li>
          <li><strong>AI-assisted drafting.</strong> Some client progress-update emails and training plans are drafted with the help of an AI writing assistant, using relevant session/programme context, before Esther reviews and sends them herself. See <a href="#information-shared">who we share your information with</a> for the processor involved.</li>
          <li><strong>Record-keeping and insurance.</strong> Signed agreements, consent forms, and health records are kept as evidence of what was agreed and disclosed, which also protects you.</li>
          <li><strong>Testimonials.</strong> We only ever use your name or words as a testimonial with your specific, separate consent — never PAR-Q or health information.</li>
          <li><strong>Running the business.</strong> Invoicing, basic bookkeeping, and administration.</li>
        </ul>
        <p>We don't use your information for automated decision-making or profiling that produces legal or similarly significant effects on you.</p>
      </LegalSection>

      <LegalSection id="information-shared" n={6} title="Who do we share your information with?">
        <p>We don't sell your information, and we don't share it for third-party marketing. We do use a small number of trusted service providers ("processors") to run the business — each only processes data on our instructions, for the purpose stated:</p>
        <LegalTable
          columns={["Who", "What for", "What they see"]}
          rows={[
            ["Microsoft (Bookings)", "Scheduling free consultations", "Name, email, phone, and any notes you enter when booking — collected directly by Microsoft once you leave our site; their own privacy notice applies to that data"],
            ["Our email provider", "Sending booking confirmations, enquiry replies, and client update emails", "Your email address and the content of the email being sent"],
            ["Our hosting provider", "Running the website and securely storing client records in our database", "Whatever is stored in your client record, hosted on infrastructure we control"],
            ["AI writing assistant (via OpenRouter)", "Helping draft client progress-update emails and training plans, which Esther always reviews before sending", "Relevant session/programme context for the client the draft is being written for — never your PAR-Q answers"],
            ["Trainerize", "Historic client records from before we moved to our current system", "Training history for clients who were with us before the migration; no longer actively used for new data"],
          ]}
        />
        <p>We may also disclose information where we're legally required to — for example, in response to a court order — or to protect someone's vital interests in a genuine emergency.</p>
      </LegalSection>

      <LegalSection id="international-transfers" n={7} title="International transfers">
        <p>Some of the service providers above may process data outside the UK (for example, the AI assistant provider). Where that happens, we rely on the safeguards built into those providers' own terms (such as the UK's International Data Transfer Agreement or the EU Standard Contractual Clauses, as applicable) to keep your information protected to UK standards wherever it's processed.</p>
      </LegalSection>

      <LegalSection id="cookies-tracking" n={8} title="Do we use cookies and other tracking technologies?">
        <p>The public website doesn't use any advertising or analytics cookies. The staff hub and client portal use a small number of essential cookies to keep you securely signed in. The full, accurate list is in our <a href="/cookies-policy">Cookie Policy</a>.</p>
      </LegalSection>

      <LegalSection id="keep-information" n={9} title="How long do we keep your information?">
        <p>We only keep information for as long as we actually need it:</p>
        <ul>
          <li><strong>General enquiries that don't become bookings.</strong> Deleted or anonymised after around 12 months of inactivity.</li>
          <li><strong>Client records — contracts, invoices, financial records.</strong> Kept for at least 6 years after the end of the relationship, to meet HMRC record-keeping requirements.</li>
          <li><strong>PAR-Q, health information, and signed consent/agreement forms.</strong> Kept for the duration of our training relationship and for a further period afterwards — in line with standard professional-indemnity insurance guidance for the fitness industry — in case a question about what was disclosed or agreed ever needs to be answered.</li>
          <li><strong>Client portal data (session logs, exercise history).</strong> Kept while you remain an active client, and for a reasonable period afterwards in case you return to training with us.</li>
        </ul>
        <p>When there's no longer a good reason to keep it, we delete or anonymise it, except where we're required by law to keep it longer.</p>
      </LegalSection>

      <LegalSection id="information-safe" n={10} title="How do we keep your information safe?">
        <p>We use appropriate technical and organisational measures to protect your information — including encrypted connections (HTTPS) across the site, access to client records and the staff hub restricted to authenticated logins, and health information handled with particular care given its sensitivity. No system connected to the internet can be guaranteed 100% secure, but we take reasonable, proportionate steps for a business of our size to protect what we hold.</p>
      </LegalSection>

      <LegalSection id="minors" n={11} title="Children's information">
        <p>Eternal Fitness's services are provided to adults. We don't knowingly collect personal information from children. If you believe a child's information has been provided to us, please contact us at <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a> and we'll remove it.</p>
      </LegalSection>

      <LegalSection id="privacy-rights" n={12} title="What are your privacy rights?">
        <p>Under UK GDPR, you have the right to:</p>
        <ul>
          <li><strong>Access</strong> a copy of the personal information we hold about you.</li>
          <li><strong>Rectification</strong> — ask us to correct anything inaccurate or incomplete.</li>
          <li><strong>Erasure</strong> — ask us to delete your information, where there's no legal reason for us to keep it.</li>
          <li><strong>Restriction</strong> — ask us to limit how we use your information in certain circumstances.</li>
          <li><strong>Portability</strong> — receive certain information in a portable format, or ask us to transfer it to another provider.</li>
          <li><strong>Object</strong> — object to processing based on legitimate interests.</li>
          <li><strong>Withdraw consent</strong> at any time, where we're relying on consent — this won't affect anything already done before you withdrew it.</li>
        </ul>
        <p>To exercise any of these, just <a href="/contact">get in touch</a> — we'll respond within one month. There's no charge for a reasonable request.</p>
        <LegalNote eyebrow="If you're not happy with our response">
          You also have the right to complain to the UK's data protection regulator, the <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">Information Commissioner's Office (ICO)</a>, at ico.org.uk or on 0303 123 1113. We'd always appreciate the chance to put things right directly first, but that right stands either way.
        </LegalNote>
      </LegalSection>

      <LegalSection id="policy-updates" n={13} title="Do we make updates to this policy?">
        <p>We'll update this policy if the way we handle your information changes, or to stay in line with the law. The "Last updated" date at the top shows when it was last revised. If we make a significant change, we'll make that clear on this page rather than relying on you checking back.</p>
      </LegalSection>

      <LegalSection id="contact-us" n={14} title="How can you contact us about this policy?">
        <p>For anything to do with your personal information — a question, a request to see or delete your data, or a concern — contact Esther Fair directly at <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a>.</p>
      </LegalSection>
    </LegalDocLayout>
  );
}
