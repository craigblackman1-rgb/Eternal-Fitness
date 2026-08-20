"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconCalendar } from "@/components/icons";

/** CR-EF-050 — route-in badge for the Outlook Bookings reconciliation queue,
 *  shown on both the day and month schedule views. Renders nothing until the
 *  count is known, and nothing at all when there's nothing to reconcile. */
export function OutlookBookingsBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/outlook-bookings?status=open&count=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled && body) setCount(body.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!count) return null;

  return (
    <Button variant="outline" asChild className="relative rounded-lg pr-7">
      <Link href="/hub/schedule/outlook" title="Reconcile bookings made via the Outlook Bookings form that haven't reached the app yet">
        <IconCalendar className="h-4 w-4 mr-1.5" />
        Outlook bookings
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full bg-[var(--color-rose)] text-white text-[11px] font-bold leading-5 text-center px-1 border-2 border-[var(--hub-card)]">
          {count}
        </span>
      </Link>
    </Button>
  );
}
