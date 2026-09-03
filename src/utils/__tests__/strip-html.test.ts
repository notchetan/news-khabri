import { stripHtml } from "../strip-html";

describe("stripHtml", () => {
  it("removes tags and collapses the whitespace they leave", () => {
    expect(stripHtml("<p>Hello</p>\n<p>world</p>")).toBe("Hello world");
  });

  it("decodes named entities", () => {
    expect(stripHtml("Tom &amp; Jerry &mdash; &ldquo;hi&rdquo;")).toBe(
      "Tom & Jerry — “hi”"
    );
  });

  it("decodes numeric and hex character references", () => {
    expect(stripHtml("caf&#233; &#x2013; open")).toBe("café – open");
  });

  it("leaves an unknown entity untouched rather than dropping it", () => {
    expect(stripHtml("a &weird; b")).toBe("a &weird; b");
  });

  it("trims and returns plain text unchanged", () => {
    expect(stripHtml("  just text  ")).toBe("just text");
  });
});
