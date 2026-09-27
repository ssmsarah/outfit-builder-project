import { describe, it, expect } from "vitest";
import { pairwiseColorScore } from "../../../src/recommendation/color/colorHarmony.js";
import { wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

describe("pairwiseColorScore - README acceptance criteria", () => {
  it("black_tshirt + blue_jeans scores >= 0.85", () => {
    const { score } = pairwiseColorScore(wardrobeById.black_tshirt, wardrobeById.blue_jeans);
    expect(score).toBeGreaterThanOrEqual(0.85);
  });

  it("red_shorts + green_floral_skirt classifies as complementary or split_complementary", () => {
    const { relation } = pairwiseColorScore(wardrobeById.red_shorts, wardrobeById.green_floral_skirt);
    expect(["complementary", "split_complementary"]).toContain(relation);
  });

  it("orange_graphic_tee + purple_striped_shirt scores lower than black_tshirt + beige_chinos", () => {
    const clashy = pairwiseColorScore(wardrobeById.orange_graphic_tee, wardrobeById.purple_striped_shirt);
    const neutralPair = pairwiseColorScore(wardrobeById.black_tshirt, wardrobeById.beige_chinos);
    expect(clashy.score).toBeLessThan(neutralPair.score);
  });
});

describe("pairwiseColorScore - shape and correctness", () => {
  it("returns score/relation/components with components matching the configured weights", () => {
    const result = pairwiseColorScore(wardrobeById.black_tshirt, wardrobeById.blue_jeans);

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("relation");
    expect(result.components).toHaveProperty("hue");
    expect(result.components).toHaveProperty("saturation");
    expect(result.components).toHaveProperty("brightness");

    const recomputed =
      0.6 * result.components.hue + 0.2 * result.components.saturation + 0.2 * result.components.brightness;
    expect(result.score).toBeCloseTo(recomputed, 5);
  });

  it("is symmetric: C(A,B) == C(B,A)", () => {
    const ab = pairwiseColorScore(wardrobeById.red_shorts, wardrobeById.green_floral_skirt);
    const ba = pairwiseColorScore(wardrobeById.green_floral_skirt, wardrobeById.red_shorts);
    expect(ab.score).toBeCloseTo(ba.score, 10);
    expect(ab.relation).toBe(ba.relation);
  });

  it("stays within [0,1] across every fixture pair", () => {
    const items = Object.values(wardrobeById);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const { score } = pairwiseColorScore(items[i], items[j]);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });

  it("handles real/user-fed data without throwing and stays in range", () => {
    const a = mapProductToItem({ _id: "a", category: ["formals"], colors: ["Navy"] });
    const b = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["Unmapped Lagoon Teal"] });

    const { score, relation } = pairwiseColorScore(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(typeof relation).toBe("string");
  });
});
