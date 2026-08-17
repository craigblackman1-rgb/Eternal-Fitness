import { describe, it, expect } from "vitest";
import { diffParq } from "@/lib/parq-diff";
import { questionTextMap } from "@/lib/parq-data";
import type { SignedPARQ } from "@/types";

function makeParq(overrides: Partial<SignedPARQ> = {}): SignedPARQ {
  const base: Record<string, unknown> = {};
  for (const q of Object.keys(questionTextMap)) base[q] = "no";
  return { ...base, ...overrides } as unknown as SignedPARQ;
}

describe("diffParq", () => {
  it("returns an empty array when the two submissions are identical", () => {
    const p = makeParq({ email: "a@b.com", phone: "123" });
    expect(diffParq(p, p)).toEqual([]);
  });

  it("detects a changed contact field", () => {
    const older = makeParq({ email: "old@b.com" });
    const newer = makeParq({ email: "new@b.com" });
    const diffs = diffParq(older, newer);
    expect(diffs).toContainEqual({ label: "Email", from: "old@b.com", to: "new@b.com" });
  });

  it("detects a changed screening question using its question text as the label", () => {
    const older = makeParq({ q1: "no" } as Partial<SignedPARQ>);
    const newer = makeParq({ q1: "yes" } as Partial<SignedPARQ>);
    const diffs = diffParq(older, newer);
    expect(diffs).toContainEqual({ label: questionTextMap.q1, from: "no", to: "yes" });
  });

  it("detects a changed free-text field", () => {
    const older = makeParq({ conditions: null });
    const newer = makeParq({ conditions: "Diabetes" });
    const diffs = diffParq(older, newer);
    expect(diffs).toContainEqual({ label: "Conditions (detail)", from: "\u2014", to: "Diabetes" });
  });

  it("renders empty/null values as an em dash placeholder", () => {
    const older = makeParq({ phone: "555" });
    const newer = makeParq({ phone: null });
    const diffs = diffParq(older, newer);
    expect(diffs).toContainEqual({ label: "Phone", from: "555", to: "\u2014" });
  });

  it("treats null and empty string as equal (no diff emitted)", () => {
    const older = makeParq({ address: null });
    const newer = makeParq({ address: "" });
    expect(diffParq(older, newer)).toEqual([]);
  });

  it("collects multiple diffs at once", () => {
    const older = makeParq({ email: "a@b.com", phone: "111" });
    const newer = makeParq({ email: "c@d.com", phone: "222" });
    const diffs = diffParq(older, newer);
    expect(diffs).toHaveLength(2);
  });
});
