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

  // A real feed emitting one of these used to throw a RangeError out of
  // String.fromCodePoint, taking the article screen into the ErrorBoundary.
  it.each([
    ["decimal past the Unicode range", "Bad &#1114112; boom"],
    ["absurdly large decimal", "Huge &#99999999999; boom"],
    ["hex past the Unicode range", "Bad &#x110000; boom"],
    ["a lone surrogate", "Bad &#55296; boom"],
  ])("leaves an out-of-range reference alone (%s)", (_label, input) => {
    expect(() => stripHtml(input)).not.toThrow();
    expect(stripHtml(input)).toBe(input);
  });

  it("drops script and style blocks with their contents", () => {
    expect(stripHtml("<style>p{color:red}</style>Hello")).toBe("Hello");
    expect(stripHtml("<script>var x = 1;</script>Hi <b>there</b>")).toBe("Hi there");
  });

  it("trims and returns plain text unchanged", () => {
    expect(stripHtml("  just text  ")).toBe("just text");
  });
});
