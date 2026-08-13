import { IconArrowUpRight } from "@/components/icons";

/**
 * Google Maps deep link for the business, not a copy of Craig's browser
 * search bar URL — that version carried an `rlz` parameter, a tracking ID
 * tied to his specific Chrome install, which has no business being baked
 * into every page's HTML permanently. This is the standard parameter-free
 * `maps/search` deep link instead. Swap for the official Business Profile
 * share link (Maps → listing → Share → Copy link, typically
 * `maps.app.goo.gl/...` or `g.page/...`) if/when Craig pulls it.
 */
const GOOGLE_REVIEWS_URL = "https://www.google.com/maps/search/?api=1&query=Eternal+Fitness+Worthing";

/**
 * Verified Google review count — confirmed by Craig 2026-08-09 (26).
 * `components/TestimonialsSection.tsx`'s schema.org `aggregateRating.reviewCount`
 * was updated to match in the same change; keep the two in sync.
 */
const GOOGLE_REVIEW_COUNT: number | null = 26;

const FITPRO_URL = "https://www.fitpro.com/blog/training-blind-or-partially-sighted-clients/";
const STORM_PODCAST_URL = "https://share.transistor.fm/s/ac03637b";
const STORM_INTERVIEW_URL =
  "https://www.stormfitnessacademy.co.uk/blog/how-to-build-a-personal-training-business-that-fits-your-life-esthers-story/";

const ratingLabel = GOOGLE_REVIEW_COUNT
  ? `Rated 5.0 out of 5 from ${GOOGLE_REVIEW_COUNT} Google reviews`
  : "Rated 5.0 out of 5 on Google Reviews";

/** Filled star. The EF icon set is stroke-only, so this one is local. */
function Star() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.44l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95z" />
    </svg>
  );
}

function Arrow() {
  return <IconArrowUpRight className="fr-arrow" style={{ width: 13, height: 13 }} />;
}

/**
 * Site-wide credibility band — external press on the left, the Google rating
 * on the right behind a hairline. Rendered from the top of `Footer.tsx`, so it
 * appears on every marketing and legal page without disturbing the fixed 72px
 * navbar or any `.ds-hero`.
 *
 * Design source: `brand-staging-2662e9/featured-reviewed-band.html`.
 *
 * Both marks are real logo files (added 2026-08-09), not the Accreditation
 * strip's `/images/accreditations/fitpro.png` — that one is a "Proud to be a
 * member of fitpro" membership badge, correct there but a category error
 * here: under a "Featured in" eyebrow it would claim Esther belongs to
 * FitPro rather than that FitPro published her. `fitpro-press.png` is the
 * plain wordmark instead.
 */
export function FeaturedReviewedBand({ showPress = true }: { showPress?: boolean } = {}) {
  const rating = (
    <>
      <span className="fr-stars" aria-hidden="true">
        <Star />
        <Star />
        <Star />
        <Star />
        <Star />
      </span>
      <span className="fr-scoreline">
        <span className="fr-score">5.0</span>
        <span className="fr-outof">
          {GOOGLE_REVIEW_COUNT ? `from ${GOOGLE_REVIEW_COUNT} reviews` : "out of 5"}
        </span>
      </span>
      <span className="fr-source">
        Google Reviews
        {GOOGLE_REVIEWS_URL ? <Arrow /> : null}
      </span>
    </>
  );

  return (
    <section className={`fr-band${showPress ? "" : " fr-band--rating-only"}`} aria-label={showPress ? "Featured in and reviewed" : "Reviewed"}>
      <div className="fr-inner">
        {showPress ? (
          <div className="fr-press">
            <p className="fr-eyebrow">Featured in</p>
            <div className="fr-lockups">
              <div className="fr-item">
                <a className="fr-link" href={FITPRO_URL} target="_blank" rel="noopener noreferrer">
                  <span className="fr-mark">
                    {/* eslint-disable-next-line @next/next/no-img-element -- fixed-height logo slot, not a content image; images.unoptimized is set sitewide anyway */}
                    <img src="/images/accreditations/fitpro-press.png" alt="FitPro" />
                  </span>
                  {/* Last word and the arrow are bound together so the arrow can
                      never wrap onto a line by itself. */}
                  <span className="fr-hook">
                    On training blind and partially sighted{" "}
                    <span className="fr-nowrap">
                      clients
                      <Arrow />
                    </span>
                  </span>
                </a>
              </div>

              <div className="fr-item">
                <p className="fr-eyebrow fr-eyebrow--repeat" aria-hidden="true">Featured in</p>
                <span className="fr-mark">
                  {/* eslint-disable-next-line @next/next/no-img-element -- fixed-height logo slot, not a content image; images.unoptimized is set sitewide anyway */}
                  <img src="/images/accreditations/storm-fitness-academy.webp" alt="Storm Fitness Academy" />
                </span>
                <div className="fr-actions">
                  <a className="fr-action" href={STORM_PODCAST_URL} target="_blank" rel="noopener noreferrer">
                    <span className="fr-tag">Podcast</span>
                    <span className="fr-action-label">Listen to the episode</span>
                    <Arrow />
                  </a>
                  <a className="fr-action" href={STORM_INTERVIEW_URL} target="_blank" rel="noopener noreferrer">
                    <span className="fr-tag">Interview</span>
                    <span className="fr-action-label">Read the full interview</span>
                    <Arrow />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="fr-rating-zone">
          {GOOGLE_REVIEWS_URL ? (
            <a
              className="fr-rating"
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${ratingLabel}. Opens Google in a new tab.`}
            >
              {rating}
            </a>
          ) : (
            /* No role="img" here — the visible text already reads as
               "5.0 out of 5 Google Reviews". Labelling it as an image would
               hide that text from screen readers to replace it with the same
               sentence. Only the stars are hidden, since they duplicate it. */
            <div className="fr-rating">{rating}</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default FeaturedReviewedBand;
