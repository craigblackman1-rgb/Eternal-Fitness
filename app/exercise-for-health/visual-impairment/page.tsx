import type { Metadata } from "next";
import VisualImpairmentClient from "./VisualImpairmentClient";

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://eternal-fitness.co.uk/exercise-for-health/visual-impairment/#service",
  "name": "Personal Training for Partially Sighted People Worthing",
  "description": "Adapted personal training for people who are blind or partially sighted in Worthing. Specialist one-to-one sessions in a private studio. Sessions tailored for partially sighted clients.",
  "url": "https://eternal-fitness.co.uk/exercise-for-health/visual-impairment",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Eternal Fitness",
    "@id": "https://eternal-fitness.co.uk/#business"
  },
  "areaServed": { "@type": "City", "name": "Worthing" },
  "serviceType": "Adapted Personal Training for Partially Sighted People",
  "audience": {
    "@type": "Audience",
    "audienceType": "Partially sighted people and people who are blind seeking personal training"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can I do personal training if I am blind or partially sighted?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Personal training for partially sighted people (VIPs) is very achievable with the right approach. Sessions rely on clear verbal instruction, tactile guidance where appropriate, consistent equipment placement, and a stable, familiar environment. The private studio format at Eternal Fitness is ideal — there are no other people to navigate around, and the layout stays consistent so you can build confidence with the space."
      }
    },
    {
      "@type": "Question",
      "name": "How do you adapt sessions for partially sighted clients?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "I use clear, detailed verbal instruction rather than visual demonstration. Equipment is always placed in the same position so you know where to expect it. I use tactile guidance to help with movement positioning when that is welcome. And sessions are structured with extra time to build familiarity with movements and the environment. The goal is for you to feel confident and safe from the very first session."
      }
    },
    {
      "@type": "Question",
      "name": "Do you have experience working with partially sighted clients?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. I currently work with partially sighted clients including people engaged in showdown — a competitive sport for blind and partially sighted people. I have developed specific approaches for VIP training through direct experience and specialist research, and I am continuing to build knowledge in this area."
      }
    }
  ]
};

export const metadata: Metadata = {
  title: "Personal Training for Partially Sighted People",
  description: "Adapted personal training for blind and partially sighted people in Worthing. Private one-to-one sessions tailored for VIP clients. Book a free consultation.",
  alternates: { canonical: "https://eternal-fitness.co.uk/exercise-for-health/visual-impairment" },
};

export default function VisualImpairmentPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <VisualImpairmentClient />
    </>
  );
}
