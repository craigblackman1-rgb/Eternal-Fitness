"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconCalendar } from "@/components/icons";

/** CR-EF-050/CR-EF-028/CR-EF-111 — tab bar shared by the three Outlook reconciliation
 *  queues (Bookings, Possible duplicates, Unassigned), matching the mockup's tabbar. */
export function OutlookReconciliationTabs({ active }: { active: "bookings" | "duplicates" | "unassigned" }) {
  const [bookingsCount, setBookingsCount] = useState<number | null>(null);
  const [duplicatesCount, setDuplicatesCount] = useState<number | null>(null);
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/outlook-bookings?status=open&count=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setBookingsCount(b?.count ?? 0))
      .catch(() => setBookingsCount(0));
    fetch("/api/outlook-duplicates?status=open&count=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setDuplicatesCount(b?.count ?? 0))
      .catch(() => setDuplicatesCount(0));
    fetch("/api/sessions/unassigned-outlook?count=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setUnassignedCount(b?.count ?? 0))
      .catch(() => setUnassignedCount(0));
  }, []);

  const tabClass = (on: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors",
      on ? "bg-[var(--hub-canvas)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    );
  const countClass = (on: boolean) =>
    cn(
      "inline-flex items-center justify-center min-w-[19px] h-[19px] px-1.5 rounded-full text-[11px] font-extrabold tabular-nums text-white",
      on ? "bg-[var(--status-danger)]" : "bg-[var(--hub-field-border)]"
    );

  return (
    <nav
      role="tablist"
      aria-label="Outlook reconciliation queues"
      className="inline-flex bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[10px] p-1 gap-1 mb-4"
    >
      <Link role="tab" aria-selected={active === "bookings"} href="/hub/schedule/outlook" className={tabClass(active === "bookings")}>
        <IconCalendar className="h-3.5 w-3.5" />
        Outlook bookings
        <span className={countClass(active === "bookings")}>{bookingsCount ?? "–"}</span>
      </Link>
      <Link
        role="tab"
        aria-selected={active === "duplicates"}
        href="/hub/schedule/outlook/duplicates"
        className={tabClass(active === "duplicates")}
      >
        <IconCalendar className="h-3.5 w-3.5" />
        Possible duplicates
        <span className={countClass(active === "duplicates")}>{duplicatesCount ?? "–"}</span>
      </Link>
      <Link
        role="tab"
        aria-selected={active === "unassigned"}
        href="/hub/schedule/outlook/unassigned"
        className={tabClass(active === "unassigned")}
      >
        <IconCalendar className="h-3.5 w-3.5" />
        Unassigned
        <span className={countClass(active === "unassigned")}>{unassignedCount ?? "–"}</span>
      </Link>
    </nav>
  );
}
