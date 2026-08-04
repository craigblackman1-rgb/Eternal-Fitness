import type { Metadata } from "next";
import HighBloodPressureClient from "./HighBloodPressureClient";

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://eternal-fitness.co.uk/exercise-for-health/high-blood-pressure/#service",
  "name": "Exercise for High Blood Pressure Worthing",
  "description": "Personal training for high blood pressure in Worthing with an Exercise Referral Specialist. Safe, monitored exercise for hypertension management.",
  "url": "https://eternal-fitness.co.uk/exercise-for-health/high-blood-pressure",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Eternal Fitness",
    "@id": "https://eternal-fitness.co.uk/#business"
  },
  "areaServed": { "@type": "City", "name": "Worthing" },
  "serviceType": "Exercise for High Blood Pressure",
  "audience": {
    "@type": "Audience",
    "audienceType": "People managing high blood pressure who want to exercise safely"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is exercise safe if I have high blood pressure?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — in most cases, exercise is both safe and clinically recommended for managing high blood pressure. The key is having a qualified specialist who understands when it is safe to exercise, how to monitor your response, and what to avoid. I'm qualified in Exercise Referral, trained to programme safely for hypertension, including contraindicated movements and intensity management."
      }
    },
    {
      "@type": "Question",
      "name": "What kind of exercise helps lower blood pressure?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Both aerobic exercise and resistance training have been shown to lower blood pressure. Moderate-intensity steady-state cardio, circuit-style resistance work, and controlled rhythmic movements all contribute. I programme a balanced approach that combines these elements while monitoring your response throughout every session."
      }
    },
    {
      "@type": "Question",
      "name": "Do I need a GP referral to train with you?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. A GP referral is welcome but not required. Many clients come independently with a hypertension diagnosis they want to manage through exercise. I will ask about your medical history, current medications, and any contraindications at your first session. If there are specific concerns, I may recommend checking with your GP before we start."
      }
    },
    {
      "@type": "Question",
      "name": "How do you monitor my blood pressure during sessions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "I take your blood pressure before every session to establish a baseline. During exercise I use a combination of heart rate monitoring and Rate of Perceived Exertion (RPE) — how hard you feel you are working on a scale — rather than relying solely on heart rate, because some blood pressure medications can alter your heart rate response."
      }
    }
  ]
};

export const metadata: Metadata = {
  title: "Exercise for High Blood Pressure, Worthing",
  description: "Safe, specialist personal training for high blood pressure in Worthing with an Exercise Referral Specialist. Monitored sessions tailored to your condition.",
  alternates: { canonical: "https://eternal-fitness.co.uk/exercise-for-health/high-blood-pressure" },
};

export default function HighBloodPressurePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <HighBloodPressureClient />
    </>
  );
}
