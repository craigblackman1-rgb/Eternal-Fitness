import type { Metadata } from "next";
import CancerRehabClient from "./CancerRehabClient";

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://eternal-fitness.co.uk/cancer-rehabilitation/#service",
  "name": "Cancer Rehabilitation Personal Training Worthing",
  "description": "Specialist personal training for cancer rehabilitation in Worthing. Support during active treatment, in remission, and post-surgery. Level 4 qualified Cancer Rehabilitation Specialist.",
  "url": "https://eternal-fitness.co.uk/cancer-rehabilitation",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Eternal Fitness",
    "@id": "https://eternal-fitness.co.uk/#business"
  },
  "areaServed": { "@type": "City", "name": "Worthing" },
  "serviceType": "Cancer Rehabilitation Personal Training",
  "audience": {
    "@type": "Audience",
    "audienceType": "Cancer patients, survivors, and post-surgical clients seeking specialist exercise support"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is it safe to exercise during cancer treatment?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Evidence now strongly supports exercise during cancer treatment — at the right intensity and with the right guidance. Exercise during chemotherapy and radiotherapy is associated with reduced fatigue, better mood, improved immune function, and faster recovery. The key word is 'appropriate' — the programme must account for your specific treatment, side effects, and current capacity. I will always ask for GP or oncologist sign-off before beginning."
      }
    },
    {
      "@type": "Question",
      "name": "What is cancer-related fatigue and how does training account for it?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Cancer-related fatigue (CRF) is physiologically different from ordinary tiredness — it does not improve with rest in the same way, and it can be severe and unpredictable. I am trained to distinguish CRF from exercise-induced fatigue and to programme accordingly: shorter sessions, lower intensity, more rest, and a check-in at the start of every session to assess where you are that day."
      }
    },
    {
      "@type": "Question",
      "name": "When can I start exercising after cancer surgery?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "This depends entirely on the type of surgery, the site, and your recovery. Gentle movement (walking, breathing exercises) can often begin within days of surgery, but structured strength work requires medical clearance and a careful, staged return. I will work with the guidance of your surgical team and will not progress anything without appropriate sign-off."
      }
    },
    {
      "@type": "Question",
      "name": "Do you work with people in active treatment or only survivors?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Both. I work with people during active chemotherapy or radiotherapy, people who are in remission, and those who have completed treatment but are rebuilding strength and fitness. Each stage is different and requires a different approach — the programme is built around where you are right now, not where you used to be."
      }
    }
  ]
};

export const metadata: Metadata = {
  title: "Cancer Rehabilitation Training in Worthing",
  description: "Specialist cancer rehabilitation personal training in Worthing. Support during treatment, in remission, and post-surgery. Level 4 Cancer Rehabilitation Specialist.",
  alternates: { canonical: "https://eternal-fitness.co.uk/cancer-rehabilitation" },
};

export default function CancerRehabPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CancerRehabClient />
    </>
  );
}
