import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { CtaButton } from "./CtaButton";
import type { CTA } from "./types";

interface PageHeroProps {
  /** "split" (default) — copy beside photo on solid ink ground; "overlay" — legacy full-bleed scrim */
  layout?: "overlay" | "split";
  /** @deprecated "split" is retired, renders as overlay — kept for not-yet-migrated callers */
  variant?: "overlay" | "split";
  image: string;
  imageAlt: string;
  /** widens+left-anchors the photo so the subject clears the copy column (mockup's --pan) — only used in overlay layout */
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
  /** floating credential card — in overlay layout: bottom-right over the photo (hidden below 1180px); in split layout: rendered inside the panel below the buttons */
  badge?: ReactNode;
  /** content rendered after the divider, before the buttons — a pull-quote or a plain intro paragraph */
  belowLead?: ReactNode;
  /** how to render belowLead — quote (serif italic with rose left border) or plain (body copy) */
  belowLeadVariant?: "quote" | "plain";
  /** @deprecated use `badge` — kept for not-yet-migrated callers */
  mediaOverlay?: ReactNode;
}

/**
 * Full-bleed editorial page hero. Two layouts:
 *
 * **split** (default, EF-IMG-03): Copy sits beside the photograph on solid ink
 * ground, never on top of it. The photograph gets only the studio grade — no
 * scrim, no vignette. One box, one radius, one hairline, no overlay anywhere.
 *
 * **overlay** (retired): One photograph across the full width, ink scrims rising
 * from the bottom and left, copy set low over it. Kept for backward compatibility
 * with callers that still use `variant`.
 */
export function PageHero({
  layout = "split",
  variant,
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
  // variant="split" in the old API was the two-column layout, but it was retired
  // before this component was rewritten — it now means "use the overlay". Only
  // the new `layout` prop controls the real layout choice.
  const effectiveLayout = variant === "split" ? "overlay" : layout;
  const card = badge ?? mediaOverlay;

  if (effectiveLayout === "overlay") {
    return (
      <section className="ds-hero">
        <div
          className="ds-hero-bg"
          style={
            imagePan
              ? {
                  width: imagePan,
                  left: 0,
                  right: "auto",
                  maxWidth: "none",
                }
              : undefined
          }
        >
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            style={{
              objectFit: "cover",
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

  // ── split layout (EF-IMG-03) ──
  return (
    <section className="ds-hero-split">
      <div className="ds-hero-split-grid">
        <div className="ds-hero-split-panel">
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
          {card && <div className="ds-hero-badge-inline">{card}</div>}
        </div>
        <div className="ds-hero-split-photo">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="(max-width: 760px) 100vw, 56vw"
            style={{
              objectFit: "cover",
              ["--hero-pos" as string]: imageObjectPosition,
              ["--hero-pos-wide" as string]: imageObjectPositionWide ?? imageObjectPosition,
            } as CSSProperties}
          />
        </div>
      </div>
    </section>
  );
}

export default PageHero;
