import type { Metadata } from "next";
import FallsPreventionClient from "./FallsPreventionClient";

/**
 * Shell page — noindex until real content lands. Schema.org markup is
 * deliberately omitted for now: describing a service that isn't yet described
 * on the page would be structured-data spam, and the falls qualification is
 * not yet confirmed (see FallsPreventionClient for the full claims constraints).
 */
export const metadata: Metadata = {
  title: "Strength, Balance & Falls Prevention Training",
  description:
    "One-to-one strength and balance training for older adults in Worthing. Details coming soon — book a free, no-obligation consultation.",
  alternates: { canonical: "https://eternal-fitness.co.uk/falls-prevention" },
  robots: { index: false, follow: true },
};

export default function FallsPreventionPage() {
  return <FallsPreventionClient />;
}
