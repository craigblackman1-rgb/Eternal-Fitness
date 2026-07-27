import Image from "next/image";
import { CtaButton } from "./CtaButton";
import type { CTA } from "./types";

interface CTABandProps {
  image: string;
  imageAlt?: string;
  imagePosition?: string;
  heading: string;
  body: string;
  primaryCta: CTA;
  secondaryCta?: CTA;
}

/**
 * Closing call-to-action band: background image + teal gradient overlay,
 * serif heading, dual buttons. Mirrors the homepage #cta and standardises
 * the closing CTA across every page.
 *
 * The band is a wide, short strip (fixed min-height, full viewport width), so on
 * wide screens object-fit:cover crops much more off the top/bottom than the sides.
 * `imagePosition` lets a page bias the crop toward wherever its subject actually
 * sits in the source photo — pass e.g. "center 20%" for a portrait shot where the
 * person's head is in the upper third, so wide viewports don't crop into their face.
 */
export function CTABand({ image, imageAlt, imagePosition, heading, body, primaryCta, secondaryCta }: CTABandProps) {
  return (
    <section className="ds-cta">
      <div className="ds-cta-bg">
        <Image src={image} alt={imageAlt ?? ""} fill sizes="100vw" style={{ objectFit: "cover", objectPosition: imagePosition ?? "center" }} />
      </div>
      <div className="ds-cta-inner">
        <h2>{heading}</h2>
        <p>{body}</p>
        <div className="ds-cta-btns">
          <CtaButton cta={{ ...primaryCta, variant: primaryCta.variant ?? "white" }} />
          {secondaryCta && <CtaButton cta={{ ...secondaryCta, variant: secondaryCta.variant ?? "ghost-white" }} />}
        </div>
      </div>
    </section>
  );
}

export default CTABand;
