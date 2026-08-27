import type { Metadata } from "next";
import TestimonialsPageClient from "./TestimonialsPageClient";

// No numeric star rating exists anywhere on this site or in the testimonial
// data — these are text-only quotes, not a review-collection widget. An
// aggregateRating/ratingValue block was deliberately NOT added: fabricating a
// rating number for schema.org markup risks a Google manual action for review
// markup abuse. If a real rating source exists (e.g. Google Business Profile),
// wire it in from there instead of inventing one here.

// 2026-08-27: Review/reviewBody JSON-LD removed entirely per Craig's decision
// (CR-EF-006). Google's guidance disqualifies self-hosted reviews about your
// own business from Review/rating rich-result markup — the schema was dead code
// that risked a manual action. Visible testimonial content is untouched.

export const metadata: Metadata = {
  title: "Client Stories & Testimonials",
  description: "What it's actually like to train with Eternal Fitness in Worthing, in clients' own words — real reviews, no before-and-after claims.",
  alternates: { canonical: "https://eternal-fitness.co.uk/testimonials" },
};

export default function TestimonialsPage() {
  return <TestimonialsPageClient />;
}
