import type { Metadata } from "next";
import DiscoveryCallClient from "./DiscoveryCallClient";

export const metadata: Metadata = {
  title: "Book a free discovery call",
  description:
    "Tell Esther a little about yourself and pick a time that works — a free, no-obligation call to talk about what you want to achieve.",
  alternates: { canonical: "https://eternal-fitness.co.uk/discovery-call" },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://eternal-fitness.co.uk/#business",
  name: "Eternal Fitness",
  url: "https://eternal-fitness.co.uk",
  telephone: "+447517658128",
  email: "esther.fair@eternal-fitness.co.uk",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Worthing",
    addressRegion: "West Sussex",
    addressCountry: "GB",
  },
  areaServed: {
    "@type": "Place",
    name: "Worthing, West Sussex",
  },
};

export default function DiscoveryCallPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <DiscoveryCallClient />
    </>
  );
}
