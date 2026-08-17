import type { MetadataRoute } from "next";

// Blog, /cancer-rehabilitation, and /falls-prevention are currently re-gated
// (see next.config.js redirects, commit 4f9330e, 2026-08-17) pending content
// sign-off, so they're deliberately left out of the sitemap. Re-add them the
// moment those routes are un-gated. /specialist-training itself is live and
// indexable (single-specialism scope), so it stays in the sitemap.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "https://eternal-fitness.co.uk";

  const staticPages = [
    { url: `${baseUrl}`, priority: 1.0, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/about`, priority: 0.9, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/personal-training`, priority: 0.9, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/specialist-training`, priority: 0.8, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/pricing`, priority: 0.85, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/contact`, priority: 0.8, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/faqs`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/testimonials`, priority: 0.7, changeFrequency: "monthly" as const },
    // VI page (2026-08-11), at its post-restructure top-level slug.
    { url: `${baseUrl}/visual-impairment`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/privacy-policy`, priority: 0.5, changeFrequency: "yearly" as const },
    { url: `${baseUrl}/terms`, priority: 0.5, changeFrequency: "yearly" as const },
    { url: `${baseUrl}/cookies-policy`, priority: 0.5, changeFrequency: "yearly" as const },
  ];

  return staticPages.map((page) => ({ ...page, lastModified: new Date() }));
}
