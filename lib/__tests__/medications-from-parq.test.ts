import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseMedicationsText, mergeMedications } from "../medications-from-parq";
import type { MedicationEntry } from "@/types";

let uidCounter = 0;
beforeEach(() => {
  uidCounter = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `test-uid-${++uidCounter}`);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseMedicationsText", () => {
  it("returns empty array for empty string", () => {
    expect(parseMedicationsText("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(parseMedicationsText("   ")).toEqual([]);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseMedicationsText(null as unknown as string)).toEqual([]);
    expect(parseMedicationsText(undefined as unknown as string)).toEqual([]);
  });

  it("parses a single medication", () => {
    const result = parseMedicationsText("Metformin 500mg");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Metformin 500mg");
    expect(result[0].form).toBe("");
    expect(result[0].id).toBe("test-uid-1");
  });

  it("splits on commas", () => {
    const result = parseMedicationsText("Bisoprolol, Atorvastatin, Amlodipine");
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.name)).toEqual(["Bisoprolol", "Atorvastatin", "Amlodipine"]);
  });

  it("splits on semicolons", () => {
    const result = parseMedicationsText("Metformin; Insulin; Paracetamol");
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.name)).toEqual(["Metformin", "Insulin", "Paracetamol"]);
  });

  it("splits on newlines", () => {
    const result = parseMedicationsText("Metformin\nInsulin\nParacetamol");
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.name)).toEqual(["Metformin", "Insulin", "Paracetamol"]);
  });

  it("splits on ' and ' (case-insensitive)", () => {
    const result = parseMedicationsText("Metformin and Insulin and Paracetamol");
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.name)).toEqual(["Metformin", "Insulin", "Paracetamol"]);
  });

  it("splits on mixed separators", () => {
    const result = parseMedicationsText("Metformin, Bisoprolol and Atorvastatin; Amlodipine");
    expect(result).toHaveLength(4);
    expect(result.map((m) => m.name)).toEqual([
      "Metformin",
      "Bisoprolol",
      "Atorvastatin",
      "Amlodipine",
    ]);
  });

  it("trims whitespace from tokens", () => {
    const result = parseMedicationsText("  Metformin ,  Insulin  ");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Metformin");
    expect(result[1].name).toBe("Insulin");
  });

  it("drops empty tokens from trailing separators", () => {
    const result = parseMedicationsText("Metformin,");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Metformin");
  });

  it("populates only name, leaves other fields blank", () => {
    const result = parseMedicationsText("Metformin");
    expect(result[0]).toEqual({
      id: "test-uid-1",
      name: "Metformin",
      form: "",
      frequency: "",
      treats: "",
      start_date: null,
      end_date: null,
      side_effects: "",
    });
  });
});

describe("mergeMedications", () => {
  const makeMed = (name: string): MedicationEntry => ({
    id: `id-${name}`,
    name,
    form: "",
    frequency: "",
    treats: "",
    start_date: null,
    end_date: null,
    side_effects: "",
  });

  it("returns incoming when existing is empty", () => {
    const incoming = [makeMed("Metformin"), makeMed("Insulin")];
    const result = mergeMedications([], incoming);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.name)).toEqual(["Metformin", "Insulin"]);
  });

  it("returns existing unchanged when incoming is empty", () => {
    const existing = [makeMed("Metformin")];
    const result = mergeMedications(existing, []);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Metformin");
  });

  it("appends only new medications (no duplicates)", () => {
    const existing = [makeMed("Metformin"), makeMed("Bisoprolol")];
    const incoming = [makeMed("Bisoprolol"), makeMed("Atorvastatin")];
    const result = mergeMedications(existing, incoming);
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.name)).toEqual(["Metformin", "Bisoprolol", "Atorvastatin"]);
  });

  it("deduplicates case-insensitively", () => {
    const existing = [makeMed("metformin")];
    const incoming = [makeMed("Metformin")];
    const result = mergeMedications(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("metformin");
  });

  it("does not mutate the existing array", () => {
    const existing = [makeMed("Metformin")];
    const incoming = [makeMed("Insulin")];
    mergeMedications(existing, incoming);
    expect(existing).toHaveLength(1);
  });

  it("does not mutate the incoming array", () => {
    const existing = [makeMed("Metformin")];
    const incoming = [makeMed("Metformin")];
    mergeMedications(existing, incoming);
    expect(incoming).toHaveLength(1);
  });

  it("preserves existing entry objects (never overwrites)", () => {
    const existing: MedicationEntry[] = [
      { ...makeMed("Metformin"), form: "tablet", frequency: "twice daily" },
    ];
    const incoming = [makeMed("Metformin")];
    const result = mergeMedications(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].form).toBe("tablet");
    expect(result[0].frequency).toBe("twice daily");
  });
});
