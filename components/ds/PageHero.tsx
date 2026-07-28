import Image from "next/image";
import type { ReactNode } from "react";
import { CtaButton } from "./CtaButton";
import type { CTA } from "./types";

interface PageHeroProps {
  variant?: "overlay" | "split";
  image: string;
  imageAlt: string;
  eyebrow?: string;
  heading: ReactNode;
  subhead?: ReactNode;
  primaryCta?: CTA;
  secondaryCta?: CTA;
  /** floating badge, typically a <StatBadge /> — overlay variant only */
  badge?: ReactNode;
  /** content rendered after the divider, before the buttons — split variant only */
  belowLead?: ReactNode;
  /** glass card positioned bottom-left inside the media column — split variant only */
  mediaOverlay?: ReactNode;
}

/**
 * Premium inner-page hero. Two variants:
 *
 * - **overlay** (default): full-bleed image, dark gradient, eyebrow + serif H1,
 *   subhead, dual CTAs and an optional floating badge.
 * - **split**: two-column layout (55/45). Left: white bg, eyebrow, heading, lead,
 *   rose divider, optional belowLead content, CTAs. Right: full-bleed image with
 *   subtle top/bottom gradient, optional mediaOverlay glass card.
 */
export function PageHero({
  variant = "overlay",
  image,
  imageAlt,
  eyebrow,
  heading,
  subhead,
  primaryCta,
  secondaryCta,
  badge,
  belowLead,
  mediaOverlay,
}: PageHeroProps) {
  if (variant === "split") {
    return (
      <section className="ds-hero-split">
        <div className="ds-hero-split-copy">
          {eyebrow && <p className="ds-eyebrow ds-eyebrow-rose">{eyebrow}</p>}
          <h1>{heading}</h1>
          {subhead && <p className="ds-hero-split-lead">{subhead}</p>}
          {subhead && <div className="ds-hero-split-rule" aria-hidden="true" />}
          {belowLead && <div className="ds-hero-split-quote">{belowLead}</div>}
          {(primaryCta || secondaryCta) && (
            <div className="ds-hero-split-btns">
              {primaryCta && <CtaButton cta={{ ...primaryCta, variant: primaryCta.variant ?? "primary" }} />}
              {secondaryCta && <CtaButton cta={{ ...secondaryCta, variant: secondaryCta.variant ?? "outline" }} />}
            </div>
          )}
        </div>
        <div className="ds-hero-split-media">
          <Image src={image} alt={imageAlt} fill priority sizes="(max-width: 1000px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          {mediaOverlay && <div className="ds-hero-split-media-card">{mediaOverlay}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="ds-hero">
      <div className="ds-hero-bg">
        <Image src={image} alt={imageAlt} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
      </div>
      <div className="ds-hero-inner">
        <div className="ds-hero-content">
          {eyebrow && <p className="ds-eyebrow ds-eyebrow-white">{eyebrow}</p>}
          <h1>{heading}</h1>
          {subhead && <p className="ds-hero-sub">{subhead}</p>}
          {(primaryCta || secondaryCta) && (
            <div className="ds-hero-btns">
              {primaryCta && <CtaButton cta={{ ...primaryCta, variant: primaryCta.variant ?? "primary" }} />}
              {secondaryCta && <CtaButton cta={{ ...secondaryCta, variant: secondaryCta.variant ?? "ghost-white" }} />}
            </div>
          )}
        </div>
      </div>
      {badge && <div className="ds-hero-badge">{badge}</div>}
    </section>
  );
}

export default PageHero;
