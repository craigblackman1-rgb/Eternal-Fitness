import { describe, it, expect } from "vitest";
import { toIsoTimestamp } from "../pg-timestamp";

describe("toIsoTimestamp", () => {
  it("returns null and undefined as null", () => {
    expect(toIsoTimestamp(null)).toBeNull();
    expect(toIsoTimestamp(undefined as unknown as null)).toBeNull();
  });

  it("converts the raw Postgres timestamptz form WebKit cannot parse", () => {
    expect(toIsoTimestamp("2026-09-03 18:00:00+01")).toBe("2026-09-03T18:00:00+01:00");
  });

  it("handles a UTC offset", () => {
    expect(toIsoTimestamp("2026-09-03 18:00:00+00")).toBe("2026-09-03T18:00:00+00:00");
  });

  it("handles a negative offset", () => {
    expect(toIsoTimestamp("2026-01-15 09:30:00-05")).toBe("2026-01-15T09:30:00-05:00");
  });

  it("handles a half-hour offset, colonised or not", () => {
    expect(toIsoTimestamp("2026-09-03 18:00:00+0530")).toBe("2026-09-03T18:00:00+05:30");
    expect(toIsoTimestamp("2026-09-03 18:00:00+05:30")).toBe("2026-09-03T18:00:00+05:30");
  });

  it("truncates Postgres microseconds to milliseconds", () => {
    expect(toIsoTimestamp("2026-09-03 18:00:00.123456+01")).toBe("2026-09-03T18:00:00.123+01:00");
  });

  it("leaves a timestamp without time zone alone apart from the T", () => {
    expect(toIsoTimestamp("2026-09-03 18:00:00")).toBe("2026-09-03T18:00:00");
  });

  it("leaves a bare date untouched — it is already ISO", () => {
    expect(toIsoTimestamp("2026-09-03")).toBe("2026-09-03");
  });

  it("passes through values that are already ISO", () => {
    expect(toIsoTimestamp("2026-09-03T18:00:00.000Z")).toBe("2026-09-03T18:00:00.000Z");
  });

  it("passes through Postgres infinity values", () => {
    expect(toIsoTimestamp("infinity")).toBe("infinity");
    expect(toIsoTimestamp("-infinity")).toBe("-infinity");
  });

  it("PRESERVES THE DATE PREFIX — the reason this is not toISOString()", () => {
    // 00:30 at +01 is the previous day in UTC. Code in this repo slices the first
    // 10 chars to get a date, so a UTC conversion here would silently shift it.
    const raw = "2026-09-03 00:30:00+01";
    const iso = toIsoTimestamp(raw)!;
    // The date prefix survives, which is what the .slice(0, 10) callers rely on.
    expect(iso.slice(0, 10)).toBe("2026-09-03");
    // Whereas converting to UTC would have moved it back a day.
    expect(new Date(iso).toISOString().slice(0, 10)).toBe("2026-09-02");
  });

  it("produces something every engine parses to the same instant", () => {
    const iso = toIsoTimestamp("2026-09-03 18:00:00+01")!;
    expect(Number.isNaN(new Date(iso).getTime())).toBe(false);
    expect(new Date(iso).toISOString()).toBe("2026-09-03T17:00:00.000Z");
  });

  it("a bare two-digit offset is unparseable even with a T — so the offset must be normalised too", () => {
    expect(Number.isNaN(new Date("2026-09-03T00:30:00+01").getTime())).toBe(true);
    expect(Number.isNaN(new Date(toIsoTimestamp("2026-09-03 00:30:00+01")!).getTime())).toBe(false);
  });
});
