import { describe, it, expect } from "vitest";
import { decodeEntities } from "@/lib/decode-entities";

describe("decodeEntities", () => {
  it("returns an empty string for null, undefined, or empty input", () => {
    expect(decodeEntities(null)).toBe("");
    expect(decodeEntities(undefined)).toBe("");
    expect(decodeEntities("")).toBe("");
  });

  it("decodes named entities", () => {
    expect(decodeEntities("Exercise &amp; Illness")).toBe("Exercise & Illness");
    expect(decodeEntities("&lt;tag&gt;")).toBe("<tag>");
    expect(decodeEntities("&quot;quoted&quot;")).toBe('"quoted"');
    expect(decodeEntities("it&apos;s")).toBe("it's");
    expect(decodeEntities("a&nbsp;b")).toBe("a b");
  });

  it("decodes numeric entities", () => {
    expect(decodeEntities("it&#39;s")).toBe("it's");
    expect(decodeEntities("it&#039;s")).toBe("it's");
    expect(decodeEntities("&#8217;")).toBe("\u2019");
    expect(decodeEntities("&#8220;quote&#8221;")).toBe("\u201Cquote\u201D");
    expect(decodeEntities("dash&#8211;dash")).toBe("dash\u2013dash");
    expect(decodeEntities("em&#8212;dash")).toBe("em\u2014dash");
  });

  it("decodes multiple entities in a single string", () => {
    expect(decodeEntities("A &amp; B &lt; C &gt; D")).toBe("A & B < C > D");
  });

  it("leaves unknown entities untouched", () => {
    expect(decodeEntities("&unknownentity;")).toBe("&unknownentity;");
    expect(decodeEntities("&#99999;")).toBe("&#99999;");
  });

  it("leaves plain text without entities unchanged", () => {
    expect(decodeEntities("just plain text")).toBe("just plain text");
  });
});
