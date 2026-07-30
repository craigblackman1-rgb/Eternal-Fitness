"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { IconMenu, IconX, IconArrowUpRight } from "@/components/icons";

type NavChild = { label: string; to: string };
type NavItem = { label: string; to: string; children?: NavChild[] };

const navItems: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Personal Training", to: "/personal-training" },
  { label: "Pricing", to: "/pricing" },
  { label: "Client Stories", to: "/testimonials" },
  { label: "FAQs", to: "/faqs" },
  { label: "Contact", to: "/contact" },
];

interface NavbarProps {
  onBookConsultation?: () => void;
}

const SITE_URL = "https://eternal-fitness.co.uk";

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/about": "About",
  "/personal-training": "Personal Training",
  "/pricing": "Pricing",
  "/testimonials": "Client Stories",
  "/faqs": "FAQs",
  "/contact": "Contact",
};

function NavDropdown({
  item,
  isLit,
  pathname,
}: {
  item: NavItem & { children: NavChild[] };
  isLit: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeout.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => clearCloseTimeout, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      panel.style.opacity = open ? "1" : "0";
      panel.style.visibility = open ? "visible" : "hidden";
      panel.style.pointerEvents = open ? "auto" : "none";
      return;
    }

    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled || !panelRef.current) return;

      if (open) {
        panel.style.visibility = "visible";
        panel.style.pointerEvents = "auto";
        const links = panel.querySelectorAll("a");
        gsap.fromTo(
          panel,
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }
        );
        gsap.fromTo(
          links,
          { opacity: 0, y: -4 },
          { opacity: 1, y: 0, duration: 0.2, ease: "power2.out", stagger: 0.03, delay: 0.03 }
        );
      } else {
        gsap.to(panel, {
          opacity: 0,
          y: -6,
          duration: 0.15,
          ease: "power2.in",
          onComplete: () => {
            if (panelRef.current) {
              panelRef.current.style.visibility = "hidden";
              panelRef.current.style.pointerEvents = "none";
            }
          },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const isActive =
    pathname === item.to ||
    item.children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));

  return (
    <li
      className="relative"
      onMouseEnter={() => {
        clearCloseTimeout();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        clearCloseTimeout();
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          scheduleClose();
        }
      }}
    >
      <Link
        href={item.to}
        aria-haspopup="true"
        aria-expanded={open}
        className={`transition-colors ${
          isActive
            ? `${isLit ? "text-charcoal" : "text-white"} font-semibold`
            : isLit
            ? "hover:text-charcoal"
            : "hover:text-white"
        } flex items-center gap-1`}
      >
        {item.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Link>
      <div
        ref={panelRef}
        className="absolute left-0 top-full pt-3 w-64 z-50 opacity-0 invisible pointer-events-none"
      >
        <div className="bg-white border border-border-warm rounded-2xl shadow-lg py-2 overflow-hidden">
          {item.children.map((child) => (
            <Link
              key={child.label}
              href={child.to}
              className="block px-4 py-2.5 text-charcoal/70 hover:text-charcoal hover:bg-warm transition-colors text-sm"
            >
              {child.label}
            </Link>
          ))}
        </div>
      </div>
    </li>
  );
}

const Navbar = ({ onBookConsultation }: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLit = pathname !== "/" || scrolled || open;

  const breadcrumbItems: Array<{ "@type": string; position: number; name: string; item: string }> = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
  ];

  const currentTitle = pageTitles[pathname];
  if (currentTitle && pathname !== "/") {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: currentTitle,
      item: `${SITE_URL}${pathname}`,
    });
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] px-6 md:px-12 flex items-center justify-between transition-all duration-300 ${
          isLit
            ? "bg-white/[0.97] border-b border-border-warm"
            : "bg-transparent"
        }`}
      >
        <Link href="/" className="flex items-center" aria-label="Eternal Fitness home">
          <EternalFitnessLogo variant={isLit ? "dark" : "light"} className="h-12 md:h-14 w-auto" />
        </Link>

        {/* Desktop nav */}
        <ul className={`hidden md:flex items-center gap-8 text-sm font-medium ${isLit ? "text-charcoal/70" : "text-white/80"}`}>
          {navItems.map((item) => {
            if (item.children) {
              return (
                <NavDropdown
                  key={item.label}
                  item={item as NavItem & { children: NavChild[] }}
                  isLit={isLit}
                  pathname={pathname}
                />
              );
            }
            return (
              <li key={item.label}>
                <Link
                  href={item.to}
                  className={`transition-colors ${
                    pathname === item.to
                      ? `${isLit ? "text-charcoal" : "text-white"} font-semibold`
                      : isLit
                      ? "hover:text-charcoal"
                      : "hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          {onBookConsultation ? (
            <button
              onClick={onBookConsultation}
              className="ef-btn ef-btn-primary text-sm py-2.5 px-5"
            >
              Book a Free Consultation <IconArrowUpRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/contact"
              className="ef-btn ef-btn-primary text-sm py-2.5 px-5"
            >
              Book a Free Consultation <IconArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`md:hidden ${isLit ? "text-charcoal" : "text-white"}`}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <IconX className="w-6 h-6" /> : <IconMenu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed top-[72px] left-0 right-0 z-40 bg-white border-b border-border-warm p-6 md:hidden flex flex-col gap-4 shadow-lg transition-all duration-200 max-h-[calc(100vh-72px)] overflow-y-auto ${
          open
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <div className="space-y-3">
                <Link
                  href={item.to}
                  onClick={() => setOpen(false)}
                  className="block text-charcoal/80 hover:text-charcoal text-sm font-medium"
                >
                  {item.label}
                </Link>
                <div className="space-y-2 pl-2 border-l-2 border-rose/30">
                  {item.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.to}
                      onClick={() => setOpen(false)}
                      className="block text-charcoal/70 hover:text-charcoal text-sm font-medium py-1"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                href={item.to}
                onClick={() => setOpen(false)}
                className="text-charcoal/80 hover:text-charcoal text-sm font-medium"
              >
                {item.label}
              </Link>
            )}
          </div>
        ))}
        {onBookConsultation ? (
          <button
            onClick={() => { setOpen(false); onBookConsultation(); }}
            className="ef-btn ef-btn-primary text-sm w-fit"
          >
            Book a Free Consultation <IconArrowUpRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="ef-btn ef-btn-primary text-sm w-fit"
          >
            Book a Free Consultation <IconArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </>
  );
};

export default Navbar;
