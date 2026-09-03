import { describe, it, expect } from "vitest";
import { coerceParam } from "../pg-client";

describe("coerceParam", () => {
  it("JSON-stringifies a plain array for a non-native column (jsonb)", () => {
    const result = coerceParam("equipment", ["dumbbell", "kettlebell"]);
    expect(result).toBe('["dumbbell","kettlebell"]');
  });

  it("leaves a native Postgres array column untouched", () => {
    const arr = ["foo", "bar"];
    const result = coerceParam("outstanding_actions", arr);
    expect(result).toBe(arr);
  });

  it("leaves objects untouched (prepareValue handles them)", () => {
    const obj = { a: 1, b: [2, 3] };
    const result = coerceParam("some_jsonb_col", obj);
    expect(result).toBe(obj);
  });

  it("leaves primitives untouched", () => {
    expect(coerceParam("name", "hello")).toBe("hello");
    expect(coerceParam("count", 42)).toBe(42);
    expect(coerceParam("flag", true)).toBe(true);
    expect(coerceParam("missing", null)).toBeNull();
    expect(coerceParam("missing", undefined)).toBeUndefined();
  });

  it("leaves empty arrays untouched even for non-native columns", () => {
    // An empty array is still a valid JS array; JSON.stringify produces "[]"
    // which is correct for jsonb. Verify it is stringified.
    const result = coerceParam("some_jsonb_col", []);
    expect(result).toBe("[]");
  });

  it("stringifies a nested array for jsonb", () => {
    const result = coerceParam("tags", [["a", "b"], ["c"]]);
    expect(result).toBe('[["a","b"],["c"]]');
  });

  it("does not stringify arrays for native columns even if nested", () => {
    // Native columns should pass the array through as-is
    const arr = [["a", "b"], ["c"]];
    const result = coerceParam("muscle_groups", arr);
    expect(result).toBe(arr);
  });

  it("recognises all known native array columns", () => {
    const nativeCols = [
      "outstanding_actions",
      "keyword_cluster",
      "archetypes",
      "muscle_groups",
      "equipment",
      "tags",
      "intensity_tiers",
      "movement_type",
      "condition_tags",
      "position",
    ];
    for (const col of nativeCols) {
      const arr = ["a", "b"];
      const result = coerceParam(col, arr);
      expect(result).toBe(arr);
    }
  });
});
