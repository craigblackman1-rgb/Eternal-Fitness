import type { Metadata } from "next";
import PrivacyPolicyClient from "./PrivacyPolicyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Eternal Fitness, personal training in Worthing. How we collect, use and protect your personal data.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://eternal-fitness.co.uk/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
