// A nested rounded element's corner radius should relate to its container's
// radius by the padding between them - that's what makes two nested rounded
// rectangles look like they share a center ("concentric"), the way Apple's
// own nested UI (e.g. an app icon's glyph inset from its own rounded
// corner) is built, rather than picking the inner radius independently.
export function concentricRadius(
  outerRadius: number,
  inset: number,
  minRadius: number = 2
): number {
  return Math.max(outerRadius - inset, minRadius);
}
