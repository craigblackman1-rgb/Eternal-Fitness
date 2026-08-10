import type { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "mainEntity": {
    "@type": "Person",
    "name": "Esther Fair",
    "jobTitle": "Personal Trainer",
    "description": "Personal trainer, qualified in Exercise Referral and Level 4 Cancer and Exercise Rehabilitation. Based in a private studio in Worthing, West Sussex.",
    "url": "https://eternal-fitness.co.uk/about",
    "worksFor": { "@type": "LocalBusiness", "name": "Eternal Fitness", "@id": "https://eternal-fitness.co.uk/#business" },
    "hasCredential": [
      { "@type": "EducationalOccupationalCredential", "name": "Personal Trainer" },
      { "@type": "EducationalOccupationalCredential", "name": "Exercise Referral Specialist" },
      { "@type": "EducationalOccupationalCredential", "name": "Level 4 Cancer and Exercise Rehabilitation" }
    ]
  }
};

export const metadata: Metadata = {
  title: "About Esther Fair",
  description: "Esther Fair — personal trainer in Worthing, qualified in Exercise Referral and Level 4 Cancer and Exercise Rehabilitation. Private one-to-one studio.",
  alternates: { canonical: "https://eternal-fitness.co.uk/about" },
};

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }} />
      <AboutPageClient />
    </>
  );
}
