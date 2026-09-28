import { describe, it, expect } from "vitest";
import { attributeMatch, matchItems } from "../../../src/recommendation/rules/attributeMatcher.js";
import { rulesConfig } from "../../../src/config/rulesConfig.js";
import { wardrobe, wardrobeById as w } from "../fixtures/wardrobe.js";

const request = { category: "top", color: "black", style: "casual" };

describe("attributeMatch - README acceptance criteria", () => {
  it("black_tshirt scores 1.0 for {top, black, casual}", () => {
    const result = attributeMatch(w.black_tshirt, request);
    expect(result.score).toBeCloseTo(1, 10);
    expect(result.matched).toEqual(["category", "color", "style"]);
    expect(result.missed).toEqual([]);
  });

  it("navy_shirt scores above 0.5", () => {
    const result = attributeMatch(w.navy_shirt, request);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.excluded).toBe(false);
  });

  it("black_trousers is excluded by category", () => {
    const result = attributeMatch(w.black_trousers, request);
    expect(result.excluded).toBe(true);
    expect(result.score).toBe(0);
    expect(result.missed).toContain("category");
    expect(matchItems(wardrobe, request).map((r) => r.item.id)).not.toContain("black_trousers");
  });

  it("renormalizes weights for a single-attribute request", () => {
    // One requested attribute -> MatchScore is exactly that attribute's s_k,
    // whatever its configured weight.
    expect(attributeMatch(w.navy_shirt, { style: "casual" }).score).toBeCloseTo(0.8, 10);
    expect(attributeMatch(w.red_shorts, { season: "summer" }).score).toBe(1);
    expect(attributeMatch(w.red_shorts, { season: "winter" }).score).toBe(0);
  });

  it("renormalizes over a two-attribute request", () => {
    const { color, style } = rulesConfig.attributeMatch.weights;
    // navy_shirt: color black -> both neutral 0.4, style casual -> 0.8.
    const expected = (color * 0.4 + style * 0.8) / (color + style);
    expect(attributeMatch(w.navy_shirt, { color: "black", style: "casual" }).score).toBeCloseTo(expected, 10);
  });
});

describe("attributeMatch - per-attribute scores", () => {
  it("style: exact 1, partial = matrix value if >= 0.7, else 0", () => {
    expect(attributeMatch(w.black_tshirt, { style: "casual" }).scores.style).toBe(1);
    expect(attributeMatch(w.grey_hoodie, { style: "casual" }).scores.style).toBe(0.8); // streetwear
    expect(attributeMatch(w.red_shorts, { style: "casual" }).scores.style).toBe(0.7); // sporty (edge)
    expect(attributeMatch(w.white_shirt, { style: "casual" }).scores.style).toBe(0); // formal 0.3
  });

  it("pattern: exact 1, requested solid vs striped 0.5, else 0", () => {
    expect(attributeMatch(w.black_tshirt, { pattern: "solid" }).scores.pattern).toBe(1);
    expect(attributeMatch(w.purple_striped_shirt, { pattern: "solid" }).scores.pattern).toBe(0.5);
    expect(attributeMatch(w.green_floral_skirt, { pattern: "solid" }).scores.pattern).toBe(0);
    expect(attributeMatch(w.black_tshirt, { pattern: "striped" }).scores.pattern).toBe(0);
  });

  it("color: exact (same color name) 1, same family 0.6, both neutral 0.4, else 0", () => {
    expect(attributeMatch(w.black_tshirt, { color: "black" }).scores.color).toBe(1);
    // black_trousers is #111111, not #000000, but still named "black".
    expect(attributeMatch(w.black_trousers, { color: "black" }).scores.color).toBe(1);
    expect(attributeMatch(w.red_shorts, { color: "maroon" }).scores.color).toBe(0.6); // red family
    expect(attributeMatch(w.navy_shirt, { color: "blue" }).scores.color).toBe(0.6); // blue family
    expect(attributeMatch(w.white_shirt, { color: "black" }).scores.color).toBe(0.4);
    expect(attributeMatch(w.orange_graphic_tee, { color: "black" }).scores.color).toBe(0);
    expect(attributeMatch(w.green_floral_skirt, { color: "red" }).scores.color).toBe(0);
  });

  it("color: an isNeutralOverride item counts as neutral against a neutral request", () => {
    // navy_shirt's palette family is blue, but it is flagged neutral (T1.2).
    expect(attributeMatch(w.navy_shirt, { color: "black" }).scores.color).toBe(0.4);
  });

  it("color: throws on a color name outside the palette", () => {
    expect(() => attributeMatch(w.black_tshirt, { color: "chartreuse" })).toThrow(/unknown color "chartreuse"/);
  });

  it("occasion and season: 1 if the item's list contains the value", () => {
    expect(attributeMatch(w.white_shirt, { occasion: "work" }).scores.occasion).toBe(1);
    expect(attributeMatch(w.white_shirt, { occasion: "sport" }).scores.occasion).toBe(0);
    expect(attributeMatch(w.wool_overcoat, { season: "winter" }).scores.season).toBe(1);
  });

  it("scores always lie in [0, 1]", () => {
    for (const item of wardrobe) {
      const { score } = attributeMatch(item, { ...request, pattern: "solid", occasion: "casual", season: "summer" });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("throws on an unknown attribute", () => {
    expect(() => attributeMatch(w.black_tshirt, { fabric: "cotton" })).toThrow(/unknown attribute "fabric"/);
  });

  it("an empty request scores 0 and matches nothing", () => {
    expect(attributeMatch(w.black_tshirt, {})).toMatchObject({ score: 0, matched: [], missed: [] });
  });
});

describe("matchItems", () => {
  it("ranks the best match first and only returns tops for a top request", () => {
    const results = matchItems(wardrobe, request);
    expect(results[0].item.id).toBe("black_tshirt");
    expect(results.every((r) => r.item.category === "top")).toBe(true);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("is deterministic", () => {
    expect(matchItems(wardrobe, { color: "black" })).toEqual(matchItems(wardrobe, { color: "black" }));
  });
});
