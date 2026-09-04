// RSS `description` fields arrive as a mix of plain text and light HTML
// (`<p>`, `<a>`, `<br>`, numeric and named entities). The app shows this
// as a short plain-text summary, not rendered markup, so this flattens it:
// drop tags, decode the handful of entities that actually show up, and
// collapse the whitespace that leaves behind.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

// String.fromCodePoint throws a RangeError on anything outside the Unicode
// range (and on a lone surrogate), so a feed that emits `&#1114112;` would
// take the whole article screen down through the root ErrorBoundary. Publisher
// RSS is untrusted input - an out-of-range reference is left as written.
function decodeCodePoint(codePoint: number, raw: string): string {
  if (
    !Number.isInteger(codePoint) ||
    codePoint < 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) {
    return raw;
  }
  return String.fromCodePoint(codePoint);
}

export function stripHtml(input: string): string {
  return input
    // Drop these two with their contents, not just their tags - otherwise a
    // stray <style> block leaves its CSS sitting in the article summary.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (match, dec) => decodeCodePoint(Number(dec), match))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
      decodeCodePoint(parseInt(hex, 16), match)
    )
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}
