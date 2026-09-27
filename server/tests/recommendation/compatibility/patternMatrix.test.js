import { describe, it, expect } from "vitest";
import { patternCompatibility } from "../../../src/recommendation/compatibility/patternMatrix.js";
import { PATTERNS } from "../../../src/recommendation/itemEnums.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

describe("patternCompatibility", () => {
  it("is symmetric for every pair of patterns", () => {
    for (const a of PATTERNS) {
      for (const b of PATTERNS) {
        expect(patternCompatibility(a, b)).toBe(patternCompatibility(b, a));
      }
    }
  });

  it("solid pairs with anything at >= 0.9", () => {
    for (const p of PATTERNS) {
      expect(patternCompatibility("solid", p)).toBeGreaterThanOrEqual(0.9);
      expect(patternCompatibility(p, "solid")).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("matches the README's table values", () => {
    expect(patternCompatibility("striped", "striped")).toBe(0.5);
    expect(patternCompatibility("checked", "checked")).toBe(0.4);
    expect(patternCompatibility("checked", "floral")).toBe(0.2);
    expect(patternCompatibility("graphic", "floral")).toBe(0.2);
  });

  it("every value is in [0,1]", () => {
    for (const a of PATTERNS) {
      for (const b of PATTERNS) {
        const value = patternCompatibility(a, b);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("throws for an unknown pattern", () => {
    expect(() => patternCompatibility("polka_dot", "solid")).toThrow(/unknown pattern/);
    expect(() => patternCompatibility("solid", "polka_dot")).toThrow(/unknown pattern/);
  });

  it("handles the default pattern ('solid') that real/user-fed items fall back to", () => {
    const legacyItem = mapProductToItem({ _id: "a", category: ["tops"], colors: ["black"] });
    expect(legacyItem.pattern).toBe("solid");
    expect(patternCompatibility(legacyItem.pattern, "floral")).toBeGreaterThanOrEqual(0.9);
  });
});
