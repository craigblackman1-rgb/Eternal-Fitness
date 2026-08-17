import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/portal/ServiceWorkerRegistration";

// Client portal — private, authenticated client data. Never indexable,
// defense-in-depth alongside robots.ts's /portal/ disallow. Pure metadata
// wrapper only (no auth logic here) — auth-gating lives in
// app/portal/(protected)/layout.tsx so this can also cover /portal/login.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/portal.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EF Portal",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#C1839F",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ServiceWorkerRegistration />
    </>
  );
}
