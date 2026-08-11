import { describe, it, expect } from "vitest";
import { computeGroups, normalizeGroups, nextGroupLabel } from "../exercise-groups";

interface FakeEx {
  exercise_name: string;
  group_label?: string | null;
}

function ex(name: string, group_label?: string): FakeEx {
  return { exercise_name: name, group_label };
}

describe("computeGroups", () => {
  it("groups consecutive items sharing a group_label", () => {
    const list = [ex("A", "Superset 1"), ex("B", "Superset 1"), ex("C")];
    const groups = computeGroups(list);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ type: "group", label: "Superset 1", indices: [0, 1] });
    expect(groups[1]).toMatchObject({ type: "single", indices: [2] });
  });

  it("dissolves an orphaned group_label (only one member) to a single", () => {
    const list = [ex("A", "Superset 1"), ex("B")];
    const groups = computeGroups(list);
    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe("single");
  });

  it("ignores group_label entirely when allowGroups is false", () => {
    const list = [ex("A", "Superset 1"), ex("B", "Superset 1")];
    const groups = computeGroups(list, { allowGroups: false });
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.type === "single")).toBe(true);
  });

  it("preserves original list indices on each group", () => {
    const list = [ex("A"), ex("B", "Circuit 3"), ex("C", "Circuit 3"), ex("D")];
    const groups = computeGroups(list);
    expect(groups[1].indices).toEqual([1, 2]);
    expect(groups[2].indices).toEqual([3]);
  });
});

describe("normalizeGroups", () => {
  it("is pure — dissolves orphans and reports which labels were dissolved", () => {
    const list = [ex("A", "Superset 1"), ex("B")];
    const { list: next, dissolved } = normalizeGroups(list);
    expect(dissolved).toEqual(["Superset 1"]);
    expect(next[0].group_label).toBeUndefined();
  });

  it("leaves real (2+) groups untouched", () => {
    const list = [ex("A", "Superset 1"), ex("B", "Superset 1")];
    const { dissolved } = normalizeGroups(list);
    expect(dissolved).toHaveLength(0);
  });
});

describe("nextGroupLabel", () => {
  it("returns 'Superset 1' for a session with no existing supersets", () => {
    expect(nextGroupLabel([ex("A"), ex("B")])).toBe("Superset 1");
  });

  it("picks the next free number against the real live label conventions", () => {
    const list = [
      ex("A", "Circuit 5"), ex("B", "Superset 1"), ex("C", "Circuit 4"), ex("D", "Circuit 1"),
      ex("E", "Superset 7"), ex("F", "Conditioning Circuit"), ex("G", "Circuit 2"),
      ex("H", "Superset 2"), ex("I", "Superset 2 — Bench, Seated"), ex("J", "Arms + Core"),
      ex("K", "Superset A"), ex("L", "Circuit 3"), ex("M", "Band Block — Floor"),
      ex("N", "Superset 4"), ex("O", "Circuit 7"), ex("P", "Superset 3"), ex("Q", "Superset 5"),
      ex("R", "Single — Bench"), ex("S", "Superset 6"), ex("T", "Superset B"),
    ];
    expect(nextGroupLabel(list)).toBe("Superset 8");
  });

  it("ignores letter-based supersets ('Superset A') when computing the next number", () => {
    expect(nextGroupLabel([ex("A", "Superset A"), ex("B", "Superset B")])).toBe("Superset 1");
  });
});
