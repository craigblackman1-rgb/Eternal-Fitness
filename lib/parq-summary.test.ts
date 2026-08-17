import { describe, it, expect } from "vitest";
import { buildParqSection } from "@/lib/parq-summary";
import { questionTextMap } from "@/lib/parq-data";
import type { SignedPARQ } from "@/types";

function makeParq(overrides: Partial<SignedPARQ> = {}): SignedPARQ {
  const base: Record<string, unknown> = { created_at: "2026-01-01T00:00:00Z" };
  // Default every screening question to "no".
  for (const q of Object.keys(questionTextMap)) base[q] = "no";
  return { ...base, ...overrides } as unknown as SignedPARQ;
}

describe("buildParqSection", () => {
  it("returns the no-PAR-Q warning when passed null", () => {
    const result = buildParqSection(null);
    expect(result).toContain("No PAR-Q on file");
    expect(result).toContain("flag this to Esther");
  });

  it("includes the submission date", () => {
    const result = buildParqSection(makeParq({ created_at: "2026-03-15T10:00:00Z" }));
    expect(result).toContain("PAR-Q submitted 2026-03-15T10:00:00Z");
  });

  it("reports no flagged answers when nothing is answered yes", () => {
    const result = buildParqSection(makeParq());
    expect(result).toContain("None — no risk factors flagged.");
  });

  it("lists the text of each question answered yes", () => {
    const result = buildParqSection(makeParq({ q1: "yes", q7: "yes" } as Partial<SignedPARQ>));
    expect(result).toContain(`- ${questionTextMap.q1}`);
    expect(result).toContain(`- ${questionTextMap.q7}`);
    expect(result).not.toContain("None — no risk factors flagged.");
  });

  it("reports no client detail when free-text fields are empty", () => {
    const result = buildParqSection(makeParq());
    expect(result).toContain("None provided.");
  });

  it("includes populated free-text detail fields with their labels", () => {
    const result = buildParqSection(
      makeParq({ conditions: "Asthma", medications: "Inhaler" }),
    );
    expect(result).toContain("Conditions: Asthma");
    expect(result).toContain("Medications: Inhaler");
    expect(result).not.toContain("None provided.");
  });
});
