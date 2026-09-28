import { describe, it, expect } from "vitest";
import {
  colorName,
  colorFamily,
  paletteColor,
  paletteColorNames,
  hsvDistance,
} from "../../../src/recommendation/search/colorNames.js";
import { searchConfig } from "../../../src/config/searchConfig.js";
import { loadSearchConfig } from "../../../src/config/loadSearchConfig.js";
import { wardrobe } from "../fixtures/wardrobe.js";

describe("colorName - README acceptance criteria", () => {
  it.each([
    ["#000000", "black"],
    ["#1F2A44", "navy"],
    ["#D8C8A8", "beige"],
    ["#3B5B92", "blue"],
  ])("%s -> %s", (hex, name) => {
    expect(colorName(hex)).toBe(name);
  });
});

describe("colorName - nearest palette entry", () => {
  it.each([
    ["#111111", "black"], // near-black
    ["#0A0A0A", "black"],
    ["#F5F5F5", "white"], // off-white
    ["#FFFFFF", "white"],
    ["#4A4A4A", "grey"], // charcoal
    ["#E67E22", "orange"],
    ["#CC2222", "red"],
    ["#2E8B57", "green"],
    ["#7D3C98", "purple"],
    ["#E8A0BF", "pink"],
    ["#1E90FF", "blue"], // dodger blue
    ["#5C4033", "brown"],
  ])("%s -> %s", (hex, name) => {
    expect(colorName(hex)).toBe(name);
  });

  it("is case-insensitive on hex input", () => {
    expect(colorName("#e67e22")).toBe("orange");
  });

  it("every palette hex maps to its own name", () => {
    for (const { name, hex } of searchConfig.colorPalette) {
      expect(colorName(hex)).toBe(name);
    }
  });

  it("names every fixture item", () => {
    for (const item of wardrobe) {
      expect(paletteColorNames()).toContain(colorName(item.colorHex));
    }
  });

  it("throws on an invalid hex", () => {
    expect(() => colorName("black")).toThrow(/invalid hex/);
  });
});

describe("colorFamily", () => {
  it.each([
    ["#000000", "neutral"],
    ["#D8C8A8", "neutral"],
    ["#1F2A44", "blue"],
    ["#3B5B92", "blue"],
    ["#CC2222", "red"],
    ["#2E8B57", "green"],
    ["#E67E22", "orange"],
    ["#7D3C98", "purple"],
    ["#E8A0BF", "pink"],
    ["#F1C40F", "yellow"],
    ["#6B4423", "brown"],
  ])("%s -> %s", (hex, family) => {
    expect(colorFamily(hex)).toBe(family);
  });
});

describe("hsvDistance", () => {
  it("treats hue as circular", () => {
    const a = { h: 355, s: 1, v: 1 };
    const b = { h: 5, s: 1, v: 1 };
    expect(hsvDistance(a, b)).toBeCloseTo(10 / 180, 10);
  });

  it("ignores hue for a fully desaturated color", () => {
    expect(hsvDistance({ h: 0, s: 0, v: 0.5 }, { h: 180, s: 0.8, v: 0.5 })).toBeCloseTo(0.8, 10);
  });

  it("is symmetric and zero for identical colors", () => {
    const a = { h: 40, s: 0.3, v: 0.6 };
    const b = { h: 200, s: 0.7, v: 0.2 };
    expect(hsvDistance(a, b)).toBeCloseTo(hsvDistance(b, a), 12);
    expect(hsvDistance(a, a)).toBe(0);
  });
});

describe("palette lookup", () => {
  it("finds entries by name, case-insensitively", () => {
    expect(paletteColor("Navy")).toMatchObject({ name: "navy", family: "blue" });
    expect(paletteColor("chartreuse")).toBeNull();
  });

  it("has at least the 20 README colors", () => {
    const required = [
      "black", "white", "grey", "navy", "blue", "light blue", "red", "maroon", "pink", "orange",
      "yellow", "beige", "cream", "brown", "green", "olive", "purple", "lavender", "teal", "khaki",
    ];
    expect(paletteColorNames()).toEqual(expect.arrayContaining(required));
  });
});

describe("loadSearchConfig - palette validation", () => {
  const good = searchConfig.colorPalette.map((e) => ({ ...e }));

  it("rejects a palette smaller than 20", () => {
    expect(() => loadSearchConfig({ colorPalette: good.slice(0, 19) })).toThrow(/at least 20/);
  });

  it("rejects bad hex, unknown family, duplicate or non-lowercase names", () => {
    const withEntry = (entry) => ({ colorPalette: [...good, entry] });
    expect(() => loadSearchConfig(withEntry({ name: "x", hex: "#GGGGGG", family: "red" }))).toThrow(/invalid hex/);
    expect(() => loadSearchConfig(withEntry({ name: "x", hex: "#000000", family: "gold" }))).toThrow(/unknown family/);
    expect(() => loadSearchConfig(withEntry({ name: "black", hex: "#000000", family: "neutral" }))).toThrow(/duplicate/);
    expect(() => loadSearchConfig(withEntry({ name: "Gold", hex: "#FFD700", family: "yellow" }))).toThrow(/lowercase/);
  });
});
