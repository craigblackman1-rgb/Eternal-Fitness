import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import "./design-system.css";
import { Providers } from "@/components/Providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif-display",
});

const SITE_URL = "https://eternal-fitness.co.uk";
// Only the production domain should be indexed — staging/preview deploys default to noindex
// so Google never sees duplicate content ahead of launch. Coolify's production env sets
// NEXT_PUBLIC_ALLOW_INDEXING=true; every other environment (staging, local) is unset.
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Eternal Fitness | Personal Training in Worthing",
    template: "%s | Eternal Fitness",
  },
  description:
    "Private one-to-one personal training in Worthing with Esther Fair — with the qualifications to adapt when your health picture is more complex.",
  openGraph: {
    siteName: "Eternal Fitness",
    locale: "en_GB",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Eternal Fitness — Personal Training in Worthing" }],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: ALLOW_INDEXING,
    follow: ALLOW_INDEXING,
  },
  other: {
    "geo.region": "GB-WSX",
    "geo.placename": "Worthing, West Sussex",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
        <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
