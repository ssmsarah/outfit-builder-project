import { describe, it, expect } from "vitest";
import { wardrobe, wardrobeById } from "./wardrobe.js";
import { CATEGORIES, STYLES, PATTERNS, SEASONS, OCCASIONS } from "../../../src/recommendation/itemEnums.js";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const REQUIRED_ITEMS = {
  black_tshirt: { category: "top", colorHex: "#000000", style: "casual", pattern: "solid" },
  white_shirt: { category: "top", colorHex: "#FFFFFF", style: "formal", pattern: "solid" },
  navy_shirt: {
    category: "top",
    colorHex: "#1F2A44",
    style: "smart_casual",
    pattern: "solid",
    isNeutralOverride: true,
  },
  blue_jeans: {
    category: "bottom",
    colorHex: "#3B5B92",
    style: "casual",
    pattern: "solid",
    isNeutralOverride: true,
  },
  beige_chinos: { category: "bottom", colorHex: "#D8C8A8", style: "smart_casual", pattern: "solid" },
  black_trousers: { category: "bottom", colorHex: "#111111", style: "formal", pattern: "solid" },
  red_shorts: { category: "bottom", colorHex: "#CC2222", style: "sporty", pattern: "solid" },
  green_floral_skirt: { category: "bottom", colorHex: "#2E8B57", style: "casual", pattern: "floral" },
  white_sneakers: { category: "shoes", colorHex: "#F5F5F5", style: "casual", pattern: "solid" },
  black_oxfords: { category: "shoes", colorHex: "#0A0A0A", style: "formal", pattern: "solid" },
  orange_graphic_tee: { category: "top", colorHex: "#E67E22", style: "streetwear", pattern: "graphic" },
  purple_striped_shirt: { category: "top", colorHex: "#7D3C98", style: "casual", pattern: "striped" },
};

describe("seed wardrobe fixture (T0.4)", () => {
  it("loads as plain data with no database or Mongoose involved", () => {
    expect(Array.isArray(wardrobe)).toBe(true);
    expect(wardrobe.length).toBeGreaterThanOrEqual(20);
  });

  it("has unique ids matching the wardrobeById lookup", () => {
    const ids = wardrobe.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of wardrobe) {
      expect(wardrobeById[item.id]).toBe(item);
    }
  });

  it("every item has a well-formed, in-range shape", () => {
    for (const item of wardrobe) {
      expect(typeof item.id).toBe("string");
      expect(CATEGORIES).toContain(item.category);
      expect(item.colorHex).toMatch(HEX_RE);
      expect(STYLES).toContain(item.style);
      expect(PATTERNS).toContain(item.pattern);
      expect(item.seasons.length).toBeGreaterThan(0);
      item.seasons.forEach((s) => expect(SEASONS).toContain(s));
      expect(item.occasions.length).toBeGreaterThan(0);
      item.occasions.forEach((o) => expect(OCCASIONS).toContain(o));
      if ("isNeutralOverride" in item) {
        expect(typeof item.isNeutralOverride).toBe("boolean");
      }
    }
  });

  it("covers every category, style, and pattern at least once", () => {
    const present = (key) => new Set(wardrobe.map((i) => i[key]));
    const categoriesPresent = present("category");
    const stylesPresent = present("style");
    const patternsPresent = present("pattern");

    for (const c of CATEGORIES) expect(categoriesPresent).toContain(c);
    for (const s of STYLES) expect(stylesPresent).toContain(s);
    for (const p of PATTERNS) expect(patternsPresent).toContain(p);
  });

  it.each(Object.entries(REQUIRED_ITEMS))(
    "includes the README-mandated fixture item %s with exact attributes",
    (id, expected) => {
      const item = wardrobeById[id];
      expect(item, `expected fixture "${id}" to exist`).toBeDefined();
      expect(item.category).toBe(expected.category);
      expect(item.colorHex).toBe(expected.colorHex);
      expect(item.style).toBe(expected.style);
      expect(item.pattern).toBe(expected.pattern);
      expect(Boolean(item.isNeutralOverride)).toBe(Boolean(expected.isNeutralOverride));
    }
  );
});
