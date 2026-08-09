import { IconArrowUpRight } from "@/components/icons";
import { AnimateIn } from "@/components/AnimateIn";

const reviewSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://eternal-fitness.co.uk/#business",
  "name": "Eternal Fitness",
  "review": [
    {
      "@type": "Review",
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
      "author": { "@type": "Person", "name": "Mary C" },
      "reviewBody": "I was so nervous about starting, but from the first session Esther put me at ease. She listened, adapted everything to my condition, and I have never felt stronger or more confident in my own body."
    },
    {
      "@type": "Review",
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
      "author": { "@type": "Person", "name": "Angela M" },
      "reviewBody": "As someone who has dealt with chronic pain for years, I was sceptical that exercise could help. The personalised approach at Eternal Fitness has genuinely changed my quality of life. I cannot recommend it enough."
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "reviewCount": "26",
    "bestRating": "5"
  }
};

const testimonials = [
  {
    quote: "I was so nervous about starting, but from the first session Esther put me at ease. She listened, adapted everything to my condition, and I have never felt stronger or more confident in my own body.",
    name: "Mary C",
    detail: "Worthing",
    accentClass: "bg-rose",
    quoteColor: "text-rose/50",
  },
  {
    quote: "As someone who has dealt with chronic pain for years, I was sceptical that exercise could help. The personalised approach at Eternal Fitness has genuinely changed my quality of life. I cannot recommend it enough.",
    name: "Angela M",
    detail: "West Sussex",
    accentClass: "bg-teal",
    quoteColor: "text-teal/50",
  },
];

const TestimonialsSection = () => {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />

      <section className="py-24 md:py-32 px-6 md:px-12 bg-cream">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <AnimateIn className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 md:mb-16">
            <div>
              <p className="text-muted-foreground text-[11px] md:text-xs font-semibold uppercase tracking-[0.25em] mb-4">Client Stories</p>
              <h2 className="text-4xl md:text-5xl text-foreground leading-[1.1]">What Clients Say</h2>
            </div>
            <a
              href="/faqs"
              className="inline-flex items-center gap-2 border border-border text-muted-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-rose hover:text-white transition-colors w-fit"
            >
              Read the FAQs <IconArrowUpRight className="w-4 h-4" />
            </a>
          </AnimateIn>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {testimonials.map((t, idx) => (
              <AnimateIn
                key={t.name}
                delay={idx * 120}
                className={`py-10 ${idx === 0 ? "md:pr-14" : "md:pl-14"}`}
              >
                <div className={`text-5xl leading-none mb-6 ${t.quoteColor} font-serif`}>&ldquo;</div>
                <p className="text-foreground/85 text-xl md:text-2xl leading-relaxed mb-8 font-serif italic">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.accentClass} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.detail}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>

          {/* Closing line */}
          <div className="mt-14 pt-10 border-t border-border">
            <p className="text-muted-foreground/60 text-sm text-center uppercase tracking-widest">
              Progress looks different for everyone — strength, mobility, sleep, or simply feeling at home in your body
            </p>
          </div>

        </div>
      </section>
    </>
  );
};

export default TestimonialsSection;
