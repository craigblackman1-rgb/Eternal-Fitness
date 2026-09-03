import { describe, it, expect } from "vitest";
import { nextSessionNumber, shouldCheckDuplicate } from "@/lib/session-slot";
import type { SlotRow } from "@/lib/session-slot";

describe("nextSessionNumber", () => {
  it("returns 1 for an empty block", () => {
    expect(nextSessionNumber([])).toBe(1);
  });

  it("returns max + 1 from existing slot rows", () => {
    const rows: SlotRow[] = [
      { session_number: 1, parent_session_id: null },
      { session_number: 2, parent_session_id: null },
      { session_number: 3, parent_session_id: null },
    ];
    expect(nextSessionNumber(rows)).toBe(4);
  });

  it("ignores sub-sessions when computing the next number", () => {
    const rows: SlotRow[] = [
      { session_number: 1, parent_session_id: null },
      { session_number: 1, parent_session_id: "parent-uuid" },
      { session_number: 1, parent_session_id: "parent-uuid" },
      { session_number: 2, parent_session_id: null },
    ];
    expect(nextSessionNumber(rows)).toBe(3);
  });

  it("returns 1 when all rows are sub-sessions", () => {
    const rows: SlotRow[] = [
      { session_number: 1, parent_session_id: "parent-uuid" },
      { session_number: 1, parent_session_id: "parent-uuid" },
    ];
    expect(nextSessionNumber(rows)).toBe(1);
  });

  it("handles non-contiguous slot numbers", () => {
    const rows: SlotRow[] = [
      { session_number: 1, parent_session_id: null },
      { session_number: 5, parent_session_id: null },
    ];
    expect(nextSessionNumber(rows)).toBe(6);
  });
});

describe("shouldCheckDuplicate", () => {
  it("returns true when parent_session_id is null", () => {
    expect(shouldCheckDuplicate(null)).toBe(true);
  });

  it("returns true when parent_session_id is undefined", () => {
    expect(shouldCheckDuplicate(undefined)).toBe(true);
  });

  it("returns false when parent_session_id is set", () => {
    expect(shouldCheckDuplicate("some-uuid")).toBe(false);
  });
});
