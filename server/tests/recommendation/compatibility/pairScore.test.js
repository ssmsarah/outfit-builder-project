import { describe, it, expect } from "vitest";
import {
  combineCompatibilityComponents,
  pairwiseCompatibilityScore,
} from "../../../src/recommendation/compatibility/pairScore.js";
import { wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

describe("combineCompatibilityComponents - README worked example", () => {
  it("reproduces the exact worked example by injecting component values", () => {
    const score = combineCompatibilityComponents({
      color: 0.8,
      style: 1.0,
      pattern: 0.8,
      occasion: 1.0,
      season: 1.0,
    });

    expect(score).toBeCloseTo(0.91, 10);
  });
});

describe("pairwiseCompatibilityScore", () => {
  it("returns components that recombine to the same score via the weights", () => {
    const { score, components } = pairwiseCompatibilityScore(
      wardrobeById.black_tshirt,
      wardrobeById.blue_jeans,
      { targetOccasion: "casual", targetSeason: "summer" }
    );

    const recomputed =
      0.3 * components.color +
      0.25 * components.style +
      0.15 * components.pattern +
      0.2 * components.occasion +
      0.1 * components.season;

    expect(score).toBeCloseTo(recomputed, 10);
  });

  it("stays within [0,1] across every fixture pair, with and without a context", () => {
    const items = Object.values(wardrobeById);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const noContext = pairwiseCompatibilityScore(items[i], items[j]);
        const withContext = pairwiseCompatibilityScore(items[i], items[j], {
          targetOccasion: "casual",
          targetSeason: "summer",
        });
        for (const { score } of [noContext, withContext]) {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("a strongly matched casual pair scores higher than a mismatched formal/sporty pair", () => {
    const strong = pairwiseCompatibilityScore(wardrobeById.black_tshirt, wardrobeById.blue_jeans, {
      targetOccasion: "casual",
    });
    const weak = pairwiseCompatibilityScore(wardrobeById.black_oxfords, wardrobeById.red_shorts, {
      targetOccasion: "casual",
    });

    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("handles real/user-fed data without throwing and stays in range", () => {
    const a = mapProductToItem({ _id: "a", category: ["tops"], colors: ["black"] });
    const b = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["Unmapped Rustic Clay"] });

    const { score, components } = pairwiseCompatibilityScore(a, b, { date: new Date(2026, 6, 4) });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    for (const value of Object.values(components)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
