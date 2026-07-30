import type { Metadata } from "next";
import TermsPageClient from "./TermsPageClient";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for Eternal Fitness personal training services in Worthing. Bookings, cancellations, payments and studio rules.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://eternal-fitness.co.uk/terms" },
};

export default function TermsPage() {
  return <TermsPageClient />;
}
