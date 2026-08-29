import Image from "next/image";
import { CtaButton } from "./CtaButton";
import type { CTA } from "./types";

interface CTABandProps {
  /** "split" — copy beside photo on solid ink ground; "overlay" (default) — legacy teal scrim */
  layout?: "overlay" | "split";
  image: string;
  imageAlt?: string;
  imagePosition?: string;
  heading: string;
  body: string;
  primaryCta: CTA;
  secondaryCta?: CTA;
  eyebrow?: string;
}

/**
 * Closing call-to-action band. Two layouts:
 *
 * **overlay** (default): Background image + teal gradient overlay, serif heading,
 * dual buttons. The legacy layout.
 *
 * **split** (EF-IMG-03): Copy sits beside the photograph on solid ink ground,
 * never on top of it via a teal scrim. The photograph gets only the studio grade
 * — no overlay. One box, one radius, one hairline. Opt-in only.
 *
 * The band is a wide, short strip (fixed min-height, full viewport width), so on
 * wide screens object-fit:cover crops much more off the top/bottom than the sides.
 * `imagePosition` lets a page bias the crop toward wherever its subject actually
 * sits in the source photo.
 */
export function CTABand({ layout = "overlay", image, imageAlt, imagePosition, heading, body, primaryCta, secondaryCta, eyebrow }: CTABandProps) {
  if (layout === "overlay") {
    return (
      <section className="ds-cta">
        <div className="ds-cta-bg">
          <Image src={image} alt={imageAlt ?? ""} fill sizes="100vw" style={{ objectFit: "cover", objectPosition: imagePosition ?? "center" }} />
        </div>
        <div className="ds-cta-inner">
          {eyebrow && <p className="ds-eyebrow ds-eyebrow-white">{eyebrow}</p>}
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

  // ── split layout (EF-IMG-03) ──
  return (
    <section className="ds-cta-split">
      <div className="ds-cta-split-grid">
        <div className="ds-cta-split-panel">
          {eyebrow && <p className="ds-eyebrow ds-eyebrow-white">{eyebrow}</p>}
          <h2>{heading}</h2>
          <p>{body}</p>
          <div className="ds-cta-btns">
            <CtaButton cta={{ ...primaryCta, variant: primaryCta.variant ?? "white" }} />
            {secondaryCta && <CtaButton cta={{ ...secondaryCta, variant: secondaryCta.variant ?? "ghost-white" }} />}
          </div>
        </div>
        <div className="ds-cta-split-photo">
          <Image
            src={image}
            alt={imageAlt ?? ""}
            fill
            sizes="(max-width: 760px) 100vw, 56vw"
            style={{
              objectFit: "cover",
              ["--cta-pos" as string]: imagePosition ?? "center",
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default CTABand;
