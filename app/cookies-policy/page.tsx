import type { Metadata } from "next";
import CookiesPolicyClient from "./CookiesPolicyClient";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Cookie Policy for Eternal Fitness. How we use cookies on the Eternal Fitness website and how to control them.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://eternal-fitness.co.uk/cookies-policy" },
};

export default function CookiesPolicyPage() {
  return <CookiesPolicyClient />;
}
