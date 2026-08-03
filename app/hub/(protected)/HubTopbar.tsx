"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HubBreadcrumb } from "./HubBreadcrumb";
import { IconMenu, IconSearch, IconUserPlus } from "@/components/icons";

interface ClientSearchResult {
  client_number: number;
  name: string;
}

function ClientSearch() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(term.trim())}`);
      if (!cancelled) {
        if (res.ok) {
          const data = await res.json();
          setResults(data ?? []);
        } else {
          setResults([]);
        }
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [term]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goTo = (clientNumber: number) => {
    setOpen(false);
    setTerm("");
    router.push(`/hub/clients/${clientNumber}`);
  };

  return (
    <div ref={containerRef} className="relative w-64 hidden md:block">
      <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Find a client..."
        className="w-full rounded-lg bg-[var(--hub-canvas)] border border-[var(--hub-border)] py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose/30 focus:bg-white transition-colors"
      />
      {open && term.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 rounded-xl border border-[var(--hub-border)] bg-white shadow-lg overflow-hidden">
          {results.length > 0 ? (
            results.map((c) => (
              <button
                key={c.client_number}
                onClick={() => goTo(c.client_number)}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-foreground hover:bg-[var(--hub-hover)] transition-colors"
              >
                {c.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">No clients found</p>
          )}
        </div>
      )}
    </div>
  );
}

export function HubTopbar({ onMenuOpen }: { onMenuOpen?: () => void }) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-[var(--hub-border)]">
      <div className="h-14 px-5 lg:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onMenuOpen && (
            <button
              onClick={onMenuOpen}
              aria-label="Open menu"
              className="lg:hidden -ml-1 p-2 rounded-lg text-foreground hover:bg-[var(--hub-hover)] transition-colors"
            >
              <IconMenu className="h-5 w-5" />
            </button>
          )}
          <HubBreadcrumb />
        </div>
        <div className="flex items-center gap-3">
          <ClientSearch />
          <Link
            href="/hub/clients/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white text-sm font-semibold px-3.5 py-1.5 transition-colors"
          >
            <IconUserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New Client</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
