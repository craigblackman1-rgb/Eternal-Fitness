"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export type LegalDocSlug = "terms" | "privacy" | "cookies";

const docTabs: { slug: LegalDocSlug; label: string; href: string }[] = [
  { slug: "privacy", label: "Privacy Policy", href: "/privacy-policy" },
  { slug: "cookies", label: "Cookie Policy", href: "/cookies-policy" },
  { slug: "terms", label: "Terms & Conditions", href: "/terms" },
];

export interface LegalMetaItem {
  label: string;
  value: ReactNode;
}

export interface LegalTocItem {
  id: string;
  label: string;
}

interface LegalDocLayoutProps {
  activeSlug: LegalDocSlug;
  title: string;
  lead: string;
  meta: LegalMetaItem[];
  tocItems: LegalTocItem[];
  sideCta?: { label: string; href: string };
  askHeading: string;
  askBody: string;
  children: ReactNode;
}

/**
 * Shared "legal document" page shell: eyebrow/title/lead hero with a
 * key-fact strip and a Privacy/Cookies/Terms tab switcher, a sticky numbered
 * table of contents beside the document body, and a closing "ask a question"
 * band. Ported from brand-staging-2662e9's terms-conditions.html / privacy-policy.html /
 * cookies-policy.html (`.doc-hero` / `.doc-tabs` / `.doc-side` / `.doc-ask`).
 */
export default function LegalDocLayout({
  activeSlug,
  title,
  lead,
  meta,
  tocItems,
  sideCta,
  askHeading,
  askBody,
  children,
}: LegalDocLayoutProps) {
  const [activeId, setActiveId] = useState(tocItems[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 }
    );
    tocItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [tocItems]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-40 pb-16 md:pt-48 md:pb-20 px-6 md:px-12 bg-ink">
        <div className="max-w-4xl mx-auto">
          <p className="text-rose text-[11px] md:text-xs font-semibold uppercase tracking-[0.25em] mb-4">Legal</p>
          <h1 className="text-4xl md:text-5xl text-white leading-[1.1] mb-5">{title}</h1>
          <p className="text-white/70 font-body text-lg leading-relaxed max-w-2xl mb-8">{lead}</p>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 mb-9 pb-9 border-b border-white/10">
            {meta.map((m) => (
              <div key={m.label}>
                <dt className="text-white/40 text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5">{m.label}</dt>
                <dd className="text-white text-sm leading-snug">{m.value}</dd>
              </div>
            ))}
          </dl>

          <nav aria-label="Legal documents" className="flex flex-wrap gap-2.5">
            {docTabs.map((tab) => {
              const isActive = tab.slug === activeSlug;
              return (
                <Link
                  key={tab.slug}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? "bg-rose text-white border-rose"
                      : "border-white/15 text-white/70 hover:text-white hover:border-white/30"
                  }`}
                >
                  <span className="w-[5px] h-[5px] rounded-full bg-current shrink-0" aria-hidden="true" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[280px_1fr] gap-12 items-start">
          {/* Sidebar TOC */}
          <aside className="md:sticky md:top-24">
            <p className="text-teal text-[11px] font-semibold uppercase tracking-[0.2em] mb-4">Contents</p>
            <nav className="flex flex-col gap-1 mb-6">
              {tocItems.map((item, i) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`flex items-baseline gap-3 px-4 py-2 rounded-lg text-sm font-body transition-colors ${
                    activeId === item.id
                      ? "bg-rose text-white font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`text-xs font-semibold tabular-nums ${activeId === item.id ? "text-white/70" : "text-muted-foreground/50"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
            {sideCta && (
              <Link href={sideCta.href} className="inline-flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-rose hover:text-white hover:border-rose transition-colors w-fit">
                {sideCta.label}
              </Link>
            )}
          </aside>

          {/* Document body */}
          <div className="max-w-none space-y-14">
            {children}

            {/* Closing "ask" band */}
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-cream border border-border px-8 py-8">
              <div className="flex-1 min-w-[240px]">
                <p className="font-serif text-xl text-foreground mb-2">{askHeading}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{askBody}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex items-center gap-2 bg-teal text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity">
                  Get in touch
                </Link>
                <a href="tel:07517658128" className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 rounded-full font-medium hover:bg-white transition-colors">
                  Call: 07517 658 128
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export function LegalSection({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <div id={id}>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-rose/50 text-sm font-semibold tabular-nums">{String(n).padStart(2, "0")}</span>
        <h2 className="text-2xl text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-muted-foreground text-sm leading-relaxed [&_h3]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1.5 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1.5 [&_strong]:text-foreground [&_a]:text-teal [&_a]:underline [&_a:hover]:no-underline">
        {children}
      </div>
    </div>
  );
}

export function LegalTable({
  columns,
  rows,
  note,
}: {
  columns: string[];
  rows: string[][];
  note?: string;
}) {
  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-cream">
              {columns.map((c) => (
                <th key={c} scope="col" className="px-4 py-3 font-semibold text-foreground border-b border-border whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 align-top text-muted-foreground ${j === 0 ? "font-mono text-xs font-semibold text-foreground whitespace-nowrap" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="text-muted-foreground/70 text-xs mt-2.5">{note}</p>}
    </div>
  );
}

export function LegalNote({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-cream border border-border px-5 py-4 mt-4">
      <p className="text-rose text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{eyebrow}</p>
      <p className="text-muted-foreground text-sm leading-relaxed [&_a]:text-teal [&_a]:underline [&_a:hover]:no-underline">{children}</p>
    </div>
  );
}
