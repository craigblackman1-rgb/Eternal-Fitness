import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { CtaButton } from "./CtaButton";
import type { CTA } from "./types";

interface PageHeroProps {
  /** kept only so any not-yet-migrated caller doesn't crash — "split" is retired, renders as overlay */
  variant?: "overlay" | "split";
  image: string;
  imageAlt: string;
  /** widens+left-anchors the photo so the subject clears the copy column (mockup's --pan) */
  imagePan?: string;
  imageObjectPosition?: string;
  /** object-position from ~1600px viewport width up — the hero keeps a fixed pixel
   * height while width keeps growing, so object-fit:cover crops more and more off
   * the top/bottom the wider the screen. At 4K/ultrawide the default (or a position
   * tuned for a normal desktop) crops straight through the subject's head. Pass a
   * more top-biased position here for any photo with a person in it; falls back to
   * `imageObjectPosition` if not given. */
  imageObjectPositionWide?: string;
  eyebrow?: string;
  heading: ReactNode;
  subhead?: ReactNode;
  primaryCta?: CTA;
  secondaryCta?: CTA;
  /** floating credential card, bottom-right over the photo — hidden below 1180px (mockup rule: copy column collides) */
  badge?: ReactNode;
  /** content rendered after the divider, before the buttons — a pull-quote or a plain intro paragraph */
  belowLead?: ReactNode;
  /** how to render belowLead — quote (serif italic with rose left border) or plain (body copy) */
  belowLeadVariant?: "quote" | "plain";
  /** @deprecated use `badge` — kept for not-yet-migrated callers */
  mediaOverlay?: ReactNode;
}

/**
 * Full-bleed editorial page hero: one photograph across the full width, ink
 * scrims rising from the bottom and left, copy set low over it, nav floating
 * white above it until scrolled. Matches brand-staging-2662e9's `.phero`/`.hero`
 * pattern (2026-07-29) — the earlier two-column "split" layout is retired.
 */
export function PageHero({
  image,
  imageAlt,
  imagePan,
  imageObjectPosition,
  imageObjectPositionWide,
  eyebrow,
  heading,
  subhead,
  primaryCta,
  secondaryCta,
  badge,
  belowLead,
  belowLeadVariant = "quote",
  mediaOverlay,
}: PageHeroProps) {
  const card = badge ?? mediaOverlay;

  return (
    <section className="ds-hero">
      <div className="ds-hero-bg">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          style={{
            objectFit: "cover",
            width: imagePan,
            left: 0,
            // Next's `fill` mode also sets `right:0`; left+right+width all
            // set over-constrains the box and the browser drops our width.
            // Freeing `right` lets the explicit pan width actually apply.
            right: imagePan ? "auto" : undefined,
            // Tailwind's preflight `img{max-width:100%}` otherwise clamps
            // the pan width straight back down to the container's width.
            maxWidth: imagePan ? "none" : undefined,
            // object-position itself is set in design-system.css from these two custom
            // properties, not inline — an inline style can't be conditioned on viewport
            // width, so the `@media (min-width: 1600px)` override there needs a CSS-side
            // hook to switch `--hero-pos` for `--hero-pos-wide` once the fixed-height hero
            // gets wide enough that object-fit:cover crops into the subject's head.
            ["--hero-pos" as string]: imageObjectPosition,
            ["--hero-pos-wide" as string]: imageObjectPositionWide ?? imageObjectPosition,
          } as CSSProperties}
        />
      </div>
      <div className="ds-hero-inner">
        <div className="ds-hero-content">
          {eyebrow && <p className="ds-eyebrow ds-eyebrow-white">{eyebrow}</p>}
          <h1>{heading}</h1>
          {subhead && <p className="ds-hero-sub">{subhead}</p>}
          {subhead && <div className="ds-hero-rule" aria-hidden="true" />}
          {belowLead && belowLeadVariant === "plain" ? (
            <div className="ds-hero-intro">{belowLead}</div>
          ) : belowLead ? (
            <blockquote className="ds-hero-quote">{belowLead}</blockquote>
          ) : null}
          {(primaryCta || secondaryCta) && (
            <div className="ds-hero-btns">
              {primaryCta && <CtaButton cta={{ ...primaryCta, variant: primaryCta.variant ?? "primary" }} />}
              {secondaryCta && <CtaButton cta={{ ...secondaryCta, variant: secondaryCta.variant ?? "ghost-white" }} />}
            </div>
          )}
        </div>
      </div>
      {card && <div className="ds-hero-badge">{card}</div>}
    </section>
  );
}

export default PageHero;
