import { describe, it, expect } from "vitest";
import {
  isTimeBased,
  parsePrescribedSeconds,
  parsePrescribedReps,
  parseRestSeconds,
  formatPrescription,
} from "../prescription";
import type { Exercise } from "@/types";

describe("isTimeBased", () => {
  it("returns true when logType is time", () => {
    expect(isTimeBased("10", "time")).toBe(true);
  });

  it("returns false when logType is reps", () => {
    expect(isTimeBased("30s", "reps")).toBe(false);
  });

  it("infers time from reps string when no logType", () => {
    expect(isTimeBased("30s hold")).toBe(true);
    expect(isTimeBased("45 sec each side")).toBe(true);
    expect(isTimeBased("2 min")).toBe(true);
    expect(isTimeBased("3 minutes")).toBe(true);
  });

  it("returns false for plain number when no logType", () => {
    expect(isTimeBased("8-10")).toBe(false);
    expect(isTimeBased("10")).toBe(false);
    expect(isTimeBased("")).toBe(false);
  });
});

describe("parsePrescribedSeconds", () => {
  it("parses seconds", () => {
    expect(parsePrescribedSeconds("30s")).toBe(30);
    expect(parsePrescribedSeconds("45 sec")).toBe(45);
    expect(parsePrescribedSeconds("60 seconds")).toBe(60);
  });

  it("parses minutes", () => {
    expect(parsePrescribedSeconds("2 min")).toBe(120);
    expect(parsePrescribedSeconds("1 minute")).toBe(60);
  });

  it("returns null for non-time strings", () => {
    expect(parsePrescribedSeconds("8-10")).toBeNull();
    expect(parsePrescribedSeconds("")).toBeNull();
  });
});

describe("parsePrescribedReps", () => {
  it("extracts first number", () => {
    expect(parsePrescribedReps("8-10")).toBe(8);
    expect(parsePrescribedReps("10")).toBe(10);
    expect(parsePrescribedReps("12 reps")).toBe(12);
  });

  it("returns null when no number", () => {
    expect(parsePrescribedReps("AMRAP")).toBeNull();
    expect(parsePrescribedReps("")).toBeNull();
  });
});

describe("parseRestSeconds", () => {
  it("parses seconds", () => {
    expect(parseRestSeconds("60s")).toBe(60);
    expect(parseRestSeconds("90 sec")).toBe(90);
  });

  it("parses minutes", () => {
    expect(parseRestSeconds("2 min")).toBe(120);
    expect(parseRestSeconds("2 mins")).toBe(120);
    expect(parseRestSeconds("2 minutes")).toBe(120);
  });

  it("returns the upper bound for ranges", () => {
    expect(parseRestSeconds("60-90s")).toBe(90);
    expect(parseRestSeconds("60-90")).toBe(90);
    expect(parseRestSeconds("1-2 min")).toBe(120);
  });

  it("returns null for empty, dash, or unparseable", () => {
    expect(parseRestSeconds("")).toBeNull();
    expect(parseRestSeconds("—")).toBeNull();
    expect(parseRestSeconds("-")).toBeNull();
    expect(parseRestSeconds("as needed")).toBeNull();
  });
});

describe("formatPrescription", () => {
  const base: Exercise = {
    exercise_name: "Squat",
    sets: 3,
    reps: "10",
    tempo: "2-0-2",
    rest: "60s",
    coaching_cue: "",
    modification: "",
    equipment: [],
  };

  it("formats full prescription", () => {
    expect(formatPrescription(base)).toBe("3 × 10 @ tempo 2-0-2 · 60s rest");
  });

  it("omits tempo when dash", () => {
    expect(formatPrescription({ ...base, tempo: "—" })).toBe("3 × 10 · 60s rest");
  });

  it("omits rest when dash", () => {
    expect(formatPrescription({ ...base, rest: "—" })).toBe("3 × 10 @ tempo 2-0-2");
  });

  it("renders fallback for empty reps", () => {
    expect(formatPrescription({ ...base, reps: "", tempo: "—", rest: "—" })).toBe("3 × —");
  });
});
