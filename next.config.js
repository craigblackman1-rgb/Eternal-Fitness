/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Self-hosted (Coolify/Docker) — Next's built-in optimizer assumes Vercel's
    // image infrastructure; serve originals directly instead.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        // HTML must revalidate every time — a cached page from a previous
        // deployment references purged /_next chunks (unstyled pages, dead
        // Server Actions). Hashed static assets carry their own caching.
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        // Authenticated hub pages: never cache anywhere.
        source: "/hub/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // --- Renamed blog posts (slug changed on migration) ---
      {
        source: "/blog/getting-back-on-track-when-youve-fallen-off-the-wagon",
        destination: "/blog/managing-setbacks-in-your-recovery-journey",
        permanent: true,
      },
      {
        source: "/blog/myth-buster-are-low-fat-foods-healthy",
        destination: "/blog/nutrition-for-energy-recovery",
        permanent: true,
      },
      {
        source: "/blog/bmi-an-outdated-inaccurate-assessment-of-a-healthy-body-weight",
        destination: "/blog/why-bmi-doesnt-matter-with-health-conditions",
        permanent: true,
      },

      // --- Legacy WordPress site (eternal-fitness.co.uk) migration redirects ---
      // Old WP site served every blog post flat off the root (no /blog/ prefix).
      // The 3 renamed posts above route through their new slug; every other
      // post keeps its slug, just moved under /blog/.
      { source: "/getting-back-on-track-when-youve-fallen-off-the-wagon", destination: "/blog/managing-setbacks-in-your-recovery-journey", permanent: true },
      { source: "/myth-buster-are-low-fat-foods-healthy", destination: "/blog/nutrition-for-energy-recovery", permanent: true },
      { source: "/bmi-an-outdated-inaccurate-assessment-of-a-healthy-body-weight", destination: "/blog/why-bmi-doesnt-matter-with-health-conditions", permanent: true },
      { source: "/myth-buster-does-resistance-training-cause-high-blood-pressure", destination: "/blog/myth-buster-does-resistance-training-cause-high-blood-pressure", permanent: true },
      { source: "/the-importance-of-staying-hydrated", destination: "/blog/the-importance-of-staying-hydrated", permanent: true },
      { source: "/rate-of-perceived-exertion", destination: "/blog/rate-of-perceived-exertion", permanent: true },
      { source: "/myth-buster-is-a-warmup-really-necessary", destination: "/blog/myth-buster-is-a-warmup-really-necessary", permanent: true },
      { source: "/exercise-illness", destination: "/blog/exercise-illness", permanent: true },
      { source: "/menopause-and-exercise", destination: "/blog/menopause-and-exercise", permanent: true },
      { source: "/is-it-possible-to-target-fat-loss-to-specific-body-parts", destination: "/blog/is-it-possible-to-target-fat-loss-to-specific-body-parts", permanent: true },
      { source: "/are-you-sabotaging-your-weight-loss", destination: "/blog/are-you-sabotaging-your-weight-loss", permanent: true },
      { source: "/why-you-should-be-lifting-heavier-weights", destination: "/blog/why-you-should-be-lifting-heavier-weights", permanent: true },
      { source: "/inflammation-and-the-body", destination: "/blog/inflammation-and-the-body", permanent: true },
      { source: "/myth-buster-should-i-stretch-before-my-workout", destination: "/blog/myth-buster-should-i-stretch-before-my-workout", permanent: true },
      { source: "/myth-buster-no-pain-no-gain", destination: "/blog/myth-buster-no-pain-no-gain", permanent: true },
      { source: "/new-years-resolutions", destination: "/blog/new-years-resolutions", permanent: true },
      { source: "/the-importance-of-sleep-for-health", destination: "/blog/the-importance-of-sleep-for-health", permanent: true },
      { source: "/myth-buster-will-ab-exercises-give-me-a-flat-stomach", destination: "/blog/myth-buster-will-ab-exercises-give-me-a-flat-stomach", permanent: true },
      { source: "/will-lifting-weights-make-me-bulky", destination: "/blog/will-lifting-weights-make-me-bulky", permanent: true },
      { source: "/tips-to-avoid-christmas-weight-gain", destination: "/blog/tips-to-avoid-christmas-weight-gain", permanent: true },
      { source: "/what-are-the-benefits-of-lifting-weights", destination: "/blog/what-are-the-benefits-of-lifting-weights", permanent: true },
      { source: "/myth-buster-is-running-bad-for-your-knees", destination: "/blog/myth-buster-is-running-bad-for-your-knees", permanent: true },
      { source: "/myth-buster-does-muscle-weigh-more-than-fat", destination: "/blog/myth-buster-does-muscle-weigh-more-than-fat", permanent: true },
      { source: "/protein-what-it-is-why-you-need-it", destination: "/blog/protein-what-it-is-why-you-need-it", permanent: true },
      { source: "/fat-what-it-is-why-you-need-it", destination: "/blog/fat-what-it-is-why-you-need-it", permanent: true },
      { source: "/carbohydrates-what-it-is-why-you-need-it", destination: "/blog/carbohydrates-what-it-is-why-you-need-it", permanent: true },
      { source: "/why-is-goal-setting-in-personal-training-so-important", destination: "/blog/why-is-goal-setting-in-personal-training-so-important", permanent: true },

      // Old WP static pages -> new page structure
      // (/contact, /personal-training, /about, /faqs, /blog, /pricing, /privacy-policy,
      // /cookies-policy keep the same slug — Next strips the old site's trailing slash
      // automatically, no explicit redirect needed)
      { source: "/whats-on-offer", destination: "/personal-training", permanent: true },
      { source: "/elementor-hf/whats-on-offer", destination: "/personal-training", permanent: true },
      { source: "/cancer-rehabilitation-and-exercise", destination: "/cancer-rehabilitation", permanent: true },
      { source: "/exercising-with-a-medical-condition", destination: "/exercise-for-health", permanent: true },
      { source: "/terms-conditions", destination: "/terms", permanent: true },

      // Old WP blog category archives -> blog index (no category taxonomy on new site)
      { source: "/category/nutrition", destination: "/blog", permanent: true },
      { source: "/category/exercise", destination: "/blog", permanent: true },
      { source: "/category/myth-buster", destination: "/blog", permanent: true },
      { source: "/category/sleep", destination: "/blog", permanent: true },

      // --- Pages not part of the 2026-07-27 launch scope ---
      // Launch set is Home, About, Personal Training, Pricing, FAQs, Contact, plus the
      // 3 legal pages. Blog and the specialist/condition pages (Exercise for Health hub +
      // subpages, Cancer Rehabilitation) are pending separate work (blog rewrite scope
      // decision; Specialist Training catalogue restructure) — disabled, not deleted.
      // Temporary (permanent: false) so these are easy to re-enable by removing this block.
      { source: "/blog", destination: "/", permanent: false },
      { source: "/blog/:path*", destination: "/", permanent: false },
      { source: "/cancer-rehabilitation", destination: "/", permanent: false },
      { source: "/exercise-for-health", destination: "/", permanent: false },
      { source: "/exercise-for-health/:path*", destination: "/", permanent: false },
      // Calorie Calculator pulled from the public site 2026-07-30 — disabled, not deleted.
      { source: "/calorie-calculator", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
