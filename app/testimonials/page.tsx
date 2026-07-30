import type { Metadata } from "next";
import TestimonialsPageClient from "./TestimonialsPageClient";

export const metadata: Metadata = {
  title: "Client Stories & Testimonials",
  description: "What it's actually like to train with Eternal Fitness in Worthing, in clients' own words — real reviews, no before-and-after claims.",
  alternates: { canonical: "https://eternal-fitness.co.uk/testimonials" },
};

export default function TestimonialsPage() {
  return <TestimonialsPageClient />;
}
