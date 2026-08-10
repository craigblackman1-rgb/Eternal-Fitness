import type { Metadata } from "next";
import PersonalTrainingClient from "./PersonalTrainingClient";

const ptSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://eternal-fitness.co.uk/personal-training/#service",
  "name": "Personal Training in Worthing",
  "description": "Private, one-to-one personal training in Worthing. Also trained to adapt for health conditions, disability, injury recovery, and GP referrals.",
  "url": "https://eternal-fitness.co.uk/personal-training",
  "provider": { "@type": "LocalBusiness", "name": "Eternal Fitness", "@id": "https://eternal-fitness.co.uk/#business" },
  "areaServed": { "@type": "City", "name": "Worthing" },
  "serviceType": "Personal Training",
  "audience": { "@type": "Audience", "audienceType": "Adults seeking private one-to-one personal training, including those with health conditions, disabilities, injuries, or complex needs" },
  "hasOfferCatalog": {
    "@type": "OfferCatalog", "name": "Personal Training Sessions",
    "itemListElement": [
      { "@type": "Offer", "name": "Block of 12", "price": "480", "priceCurrency": "GBP" },
      { "@type": "Offer", "name": "Block of 24", "price": "840", "priceCurrency": "GBP" }
    ]
  }
};

export const metadata: Metadata = {
  title: "Personal Training in Worthing",
  description: "Private, one-to-one personal training in Worthing. Strength, mobility, and a plan that adapts to how you actually feel — with the training to adapt further if you need it.",
  alternates: { canonical: "https://eternal-fitness.co.uk/personal-training" },
};

export default function PersonalTrainingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ptSchema) }} />
      <PersonalTrainingClient />
    </>
  );
}
