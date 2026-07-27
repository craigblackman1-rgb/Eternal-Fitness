import { IconArrowUpRight } from "@/components/icons";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Do I need to be fit or healthy to start?",
    answer: "No. Most clients haven't exercised in a while, or don't think of themselves as \"gym people.\" You do not need any experience — the only starting point is where you are right now.",
  },
  {
    question: "Is this suitable if I have an injury or medical condition?",
    answer: "Almost certainly yes. Esther is qualified in exercise referral and cancer rehabilitation, specifically trained to work with people who have clinical health conditions. Every programme is adapted to what your body can manage and adjusted as your health changes.",
  },
  {
    question: "How often should I train?",
    answer: "For most clients, two sessions per week is a good starting point. For those managing health conditions or recovering from illness, one session per week may be more appropriate initially. Esther will recommend a frequency that is sustainable and effective for your specific situation.",
  },
  {
    question: "Do you offer flexible packages?",
    answer: "Sessions are booked in blocks of 12 (£480) or 24 (£840), in the studio or online. Every new client starts with a free 30-minute consultation — no commitment required.",
  },
  {
    question: "Where is the studio located?",
    answer: "Sessions take place in a private studio in Worthing, West Sussex — used exclusively for one-to-one training. No public gym floor, no other clients. The full address is confirmed at the point of booking.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="ef-section px-6 md:px-12 bg-background">
      <div className="max-w-[1320px] mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-start">
        <div>
          <div className="ef-eyebrow ef-eyebrow-rose mb-5">Questions</div>
          <h2 className="text-3xl md:text-4xl text-foreground ef-h2 mb-4">Common questions</h2>
          <p className="ef-body text-lg mb-8">
            Here are the questions I get asked most often. For the full list, visit the FAQs page.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/faqs" className="ef-btn ef-btn-dark">
              All FAQs <IconArrowUpRight className="w-4 h-4" />
            </Link>
            <Link href="/contact" className="ef-btn ef-btn-outline">
              Ask a Question
            </Link>
          </div>
        </div>

        <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-muted">
              <AccordionTrigger className="font-body text-foreground text-left text-base py-5 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="ef-body text-base pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
