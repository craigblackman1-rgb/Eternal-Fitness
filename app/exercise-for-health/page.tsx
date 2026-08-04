import type { Metadata } from "next";
import { getPageContentBlocks } from "@/lib/pageContent";
import ExerciseForHealthClient from "./ExerciseForHealthClient";

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://eternal-fitness.co.uk/exercise-for-health/#service",
  "name": "Exercise for Health Conditions — Personal Training Worthing",
  "description": "Specialist personal training in Worthing for people with health conditions including high blood pressure, type 2 diabetes, osteoporosis, COPD, and chronic illness. Level 4 qualified, exercise referral specialist.",
  "url": "https://eternal-fitness.co.uk/exercise-for-health",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Eternal Fitness",
    "@id": "https://eternal-fitness.co.uk/#business"
  },
  "areaServed": { "@type": "City", "name": "Worthing" },
  "serviceType": "Exercise for Health Conditions",
  "audience": {
    "@type": "Audience",
    "audienceType": "People with health conditions seeking GP-referred or self-referred personal training"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can I exercise if I have a health condition?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In most cases, yes — and the evidence strongly supports it. Exercise is clinically recommended for a wide range of conditions including high blood pressure, type 2 diabetes, osteoporosis, COPD, and chronic pain. The key is having a qualified specialist who understands your specific condition and can programme safely around it. As a Level 4 qualified Exercise Referral Specialist, I am trained to work with all of these."
      }
    },
    {
      "@type": "Question",
      "name": "Do I need a GP referral to train with you?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. A GP referral is welcome but not required. Many clients come independently with a health condition they want to manage or improve through exercise. I will ask about your medical history at your first session and may request that you check with your GP if there are any specific contraindications to address first."
      }
    },
    {
      "@type": "Question",
      "name": "What health conditions do you work with?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "I work with clients managing a wide range of conditions: high blood pressure, high cholesterol, type 2 diabetes, COPD, post-cardiac events, osteoporosis and bone health, chronic pain, fibromyalgia, ME/CFS, visual impairment, neurological conditions, and more. If your condition is not listed, please get in touch — the answer is almost always yes."
      }
    },
    {
      "@type": "Question",
      "name": "How is exercising with a health condition different from regular personal training?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The fundamentals of exercise are the same, but the approach must account for how your condition affects your body — including fatigue patterns, medications, contraindicated movements, and day-to-day variability. I'm qualified in Exercise Referral, so I programme around your condition rather than despite it."
      }
    }
  ]
};

export const metadata: Metadata = {
  title: "Exercise for Health Conditions in Worthing",
  description: "Specialist personal training in Worthing for health conditions. Level 4 qualified exercise referral specialist. High blood pressure, diabetes, bone health and more.",
  alternates: { canonical: "https://eternal-fitness.co.uk/exercise-for-health" },
};

export default async function ExerciseForHealthPage() {
  const content = await getPageContentBlocks("exercise-for-health");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ExerciseForHealthClient content={content} />
    </>
  );
}
