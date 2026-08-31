import { describe, it, expect } from "vitest";
import { parseClientNameFromSubject } from "@/lib/outlook-bookings";

describe("parseClientNameFromSubject", () => {
  it("extracts name from standard Bookings subject", () => {
    expect(parseClientNameFromSubject("Personal Training - Tom Putnam")).toBe("Tom Putnam");
  });

  it("extracts name from Online Personal Training subject", () => {
    expect(parseClientNameFromSubject("Online Personal Training - anne wareing")).toBe("anne wareing");
  });

  it("extracts name from Initial consult subject", () => {
    expect(parseClientNameFromSubject("Initial consult - Becky")).toBe("Becky");
  });

  it("extracts name from Online Initial consult subject", () => {
    expect(parseClientNameFromSubject("Online Initial consult - Becky")).toBe("Becky");
  });

  it("handles all-lowercase Online Personal Training", () => {
    expect(parseClientNameFromSubject("online personal training - jo")).toBe("jo");
  });

  it("returns null for unrelated subject", () => {
    expect(parseClientNameFromSubject("Gym induction")).toBeNull();
  });

  it("returns null when subject has the prefix but no dash/name", () => {
    expect(parseClientNameFromSubject("Personal Training")).toBeNull();
  });

  it("trims surrounding whitespace on the subject", () => {
    expect(parseClientNameFromSubject("  Personal Training - Tom Putnam  ")).toBe("Tom Putnam");
  });
});
