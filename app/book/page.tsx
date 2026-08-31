import { PublicBookingClient } from "./PublicBookingClient";

/**
 * CR-EF-097 — Public booking page.
 *
 * Warm marketing register (DESIGN.md §1–§8), NOT the cool-grey hub.
 * Replaces the Microsoft Bookings form.
 *
 * Mobile-first: the phone layout is the base; the 980px query adds the
 * desktop summary rail and wider grids.
 *
 * This page works without authentication — new clients book here.
 */
export default function PublicBookingPage() {
  return <PublicBookingClient />;
}
