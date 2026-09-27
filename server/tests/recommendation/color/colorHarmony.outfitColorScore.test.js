import { describe, it, expect } from "vitest";
import { outfitColorScore, pairwiseColorScore } from "../../../src/recommendation/color/colorHarmony.js";
import { wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

// Same test-only hue->hex helper used in T1.3's tests, for exact control
// over hue separation when constructing a "4 bright colors" outfit.
function hexFromHue(h) {
  const c = 1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let [r1, g1, b1] = [0, 0, 0];
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}
const brightItem = (h) => ({ colorHex: hexFromHue(h) });

function meanPairScore(items) {
  const scores = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      scores.push(pairwiseColorScore(items[i], items[j]).score);
    }
  }
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

describe("outfitColorScore - README acceptance criteria", () => {
  it("an all-neutral outfit scores >= 0.9", () => {
    const outfit = [wardrobeById.black_tshirt, wardrobeById.blue_jeans, wardrobeById.black_oxfords];
    expect(outfitColorScore(outfit)).toBeGreaterThanOrEqual(0.9);
  });

  it("a 4-bright-color outfit (4 distinct hue groups) receives the 0.85 penalty", () => {
    // Hues 90 degrees apart pairwise -> 4 separate connected components,
    // each item fully saturated/bright so none qualifies as neutral.
    const outfit = [brightItem(0), brightItem(90), brightItem(180), brightItem(270)];

    const unpenalized = meanPairScore(outfit);
    const actual = outfitColorScore(outfit);

    expect(actual).toBeCloseTo(unpenalized * 0.85, 10);
    // Sanity check the penalty actually changed something (not a no-op).
    expect(actual).toBeLessThan(unpenalized);
  });
});

describe("outfitColorScore - shape and edge cases", () => {
  it("does not penalize an outfit with 3 or fewer non-neutral hue groups", () => {
    const outfit = [brightItem(0), brightItem(90), brightItem(180)];
    const unpenalized = meanPairScore(outfit);
    expect(outfitColorScore(outfit)).toBeCloseTo(unpenalized, 10);
  });

  it("returns 0 for an empty or single-item outfit rather than throwing", () => {
    expect(outfitColorScore([])).toBe(0);
    expect(outfitColorScore([wardrobeById.black_tshirt])).toBe(0);
  });

  it("stays within [0,1] for a mixed real-fixture outfit", () => {
    const outfit = [
      wardrobeById.navy_shirt,
      wardrobeById.beige_chinos,
      wardrobeById.white_sneakers,
      wardrobeById.leather_belt,
    ];
    const score = outfitColorScore(outfit);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("handles a real/user-fed outfit built entirely from legacy product records", () => {
    const outfit = [
      mapProductToItem({ _id: "a", category: ["tops"], colors: ["black"] }),
      mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["Unmapped Ocean Mist"] }),
      mapProductToItem({ _id: "c", category: ["shoes"] }), // no colors at all
    ];

    const score = outfitColorScore(outfit);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
