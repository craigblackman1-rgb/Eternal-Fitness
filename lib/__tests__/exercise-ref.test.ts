import { describe, it, expect } from "vitest";
import { buildExerciseRef, parseExerciseRef, ensureUids } from "../exercise-ref";

describe("buildExerciseRef / parseExerciseRef round-trip", () => {
  it("round-trips a normal exercise ref", () => {
    const ref = buildExerciseRef("studio", "warm_up", 0, "Bodyweight Squat");
    expect(ref).toBe("studio:warm_up:0:Bodyweight Squat");
    const parsed = parseExerciseRef(ref);
    expect(parsed).toEqual({
      version: "studio",
      section: "warm_up",
      index: 0,
      name: "Bodyweight Squat",
    });
  });

  it("round-trips a name containing colons", () => {
    const ref = buildExerciseRef("studio", "main_block", 3, "Ratio 2:1 Interval");
    expect(ref).toBe("studio:main_block:3:Ratio 2:1 Interval");
    const parsed = parseExerciseRef(ref);
    expect(parsed).toEqual({
      version: "studio",
      section: "main_block",
      index: 3,
      name: "Ratio 2:1 Interval",
    });
  });
});

describe("parseExerciseRef", () => {
  it("returns null for fewer than 4 parts", () => {
    expect(parseExerciseRef("studio:warm_up:0")).toBeNull();
    expect(parseExerciseRef("studio")).toBeNull();
    expect(parseExerciseRef("")).toBeNull();
  });

  it("returns null for a non-numeric index segment", () => {
    expect(parseExerciseRef("studio:warm_up:abc:Squat")).toBeNull();
    expect(parseExerciseRef("studio:warm_up:1.5:Squat")).toBeNull();
    expect(parseExerciseRef("studio:warm_up:-1:Squat")).toBeNull();
  });
});

describe("ensureUids", () => {
  it("preserves an existing uid when forceNew is not set", () => {
    const input = [{ name: "A", uid: "existing-uid-1" }];
    const result = ensureUids(input);
    expect(result[0].uid).toBe("existing-uid-1");
    expect(result[0].name).toBe("A");
  });

  it("mints a uid when missing", () => {
    const input: { name: string; uid?: string }[] = [{ name: "A" }];
    const result = ensureUids(input);
    expect(typeof result[0].uid).toBe("string");
    expect(result[0].uid.length).toBeGreaterThan(0);
    expect(result[0].name).toBe("A");
  });

  it("mints a uid when uid is empty string", () => {
    const input = [{ name: "A", uid: "" }];
    const result = ensureUids(input);
    expect(typeof result[0].uid).toBe("string");
    expect(result[0].uid.length).toBeGreaterThan(0);
  });

  it("leaves everything else on the object unchanged", () => {
    const input = [{ name: "A", sets: 3, reps: "10", uid: "keep-me" }];
    const result = ensureUids(input);
    expect(result[0].name).toBe("A");
    expect(result[0].sets).toBe(3);
    expect(result[0].reps).toBe("10");
    expect(result[0].uid).toBe("keep-me");
  });

  it("with forceNew: true always mints a new uid even when one is present", () => {
    const input = [{ name: "A", uid: "old-uid" }];
    const result = ensureUids(input, { forceNew: true });
    expect(result[0].uid).not.toBe("old-uid");
    expect(typeof result[0].uid).toBe("string");
  });

  it("with forceNew: true produces different uids on two calls with the same input", () => {
    const input = [{ name: "A", uid: "old-uid" }];
    const result1 = ensureUids(input, { forceNew: true });
    const result2 = ensureUids(input, { forceNew: true });
    expect(result1[0].uid).not.toBe(result2[0].uid);
  });
});
