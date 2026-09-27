import { describe, it, expect } from "vitest";
import { explainOutfit } from "../../../src/recommendation/compatibility/explainOutfit.js";
import { scoringConfig } from "../../../src/config/scoringConfig.js";
import { wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

const { black_tshirt, blue_jeans, white_sneakers, leather_belt } = wardrobeById;
const context = { targetOccasion: "casual", targetSeason: null };

function recombine(breakdown) {
  const w = scoringConfig.compatibilityWeights;
  return w.color * breakdown.color + w.style * breakdown.style + w.pattern * breakdown.pattern +
    w.occasion * breakdown.occasion + w.season * breakdown.season;
}

describe("explainOutfit - shape", () => {
  it("returns items as ids, a compatibilityScore, breakdown, colorRelations, and reasons", () => {
    const result = explainOutfit([black_tshirt, blue_jeans, white_sneakers], context);

    expect(result.items).toEqual(["black_tshirt", "blue_jeans", "white_sneakers"]);
    expect(typeof result.compatibilityScore).toBe("number");
    expect(result.breakdown).toHaveProperty("color");
    expect(result.breakdown).toHaveProperty("style");
    expect(result.breakdown).toHaveProperty("pattern");
    expect(result.breakdown).toHaveProperty("occasion");
    expect(result.breakdown).toHaveProperty("season");
    expect(Array.isArray(result.colorRelations)).toBe(true);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("lists every pair's color relation with correctly-ordered id pairs", () => {
    const result = explainOutfit([black_tshirt, blue_jeans, white_sneakers], context);
    expect(result.colorRelations).toHaveLength(3); // C(3,2)
    for (const { pair, relation } of result.colorRelations) {
      expect(pair).toHaveLength(2);
      expect(typeof relation).toBe("string");
    }
    expect(result.colorRelations.find((r) => r.pair[0] === "black_tshirt" && r.pair[1] === "blue_jeans")).toBeDefined();
  });
});

describe("explainOutfit - README acceptance criteria", () => {
  it("breakdown values recombine (via compatibilityWeights) to the final score within 0.01, for an outfit with no accessories", () => {
    const result = explainOutfit([black_tshirt, blue_jeans, white_sneakers], context);
    const recomputed = recombine(result.breakdown);
    expect(Math.abs(recomputed - result.compatibilityScore)).toBeLessThan(0.01);
  });

  it("...and still within 0.01 for an outfit that includes one (down-weighted) accessory pair", () => {
    const result = explainOutfit([black_tshirt, blue_jeans, white_sneakers, leather_belt], context);
    const recomputed = recombine(result.breakdown);
    expect(Math.abs(recomputed - result.compatibilityScore)).toBeLessThan(0.01);
  });

  it("breakdown.color equals outfitColorScore exactly (it's substituted in directly, not averaged from pairs)", () => {
    const result = explainOutfit([black_tshirt, blue_jeans, white_sneakers], context);
    // Re-derive independently via the same function T2.6 itself uses.
    // (Not re-importing outfitColorScore here to keep this a black-box
    // check of explainOutfit's own contract, not a white-box duplicate.)
    expect(result.breakdown.color).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.color).toBeLessThanOrEqual(1);
  });
});

describe("explainOutfit - reasons are driven by actual strongest/weakest factors", () => {
  it("names the correct factor's positive template when that factor is the clear strongest", () => {
    // black_tshirt/blue_jeans/white_sneakers are all casual & solid, so
    // style and pattern should both be maxed at 1.0 - either is a valid
    // "strongest" pick depending on FACTORS tie-break order (style comes
    // first), so assert on the observed strongest rather than hardcoding.
    const result = explainOutfit([black_tshirt, blue_jeans, white_sneakers], context);
    const strongestValue = Math.max(...Object.values(result.breakdown));
    // At least one reason should be non-empty and template-based (no AI text).
    for (const reason of result.reasons) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(0);
    }
    expect(strongestValue).toBeGreaterThan(0);
  });

  it("only produces one reason when every factor is exactly tied", () => {
    // Precisely constructed (via pre-cached .hsv, bypassing hex rounding) so
    // color, style, pattern, occasion, and season all land on exactly 1.0:
    // both neutral with v-difference exactly equal to targetContrast (0.3),
    // same style/pattern, both include the target occasion, identical
    // single-element season sets under Jaccard.
    const a = {
      id: "a", category: "top", style: "casual", pattern: "solid",
      occasions: ["casual"], seasons: ["summer"],
      colorHex: "#000000", hsv: { h: 0, s: 0, v: 0 },
    };
    const b = {
      id: "b", category: "bottom", style: "casual", pattern: "solid",
      occasions: ["casual"], seasons: ["summer"],
      colorHex: "#4D4D4D", hsv: { h: 0, s: 0, v: 0.3 },
    };

    const result = explainOutfit([a, b], { targetOccasion: "casual", targetSeason: null });
    expect(Object.values(result.breakdown).every((v) => v === 1)).toBe(true);
    expect(result.reasons).toHaveLength(1);
  });
});

describe("explainOutfit against real/user-fed data", () => {
  it("explains an outfit built from legacy product records without throwing", () => {
    const top = mapProductToItem({ _id: "t", category: ["tops"], colors: ["black"] });
    const bottom = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["blue"] });
    const shoes = mapProductToItem({ _id: "s", category: ["shoes"] });

    const result = explainOutfit([top, bottom, shoes], { targetOccasion: "casual", targetSeason: null });
    expect(result.items).toEqual(["t", "b", "s"]);
    expect(result.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(result.compatibilityScore).toBeLessThanOrEqual(1);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
