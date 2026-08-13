import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://eternal-fitness.co.uk/#business",
  "name": "Eternal Fitness",
  "description": "Private one-to-one personal training in Worthing with Esther Fair, qualified in Cancer and Exercise Rehabilitation and Exercise Referral. Also trained to support health conditions, disability and complex needs.",
  "url": "https://eternal-fitness.co.uk",
  "telephone": "07517658128",
  "email": "esther.fair@eternal-fitness.co.uk",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Worthing",
    "addressRegion": "West Sussex",
    "postalCode": "BN11",
    "addressCountry": "GB"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "50.8179", "longitude": "-0.3721" },
  "areaServed": [
    { "@type": "City", "name": "Worthing" },
    { "@type": "City", "name": "Brighton" },
    { "@type": "City", "name": "Shoreham-by-Sea" },
    { "@type": "AdministrativeArea", "name": "West Sussex" }
  ],
  "priceRange": "££",
  "image": "https://eternal-fitness.co.uk/og-image.png",
  "sameAs": ["https://www.facebook.com/EternalFitnessPersonalTraining/", "https://instagram.com/eternalfitness/", "https://linkedin.com/in/esther-fair/", "https://youtube.com/eternalfitness/"],
  "founder": { "@type": "Person", "name": "Esther Fair", "jobTitle": "Personal Trainer" },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Personal Training Services",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Block of 12 Personal Training Sessions", "description": "12 x 60-minute one-to-one personal training sessions, in the studio or online, with programme review and adjustment." }, "price": "480", "priceCurrency": "GBP" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Block of 24 Personal Training Sessions", "description": "24 x 60-minute one-to-one personal training sessions, in the studio or online, with ongoing programme management and priority scheduling." }, "price": "840", "priceCurrency": "GBP" }
    ]
  }
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Esther Fair",
  "jobTitle": "Personal Trainer",
  "url": "https://eternal-fitness.co.uk/about",
  "telephone": "07517658128",
  "email": "esther.fair@eternal-fitness.co.uk",
  "worksFor": { "@type": "LocalBusiness", "name": "Eternal Fitness", "@id": "https://eternal-fitness.co.uk/#business" },
  "address": { "@type": "PostalAddress", "addressLocality": "Worthing", "addressRegion": "West Sussex", "addressCountry": "GB" },
  "knowsAbout": ["Personal Training", "Cancer Rehabilitation", "Exercise Referral", "Adaptive Fitness", "Chronic Health Conditions", "Disability Fitness", "Injury Recovery", "Strength Training", "Mobility Training"],
  "hasCredential": [
    { "@type": "EducationalOccupationalCredential", "name": "Personal Trainer" },
    { "@type": "EducationalOccupationalCredential", "name": "Exercise Referral Specialist" },
    { "@type": "EducationalOccupationalCredential", "name": "Level 4 Cancer and Exercise Rehabilitation" }
  ],
  "sameAs": ["https://www.facebook.com/EternalFitnessPersonalTraining/", "https://instagram.com/eternalfitness/", "https://linkedin.com/in/esther-fair/", "https://youtube.com/eternalfitness/"]
};

export const metadata: Metadata = {
  title: "Personal Trainer in Worthing | Eternal Fitness",
  description: "Private one-to-one personal training in Worthing. A plan that adapts to how you actually feel, every session — with the training to adapt further if your health ever changes.",
  alternates: { canonical: "https://eternal-fitness.co.uk/" },
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <HomePageClient />
    </>
  );
}
