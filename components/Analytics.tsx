"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// Same Google Tag Manager container as the previous WordPress site. GA4
// (G-B4ZDEPQCR9) and the Meta Pixel (304813821119731) are both configured
// inside this container — manage tags in GTM, not in code.
const GTM_ID = "GTM-TRQQB37";

// Production only — reuses the same signal that gates indexing, so staging and
// local dev never send analytics traffic.
const ENABLED = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

// Marketing pages only. The staff hub, client portal, and public document
// signing pages carry client health context and must never load GA/Meta.
const EXCLUDED_PREFIXES = ["/hub", "/portal", "/documents"];

export function Analytics() {
  const pathname = usePathname();

  if (!ENABLED) return null;
  if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
