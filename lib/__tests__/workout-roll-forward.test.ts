import { describe, it, expect } from "vitest";
import { computeRollForwardPlan, resolveMaxWeek } from "../workout-roll-forward";

describe("computeRollForwardPlan", () => {
  function makeSession(
    overrides: Partial<{ id: string; session_number: number; data: Record<string, unknown> | null; archetype: string | null; status: string | null; cancelled_at: string | null; completed_at: string | null; scheduled_at: string | null; parent_session_id: string | null }> = {},
  ) {
    return {
      id: overrides.id ?? `s-${overrides.session_number ?? 0}`,
      session_number: overrides.session_number ?? 1,
      data: overrides.data ?? null,
      archetype: overrides.archetype ?? null,
      status: overrides.status ?? null,
      cancelled_at: overrides.cancelled_at ?? null,
      completed_at: overrides.completed_at ?? null,
      scheduled_at: overrides.scheduled_at ?? null,
      parent_session_id: overrides.parent_session_id ?? null,
    };
  }

  it("returns empty plan when no later sessions exist", () => {
    const sessions = [makeSession({ session_number: 1 })];
    const plan = computeRollForwardPlan(sessions, 1);
    expect(plan).toEqual([]);
  });

  it("skips completed sessions", () => {
    const sessions = [
      makeSession({ session_number: 1, completed_at: "2026-01-01T10:00:00Z" }),
      makeSession({ session_number: 2, completed_at: "2026-01-02T10:00:00Z" }),
      makeSession({ session_number: 3 }),
    ];
    const plan = computeRollForwardPlan(sessions, 1);
    expect(plan).toHaveLength(1);
    expect(plan[0].targetId).toBe("s-3");
  });

  it("skips cancelled sessions", () => {
    const sessions = [
      makeSession({ session_number: 1 }),
      makeSession({ session_number: 2, cancelled_at: "2026-01-01T10:00:00Z" }),
      makeSession({ session_number: 3 }),
    ];
    const plan = computeRollForwardPlan(sessions, 1);
    expect(plan).toHaveLength(1);
    expect(plan[0].targetId).toBe("s-3");
  });

  it("skips sub-sessions (parent_session_id set)", () => {
    const sessions = [
      makeSession({ session_number: 1 }),
      makeSession({ session_number: 2, parent_session_id: "s-1" }),
      makeSession({ session_number: 3 }),
    ];
    const plan = computeRollForwardPlan(sessions, 1);
    expect(plan).toHaveLength(1);
    expect(plan[0].targetId).toBe("s-3");
  });

  it("rolls through multiple planned sessions in order", () => {
    const sessions = [
      makeSession({ session_number: 1, data: { versions: "A" }, archetype: "A" }),
      makeSession({ session_number: 2, data: { versions: "B" }, archetype: "B" }),
      makeSession({ session_number: 3, data: { versions: "C" }, archetype: "C" }),
    ];
    const plan = computeRollForwardPlan(sessions, 1);
    expect(plan).toHaveLength(2);
    // Vacated session 1's data goes to session 2
    expect(plan[0]).toEqual({
      sourceId: "s-1",
      targetId: "s-2",
      sourceData: { versions: "A" },
      sourceArchetype: "A",
    });
    // Session 2's original data goes to session 3
    expect(plan[1]).toEqual({
      sourceId: "s-2",
      targetId: "s-3",
      sourceData: { versions: "B" },
      sourceArchetype: "B",
    });
  });

  it("only considers sessions after the vacated session", () => {
    const sessions = [
      makeSession({ session_number: 1 }),
      makeSession({ session_number: 2 }),
      makeSession({ session_number: 3 }),
    ];
    const plan = computeRollForwardPlan(sessions, 2);
    expect(plan).toHaveLength(1);
    expect(plan[0].targetId).toBe("s-3");
    expect(plan[0].sourceId).toBe("s-2");
  });

  it("skips in-progress sessions in the chain", () => {
    const sessions = [
      makeSession({ session_number: 1, data: { versions: "A" } }),
      makeSession({ session_number: 2, status: "in_progress" }),
      makeSession({ session_number: 3 }),
    ];
    const plan = computeRollForwardPlan(sessions, 1);
    // Session 2 is in_progress, so it IS rolled (in_progress is not settled)
    expect(plan).toHaveLength(2);
  });

  it("handles mixed settled and unsettled sessions", () => {
    const sessions = [
      makeSession({ session_number: 1, data: { v: "1" } }),
      makeSession({ session_number: 2, completed_at: "2026-01-01" }),
      makeSession({ session_number: 3, data: { v: "3" } }),
      makeSession({ session_number: 4, cancelled_at: "2026-01-01" }),
      makeSession({ session_number: 5, data: { v: "5" } }),
    ];
    const plan = computeRollForwardPlan(sessions, 1);
    // Skips completed #2, cancelled #4 — rolls 1→3→5
    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({ sourceId: "s-1", targetId: "s-3" });
    expect(plan[1]).toMatchObject({ sourceId: "s-3", targetId: "s-5" });
  });
});

describe("resolveMaxWeek", () => {
  it("defaults to 1 when no sessions", () => {
    expect(resolveMaxWeek([])).toBe(1);
  });

  it("returns the highest week number", () => {
    expect(resolveMaxWeek([{ week: 1 }, { week: 3 }, { week: 2 }])).toBe(3);
  });

  it("ignores sub-sessions", () => {
    expect(resolveMaxWeek([
      { week: 5, parent_session_id: "parent" },
      { week: 2 },
    ])).toBe(2);
  });

  it("treats null week as 0", () => {
    expect(resolveMaxWeek([{ week: null }, { week: 3 }])).toBe(3);
  });

  it("defaults to 1 when all weeks are null", () => {
    expect(resolveMaxWeek([{ week: null }, { week: null }])).toBe(1);
  });
});
