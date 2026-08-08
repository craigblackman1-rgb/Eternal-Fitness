import Link from "next/link";
import { IconArrowUpRight } from "@/components/icons";
import { BOOKINGS_URL } from "@/lib/booking";
import { useBookingModal } from "@/components/BookingModal";
import type { CTA } from "./types";

const variantClass: Record<NonNullable<CTA["variant"]>, string> = {
  primary: "ef-btn-primary",
  dark: "ef-btn-dark",
  outline: "ef-btn-outline",
  white: "ef-btn-white",
  "ghost-white": "ef-btn-ghost-white",
};

/** Renders a CTA as a link (href) or button (onClick) using the shared .ef-btn system.
 * A `href` of BOOKINGS_URL opens the site-wide booking modal instead of navigating away
 * (2026-08-08) — every caller that just passes `{ href: BOOKINGS_URL }` picks this up for
 * free with no change needed at the call site. */
export function CtaButton({ cta }: { cta: CTA }) {
  const { openBookingModal } = useBookingModal();
  const cls = `ef-btn ${variantClass[cta.variant ?? "primary"]}`;
  const inner = (
    <>
      {cta.label}
      {cta.arrow && <IconArrowUpRight className="w-4 h-4" />}
    </>
  );

  if (cta.href === BOOKINGS_URL) {
    return (
      <button type="button" onClick={openBookingModal} className={cls}>
        {inner}
      </button>
    );
  }

  if (cta.href) {
    return (
      <Link href={cta.href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={cta.onClick} className={cls}>
      {inner}
    </button>
  );
}

export default CtaButton;
