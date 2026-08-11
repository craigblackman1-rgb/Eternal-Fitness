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
      // --- Production cutover (2026-08-09): staging subdomain was shared with real
      // people pre-launch. Once eternal-fitness.co.uk is live, anyone still holding a
      // staging.eternal-fitness.co.uk link must land on the real site, not the stale
      // staging environment (risk: submitting documents / logging in against old data).
      {
        source: "/:path*",
        has: [{ type: "host", value: "staging.eternal-fitness.co.uk" }],
        destination: "https://eternal-fitness.co.uk/:path*",
        permanent: true,
      },

      // --- Renamed blog posts: REMOVED 2026-08-10 ---
      // These three 301'd to managing-setbacks-in-your-recovery-journey,
      // nutrition-for-energy-recovery and why-bmi-doesnt-matter-with-health-conditions.
      // Verified against prod: none of those three slugs exist. The rename lives in
      // 20260419_session_2_blog_repositioning.sql, which has NEVER BEEN APPLIED to the
      // database (prod holds only the 27 original WordPress rows). So each rule was
      // intercepting a post that does work and 301'ing it into a 404.
      // Restore these only once that migration is actually applied.

      // --- Legacy WordPress site (eternal-fitness.co.uk) migration redirects ---
      // Old WP site served every blog post flat off the root (no /blog/ prefix).
      // The 3 renamed posts above route through their new slug; every other
      // post keeps its slug, just moved under /blog/.
      // These 3 pointed at the renamed slugs above; retargeted 2026-08-10 to the slugs
      // that actually exist in the database, for the same reason (rename never applied).
      { source: "/getting-back-on-track-when-youve-fallen-off-the-wagon", destination: "/blog/getting-back-on-track-when-youve-fallen-off-the-wagon", permanent: true },
      { source: "/myth-buster-are-low-fat-foods-healthy", destination: "/blog/myth-buster-are-low-fat-foods-healthy", permanent: true },
      { source: "/bmi-an-outdated-inaccurate-assessment-of-a-healthy-body-weight", destination: "/blog/bmi-an-outdated-inaccurate-assessment-of-a-healthy-body-weight", permanent: true },
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
      { source: "/exercising-with-a-medical-condition", destination: "/specialist-training", permanent: true },
      { source: "/terms-conditions", destination: "/terms", permanent: true },

      // --- Specialist pages restructure (2026-08-10) ---
      // The business narrowed to three specialisms: blind/partially sighted,
      // cancer rehabilitation, and strength/balance for older adults. The old
      // /exercise-for-health hub advertised 8 conditions (only 3 ever built) and
      // is replaced by /specialist-training. Visual impairment moved to a flat
      // top-level URL; bone-health and high-blood-pressure are retired (their
      // page components remain in git history if they need to come back).
      // Specific rules must precede the catch-all below.
      { source: "/exercise-for-health/visual-impairment", destination: "/visual-impairment", permanent: true },
      { source: "/exercise-for-health", destination: "/specialist-training", permanent: true },
      { source: "/exercise-for-health/:path*", destination: "/specialist-training", permanent: true },

      // Old WP blog category archives -> blog index (blog is back out of the disabled block)
      { source: "/category/nutrition", destination: "/blog", permanent: true },
      { source: "/category/exercise", destination: "/blog", permanent: true },
      { source: "/category/myth-buster", destination: "/blog", permanent: true },
      { source: "/category/sleep", destination: "/blog", permanent: true },

      // --- Public calorie calculator retired 2026-08-07 ---
      // Was always noindex/unlinked ("hidden for now"); the client portal's gated
      // per-client calorie-guide (app/portal/(protected)/calorie-guide) is now the
      // real version. Route handler kept in repo, not deleted.
      { source: "/calorie-calculator", destination: "/", permanent: false },

      // --- Renamed hub route (2026-08-04) ---
      { source: "/hub/plan-schedule", destination: "/hub/training-blocks", permanent: false },
    ];
  },
};

export default nextConfig;
