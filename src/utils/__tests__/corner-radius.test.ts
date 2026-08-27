import { concentricRadius } from "../corner-radius";

describe("concentricRadius", () => {
  it("subtracts the inset from the outer radius", () => {
    expect(concentricRadius(16, 12)).toBe(4);
  });

  it("floors at the default minRadius rather than going to 0 or negative", () => {
    expect(concentricRadius(8, 12)).toBe(2);
    expect(concentricRadius(4, 20)).toBe(2);
  });

  it("respects a custom minRadius", () => {
    expect(concentricRadius(8, 12, 0)).toBe(0);
    expect(concentricRadius(4, 20, 5)).toBe(5);
  });

  it("returns the exact difference when it's already above minRadius", () => {
    expect(concentricRadius(32, 8)).toBe(24);
  });
});
