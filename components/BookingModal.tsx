"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { BOOKINGS_URL } from "@/lib/booking";

interface BookingModalContextValue {
  openBookingModal: () => void;
}

const BookingModalContext = createContext<BookingModalContextValue | null>(null);

/** Every "Book a Free Consultation" CTA site-wide opens this modal instead of navigating
 * away (2026-08-08, Craig's call) — the live Microsoft Bookings calendar is embedded via
 * iframe. Bookings' CSP (`frame-ancestors https:`) only allows this over HTTPS, so it won't
 * render locally on `http://localhost`; it works on any deployed (https) environment. */
export function BookingModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openBookingModal = useCallback(() => setOpen(true), []);

  return (
    <BookingModalContext.Provider value={{ openBookingModal }}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-ink/60 backdrop-blur-sm" />
          <DialogPrimitive.Content
            className="fixed left-1/2 top-1/2 z-[100] w-[calc(100vw-32px)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-warm">
              <DialogPrimitive.Title className="font-serif text-lg text-ink">Book your free consultation</DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="rounded-full p-1.5 text-slate hover:bg-warm hover:text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-rose"
                aria-label="Close booking calendar"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
            <div className="relative h-[70vh] max-h-[640px] min-h-[420px] bg-warm">
              <iframe
                src={BOOKINGS_URL}
                title="Online booking calendar"
                className="absolute inset-0 h-full w-full rounded-b-2xl border-0"
              />
            </div>
            <div className="px-5 py-3 border-t border-border-warm text-center">
              <p className="text-[12.5px] text-muted-foreground">
                Calendar not loading?{" "}
                <a href={BOOKINGS_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-rose transition-colors">
                  Open it in a new tab
                </a>{" "}
                instead, or call <a href="tel:07517658128" className="underline underline-offset-4 hover:text-rose transition-colors">07517 658 128</a>.
              </p>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </BookingModalContext.Provider>
  );
}

/** Opens the site-wide booking modal. Every "Book a Free Consultation" CTA should use this
 * instead of linking to BOOKINGS_URL directly. */
export function useBookingModal(): BookingModalContextValue {
  const ctx = useContext(BookingModalContext);
  if (!ctx) {
    throw new Error("useBookingModal must be used within a BookingModalProvider");
  }
  return ctx;
}
