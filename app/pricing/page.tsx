import type { Metadata } from "next";
import { getPageContentBlocks } from "@/lib/pageContent";
import PricingPageClient from "./PricingPageClient";

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Personal Training Pricing — Eternal Fitness Worthing",
  "url": "https://eternal-fitness.co.uk/pricing",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Product",
        "name": "Block of 12 Personal Training Sessions",
        "description": "12 x 60-minute one-to-one personal training sessions, in the studio or online, with programme review and adjustment included.",
        "brand": { "@type": "Brand", "name": "Eternal Fitness" },
        "offers": {
          "@type": "Offer",
          "price": "480",
          "priceCurrency": "GBP",
          "availability": "https://schema.org/InStock",
          "seller": { "@type": "LocalBusiness", "name": "Eternal Fitness", "@id": "https://eternal-fitness.co.uk/#business" }
        }
      }
    },
    {
      "@type": "ListItem",
      "position": 2,
      "item": {
        "@type": "Product",
        "name": "Block of 24 Personal Training Sessions",
        "description": "24 x 60-minute one-to-one personal training sessions, in the studio or online, with ongoing programme management and priority scheduling. Save £5 per session vs. Block of 12.",
        "brand": { "@type": "Brand", "name": "Eternal Fitness" },
        "offers": {
          "@type": "Offer",
          "price": "840",
          "priceCurrency": "GBP",
          "availability": "https://schema.org/InStock",
          "seller": { "@type": "LocalBusiness", "name": "Eternal Fitness", "@id": "https://eternal-fitness.co.uk/#business" }
        }
      }
    }
  ]
};

export const metadata: Metadata = {
  title: "Personal Training Prices in Worthing | Eternal Fitness",
  description: "Personal training pricing in Worthing — blocks of 12 or 24 one-to-one sessions, in the studio or online. Free consultation to start.",
  alternates: { canonical: "https://eternal-fitness.co.uk/pricing" },
};

export default async function PricingPage() {
  const content = await getPageContentBlocks("pricing");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }} />
      <PricingPageClient content={content} />
    </>
  );
}
