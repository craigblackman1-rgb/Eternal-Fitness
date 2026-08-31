"use client";

import { CTABand } from "@/components/ds";
import { BOOKINGS_URL } from "@/lib/booking";

/**
 * Thin wrapper kept for backwards-compatible imports (Blog pages).
 * Renders the shared CTABand so the closing CTA matches the rest of the site.
 */
const CTASection = () => {
  return (
    <CTABand
      image="/images/studio-1.jpg"
      imageAlt="Esther standing at the kettlebell shelves in the private Worthing studio with a hand resting on the bells, smiling towards the camera, the mirror, whiteboard and adjustable bench along the wall behind her."
      heading="Ready to find out if this is right for you?"
      body="The first conversation is free, there is no commitment, and there is no such thing as the wrong question. I work with a small number of clients at any one time — so every person gets my full attention."
      primaryCta={{ label: "Book a Free Consultation", href: BOOKINGS_URL }}
      secondaryCta={{ label: "Give Me a Call", href: "tel:07517658128", variant: "ghost-white" }}
      imageDescription={"Esther stands at the kettlebell shelves with a hand resting on the bells along the top row, turned back towards the camera. The bells sit in weight order, the lighter ones marked with coloured bands. Along the wall behind her are the mirror, the whiteboard, the suspension straps and the adjustable bench, each in its own fixed place; the floor between them is clear."}
    />
  );
};

export default CTASection;
