"use client";

import type { DocumentSection } from "@/lib/documents/types";

export function DocumentViewerClient({ sections }: { sections: DocumentSection[] }) {
  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      el.scrollIntoView();
      window.scrollBy(0, -96);
    }
  };

  return (
    <nav
      className="no-print rounded-2xl border border-border/60 bg-white p-5 sticky"
      style={{ top: "5.5rem" }}
      aria-labelledby="toc-heading"
    >
      <h2
        id="toc-heading"
        className="text-[0.82rem] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3"
      >
        What is in this document
      </h2>
      <ol className="space-y-0">
        {sections.map((section, i) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(e) => handleTocClick(e, section.id)}
              className="flex items-center min-h-[2.75rem] py-1 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg px-2 -mx-2 transition-colors"
            >
              <span className="tabular-nums text-muted-foreground/60 mr-2 w-5 inline-block text-right">
                {i + 1}.
              </span>
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
