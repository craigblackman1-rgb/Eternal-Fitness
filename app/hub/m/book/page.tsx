"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  todayLocalISODate,
  shiftDay,
} from "@/lib/schedule-dates";

interface ClientOption {
  id: string;
  name: string;
  client_number: number | null;
}

interface BlockOption {
  id: string;
  block_number: number;
  status: string;
  block_note: string | null;
}

interface OutlookBookingRow {
  id: string;
  subject: string;
  start_at: string;
  parsed_name: string | null;
  status: string;
}

const ICO = {
  back: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  exit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  client: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
    </svg>
  ),
  block: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>
  ),
  when: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  warn: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
      <path d="M12 9v4M12 17h.01"/>
    </svg>
  ),
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export default function BookSessionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const scope = (searchParams.get("scope") as "trainer" | "client") || "client";
  const preselectClientNumber = searchParams.get("client");
  const preselectDay = searchParams.get("day") || todayLocalISODate();
  const bookingId = searchParams.get("booking");
  const isBookingConfirm = !!bookingId;

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(preselectDay);
  const [time, setTime] = useState<string>("10:00");
  const [loadingClients, setLoadingClients] = useState(scope === "trainer");
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<OutlookBookingRow | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(isBookingConfirm);
  const [bookingGone, setBookingGone] = useState<string | null>(null);

  const isTrainerScope = scope === "trainer";
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  // Load clients in trainer scope; resolve preselected client in client scope.
  // In booking-confirm mode the client picker is always the full trainer list
  // (this triage flow is trainer-scope only, per the mockup) — pre-select
  // happens separately once the booking's parsed_name is known.
  useEffect(() => {
    if (isTrainerScope || isBookingConfirm) {
      setLoadingClients(true);
      fetch("/api/clients")
        .then((res) => (res.ok ? res.json() : []))
        .then((list: ClientOption[]) => {
          setClients(list);
          if (preselectClientNumber) {
            const matched = list.find((c) => String(c.client_number) === preselectClientNumber);
            if (matched) setSelectedClientId(matched.id);
          }
        })
        .finally(() => setLoadingClients(false));
    } else if (preselectClientNumber) {
      fetch(`/api/clients/${preselectClientNumber}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((c: ClientOption | null) => {
          if (c) {
            setClients([c]);
            setSelectedClientId(c.id);
          }
        });
    }
  }, [isTrainerScope, isBookingConfirm, preselectClientNumber]);

  // Booking-confirm mode: fetch the queue and find this row (no single-booking
  // GET route exists — filtering the list client-side is fine at this scale).
  // Once clients have loaded, pre-select on an exact case-insensitive
  // parsed_name match.
  useEffect(() => {
    if (!bookingId) return;
    setLoadingBooking(true);
    fetch("/api/outlook-bookings?status=all")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: OutlookBookingRow[]) => {
        const found = list.find((b) => b.id === bookingId) ?? null;
        if (!found) {
          setBookingGone("This booking no longer exists.");
        } else if (found.status !== "open") {
          setBookingGone(`This booking has already been ${found.status}.`);
        } else {
          setBooking(found);
        }
      })
      .finally(() => setLoadingBooking(false));
  }, [bookingId]);

  useEffect(() => {
    if (!booking?.parsed_name || clients.length === 0 || selectedClientId) return;
    const needle = booking.parsed_name.trim().toLowerCase();
    const match = clients.find((c) => c.name.trim().toLowerCase() === needle);
    if (match) setSelectedClientId(match.id);
  }, [booking, clients, selectedClientId]);

  // Load blocks for selected client.
  useEffect(() => {
    if (!selectedClientId) {
      setBlocks([]);
      setSelectedBlockId(null);
      return;
    }
    setLoadingBlocks(true);
    fetch(`/api/clients/${selectedClientId}/blocks`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: BlockOption[]) => {
        const ordered = list.sort((a, b) => b.block_number - a.block_number);
        setBlocks(ordered);
        const current =
          ordered.find((b) => b.status === "active") ??
          ordered.find((b) => b.status === "approved") ??
          ordered[0] ??
          null;
        setSelectedBlockId(current?.id ?? null);
      })
      .finally(() => setLoadingBlocks(false));
  }, [selectedClientId]);

  const canSubmit = isBookingConfirm
    ? !!(selectedClientId && selectedBlockId && booking && !submitting)
    : !!(selectedClientId && selectedBlockId && date && time && !submitting);

  const backHref = isTrainerScope ? "/hub/m/calendar" : `/hub/m/clients/${preselectClientNumber ?? ""}`;

  // A booking that's already gone (resolved by someone else, or deleted) has
  // nothing left to confirm — bounce back to the triage list rather than
  // showing a dead form.
  useEffect(() => {
    if (bookingGone) {
      toast.error(bookingGone);
      router.push("/hub/m/calendar");
    }
  }, [bookingGone, router]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    if (isBookingConfirm && booking) {
      try {
        const res = await fetch(`/api/outlook-bookings/${booking.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: selectedClientId, blockId: selectedBlockId }),
        });
        if (res.status === 409) {
          toast.error("Someone already resolved this booking");
          router.push("/hub/m/calendar");
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to confirm booking");
        }
        toast.success("Booking confirmed");
        router.push("/hub/m/calendar");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to confirm booking");
        setSubmitting(false);
      }
      return;
    }

    try {
      const [y, mo, d] = date.split("-").map(Number);
      const [h, min] = time.split(":").map(Number);
      const scheduledAt = new Date(y, mo - 1, d, h, min, 0, 0).toISOString();

      const res = await fetch(`/api/blocks/${selectedBlockId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: scheduledAt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to book session");
      }
      toast.success("Session booked");
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book session");
      setSubmitting(false);
    }
  }, [canSubmit, date, time, selectedBlockId, selectedClientId, backHref, router, isBookingConfirm, booking]);

  function formatBookingContext(startAt: string): string {
    const d = new Date(startAt);
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) +
      " · " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  const scopeName = selectedClient?.name ?? (isTrainerScope ? "All clients" : "—");
  const scopeLabel = isTrainerScope ? "Trainer scope" : "Booking for client";

  return (
    <>
      <header className="mtop">
        <div className="mtop-row">
          <Link className="mtop-back" href={backHref} aria-label="Back">
            {ICO.back}
          </Link>
          <div className="mtop-id">
            <div className="mtop-t">{isBookingConfirm ? "Confirm booking" : "Book session"}</div>
            <div className="mtop-s">
              {isBookingConfirm
                ? "Match this Outlook booking to a client and program"
                : "Writes scheduled_at — syncs to Outlook"}
            </div>
          </div>
        </div>
      </header>

      <div className="scope-bar">
        <span className="scope-av">
          {selectedClient ? initials(selectedClient.name) : "EF"}
        </span>
        <div className="scope-txt">
          <div className="scope-lbl">{scopeLabel}</div>
          <div className="scope-name">{scopeName}</div>
        </div>
        <Link className="scope-exit" href={backHref}>
          {ICO.exit}
          Exit
        </Link>
      </div>

      <main className="mcontent">
        {isTrainerScope && (
          <div className="panel" data-od-id="client-picker">
            <div className="panel-h">
              <span className="panel-h-ic ic-rose">{ICO.client}</span>
              <span>
                <span className="panel-h-t">Which client?</span>
                <span className="panel-h-s">Pick the client first.</span>
              </span>
            </div>
            <div className="panel-b">
              {loadingClients ? (
                <div className="pick-loading">Loading clients…</div>
              ) : clients.length === 0 ? (
                <div className="pick-empty">No clients found.</div>
              ) : (
                clients.map((c) => {
                  const selected = selectedClientId === c.id;
                  return (
                    <button
                      key={c.id}
                      className={`pick-item${selected ? " selected" : ""}`}
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setSelectedBlockId(null);
                      }}
                      data-od-id={`pick-${c.client_number ?? c.id}`}
                    >
                      <span className="pick-av">{initials(c.name)}</span>
                      <span className="pick-b">
                        <span className="pick-t">{c.name}</span>
                      </span>
                      <span className="pick-check">
                        {selected ? ICO.check : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="panel" data-od-id="block-picker">
          <div className="panel-h">
            <span className="panel-h-ic ic-slate">{ICO.block}</span>
            <span>
              <span className="panel-h-t">Which program?</span>
              <span className="panel-h-s">
                {selectedClient ? `For ${firstName(selectedClient.name)}` : "Pick a client first"}
              </span>
            </span>
          </div>
          <div className="panel-b">
            {loadingBlocks ? (
              <div className="pick-loading">Loading programs…</div>
            ) : !selectedClientId ? (
              <div className="pick-empty">Pick a client first.</div>
            ) : blocks.length === 0 ? (
              <div className="pick-empty">This client has no program yet.</div>
            ) : (
              blocks.map((b) => {
                const selected = selectedBlockId === b.id;
                return (
                  <button
                    key={b.id}
                    className={`pick-item${selected ? " selected" : ""}`}
                    onClick={() => setSelectedBlockId(b.id)}
                  >
                    <span className="pick-b">
                      <span className="pick-t">
                        Program {b.block_number}
                        {b.block_note ? ` · ${b.block_note}` : ""}
                      </span>
                      <span className="pick-m">{b.status}</span>
                    </span>
                    <span className="pick-check">{selected ? ICO.check : null}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {isBookingConfirm && (loadingBooking || booking) && (
          <div className="alert a-warning" data-od-id="booking-context">
            <span className="alert-ic">{ICO.warn}</span>
            <div>
              <b>From Microsoft Bookings</b>
              {loadingBooking
                ? "Loading…"
                : `"${booking!.subject}" · ${formatBookingContext(booking!.start_at)}. Confirm who and which program it belongs to — then it becomes a real session.`}
            </div>
          </div>
        )}

        {!isBookingConfirm && (
          <div className="panel" data-od-id="when-picker">
            <div className="panel-h">
              <span className="panel-h-ic ic-teal">{ICO.when}</span>
              <span>
                <span className="panel-h-t">When</span>
                <span className="panel-h-s">Writes scheduled_at — Outlook sync fires automatically</span>
              </span>
            </div>
            <div className="panel-b">
              <div className="field">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  min={shiftDay(todayLocalISODate(), -90)}
                  max={shiftDay(todayLocalISODate(), 365)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="time">Time</label>
                <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <button
          className="btn btn-primary full"
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-od-id="confirm-booking"
        >
          {submitting ? (isBookingConfirm ? "Confirming…" : "Booking…") : "Confirm booking"}
        </button>
      </main>
    </>
  );
}
