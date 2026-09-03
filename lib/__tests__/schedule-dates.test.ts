import { describe, it, expect } from "vitest";
import {
  projectUnbookedDates,
  groupSessionsByWeek,
  isoToMonday,
  shiftDay,
} from "../schedule-dates";
import type { Weekday } from "@/lib/scheduling";

// ---------------------------------------------------------------------------
// Helper: build a minimal session object for testing
// ---------------------------------------------------------------------------
function makeSession(
  overrides: {
    id?: string;
    scheduled_at?: string | null;
    week?: number;
    completed_at?: string | null;
    cancelled_at?: string | null;
    parent_session_id?: string | null;
  } = {},
) {
  return {
    id: overrides.id ?? `s-${Math.random().toString(36).slice(2, 8)}`,
    scheduled_at: overrides.scheduled_at ?? null,
    week: overrides.week ?? 1,
    completed_at: overrides.completed_at ?? null,
    cancelled_at: overrides.cancelled_at ?? null,
    parent_session_id: overrides.parent_session_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// projectUnbookedDates
// ---------------------------------------------------------------------------
describe("projectUnbookedDates", () => {
  it("returns empty array of results when all sessions are booked", () => {
    const sessions = [
      makeSession({ id: "a", scheduled_at: "2026-08-03T10:00:00" }), // Mon
      makeSession({ id: "b", scheduled_at: "2026-08-05T10:00:00" }), // Wed
    ];
    const result = projectUnbookedDates(sessions, [1, 3], "2026-08-05", "2026-08-03");
    // No unbooked sessions → projected_at is empty string (sentinel)
    expect(result.every((s) => s.projected_at === "")).toBe(true);
  });

  it("projects unbooked sessions onto Mon/Wed/Fri pattern continuing across a month boundary", () => {
    // Last booked: Fri 28 Aug 2026. Pattern: Mon/Wed/Fri.
    // Next unbooked should land on Mon 31 Aug, then Wed 2 Sep, etc.
    const sessions = [
      makeSession({ id: "booked1", scheduled_at: "2026-08-26T10:00:00" }), // Tue — but pattern is Mon/Wed/Fri
      makeSession({ id: "booked2", scheduled_at: "2026-08-28T10:00:00" }), // Fri
      makeSession({ id: "unbooked1", week: 5 }),
      makeSession({ id: "unbooked2", week: 5 }),
    ];
    const result = projectUnbookedDates(sessions, [1, 3, 5], "2026-08-28", "2026-08-03");

    const unbooked1 = result.find((s) => s.id === "unbooked1")!;
    const unbooked2 = result.find((s) => s.id === "unbooked2")!;

    // After Fri 28 Aug, next Mon/Wed/Fri is Mon 31 Aug
    expect(unbooked1.projected_at).toBe("2026-08-31");
    // Then Wed 2 Sep
    expect(unbooked2.projected_at).toBe("2026-09-02");
  });

  it("falls back to most common weekday gap when weekdays array is empty", () => {
    // Booked sessions on Mon 3 Aug and Thu 6 Aug → gap of 3 days → fallback weekday = Thu (4)
    const sessions = [
      makeSession({ id: "booked1", scheduled_at: "2026-08-03T10:00:00" }), // Mon
      makeSession({ id: "booked2", scheduled_at: "2026-08-06T10:00:00" }), // Thu
      makeSession({ id: "unbooked1", week: 2 }),
    ];
    const result = projectUnbookedDates(sessions, [], "2026-08-06", "2026-08-03");

    const unbooked1 = result.find((s) => s.id === "unbooked1")!;
    // After Thu 6 Aug, next Thu is 13 Aug
    expect(unbooked1.projected_at).toBe("2026-08-13");
  });

  it("starts from scheduledStartIso when there are no booked sessions", () => {
    const sessions = [
      makeSession({ id: "unbooked1", week: 1 }),
      makeSession({ id: "unbooked2", week: 1 }),
    ];
    const result = projectUnbookedDates(sessions, [1, 3], null, "2026-08-03");

    const unbooked1 = result.find((s) => s.id === "unbooked1")!;
    const unbooked2 = result.find((s) => s.id === "unbooked2")!;

    // Start from Mon 3 Aug, pattern Mon/Wed → first is Mon 3 Aug, second is Wed 5 Aug
    expect(unbooked1.projected_at).toBe("2026-08-03");
    expect(unbooked2.projected_at).toBe("2026-08-05");
  });

  it("returns empty projected_at for sessions when no input sessions", () => {
    const result = projectUnbookedDates([], [1, 3], null, null);
    expect(result).toEqual([]);
  });

  it("does not mutate the original session objects", () => {
    const sessions = [
      makeSession({ id: "u1", week: 1 }),
    ];
    const original = { ...sessions[0] };
    projectUnbookedDates(sessions, [1], null, "2026-08-03");
    expect(sessions[0]).toEqual(original);
  });

  it("skips cancelled and completed sessions when identifying unbooked", () => {
    const sessions = [
      makeSession({ id: "cancelled", cancelled_at: "2026-08-03T10:00:00", week: 1 }),
      makeSession({ id: "completed", completed_at: "2026-08-03T10:00:00", week: 1 }),
      makeSession({ id: "unbooked", week: 1 }),
    ];
    const result = projectUnbookedDates(sessions, [1], null, "2026-08-03");
    const unbooked = result.find((s) => s.id === "unbooked")!;
    expect(unbooked.projected_at).toBe("2026-08-03");
  });

  it("skips sub-sessions (parent_session_id set)", () => {
    const sessions = [
      makeSession({ id: "parent", scheduled_at: "2026-08-03T10:00:00" }),
      makeSession({ id: "sub", parent_session_id: "parent", week: 1 }),
      makeSession({ id: "unbooked", week: 1 }),
    ];
    const result = projectUnbookedDates(sessions, [1], "2026-08-03", "2026-08-03");
    const sub = result.find((s) => s.id === "sub")!;
    // Sub-session should not get a projected_at (it's not a pot session)
    expect(sub.projected_at).toBe("");
  });
});

// ---------------------------------------------------------------------------
// groupSessionsByWeek — with projected_at
// ---------------------------------------------------------------------------
describe("groupSessionsByWeek with projected sessions", () => {
  it("groups projected sessions into 'Week of <Monday>' groups, not 'Plan week N'", () => {
    const sessions = [
      makeSession({ id: "s1", scheduled_at: "2026-08-03T10:00:00", week: 1 }), // Mon 3 Aug
      { ...makeSession({ id: "p1", week: 2 }), projected_at: "2026-08-10" },   // Mon 10 Aug
      { ...makeSession({ id: "p2", week: 2 }), projected_at: "2026-08-12" },   // Wed 12 Aug
    ];

    const groups = groupSessionsByWeek(sessions);

    // Should have 2 groups, both scheduled/projected (with monday set), no plan groups
    expect(groups).toHaveLength(2);
    expect(groups[0].kind).toBe("scheduled");
    expect(groups[0].monday).toBe("2026-08-03");
    expect(groups[1].kind).toBe("projected");
    expect(groups[1].monday).toBe("2026-08-10");
  });

  it("mixes scheduled and projected sessions in the same week correctly", () => {
    const sessions = [
      makeSession({ id: "s1", scheduled_at: "2026-08-05T10:00:00", week: 1 }), // Wed 5 Aug
      { ...makeSession({ id: "p1", week: 1 }), projected_at: "2026-08-03" },   // Mon 3 Aug (same week)
    ];

    const groups = groupSessionsByWeek(sessions);

    // Both land in the week of Mon 3 Aug
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("scheduled"); // has at least one scheduled_at
    expect(groups[0].monday).toBe("2026-08-03");
    expect(groups[0].sessions).toHaveLength(2);
  });

  it("still produces plan groups for sessions with no scheduled_at and no projected_at", () => {
    const sessions = [
      makeSession({ id: "s1", scheduled_at: "2026-08-03T10:00:00", week: 1 }),
      makeSession({ id: "unscheduled", week: 3 }), // no date at all
    ];

    const groups = groupSessionsByWeek(sessions);

    expect(groups).toHaveLength(2);
    expect(groups[0].kind).toBe("scheduled");
    expect(groups[1].kind).toBe("plan");
    expect(groups[1].planWeek).toBe(3);
  });
});
