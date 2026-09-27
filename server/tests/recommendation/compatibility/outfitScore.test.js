import { describe, it, expect } from "vitest";
import { outfitScore } from "../../../src/recommendation/compatibility/outfitScore.js";
import { pairwiseCompatibilityScore } from "../../../src/recommendation/compatibility/pairScore.js";
import { outfitColorScore } from "../../../src/recommendation/color/colorHarmony.js";
import { wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

const {
  black_tshirt,
  blue_jeans,
  white_sneakers,
  black_trousers,
  black_oxfords,
  leather_belt,
  silver_necklace,
} = wardrobeById;

// targetSeason: null pins season scoring to Jaccard mode so these tests
// don't depend on today's real date.
const casualContext = { targetOccasion: "casual", targetSeason: null };
const formalContext = { targetOccasion: "formal", targetSeason: null };

describe("outfitScore - README acceptance criteria", () => {
  it("black_tshirt+blue_jeans+white_sneakers scores higher than black_tshirt+black_trousers+black_oxfords in a casual context", () => {
    const casualOutfit = outfitScore([black_tshirt, blue_jeans, white_sneakers], casualContext);
    const formalOutfit = outfitScore([black_tshirt, black_trousers, black_oxfords], casualContext);

    expect(casualOutfit).toBeGreaterThan(formalOutfit);
  });

  it("...and lower in a formal context", () => {
    const casualOutfit = outfitScore([black_tshirt, blue_jeans, white_sneakers], formalContext);
    const formalOutfit = outfitScore([black_tshirt, black_trousers, black_oxfords], formalContext);

    expect(casualOutfit).toBeLessThan(formalOutfit);
  });
});

describe("outfitScore - structure and weighting", () => {
  it("returns 0 for a structurally invalid outfit instead of computing a score", () => {
    expect(outfitScore([black_tshirt, blue_jeans], casualContext)).toBe(0); // missing shoes
  });

  it("stays within [0,1] for valid outfits, with and without accessories", () => {
    const noAccessory = outfitScore([black_tshirt, blue_jeans, white_sneakers], casualContext);
    const withAccessories = outfitScore(
      [black_tshirt, blue_jeans, white_sneakers, leather_belt, silver_necklace],
      casualContext
    );
    for (const score of [noAccessory, withAccessories]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("accessory pairs are actually down-weighted (adding a poorly-matched accessory moves the score less than a full-weight item would)", () => {
    const base = outfitScore([black_tshirt, blue_jeans, white_sneakers], casualContext);

    // silver_necklace is formal - a poor style match for this casual outfit.
    const withAccessory = outfitScore(
      [black_tshirt, blue_jeans, white_sneakers, silver_necklace],
      casualContext
    );

    const drop = base - withAccessory;
    expect(drop).toBeGreaterThan(0); // it does pull the score down...
    expect(drop).toBeLessThan(0.5); // ...but only at half weight, not full weight
  });

  it("replaces the mean pairwise color contribution with the outfit-level color score (exact formula check)", () => {
    const items = [black_tshirt, blue_jeans, white_sneakers]; // no accessories -> all pair weights 1.0
    const score = outfitScore(items, casualContext);

    let pairSum = 0;
    let colorSum = 0;
    let n = 0;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const { score: pairScore, components } = pairwiseCompatibilityScore(items[i], items[j], casualContext);
        pairSum += pairScore;
        colorSum += components.color;
        n += 1;
      }
    }
    const base = pairSum / n;
    const meanPairColor = colorSum / n;
    const wc = 0.3;
    const expected = base - wc * meanPairColor + wc * outfitColorScore(items);

    expect(score).toBeCloseTo(Math.min(1, Math.max(0, expected)), 8);
  });
});

describe("outfitScore against real/user-fed data", () => {
  it("scores a valid outfit built from legacy product records without throwing", () => {
    const top = mapProductToItem({ _id: "t", category: ["tops"], colors: ["black"] });
    const bottom = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["blue"] });
    const shoes = mapProductToItem({ _id: "s", category: ["shoes"] });

    const score = outfitScore([top, bottom, shoes], { targetOccasion: "casual", targetSeason: null });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
