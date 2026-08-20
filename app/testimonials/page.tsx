import type { Metadata } from "next";
import TestimonialsPageClient from "./TestimonialsPageClient";

// No numeric star rating exists anywhere on this site or in the testimonial
// data — these are text-only quotes, not a review-collection widget. An
// aggregateRating/ratingValue block was deliberately NOT added: fabricating a
// rating number for schema.org markup risks a Google manual action for review
// markup abuse. If a real rating source exists (e.g. Google Business Profile),
// wire it in from there instead of inventing one here.
const testimonialsSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://eternal-fitness.co.uk/#business",
  "name": "Eternal Fitness",
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Amanda" },
      "reviewBody": "She helps me maintain a level of strength, mobility and fitness that I wouldn't have without her… she also adapts routines and exercises to my needs when necessary. I would highly recommend Esther to anyone, of any age and ability."
    },
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Stephanie" },
      "reviewBody": "I have been seeing Esther for several years now and my fitness has improved beyond what I could have thought possible. I have a medical condition that makes exercise painful sometimes but Esther works around this and provides alternative exercises. Can not recommend her highly enough."
    },
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Saffron" },
      "reviewBody": "She adjusts to her clients' restrictions and individual goals, listens always and creates bespoke plans for every situation."
    },
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Ellie" },
      "reviewBody": "I have always felt safe, challenged and supported when working with her."
    }
  ]
};

export const metadata: Metadata = {
  title: "Client Stories & Testimonials",
  description: "What it's actually like to train with Eternal Fitness in Worthing, in clients' own words — real reviews, no before-and-after claims.",
  alternates: { canonical: "https://eternal-fitness.co.uk/testimonials" },
};

export default function TestimonialsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(testimonialsSchema) }} />
      <TestimonialsPageClient />
    </>
  );
}
