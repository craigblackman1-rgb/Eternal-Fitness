"use client";

import LegalDocLayout, { LegalSection, LegalNote, LegalTable } from "@/components/legal/LegalDocLayout";

const tocItems = [
  { id: "what-are-cookies", label: "What are cookies?" },
  { id: "why-cookies", label: "Why do we use cookies?" },
  { id: "control-cookies", label: "How can I control cookies?" },
  { id: "essential-cookies", label: "Essential website cookies" },
  { id: "analytics-cookies", label: "Analytics and customization cookies" },
  { id: "unclassified-cookies", label: "Unclassified cookies" },
  { id: "tracking-technologies", label: "Other tracking technologies" },
  { id: "flash-cookies", label: "Flash cookies" },
  { id: "targeted-advertising", label: "Targeted advertising" },
  { id: "policy-updates", label: "Policy updates" },
  { id: "further-information", label: "Further information" },
];

export default function CookiesPolicyClient() {
  return (
    <LegalDocLayout
      activeSlug="cookies"
      title="Cookie Policy"
      lead="This Cookie Policy explains how Eternal Fitness uses cookies and similar technologies when you visit our website, what each one does, and how you can control them."
      meta={[
        { label: "Last updated", value: "6 December 2020" },
        { label: "Cookies listed", value: "8 across 3 categories" },
        { label: "Questions", value: <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a> },
        { label: "Or call", value: <a href="tel:+4407517658128">(+44) 07517 658128</a> },
      ]}
      tocItems={tocItems}
      sideCta={{ label: "Read the Privacy Policy", href: "/privacy-policy" }}
      askHeading="Not sure what any of this means?"
      askBody="That is a fair question to ask, and an easy one to answer. Send a message and I will explain it in plain English."
    >
      <LegalSection id="what-are-cookies" n={1} title="What are cookies?">
        <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
        <p>Cookies set by the website owner (in this case, Eternal Fitness) are called &ldquo;first party cookies&rdquo;. Cookies set by parties other than the website owner are called &ldquo;third party cookies&rdquo;.</p>
        <p>Third party cookies enable third party features or functionality to be provided on or through the website (e.g. advertising, interactive content and analytics). The parties that set these third party cookies can recognize your computer both when it visits the website in question and also when it visits certain other websites.</p>
      </LegalSection>

      <LegalSection id="why-cookies" n={2} title="Why do we use cookies?">
        <p>We use first and third party cookies for several reasons. Some cookies are required for technical reasons in order for our Websites to operate, and we refer to these as &ldquo;essential&rdquo; or &ldquo;strictly necessary&rdquo; cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Online Properties.</p>
        <p>Third parties serve cookies through our Websites for advertising, analytics and other purposes. This is described in more detail below.</p>
      </LegalSection>

      <LegalSection id="control-cookies" n={3} title="How can I control cookies?">
        <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager. The Cookie Consent Manager allows you to select which categories of cookies you accept or reject. Essential cookies cannot be rejected as they are strictly necessary to provide you with services.</p>
        <p>If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted. You may also set or amend your web browser controls to accept or refuse cookies. As the means by which you can refuse cookies through your web browser controls vary from browser-to-browser, you should visit your browser&apos;s help menu for more information.</p>
        <p>In addition, most advertising networks offer you a way to opt out of targeted advertising.</p>
      </LegalSection>

      <LegalSection id="essential-cookies" n={4} title="Essential website cookies">
        <p>These cookies are strictly necessary to provide you with services available through our Websites and to use some of its features, such as access to secure areas.</p>
        <LegalTable
          columns={["Name", "Purpose", "Provider", "Type", "Expires"]}
          rows={[
            ["__tlbcpv", "Used to record unique visitor views of the consent banner.", ".termly.io", "http_cookie", "1 year"],
            ["__cfduid", "Used by Cloudflare to identify individual clients behind a shared IP address, and apply security settings on a per-client basis.", ".termly.io", "server_cookie", "30 days"],
            ["TERMLY_API_CACHE", "Used to store visitor's consent result in order to improve performance of the consent banner.", "www.eternal-fitness.co.uk", "html_local_storage", "1 year"],
          ]}
          note="Essential cookies cannot be switched off — the site cannot deliver its basic services without them."
        />
      </LegalSection>

      <LegalSection id="analytics-cookies" n={5} title="Analytics and customization cookies">
        <p>These cookies collect information that is used either in aggregate form to help us understand how our Websites are being used or how effective our marketing campaigns are, or to help us customize our Websites for you.</p>
        <LegalTable
          columns={["Name", "Purpose", "Provider", "Type", "Expires"]}
          rows={[
            ["_ga", "Records a particular ID used to come up with data about website usage by the user.", ".eternal-fitness.co.uk", "http_cookie", "1 year 11 months 29 days"],
            ["_gat#", "Enables Google Analytics to regulate the rate of requesting.", ".eternal-fitness.co.uk", "http_cookie", "1 minute"],
            ["_gid", "Keeps an entry of unique ID which is then used to come up with statistical data on website usage by visitors.", ".eternal-fitness.co.uk", "http_cookie", "1 day"],
          ]}
        />
      </LegalSection>

      <LegalSection id="unclassified-cookies" n={6} title="Unclassified cookies">
        <p>These are cookies that have not yet been categorized. We are in the process of classifying these cookies with the help of their providers.</p>
        <LegalTable
          columns={["Name", "Provider", "Type", "Expires"]}
          rows={[
            ["elementor", "www.eternal-fitness.co.uk", "html_local_storage", "Persistent"],
            ["_ga_B4ZDEPQCR9", ".eternal-fitness.co.uk", "http_cookie", "1 year 11 months 29 days"],
          ]}
        />
      </LegalSection>

      <LegalSection id="tracking-technologies" n={7} title="What about other tracking technologies, like web beacons?">
        <p>Cookies are not the only way to recognize or track visitors to a website. We may use other, similar technologies from time to time, like web beacons (sometimes called &ldquo;tracking pixels&rdquo; or &ldquo;clear gifs&rdquo;). These are tiny graphics files that contain a unique identifier that enable us to recognize when someone has visited our Websites or opened an e-mail including them.</p>
        <p>This allows us, for example, to monitor the traffic patterns of users from one page within a website to another, to deliver or communicate with cookies, to understand whether you have come to the website from an online advertisement displayed on a third-party website, to improve site performance, and to measure the success of e-mail marketing campaigns. In many instances, these technologies are reliant on cookies to function properly, and so declining cookies will impair their functioning.</p>
      </LegalSection>

      <LegalSection id="flash-cookies" n={8} title="Do you use Flash cookies or Local Shared Objects?">
        <p>Websites may also use so-called &ldquo;Flash Cookies&rdquo; (also known as Local Shared Objects or &ldquo;LSOs&rdquo;) to, among other things, collect and store information about your use of our services, fraud prevention and for other site operations.</p>
        <p>If you do not want Flash Cookies stored on your computer, you can adjust the settings of your Flash player to block Flash Cookies storage using the tools contained in the Website Storage Settings Panel. You can also control Flash Cookies by going to the Global Storage Settings Panel and following the instructions.</p>
        <p>Please note that setting the Flash Player to restrict or limit acceptance of Flash Cookies may reduce or impede the functionality of some Flash applications, including, potentially, Flash applications used in connection with our services or online content.</p>
      </LegalSection>

      <LegalSection id="targeted-advertising" n={9} title="Do you serve targeted advertising?">
        <p>Third parties may serve cookies on your computer or mobile device to serve advertising through our Websites. These companies may use information about your visits to this and other websites in order to provide relevant advertisements about goods and services that you may be interested in.</p>
        <p>They may also employ technology that is used to measure the effectiveness of advertisements. This can be accomplished by them using cookies or web beacons to collect information about your visits to this and other sites in order to provide relevant advertisements about goods and services of potential interest to you. The information collected through this process does not enable us or them to identify your name, contact details or other details that directly identify you unless you choose to provide these.</p>
      </LegalSection>

      <LegalSection id="policy-updates" n={10} title="How often will you update this Cookie Policy?">
        <p>We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies. The date at the top of this Cookie Policy indicates when it was last updated.</p>
      </LegalSection>

      <LegalSection id="further-information" n={11} title="Where can I get further information?">
        <p>If you have any questions about our use of cookies or other technologies, please email us at <a href="mailto:esther.fair@eternal-fitness.co.uk">esther.fair@eternal-fitness.co.uk</a> or call us on <a href="tel:+4407517658128">(+44) 07517 658128</a>.</p>
        <LegalNote eyebrow="Related">
          How we handle the personal information behind these cookies — including your rights over it — is set out in our <a href="/privacy-policy">Privacy Policy</a>.
        </LegalNote>
      </LegalSection>
    </LegalDocLayout>
  );
}
