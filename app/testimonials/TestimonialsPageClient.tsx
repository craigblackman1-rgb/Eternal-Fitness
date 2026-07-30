"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConsultationDialog from "@/components/ConsultationDialog";
import { useConsultationDialog } from "@/hooks/useConsultationDialog";
import { Section, SectionHeading, PageHero, CTABand, Reveal, Eyebrow } from "@/components/ds";
import { IconRefreshCw, IconListenAdapt, IconClock, IconShieldCheck, IconChevronDown } from "@/components/icons";

const themeCards = [
  {
    title: "Adapting, not pausing",
    body: "When something changes — energy, pain, a new restriction — the exercise changes with it. The session still happens.",
    icon: IconRefreshCw,
    accent: "rose" as const,
    source: "Mentioned by Amanda M and Saffron S",
  },
  {
    title: "Listening first",
    body: "Every session opens with a check-in — sleep, energy, what's changed since last week. The plan for the day is set from that answer.",
    icon: IconListenAdapt,
    accent: "teal" as const,
    source: "Mentioned by Saffron S",
  },
  {
    title: "Measured in years",
    body: "Clients here tend to stay. Five and seven years of continuous training is the pattern, not the exception.",
    icon: IconClock,
    accent: "rose" as const,
    source: "Mentioned by Amanda M and Colin F",
  },
];

const caseStudySlots = [
  {
    focus: "Training that lasted years",
    desc: "A long-term client, from a first tentative consultation to training that has simply become part of the week.",
  },
  {
    focus: "Training through treatment",
    desc: "Keeping strength and mobility going during and after cancer treatment, with the load adjusted around how each week actually went.",
  },
  {
    focus: "Adapting after a diagnosis",
    desc: "What changes in a programme when the health picture shifts mid-way — and what stays exactly the same.",
  },
];

const caseStudyFields = ["Starting point", "What we changed", "Where they are now", "How long it took"];

export default function TestimonialsPageClient() {
  const { open, setOpen, openDialog } = useConsultationDialog();
  const bookCta = { label: "Book a Free Consultation", onClick: openDialog, arrow: true };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onBookConsultation={openDialog} />

      <PageHero
        image="/images/coaching-plank-client.jpg"
        imageAlt="Esther Fair coaching a client through floor work in her private Worthing studio"
        imageObjectPosition="50% 40%"
        eyebrow="Client Stories"
        heading={<>In their <em>own words</em></>}
        subhead="What it's actually like to train here, from the people who do it."
        belowLead="No before-and-after photos and no transformation claims — just what clients have said about the training, in their own wording. Longer case studies are in preparation."
        belowLeadVariant="plain"
        primaryCta={bookCta}
        secondaryCta={{ label: "Read the reviews", href: "#reviews", variant: "outline" }}
      />

      {/* Reviews */}
      <Section background="white" id="reviews">
        <SectionHeading
          eyebrow="Client Reviews"
          heading="What clients say"
          intro="Every quote below was written by a client. Nothing has been re-worded, and names appear as the client left them."
        />

        <Reveal y={44} style={{ marginTop: 44 }}>
          <figure className="ds-quote-card">
            <div className="ds-quote-card-mark" aria-hidden="true">&ldquo;</div>
            <p className="ds-quote-card-body">
              She helps me maintain a level of strength, mobility and fitness that I wouldn&apos;t have without her&hellip; she also adapts routines and exercises to my needs when necessary. I would highly recommend Esther to anyone, of any age and ability.
            </p>
            <figcaption className="ds-quote-card-by">
              <span className="ds-quote-card-av" aria-hidden="true">A</span>
              <span>
                <span className="ds-quote-card-name" style={{ display: "block" }}>Amanda M</span>
                <span className="ds-quote-card-meta" style={{ display: "block" }}>Training 5 years</span>
              </span>
            </figcaption>
          </figure>
        </Reveal>

        <Reveal className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border mt-10" stagger={0.12} y={40}>
          <div className="py-8 md:pr-12">
            <div className="text-5xl leading-none mb-5 text-rose/50 font-serif">&ldquo;</div>
            <p className="text-foreground/85 text-lg leading-relaxed mb-6 font-serif italic">
              Esther has really helped me wonderfully over the past 7 years with my fitness and flexibility.
            </p>
            <div className="flex items-center gap-3 pt-5 border-t border-border">
              <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-white text-sm font-bold shrink-0">C</div>
              <div>
                <p className="text-foreground font-semibold text-sm">Colin F</p>
                <p className="text-muted-foreground text-xs">Training 7 years</p>
              </div>
            </div>
          </div>
          <div className="py-8 md:pl-12">
            <div className="text-5xl leading-none mb-5 text-teal/50 font-serif">&ldquo;</div>
            <p className="text-foreground/85 text-lg leading-relaxed mb-6 font-serif italic">
              She adjusts to her clients&apos; restrictions and individual goals, listens always and creates bespoke plans for every situation.
            </p>
            <div className="flex items-center gap-3 pt-5 border-t border-border">
              <div className="w-10 h-10 rounded-full bg-rose flex items-center justify-center text-white text-sm font-bold shrink-0">S</div>
              <div>
                <p className="text-foreground font-semibold text-sm">Saffron S</p>
                <p className="text-muted-foreground text-xs">Client</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal y={24} className="flex items-start gap-2.5 mt-10 text-muted-foreground text-sm leading-relaxed max-w-2xl">
          <span className="w-[5px] h-[5px] rounded-full bg-rose shrink-0 mt-2" aria-hidden="true" />
          Three reviews are published here. More are only added once the client has confirmed, in writing, that they&apos;re happy to be quoted — which is why this page grows slowly.
        </Reveal>

        <Reveal y={24} className="mt-8">
          <a href="/contact" className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 rounded-full font-medium hover:bg-rose hover:text-white hover:border-rose transition-colors">
            Trained with me? Share your experience
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </Reveal>
      </Section>

      {/* Themes */}
      <Section background="cream" id="themes">
        <SectionHeading
          eyebrow="Common Threads"
          eyebrowColor="teal"
          heading="What people tend to mention"
          intro="Read the reviews together and the same three things come up. They're a fair description of how sessions actually run."
        />
        <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-5" stagger={0.12} y={40} style={{ marginTop: 44 }}>
          {themeCards.map((c) => (
            <div key={c.title} className="ds-card">
              <div className={`ds-card-ic ds-card-ic-${c.accent}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <h4 className="ds-card-title">{c.title}</h4>
              <p className="ds-card-body">{c.body}</p>
              <p className="text-muted-foreground/60 text-xs mt-4 pt-4 border-t border-border">{c.source}</p>
            </div>
          ))}
        </Reveal>
      </Section>

      {/* What gets measured (dark band) */}
      <Section background="ink" id="measure">
        <div className="ds-split">
          <Reveal y={24}>
            <Eyebrow color="white">How Progress Is Judged</Eyebrow>
            <p className="text-white text-xl md:text-2xl font-serif leading-snug mb-5 mt-4">
              There are no weigh-ins here, and no before-and-after photos. Progress gets measured against where you started, not against anybody else.
            </p>
            <p className="text-white/70 text-sm leading-relaxed max-w-[56ch]">
              That makes for quieter stories than most fitness marketing. It also makes them true — the things clients notice first are rarely the things a scale would show.
            </p>
          </Reveal>
          <Reveal y={40}>
            <p className="text-white font-semibold text-sm mb-3">What clients actually notice</p>
            <ul className="space-y-2.5">
              {[
                "Climbing stairs with less effort",
                "Sleeping better",
                "Walking further before needing to stop",
                "Getting up off the floor without planning it",
                "Confidence and independence, week to week",
                "Still training when their health picture changes",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-white/80 text-sm">
                  <span className="w-[5px] h-[5px] rounded-full bg-rose shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* Case studies (scaffold — no client data published yet) */}
      <Section background="white" id="case-studies">
        <SectionHeading
          eyebrow="Case Studies"
          heading="Longer stories, in preparation"
          intro="A review is a sentence. A case study is the whole arc — where somebody started, what we changed along the way, and what training looks like for them now. Three are being written with clients at the moment. Each will follow the same four-part structure."
        />
        <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-5" stagger={0.12} y={40} style={{ marginTop: 44 }}>
          {caseStudySlots.map((c) => (
            <details key={c.focus} className="group rounded-2xl border border-dashed border-border p-7 flex flex-col">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground bg-cream rounded-full px-3 py-1.5 w-fit mb-4">
                <span className="w-[5px] h-[5px] rounded-full bg-muted-foreground shrink-0" aria-hidden="true" />
                In preparation
              </div>
              <div className="text-foreground font-semibold text-[17px] leading-snug mb-2">{c.focus}</div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{c.desc}</p>
              <summary className="mt-auto pt-3.5 border-t border-border flex items-center justify-between gap-3 text-sm font-semibold text-foreground cursor-pointer list-none">
                What this will cover
                <IconChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-4 space-y-3.5">
                {caseStudyFields.map((f) => (
                  <li key={f}>
                    <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">{f}</span>
                    <span className="block h-2 rounded-full bg-cream w-full" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </Reveal>

        <Reveal y={24} className="mt-10 rounded-2xl bg-cream border border-border px-7 py-6 flex flex-wrap items-center gap-6">
          <div className="w-11 h-11 rounded-full bg-teal/15 text-teal flex items-center justify-center shrink-0">
            <IconShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <p className="font-serif text-lg text-foreground mb-1.5">Written consent, every time</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nothing about a client is published without them reading it first and agreeing to it in writing. Health details are only included if the client asks for them to be, names can be shortened or changed, and no case study will ever carry a before-and-after photo.
            </p>
          </div>
          <a href="/contact" className="inline-flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white transition-colors w-fit">
            Ask about taking part
          </a>
        </Reveal>
      </Section>

      <CTABand
        image="/images/studio-lunge-pair.jpg"
        eyebrow="Free Consultation"
        heading="The first conversation is free, with no commitment."
        body="I work with a small number of clients at a time — so every person gets my full attention."
        primaryCta={{ label: "Book a Free Consultation", onClick: openDialog }}
        secondaryCta={{ label: "Call: 07517 658 128", href: "tel:07517658128", variant: "ghost-white" }}
      />

      <Footer />
      <ConsultationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
