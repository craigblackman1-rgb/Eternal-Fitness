"use client";

import LegalDocLayout, { LegalSection, LegalNote } from "@/components/legal/LegalDocLayout";

const tocItems = [
  { id: "information-collect", label: "What information do we collect?" },
  { id: "use-information", label: "How do we use your information?" },
  { id: "information-shared", label: "Will your information be shared?" },
  { id: "cookies-tracking", label: "Cookies and tracking technologies" },
  { id: "keep-information", label: "How long do we keep your information?" },
  { id: "information-safe", label: "How do we keep your information safe?" },
  { id: "minors", label: "Do we collect information from minors?" },
  { id: "privacy-rights", label: "What are your privacy rights?" },
  { id: "dnt-features", label: "Do-Not-Track features" },
  { id: "california-rights", label: "California residents' rights" },
  { id: "policy-updates", label: "Updates to this policy" },
  { id: "contact-us", label: "How can you contact us?" },
];

export default function PrivacyPolicyClient() {
  return (
    <LegalDocLayout
      activeSlug="privacy"
      title="Privacy Policy"
      lead="We are committed to protecting your personal information and your right to privacy. This policy explains what information we collect, how we use it, and your rights over it."
      meta={[
        { label: "Last updated", value: "6 December 2020" },
        { label: "Data controller", value: "Eternal Fitness, Worthing" },
        { label: "Data protection officer", value: "Esther Fair" },
        { label: "Questions", value: <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a> },
      ]}
      tocItems={tocItems}
      sideCta={{ label: "Ask a question", href: "/contact" }}
      askHeading="Want a copy of what we hold?"
      askBody="Ask and I will send it. If you would rather have the conversation on the phone than in writing, that is fine too."
    >
      <LegalSection id="information-collect" n={1} title="What information do we collect?">
        <h3>Personal information you disclose to us</h3>
        <p>We collect personal information that you voluntarily provide to us when expressing an interest in obtaining information about us or our products and services, when participating in activities on the Sites, or otherwise contacting us.</p>
        <p>The personal information we collect may include the following:</p>
        <ul>
          <li><strong>Name and Contact Data.</strong> We collect your first and last name, email address, postal address, phone number, and other similar contact data.</li>
          <li><strong>Credentials.</strong> We collect passwords, password hints, and similar security information used for authentication and account access.</li>
          <li><strong>Payment Data.</strong> We collect data necessary to process your payment if you make purchases, such as your payment instrument number and the security code associated with your payment instrument. All payment data is stored by our payment processor.</li>
        </ul>
        <h3>Information automatically collected</h3>
        <p>We automatically collect certain information when you visit, use or navigate the Sites. This information does not reveal your specific identity but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Sites and other technical information.</p>
        <p>This information is primarily needed to maintain the security and operation of our Sites, and for our internal analytics and reporting purposes. Like many businesses, we also collect information through cookies and similar technologies.</p>
        <h3>Information collected from other sources</h3>
        <p>We may obtain information about you from other sources, such as public databases, joint marketing partners, as well as from other third parties. Examples of the information we receive from other sources include: social media profile information; marketing leads and search results and links, including paid listings.</p>
      </LegalSection>

      <LegalSection id="use-information" n={2} title="How do we use your information?">
        <p>We process your information for purposes based on legitimate business interests, the fulfillment of our contract with you, compliance with our legal obligations, and/or your consent.</p>
        <p>We use the information we collect or receive:</p>
        <ul>
          <li><strong>Marketing and promotional communications.</strong> We and/or our third party marketing partners may use the personal information you send to us for our marketing purposes, if this is in accordance with your marketing preferences. You can opt-out of our marketing emails at any time.</li>
          <li><strong>Testimonials.</strong> We post testimonials on our Sites that may contain personal information. Prior to posting a testimonial, we will obtain your consent to use your name and testimonial.</li>
          <li><strong>Request feedback.</strong> We may use your information to request feedback and to contact you about your use of our Sites.</li>
          <li><strong>User-to-user communications.</strong> We may use your information in order to enable user-to-user communications with each user&apos;s consent.</li>
          <li><strong>Enforce terms, conditions and policies.</strong></li>
          <li><strong>Respond to legal requests and prevent harm.</strong> If we receive a subpoena or other legal request, we may need to inspect the data we hold to determine how to respond.</li>
          <li><strong>Other business purposes.</strong> We may use your information for data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and to evaluate and improve our Sites, products, services, marketing and your experience.</li>
        </ul>
      </LegalSection>

      <LegalSection id="information-shared" n={3} title="Will your information be shared with anyone?">
        <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</p>
        <p>We may process or share your data based on the following legal basis:</p>
        <ul>
          <li><strong>Consent:</strong> We may process your data if you have given us specific consent to use your personal information for a specific purpose.</li>
          <li><strong>Legitimate Interests:</strong> We may process your data when it is reasonably necessary to achieve our legitimate business interests.</li>
          <li><strong>Performance of a Contract:</strong> Where we have entered into a contract with you, we may process your personal information to fulfill the terms of our contract.</li>
          <li><strong>Legal Obligations:</strong> We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process.</li>
          <li><strong>Vital Interests:</strong> We may disclose your information where we believe it is necessary to investigate, prevent, or take action regarding potential violations of our policies, suspected fraud, situations involving potential threats to the safety of any person and illegal activities, or as evidence in litigation in which we are involved.</li>
          <li><strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies-tracking" n={4} title="Do we use cookies and other tracking technologies?">
        <p>We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our <a href="/cookies-policy">Cookie Policy</a>.</p>
      </LegalSection>

      <LegalSection id="keep-information" n={5} title="How long do we keep your information?">
        <p>We keep your information for as long as necessary to fulfill the purposes outlined in this privacy policy unless otherwise required by law. We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy policy, unless a longer retention period is required or permitted by law (such as tax, accounting or other legal requirements). No purpose in this policy will require us keeping your personal information for longer than 1 year.</p>
        <p>When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize it, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.</p>
      </LegalSection>

      <LegalSection id="information-safe" n={6} title="How do we keep your information safe?">
        <p>We aim to protect your personal information through a system of organisational and technical security measures. We have implemented appropriate technical and organisational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure. Although we will do our best to protect your personal information, transmission of personal information to and from our Sites is at your own risk. You should only access the services within a secure environment.</p>
      </LegalSection>

      <LegalSection id="minors" n={7} title="Do we collect information from minors?">
        <p>We do not knowingly solicit data from or market to children under 18 years of age. By using the Sites, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent&apos;s use of the Sites. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a>.</p>
      </LegalSection>

      <LegalSection id="privacy-rights" n={8} title="What are your privacy rights?">
        <p>In some regions, such as the European Economic Area, you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time.</p>
        <p>In some regions (like the European Economic Area), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information.</p>
        <p>If we are relying on your consent to process your personal information, you have the right to withdraw your consent at any time. Please note however that this will not affect the lawfulness of the processing before its withdrawal.</p>
        <LegalNote eyebrow="Cookies and similar technologies">
          Most web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Sites. For further information, please see our <a href="/cookies-policy">Cookie Policy</a>.
        </LegalNote>
      </LegalSection>

      <LegalSection id="dnt-features" n={9} title="Controls for Do-Not-Track features">
        <p>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (&ldquo;DNT&rdquo;) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. No uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Policy.</p>
      </LegalSection>

      <LegalSection id="california-rights" n={10} title="Do California residents have specific privacy rights?">
        <p>Yes, if you are a resident of California, you are granted specific rights regarding access to your personal information. California Civil Code Section 1798.83, also known as the &ldquo;Shine The Light&rdquo; law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year.</p>
        <p>If you are under 18 years of age, reside in California, and have a registered account with the Sites, you have the right to request removal of unwanted data that you publicly post on the Sites. To request removal of such data, please contact us using the contact information provided below, and include the email address associated with your account and a statement that you reside in California. We will make sure the data is not publicly displayed on the Sites, but please be aware that the data may not be completely or comprehensively removed from all our systems.</p>
      </LegalSection>

      <LegalSection id="policy-updates" n={11} title="Do we make updates to this policy?">
        <p>Yes, we will update this policy as necessary to stay compliant with relevant laws. We may update this privacy policy from time to time. The updated version will be indicated by an updated &ldquo;Revised&rdquo; date and the updated version will be effective as soon as it is accessible. If we make material changes to this privacy policy, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this privacy policy frequently to be informed of how we are protecting your information.</p>
      </LegalSection>

      <LegalSection id="contact-us" n={12} title="How can you contact us about this policy?">
        <p>If you have questions or comments about this policy, you may contact our Data Protection Officer (DPO), Esther Fair, by email at <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a>.</p>
        <h3>How can you review, update, or delete the data we collect from you?</h3>
        <p>Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, change that information, or delete it in some circumstances. To request to review, update, or delete your personal information, please <a href="/contact">contact us</a>. We will respond to your request within 30 days.</p>
      </LegalSection>
    </LegalDocLayout>
  );
}
