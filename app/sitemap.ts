import type { MetadataRoute } from "next";

// Launch scope only (2026-07-27): the Specialist Training / condition pages and
// Blog are disabled (see next.config.js redirects) pending separate work, so
// they're deliberately left out of the sitemap too. Re-add them here once
// those routes are re-enabled.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "https://eternal-fitness.co.uk";

  const staticPages = [
    { url: `${baseUrl}`, priority: 1.0, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/about`, priority: 0.9, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/personal-training`, priority: 0.9, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/pricing`, priority: 0.85, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/contact`, priority: 0.8, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/faqs`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/privacy-policy`, priority: 0.5, changeFrequency: "yearly" as const },
    { url: `${baseUrl}/terms`, priority: 0.5, changeFrequency: "yearly" as const },
    { url: `${baseUrl}/cookies-policy`, priority: 0.5, changeFrequency: "yearly" as const },
  ];

  return staticPages.map((page) => ({ ...page, lastModified: new Date() }));
}
