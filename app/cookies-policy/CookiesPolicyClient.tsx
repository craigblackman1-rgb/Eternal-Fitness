"use client";

import LegalDocLayout, { LegalSection, LegalNote, LegalTable } from "@/components/legal/LegalDocLayout";

const tocItems = [
  { id: "what-are-cookies", label: "What are cookies?" },
  { id: "public-site", label: "Cookies on the public website" },
  { id: "hub-portal-cookies", label: "Cookies in the staff hub and client portal" },
  { id: "third-party-cookies", label: "Cookies from third-party sites you visit from here" },
  { id: "control-cookies", label: "How can I control cookies?" },
  { id: "policy-updates", label: "Policy updates" },
  { id: "further-information", label: "Further information" },
];

export default function CookiesPolicyClient() {
  return (
    <LegalDocLayout
      activeSlug="cookies"
      title="Cookie Policy"
      lead="This is a straight account of every cookie this site actually sets — not a generic list. If it's not on this page, we don't use it."
      meta={[
        { label: "Last updated", value: "7 August 2026" },
        { label: "Cookies in use", value: "3, all essential" },
        { label: "Questions", value: <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a> },
        { label: "Or call", value: <a href="tel:+4407517658128">(+44) 07517 658128</a> },
      ]}
      tocItems={tocItems}
      sideCta={{ label: "Read the Privacy Policy", href: "/privacy-policy" }}
      askHeading="Not sure what any of this means?"
      askBody="That is a fair question to ask, and an easy one to answer. Send a message and I will explain it in plain English."
    >
      <LegalSection id="what-are-cookies" n={1} title="What are cookies?">
        <p>Cookies are small text files stored on your device when you visit a website. They can be used for all sorts of things — keeping you logged in, remembering a preference, or tracking your behaviour across sites for advertising. This page tells you exactly which of those this site does, and doesn't, do.</p>
      </LegalSection>

      <LegalSection id="public-site" n={2} title="Cookies on the public website">
        <p>The public pages of this site — the ones anyone can browse without logging in — <strong>don't set any cookies at all.</strong> There's no analytics, no advertising or retargeting pixels, and no third-party tracking of any kind on the pages you're reading right now.</p>
        <p>That also means we don't currently need a cookie consent banner: UK cookie law (PECR) requires consent for non-essential cookies like analytics or advertising, and we don't use any. If that changes in future — for example, if we add analytics to understand how the site is used — we'll add a proper consent banner and update this policy before we do.</p>
      </LegalSection>

      <LegalSection id="hub-portal-cookies" n={3} title="Cookies in the staff hub and client portal">
        <p>The password-protected staff hub (used by Esther to manage clients and the business) and the client portal (used by clients to view their training) each use a small number of <strong>strictly necessary</strong> cookies. These don't need your consent under PECR because the site can't function without them — they exist purely to keep you securely signed in, not to track you.</p>
        <LegalTable
          columns={["Cookie", "Purpose", "Where", "Expires"]}
          rows={[
            ["Staff session cookie", "Keeps a signed-in staff member logged in to the hub.", "Staff hub only (/hub)", "Session / until sign-out"],
            ["better_auth_portal_session", "Keeps a signed-in client logged in to the client portal.", "Client portal only (/portal)", "7 days"],
            ["Sidebar preference", "Remembers whether the hub's side navigation is expanded or collapsed. Contains no personal data.", "Staff hub only (/hub)", "Up to 7 days"],
          ]}
          note="None of these are used for advertising, analytics, or tracking you across other websites."
        />
      </LegalSection>

      <LegalSection id="third-party-cookies" n={4} title="Cookies from third-party sites you visit from here">
        <p>Booking a free consultation takes you to our Microsoft Bookings calendar, hosted on Microsoft's own domain. Once you're there, Microsoft's own cookies and privacy practices apply — not ours. The same goes for any other external link on this site (for example, a link to our Facebook page). We're not responsible for what those third-party sites do with cookies, and we'd encourage you to check their own policies if you're unsure.</p>
      </LegalSection>

      <LegalSection id="control-cookies" n={5} title="How can I control cookies?">
        <p>Because the essential cookies described above are required for the hub and portal to work, there's nothing to opt out of on our own site — if you'd rather not have them set, simply don't log in to the hub or portal (the public pages, as covered above, never set a cookie regardless).</p>
        <p>You can also control or delete cookies at any time through your browser's own settings — most browsers let you view, block, or remove cookies on a per-site basis. Your browser's help menu will have the specifics, since it varies by browser.</p>
      </LegalSection>

      <LegalSection id="policy-updates" n={6} title="How often will you update this Cookie Policy?">
        <p>We'll update this page whenever what the site actually does changes — for example, if analytics or a consent banner is ever added. The date at the top shows when it was last reviewed against the live site.</p>
      </LegalSection>

      <LegalSection id="further-information" n={7} title="Where can I get further information?">
        <p>Questions about cookies, or about how we use personal information more generally, are welcome by email at <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a> or by phone on <a href="tel:+4407517658128">(+44) 07517 658128</a>.</p>
        <LegalNote eyebrow="Related">
          How we handle personal information more broadly — including your rights over it — is set out in our <a href="/privacy-policy">Privacy Policy</a>.
        </LegalNote>
      </LegalSection>
    </LegalDocLayout>
  );
}
