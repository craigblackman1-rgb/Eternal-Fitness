import { describe, it, expect } from "vitest";
import { stripHtml } from "@/lib/strip-html";

describe("stripHtml", () => {
  it("removes simple tags and keeps text content", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("strips <style> blocks entirely, including their contents", () => {
    expect(stripHtml("<style>.a{color:red}</style>Body text")).toBe("Body text");
  });

  it("decodes the handful of supported entities", () => {
    expect(stripHtml("a&nbsp;b")).toBe("a b");
    expect(stripHtml("Jack&amp;Jill")).toBe("Jack&Jill");
    expect(stripHtml("dash&mdash;dash")).toBe("dash\u2014dash");
    expect(stripHtml("more&hellip;")).toBe("more\u2026");
  });

  it("collapses runs of whitespace produced by tag removal", () => {
    expect(stripHtml("<div>a</div>\n\n<div>b</div>")).toBe("a b");
  });

  it("trims leading and trailing whitespace", () => {
    expect(stripHtml("   <span>hi</span>   ")).toBe("hi");
  });

  it("returns an empty string for markup with no text", () => {
    expect(stripHtml("<br/><hr/>")).toBe("");
  });

  it("handles multiline style blocks with attributes", () => {
    const html = '<style type="text/css">\n body { margin: 0; }\n</style><p>Keep me</p>';
    expect(stripHtml(html)).toBe("Keep me");
  });
});
