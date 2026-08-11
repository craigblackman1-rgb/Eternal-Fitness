import type { Metadata } from "next";
import VisualImpairmentClient from "./VisualImpairmentClient";

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://eternal-fitness.co.uk/visual-impairment/#service",
  "name": "VI-Inclusive Personal Training Worthing",
  "description": "Accessible, one-to-one strength and movement coaching for blind and partially sighted people in a private Worthing studio. Trained with British Blind Sport — a predictable space, clear verbal cues, and a plan built around your baseline.",
  "url": "https://eternal-fitness.co.uk/visual-impairment",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Eternal Fitness",
    "@id": "https://eternal-fitness.co.uk/#business"
  },
  "areaServed": { "@type": "City", "name": "Worthing" },
  "serviceType": "VI-Inclusive Personal Training",
  "audience": {
    "@type": "Audience",
    "audienceType": "Blind and partially sighted people seeking personal training"
  }
};

// Mirrors the on-page Access & Location accordion — keep the two in sync.
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I navigate into the studio?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "I never presume to know what help you want — I will always ask. If you prefer to have a sighted guide, I can meet you outside or act as a guide on the walk into the studio."
      }
    },
    {
      "@type": "Question",
      "name": "Is there public transport or parking nearby?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The studio is located exceptionally close to main local bus stop routes, making travel straightforward. If you are arriving by car or being dropped off, free on-street parking is available nearby. Please note that the direct access road is uneven, but you can be dropped off directly at the main gate."
      }
    },
    {
      "@type": "Question",
      "name": "Are guide dogs welcome?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Absolutely, without reservation. If you travel with a guide dog, they are incredibly welcome to rest safely in the private studio during your session. If you prefer to have a support person or family member sit in on your sessions, the space is entirely yours."
      }
    },
    {
      "@type": "Question",
      "name": "Do I need specialist kit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. If you truly focus on muscle contractions and listen to the teaching cues, you do not need heavy weights or complex machinery. We use highly effective resistance bands, mobility tools, and free weights to build lasting, real-world strength."
      }
    }
  ]
};

export const metadata: Metadata = {
  title: "VI-Inclusive Personal Training in Worthing",
  description: "Accessible, one-to-one strength and movement coaching in a private Worthing studio. Trained with British Blind Sport — a predictable space, clear verbal cues, and a plan built around your baseline.",
  alternates: { canonical: "https://eternal-fitness.co.uk/visual-impairment" },
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
