import { describe, it, expect } from "vitest";
import { normaliseClientEquipment, clientEquipmentNames, formatClientEquipment } from "../client-equipment";

describe("normaliseClientEquipment", () => {
  it("returns null for null/undefined", () => {
    expect(normaliseClientEquipment(null)).toBeNull();
    expect(normaliseClientEquipment(undefined)).toBeNull();
  });

  it("returns null for non-array values", () => {
    expect(normaliseClientEquipment("string")).toBeNull();
    expect(normaliseClientEquipment(42)).toBeNull();
    expect(normaliseClientEquipment({})).toBeNull();
  });

  it("returns empty array for empty array", () => {
    expect(normaliseClientEquipment([])).toEqual([]);
  });

  it("normalises a legacy string array to {name, detail} objects", () => {
    const result = normaliseClientEquipment(["Dumbbells", "Resistance bands"]);
    expect(result).toEqual([
      { name: "Dumbbells", detail: "" },
      { name: "Resistance bands", detail: "" },
    ]);
  });

  it("trims whitespace and drops empty strings from string array", () => {
    const result = normaliseClientEquipment(["  Dumbbells  ", "", "  ", "Kettlebells"]);
    expect(result).toEqual([
      { name: "Dumbbells", detail: "" },
      { name: "Kettlebells", detail: "" },
    ]);
  });

  it("normalises a {name, detail} object array (current write shape)", () => {
    const input = [
      { name: "Dumbbells", detail: "2-20kg pairs" },
      { name: "Resistance bands", detail: "" },
    ];
    const result = normaliseClientEquipment(input);
    expect(result).toEqual(input);
  });

  it("normalises mixed shapes (objects with missing fields)", () => {
    const input = [
      { name: "Dumbbells", detail: "2-20kg" },
      { name: "Step box" },
      { detail: "unknown" },
    ];
    const result = normaliseClientEquipment(input);
    // The function filters out entries where name is empty after trim
    expect(result).toEqual([
      { name: "Dumbbells", detail: "2-20kg" },
      { name: "Step box", detail: "" },
    ]);
  });

  it("filters out entries with empty name in object array", () => {
    const input = [
      { name: "Dumbbells", detail: "20kg" },
      { name: "", detail: "something" },
      { name: "  ", detail: "something" },
    ];
    const result = normaliseClientEquipment(input);
    expect(result).toEqual([
      { name: "Dumbbells", detail: "20kg" },
    ]);
  });

  it("returns null for array with no recognisable first element", () => {
    expect(normaliseClientEquipment([42])).toBeNull();
    expect(normaliseClientEquipment([true])).toBeNull();
  });
});

describe("clientEquipmentNames", () => {
  it("returns null for null input", () => {
    expect(clientEquipmentNames(null)).toBeNull();
  });

  it("extracts names from {name, detail} objects", () => {
    const input = [
      { name: "Dumbbells", detail: "20kg" },
      { name: "Step box", detail: "" },
    ];
    expect(clientEquipmentNames(input)).toEqual(["Dumbbells", "Step box"]);
  });

  it("extracts names from legacy string array", () => {
    expect(clientEquipmentNames(["Dumbbells", "Step box"])).toEqual(["Dumbbells", "Step box"]);
  });

  it("returns empty array for empty array", () => {
    expect(clientEquipmentNames([])).toEqual([]);
  });
});

describe("formatClientEquipment", () => {
  it("returns 'Not specified' for null", () => {
    expect(formatClientEquipment(null)).toBe("Not specified");
  });

  it("returns 'Bodyweight only' for empty array", () => {
    expect(formatClientEquipment([])).toBe("Bodyweight only");
  });

  it("formats entries without detail", () => {
    const input = [{ name: "Dumbbells", detail: "" }, { name: "Step box", detail: "" }];
    expect(formatClientEquipment(input)).toBe("Dumbbells, Step box");
  });

  it("formats entries with detail", () => {
    const input = [
      { name: "Dumbbells", detail: "2-20kg pairs" },
      { name: "Resistance bands", detail: "Light to heavy" },
    ];
    expect(formatClientEquipment(input)).toBe("Dumbbells (2-20kg pairs), Resistance bands (Light to heavy)");
  });
});
