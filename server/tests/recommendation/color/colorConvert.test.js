import { describe, it, expect } from "vitest";
import { hexToHsv, getItemHsv } from "../../../src/recommendation/color/colorConvert.js";
import { wardrobe } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

function expectClose(actual, expected, precision = 5) {
  expect(actual).toBeCloseTo(expected, precision);
}

describe("hexToHsv", () => {
  it("matches the README's worked primary-color examples", () => {
    expectClose(hexToHsv("#FF0000").h, 0);
    expectClose(hexToHsv("#FF0000").s, 1);
    expectClose(hexToHsv("#FF0000").v, 1);

    expectClose(hexToHsv("#00FF00").h, 120);
    expectClose(hexToHsv("#00FF00").s, 1);
    expectClose(hexToHsv("#00FF00").v, 1);

    expectClose(hexToHsv("#0000FF").h, 240);
    expectClose(hexToHsv("#0000FF").s, 1);
    expectClose(hexToHsv("#0000FF").v, 1);
  });

  it("white has s=0, v=1 (any hue)", () => {
    const { s, v } = hexToHsv("#FFFFFF");
    expect(s).toBe(0);
    expect(v).toBe(1);
  });

  it("black has v=0 (any hue, any saturation)", () => {
    const { v } = hexToHsv("#000000");
    expect(v).toBe(0);
  });

  it("returns h in [0,360) and s,v in [0,1] for arbitrary hex values", () => {
    for (const hex of ["#1F2A44", "#D8C8A8", "#7D3C98", "#E67E22", "#123ABC"]) {
      const { h, s, v } = hexToHsv(hex);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("throws on invalid hex input", () => {
    expect(() => hexToHsv("red")).toThrow();
    expect(() => hexToHsv("#FFF")).toThrow();
    expect(() => hexToHsv("#GGGGGG")).toThrow();
    expect(() => hexToHsv("FF0000")).toThrow();
    expect(() => hexToHsv(null)).toThrow();
    expect(() => hexToHsv(undefined)).toThrow();
  });
});

describe("getItemHsv (caching)", () => {
  it("computes and caches hsv on the item", () => {
    const item = { colorHex: "#FF0000" };
    const hsv = getItemHsv(item);

    expect(item.hsv).toBe(hsv);
    expectClose(hsv.h, 0);
  });

  it("reuses the cached value instead of recomputing on a second call", () => {
    const item = { colorHex: "#FF0000" };
    const first = getItemHsv(item);

    // Mutate colorHex after the first computation - if getItemHsv recomputed,
    // this would change; it shouldn't, because the cache should win.
    item.colorHex = "#00FF00";
    const second = getItemHsv(item);

    expect(second).toBe(first);
    expectClose(second.h, 0); // still red's hue, not green's
  });
});

describe("hexToHsv against real fixture and user-fed data", () => {
  it("converts every wardrobe fixture item's colorHex without throwing", () => {
    for (const item of wardrobe) {
      const { h, s, v } = hexToHsv(item.colorHex);
      expect(Number.isFinite(h)).toBe(true);
      expect(Number.isFinite(s)).toBe(true);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("converts colorHex derived from messy, real/user-fed legacy product data", () => {
    const realShapedProducts = [
      { _id: "a", category: ["formals"], colors: ["Navy"] },
      { _id: "b", category: ["tops"] }, // no colors at all
      { _id: "c", category: ["accessories"], colors: ["Rustic Sunset Ombre"] }, // unmapped color name
      { _id: "d", category: ["bottoms"], colors: ["red"] },
    ];

    for (const product of realShapedProducts) {
      const item = mapProductToItem(product);
      expect(() => hexToHsv(item.colorHex)).not.toThrow();
    }
  });
});
