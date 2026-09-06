/** Package pricing constants — single source of truth for renewal flow.
 *  Prices are in GBP pence to avoid floating-point issues. */
export const PACKAGE_SIZES = [
  { id: "4", sessions: 4, label: "4 sessions", pricePence: 16000, priceDisplay: "£160" },
  { id: "6", sessions: 6, label: "6 sessions", pricePence: 22500, priceDisplay: "£225" },
  { id: "12", sessions: 12, label: "12 sessions", pricePence: 42000, priceDisplay: "£420" },
  { id: "24", sessions: 24, label: "24 sessions", pricePence: 78000, priceDisplay: "£780" },
  { id: "ongoing", sessions: null, label: "Ongoing", pricePence: 7000, priceDisplay: "£70/mo" },
] as const;

export type PackageSizeId = (typeof PACKAGE_SIZES)[number]["id"];

export function getPackageSize(id: PackageSizeId) {
  return PACKAGE_SIZES.find((p) => p.id === id);
}

/** Compute the default expiry date for a new package (today + 60 days). */
export function defaultExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().split("T")[0];
}

/** Build a block title from a date range like "Oct–Dec 2026". */
export function blockTitleFromDateRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  };
  return `${fmt(start)}–${fmt(end).split(" ")[1]}`;
}
