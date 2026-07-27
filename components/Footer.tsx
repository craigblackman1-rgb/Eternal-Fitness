import Link from "next/link";
import { IconPhone, IconMail, IconFacebook, IconInstagram, IconLinkedin, IconYoutube, IconMapPin } from "@/components/icons";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { AccreditationStrip } from "@/components/ds";

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://eternal-fitness.co.uk/#website",
  "name": "Eternal Fitness",
  "url": "https://eternal-fitness.co.uk",
  "description": "Private one-to-one personal training in Worthing with Level 4 qualified trainer Esther Fair.",
  "publisher": {
    "@type": "LocalBusiness",
    "@id": "https://eternal-fitness.co.uk/#business"
  }
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-dark-navy rounded-sm";

const Footer = () => {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <footer className="bg-dark-navy text-white">
        {/* Main grid */}
        <div className="px-6 md:px-12 py-16 md:py-20">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.3fr_1fr] gap-12 lg:gap-16">
            {/* Brand + Credentials */}
            <div>
              <Link href="/" aria-label="Eternal Fitness home" className={`inline-block ${focusRing}`}>
                <EternalFitnessLogo variant="light" className="h-16 w-auto" />
              </Link>
              <p className="text-[15px] text-white/60 leading-relaxed mt-5 max-w-xs">
                Private one-to-one personal training in Worthing.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-rose flex items-center justify-center text-white text-sm font-bold shrink-0">
                  4
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white/80">Level 4 Qualified</div>
                  <div className="text-[12px] text-white/40">In Cancer &amp; Exercise Rehabilitation</div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h2 className="text-[13px] font-bold text-white/40 tracking-widest uppercase mb-6">Get in Touch</h2>
              <ul className="space-y-3.5">
                <li>
                  <a
                    href="tel:07517658128"
                    className={`inline-flex items-center gap-3 text-[15px] text-white/65 hover:text-rose transition-colors ${focusRing}`}
                  >
                    <IconPhone className="w-4 h-4 text-rose shrink-0" aria-hidden="true" />
                    07517 658 128
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:esther.fair@eternal-fitness.co.uk"
                    className={`flex items-start gap-3 text-[15px] text-white/65 hover:text-rose transition-colors ${focusRing}`}
                  >
                    <IconMail className="w-4 h-4 text-rose shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="break-words">esther.fair@eternal-fitness.co.uk</span>
                  </a>
                </li>
                <li className="inline-flex items-center gap-3 text-[15px] text-white/45">
                  <IconMapPin className="w-4 h-4 text-rose shrink-0" aria-hidden="true" />
                  Worthing, West Sussex
                </li>
              </ul>
            </div>

            {/* Information + Social */}
            <div>
              <h2 className="text-[13px] font-bold text-white/40 tracking-widest uppercase mb-6">More</h2>
              <ul className="space-y-3.5 mb-8">
                <li><Link href="/personal-training" className={`text-[15px] text-white/65 hover:text-rose transition-colors ${focusRing}`}>Personal Training</Link></li>
                <li><Link href="/about" className={`text-[15px] text-white/65 hover:text-rose transition-colors ${focusRing}`}>About Me</Link></li>
                <li><Link href="/pricing" className={`text-[15px] text-white/65 hover:text-rose transition-colors ${focusRing}`}>Pricing</Link></li>
                <li><Link href="/faqs" className={`text-[15px] text-white/65 hover:text-rose transition-colors ${focusRing}`}>FAQs</Link></li>
                <li><Link href="/contact" className={`text-[15px] text-white/65 hover:text-rose transition-colors ${focusRing}`}>Contact</Link></li>
              </ul>
              <div className="flex gap-3">
                <a
                  href="https://www.facebook.com/EternalFitnessPersonalTraining/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-rose hover:bg-rose/10 transition-all ${focusRing}`}
                >
                  <IconFacebook className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com/eternalfitness/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-rose hover:bg-rose/10 transition-all ${focusRing}`}
                >
                  <IconInstagram className="w-4 h-4" />
                </a>
                <a
                  href="https://linkedin.com/in/esther-fair/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-rose hover:bg-rose/10 transition-all ${focusRing}`}
                >
                  <IconLinkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com/eternalfitness/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-rose hover:bg-rose/10 transition-all ${focusRing}`}
                >
                  <IconYoutube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Accreditations */}
          <div className="max-w-[1320px] mx-auto mt-14 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/30 shrink-0">Registered &amp; accredited</span>
            <AccreditationStrip variant="footer" />
          </div>

          {/* Rose divider */}
          <div className="max-w-[1320px] mx-auto mt-8 mb-6 h-px bg-rose/20" />

          {/* Bottom bar */}
          <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-white/35">
            <span>&copy; {new Date().getFullYear()} Eternal Fitness &middot; Esther Fair</span>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className={`hover:text-white/55 transition-colors ${focusRing}`}>Privacy Policy</Link>
              <Link href="/terms" className={`hover:text-white/55 transition-colors ${focusRing}`}>Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
