import { describe, it, expect } from "vitest";
import { shouldDeleteEvent } from "@/lib/calendar-sync";

describe("shouldDeleteEvent", () => {
  it("returns true when session is cancelled", () => {
    expect(
      shouldDeleteEvent({
        scheduled_at: "2026-08-20T10:00:00Z",
        cancelled_at: "2026-08-19T14:00:00Z",
      })
    ).toBe(true);
  });

  it("returns true when session is unscheduled (scheduled_at is null)", () => {
    expect(
      shouldDeleteEvent({
        scheduled_at: null,
        cancelled_at: null,
      })
    ).toBe(true);
  });

  it("returns true when session is both cancelled and unscheduled", () => {
    expect(
      shouldDeleteEvent({
        scheduled_at: null,
        cancelled_at: "2026-08-19T14:00:00Z",
      })
    ).toBe(true);
  });

  it("returns false when session is scheduled and not cancelled — even 10 days in the past", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      shouldDeleteEvent({
        scheduled_at: tenDaysAgo,
        cancelled_at: null,
      })
    ).toBe(false);
  });

  it("returns false when session is scheduled and not cancelled — even 30 days in the past", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      shouldDeleteEvent({
        scheduled_at: thirtyDaysAgo,
        cancelled_at: null,
      })
    ).toBe(false);
  });

  it("returns false when session is scheduled and not cancelled — in the future", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(
      shouldDeleteEvent({
        scheduled_at: tomorrow,
        cancelled_at: null,
      })
    ).toBe(false);
  });

  it("returns false when session is scheduled and not cancelled — exactly at the 24h boundary", () => {
    const exactly24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(
      shouldDeleteEvent({
        scheduled_at: exactly24hAgo,
        cancelled_at: null,
      })
    ).toBe(false);
  });
});
