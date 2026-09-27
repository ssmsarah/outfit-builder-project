import { describe, it, expect } from "vitest";
import { styleCompatibility } from "../../../src/recommendation/compatibility/styleMatrix.js";
import { STYLES } from "../../../src/recommendation/itemEnums.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

describe("styleCompatibility", () => {
  it("is symmetric for every pair of styles", () => {
    for (const a of STYLES) {
      for (const b of STYLES) {
        expect(styleCompatibility(a, b)).toBe(styleCompatibility(b, a));
      }
    }
  });

  it("matches the README's table values", () => {
    expect(styleCompatibility("casual", "casual")).toBe(1.0);
    expect(styleCompatibility("casual", "formal")).toBe(0.3);
    expect(styleCompatibility("smart_casual", "streetwear")).toBe(0.5);
    expect(styleCompatibility("formal", "sporty")).toBe(0.1);
    expect(styleCompatibility("streetwear", "sporty")).toBe(0.7);
  });

  it("every value is in [0,1]", () => {
    for (const a of STYLES) {
      for (const b of STYLES) {
        const value = styleCompatibility(a, b);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("throws for an unknown style", () => {
    expect(() => styleCompatibility("goth", "casual")).toThrow(/unknown style/);
    expect(() => styleCompatibility("casual", "goth")).toThrow(/unknown style/);
    expect(() => styleCompatibility(undefined, "casual")).toThrow();
  });

  it("handles the default style ('casual') that real/user-fed items fall back to", () => {
    const legacyItem = mapProductToItem({ _id: "a", category: ["tops"], colors: ["black"] });
    expect(legacyItem.style).toBe("casual");
    expect(() => styleCompatibility(legacyItem.style, "formal")).not.toThrow();
  });
});
