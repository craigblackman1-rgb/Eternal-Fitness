import type { Metadata } from "next";
import CalorieCalculatorPageClient from "./CalorieCalculatorPageClient";

export const metadata: Metadata = {
  title: "Calorie Calculator | Eternal Fitness",
  description:
    "Work out roughly how many calories you need each day \u2014 with plain-English activity levels, targets for losing, maintaining or building back up, and an honest note on what the number can and cannot tell you.",
  alternates: { canonical: "https://eternal-fitness.co.uk/calorie-calculator" },
};

export default function CalorieCalculatorPage() {
  return <CalorieCalculatorPageClient />;
}
