"use client";

import { ProcessFlow, StatStrip } from "@/components/ds";

const processSteps = [
  {
    title: "Free Consultation",
    description:
      "A 30-minute conversation to understand your medical history, goals, and whether we are the right fit. No commitment.",
  },
  {
    title: "Initial Assessment",
    description:
      "Full functional movement screening and health review. I build your baseline and design a programme around your body that day.",
  },
  {
    title: "One-to-One Training",
    description:
      "Private sessions in my Worthing studio. Each session adapts to how you feel — fatigue, pain, and energy levels all factored in.",
  },
  {
    title: "Ongoing Support",
    description:
      "Progress reviews every 6–12 sessions. Programme evolves as your body changes. Same trainer, same studio, consistent care.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-warm">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 md:mb-20">
          <div>
            <p className="text-teal text-[11px] md:text-xs font-semibold uppercase tracking-[0.25em] mb-4">
              How It Works
            </p>
            <h2 className="text-4xl md:text-5xl text-foreground leading-[1.1]">
              From First Conversation to
              <br />
              Lasting Progress
            </h2>
          </div>
          <p className="text-muted-foreground font-body text-base max-w-sm md:pb-1">
            My process is simple by design. No friction, no guesswork, no
            hidden stages. You know exactly what happens at every step.
          </p>
        </div>

        {/* Process flow diagram */}
        <ProcessFlow steps={processSteps.map((s) => ({ title: s.title, body: s.description }))} />

        {/* Stats — dark credentials band */}
        <div className="mt-16 md:mt-20">
          <StatStrip
            background="ink"
            stats={[
              { value: "Level 4", label: "Cancer and Exercise Rehabilitation qualified — plus exercise referral" },
              { value: "1-to-1", label: "Private studio, no other clients, no gym floor. Every session is just us" },
              { value: "100%", label: "Of clients referred by their GP, consultant, or physio continue training long-term" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
