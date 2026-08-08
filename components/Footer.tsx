import Link from "next/link";
import { IconFacebook, IconArrowUpRight } from "@/components/icons";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { useBookingModal } from "@/components/BookingModal";

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://eternal-fitness.co.uk/#website",
  "name": "Eternal Fitness",
  "url": "https://eternal-fitness.co.uk",
  "description": "Private one-to-one personal training in Worthing with Esther Fair, Level 4 qualified in Cancer and Exercise Rehabilitation.",
  "publisher": {
    "@type": "LocalBusiness",
    "@id": "https://eternal-fitness.co.uk/#business"
  }
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-ink rounded-sm";

const footerLinkClasses = `relative inline-block py-2 text-[15px] leading-[1.35] text-white/60 transition-colors hover:text-white ${focusRing}`;

const Footer = () => {
  const { openBookingModal } = useBookingModal();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <footer className="relative isolate overflow-hidden bg-ink text-white/60">
        {/* rose eyebrow rule + radial glow, echoing the section-head device used across the marketing pages */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" aria-hidden="true" />
        <div className="absolute top-0 left-0 h-[3px] w-[148px] bg-rose" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-[24%] -left-[8%] h-[130%] w-[58%] -z-10"
          style={{ background: "radial-gradient(closest-side, rgba(193,131,159,0.09), transparent 72%)" }}
          aria-hidden="true"
        />

        <div className="relative px-6 md:px-20 pb-[34px]">
          {/* Top: brand + 3 nav groups */}
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.65fr_.82fr_.82fr_1.15fr] gap-10 lg:gap-14 py-14 lg:py-[78px] border-b border-white/10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" aria-label="Eternal Fitness home" className={`inline-block ${focusRing}`}>
                <EternalFitnessLogo variant="light" className="h-12 w-auto mb-7" />
              </Link>
              <p className="font-serif font-normal text-[clamp(23px,2.1vw,30px)] leading-[1.22] tracking-[-0.022em] text-white max-w-[22ch] mb-4">
                Private one-to-one personal training in Worthing.
              </p>
              <p className="text-[14.5px] leading-[1.62] text-white/60 max-w-[36ch] mb-7">
                All sessions last 60 minutes. Train in my private Worthing studio or join live online.
              </p>
              <button type="button" onClick={openBookingModal} className={`ef-btn ef-btn-ghost-white ${focusRing}`}>
                Book a free consultation
                <IconArrowUpRight style={{ width: 13, height: 13 }} />
              </button>
            </div>

            {/* Explore */}
            <nav aria-label="Footer — explore" className="flex flex-col items-start">
              <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/45 mb-3.5">Explore</h2>
              <Link href="/" className={footerLinkClasses}>Home</Link>
              <Link href="/about" className={footerLinkClasses}>About</Link>
              <Link href="/personal-training" className={footerLinkClasses}>Personal Training</Link>
              <Link href="/pricing" className={footerLinkClasses}>Pricing</Link>
            </nav>

            {/* Training */}
            <nav aria-label="Footer — training" className="flex flex-col items-start">
              <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/45 mb-3.5">Training</h2>
              <Link href="/personal-training#specialist" className={footerLinkClasses}>Specialist Training</Link>
              <Link href="/faqs" className={footerLinkClasses}>FAQs</Link>
              <Link href="/contact" className={footerLinkClasses}>Contact</Link>
            </nav>

            {/* Contact */}
            <div className="flex flex-col items-stretch">
              <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/45 mb-3.5">Get in touch</h2>
              <a
                href="tel:07517658128"
                className={`font-serif font-normal text-[clamp(25px,2.2vw,31px)] leading-[1.1] tracking-[-0.025em] text-white transition-colors hover:text-rose ${focusRing}`}
              >
                07517 658 128
              </a>
              <a
                href="mailto:esther.fair@eternal-fitness.co.uk"
                className={`block mt-4 pt-[15px] border-t border-white/10 text-[14.5px] leading-[1.4] text-white/60 break-words transition-colors hover:text-white ${focusRing}`}
              >
                esther.fair@eternal-fitness.co.uk
              </a>
              <p className="mt-4 pt-[15px] border-t border-white/10 text-[14.5px] leading-[1.45] text-white/60">
                Worthing, West Sussex
                <span className="block text-[12.5px] text-white/45 mt-1">Exact address shared after booking.</span>
              </p>
              <div className="mt-[18px] pt-[17px] border-t border-white/10">
                <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-white/45 mb-3">Follow</span>
                <a
                  href="https://www.facebook.com/profile.php?id=61576413498498"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Eternal Fitness on Facebook"
                  className={`inline-flex w-11 h-11 rounded-full items-center justify-center border border-white/10 text-rose transition-all hover:bg-rose hover:text-white hover:border-rose hover:-translate-y-0.5 ${focusRing}`}
                >
                  <IconFacebook style={{ width: 17, height: 17 }} />
                </a>
              </div>
            </div>
          </div>

          {/* Qualifications strip */}
          <ul className="max-w-[1320px] mx-auto flex flex-wrap items-center gap-2.5 py-[26px] border-b border-white/10 list-none">
            <li className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/45 mr-2">Qualified in</li>
            {["Personal Training", "Exercise Referral", "Level 4 Cancer and Exercise Rehabilitation"].map((q) => (
              <li
                key={q}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/5"
              >
                <span className="w-[5px] h-[5px] rounded-full bg-rose shrink-0" aria-hidden="true" />
                {q}
              </li>
            ))}
          </ul>

          {/* Bottom bar */}
          <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 pt-[26px] text-[12.5px] text-white/45">
            <span>&copy; {new Date().getFullYear()} Eternal Fitness &middot; Worthing, West Sussex</span>
            <nav aria-label="Legal" className="flex gap-[22px]">
              <Link href="/privacy-policy" className={`transition-colors hover:text-white ${focusRing}`}>Privacy</Link>
              <Link href="/terms" className={`transition-colors hover:text-white ${focusRing}`}>Terms</Link>
              <Link href="/cookies-policy" className={`transition-colors hover:text-white ${focusRing}`}>Cookies</Link>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
