"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

function TabIcon({ type }: { type: "today" | "train" | "clients" }) {
  if (type === "today") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    );
  }
  if (type === "train") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5v11M17.5 6.5v11M3 10h1.5M3 14h1.5M19.5 10H21M19.5 14H21M9 10h6v4H9z"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const activeTab = useMemo(() => {
    if (pathname === "/hub/m") return "today";
    if (pathname.startsWith("/hub/m/train")) return "train";
    if (pathname.startsWith("/hub/m/clients")) return "clients";
    return "today";
  }, [pathname]);

  // Client mode (`/hub/m/clients/[client_number]`) owns its own bottom tab
  // bar (Overview / Calendar / Workouts / Notes) — the trainer bar is replaced
  // while scoped into a client, matching hub-m-client-mode.html.
  const inClientMode = useMemo(() => /^\/hub\/m\/clients\/[^/]+/.test(pathname), [pathname]);

  return (
    <div className="mobile-shell">
      {children}
      {!inClientMode && (
      <nav className="tabbar" aria-label="Primary">
        <Link
          className={`tab${activeTab === "today" ? " on" : ""}`}
          href="/hub/m"
          {...(activeTab === "today" ? { "aria-current": "page" as const } : {})}
        >
          <TabIcon type="today" />
          Today
        </Link>
        <Link
          className={`tab${activeTab === "train" ? " on" : ""}`}
          href="/hub/m/train"
          {...(activeTab === "train" ? { "aria-current": "page" as const } : {})}
        >
          <TabIcon type="train" />
          Train
        </Link>
        <Link
          className={`tab${activeTab === "clients" ? " on" : ""}`}
          href="/hub/m/clients"
          {...(activeTab === "clients" ? { "aria-current": "page" as const } : {})}
        >
          <TabIcon type="clients" />
          Clients
        </Link>
      </nav>
      )}
    </div>
  );
}
