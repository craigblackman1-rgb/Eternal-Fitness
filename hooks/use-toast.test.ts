import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reducer } from "@/hooks/use-toast";

// The reducer's toast type is broad; keep test fixtures minimal.
type AnyToast = { id: string; open?: boolean; title?: string };
function state(toasts: AnyToast[]) {
  return { toasts } as unknown as Parameters<typeof reducer>[0];
}
function toast(t: AnyToast): AnyToast {
  return t;
}

describe("use-toast reducer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("ADD_TOAST prepends and enforces the toast limit of 1", () => {
    const start = state([]);
    const next = reducer(start, { type: "ADD_TOAST", toast: toast({ id: "1", open: true }) } as never);
    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe("1");

    const afterSecond = reducer(next, {
      type: "ADD_TOAST",
      toast: toast({ id: "2", open: true }),
    } as never);
    expect(afterSecond.toasts).toHaveLength(1);
    expect(afterSecond.toasts[0].id).toBe("2");
  });

  it("UPDATE_TOAST merges fields into the matching toast only", () => {
    const start = state([{ id: "1", open: true, title: "old" }]);
    const next = reducer(start, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "new" },
    } as never);
    expect(next.toasts[0].title).toBe("new");
  });

  it("UPDATE_TOAST leaves non-matching toasts unchanged", () => {
    const start = state([{ id: "1", title: "keep" }]);
    const next = reducer(start, {
      type: "UPDATE_TOAST",
      toast: { id: "2", title: "other" },
    } as never);
    expect(next.toasts[0].title).toBe("keep");
  });

  it("DISMISS_TOAST sets open:false for the targeted toast", () => {
    const start = state([{ id: "1", open: true }, { id: "2", open: true }]);
    const next = reducer(start, { type: "DISMISS_TOAST", toastId: "1" } as never);
    expect(next.toasts.find((t) => t.id === "1")?.open).toBe(false);
    expect(next.toasts.find((t) => t.id === "2")?.open).toBe(true);
  });

  it("DISMISS_TOAST with no id closes every toast", () => {
    const start = state([{ id: "1", open: true }, { id: "2", open: true }]);
    const next = reducer(start, { type: "DISMISS_TOAST" } as never);
    expect(next.toasts.every((t) => t.open === false)).toBe(true);
  });

  it("REMOVE_TOAST removes a single toast by id", () => {
    const start = state([{ id: "1" }, { id: "2" }]);
    const next = reducer(start, { type: "REMOVE_TOAST", toastId: "1" } as never);
    expect(next.toasts.map((t) => t.id)).toEqual(["2"]);
  });

  it("REMOVE_TOAST with no id clears all toasts", () => {
    const start = state([{ id: "1" }, { id: "2" }]);
    const next = reducer(start, { type: "REMOVE_TOAST" } as never);
    expect(next.toasts).toEqual([]);
  });
});
