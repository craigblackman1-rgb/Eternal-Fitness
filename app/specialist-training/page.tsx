import type { Metadata } from "next";
import { getPageContentBlocks } from "@/lib/pageContent";
import SpecialistTrainingClient from "./SpecialistTrainingClient";

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://eternal-fitness.co.uk/specialist-training/#service",
  "name": "Specialist Personal Training — Worthing",
  "description":
    "Specialist one-to-one personal training in Worthing for blind and partially sighted people, people during and after cancer treatment, and older adults working on strength and balance. Exercise Referral qualified, with the Level 4 Cancer and Exercise Rehabilitation qualification.",
  "url": "https://eternal-fitness.co.uk/specialist-training",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Eternal Fitness",
    "@id": "https://eternal-fitness.co.uk/#business",
  },
  "areaServed": { "@type": "City", "name": "Worthing" },
  "serviceType": "Specialist Personal Training",
  "audience": {
    "@type": "Audience",
    "audienceType":
      "Blind and partially sighted people, people during and after cancer treatment, and older adults working on strength and balance",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do I need a GP referral to train with you?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. A GP referral is welcome but not required. Esther will ask about your medical history at your first session, and for some circumstances may ask you to check with your GP or specialist team before starting.",
      },
    },
    {
      "@type": "Question",
      "name": "How is specialist training different from a regular personal trainer?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Esther is qualified in Exercise Referral and holds the Level 4 Cancer and Exercise Rehabilitation qualification. That means understanding contraindicated movements, medication effects, fatigue management, and how capacity can change from one session to the next.",
      },
    },
    {
      "@type": "Question",
      "name": "What areas does Eternal Fitness specialise in?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Three areas: personal training for blind and partially sighted people; cancer rehabilitation during treatment, after surgery and into remission; and strength and balance training for older adults. Sessions are one-to-one in a private studio in Worthing.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "Specialist Personal Training in Worthing",
  description:
    "Specialist one-to-one personal training in Worthing for blind and partially sighted people, cancer rehabilitation, and strength and balance for older adults.",
  alternates: { canonical: "https://eternal-fitness.co.uk/specialist-training" },
};

export default async function SpecialistTrainingPage() {
  const content = await getPageContentBlocks("specialist-training");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SpecialistTrainingClient content={content} />
    </>
  );
}
