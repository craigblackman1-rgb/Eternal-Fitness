import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/hub/ServiceWorkerRegistration";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/hub.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EF Hub",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#C1839F",
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ServiceWorkerRegistration />
    </>
  );
}
