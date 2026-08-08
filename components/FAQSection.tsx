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
    question: "What happens if my health changes during a block?",
    answer: "If you experience a medical setback, injury, or flare-up, your sessions do not simply disappear. While blocks have fixed validity periods (120 or 240 days), I offer a medical suspension framework. We can safely hold your unused sessions on account and resume training the moment your body is ready.",
  },
  {
    question: "What is your session cancellation policy?",
    answer: "Sessions must be cancelled or rescheduled with at least 24 hours' notice. Sessions cancelled with less than 24 hours' notice are forfeited. If you are running late for a session, the appointment will still end at its scheduled time to protect the next client's booking slot.",
  },
  {
    question: "Do you offer flexible or rolling packages?",
    answer: "Yes. Alongside our fixed session blocks, we offer structured Rolling Monthly Contracts. These require a minimum initial term of 3 months (12 weeks) to establish real consistency, followed by a one-calendar-month written notice period if you ever choose to cancel.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="ef-section px-6 md:px-12 bg-background">
      <div className="max-w-[1320px] mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-start">
        <div>
          <div className="ef-eyebrow ef-eyebrow-rose mb-5">Questions</div>
          <h2 className="text-3xl md:text-4xl text-foreground ef-h2 mb-4">Before you book</h2>
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
