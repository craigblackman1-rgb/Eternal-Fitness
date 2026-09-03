import { describe, it, expect } from "vitest";
import { coerceParam } from "../pg-client";

describe("coerceParam", () => {
  it("JSON-stringifies a plain array for a non-native column (jsonb)", () => {
    const result = coerceParam("some_table", "some_jsonb_col", ["dumbbell", "kettlebell"]);
    expect(result).toBe('["dumbbell","kettlebell"]');
  });

  it("leaves a native Postgres array column untouched", () => {
    const arr = ["foo", "bar"];
    const result = coerceParam("clients", "outstanding_actions", arr);
    expect(result).toBe(arr);
  });

  it("leaves objects untouched (prepareValue handles them)", () => {
    const obj = { a: 1, b: [2, 3] };
    const result = coerceParam("some_table", "some_jsonb_col", obj);
    expect(result).toBe(obj);
  });

  it("leaves primitives untouched", () => {
    expect(coerceParam("some_table", "name", "hello")).toBe("hello");
    expect(coerceParam("some_table", "count", 42)).toBe(42);
    expect(coerceParam("some_table", "flag", true)).toBe(true);
    expect(coerceParam("some_table", "missing", null)).toBeNull();
    expect(coerceParam("some_table", "missing", undefined)).toBeUndefined();
  });

  it("stringifies an empty array for jsonb columns", () => {
    const result = coerceParam("some_table", "some_jsonb_col", []);
    expect(result).toBe("[]");
  });

  it("stringifies a nested array for jsonb", () => {
    const result = coerceParam("some_table", "some_jsonb_col", [["a", "b"], ["c"]]);
    expect(result).toBe('[["a","b"],["c"]]');
  });

  it("does not stringify arrays for native columns even if nested", () => {
    const arr = [["a", "b"], ["c"]];
    const result = coerceParam("exercises", "muscle_groups", arr);
    expect(result).toBe(arr);
  });

  it("recognises all known native array columns (table.column qualified)", () => {
    const nativeCols: [string, string][] = [
      ["clients", "outstanding_actions"],
      ["site_content", "keyword_cluster"],
      ["exercises", "archetypes"],
      ["exercises", "muscle_groups"],
      ["exercises", "equipment"],
      ["exercises", "tags"],
      ["exercises", "intensity_tiers"],
      ["workout_templates", "archetypes"],
      ["workout_templates", "movement_type"],
      ["workout_templates", "muscle_groups"],
      ["workout_templates", "equipment"],
      ["workout_templates", "condition_tags"],
      ["workout_templates", "position"],
    ];
    for (const [table, col] of nativeCols) {
      const arr = ["a", "b"];
      const result = coerceParam(table, col, arr);
      expect(result).toBe(arr);
    }
  });

  // --- collision regression: equipment is JSONB on clients, TEXT[] on exercises ---

  it("stringifies equipment on clients (JSONB) — non-empty array", () => {
    const result = coerceParam("clients", "equipment", ["dumbbell", "kettlebell"]);
    expect(result).toBe('["dumbbell","kettlebell"]');
  });

  it("stringifies equipment on clients (JSONB) — empty array", () => {
    const result = coerceParam("clients", "equipment", []);
    expect(result).toBe("[]");
  });

  it("passes equipment through raw on exercises (TEXT[])", () => {
    const arr = ["dumbbell", "kettlebell"];
    const result = coerceParam("exercises", "equipment", arr);
    expect(result).toBe(arr);
  });

  it("passes equipment through raw on workout_templates (TEXT[])", () => {
    const arr = ["barbell"];
    const result = coerceParam("workout_templates", "equipment", arr);
    expect(result).toBe(arr);
  });

  it("stringifies equipment on unknown table (should stringify)", () => {
    const result = coerceParam("other_table", "equipment", ["dumbbell"]);
    expect(result).toBe('["dumbbell"]');
  });
});
