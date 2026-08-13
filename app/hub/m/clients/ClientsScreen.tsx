"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MobileClientListItem } from "./page";

const ICO = {
  chev: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  med: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18" />
    </svg>
  ),
  okSm: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  monitor: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  search: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  ),
};

const FILTERS = [
  { key: "all", label: "All clients" },
  { key: "today", label: "Booked today" },
  { key: "flag", label: "Medical flag" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function ClientsScreen({ items }: { items: MobileClientListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      const okQ = !q || (c.name + " " + (c.descriptor ?? "")).toLowerCase().includes(q);
      const okF = filter === "all" || (filter === "flag" && c.hasFlag) || (filter === "today" && c.bookedToday);
      return okQ && okF;
    });
  }, [items, query, filter]);

  const sectionTitle = filter === "flag" ? "Flagged clients" : filter === "today" ? "Booked today" : "All clients";

  return (
    <>
      <header className="mtop">
        <div className="mtop-row">
          <div className="mtop-id">
            <div className="mtop-t">Clients</div>
            <div className="mtop-s">Read-only — a glance before a session</div>
          </div>
          <Link className="desktop-link" href="/hub/clients">
            {ICO.monitor}
            Desktop
          </Link>
        </div>
        <div className="searchwrap">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            aria-label="Search clients"
          />
        </div>
        <div className="cchips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`cchip${filter === f.key ? " on" : ""}`}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mcontent">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-ic">{ICO.search}</div>
            <p className="empty-t">No clients match{query ? ` “${query}”` : " that filter"}</p>
            <p className="empty-d">Try a shorter search or clear the filter. New clients are added from the desktop hub.</p>
            <button
              className="btn btn-outline"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <>
            <div className="sec-label">
              <h2>{sectionTitle}</h2>
              <span>
                {filtered.length} of {items.length}
              </span>
            </div>
            <div className="clist">
              {filtered.map((c) => {
                const meta = [c.descriptor, c.nextLabel ? `next ${c.nextLabel.toLowerCase()}` : null]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Link
                    key={c.clientNumber}
                    className={`ccard${c.hasFlag ? " flagged" : ""}`}
                    href={`/hub/m/clients/${c.clientNumber}`}
                  >
                    <span className={`cav${c.hasFlag ? " flag" : ""}`}>{c.initials}</span>
                    <div className="cbody">
                      <div className="cname">{c.name}</div>
                      <div className="cmeta">{meta || "No upcoming session"}</div>
                      <div className="cflags">
                        {c.hasFlag ? (
                          <span className="pill med">
                            {ICO.med}
                            {c.flagCount} flag{c.flagCount !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="pill ok">
                            {ICO.okSm}
                            No flags
                          </span>
                        )}
                        {c.blockLabel && <span className="pill blk">{c.blockLabel}</span>}
                      </div>
                    </div>
                    <span className="cchev">{ICO.chev}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
