// I7.3: rules inside outfit generation (T2.7) and final ranking (T3.7).
import { describe, it, expect } from "vitest";
import { generateOutfits } from "../../../src/recommendation/compatibility/outfitGenerator.js";
import { generatePersonalizedOutfits } from "../../../src/recommendation/personalization/finalRanker.js";
import { outfitScore } from "../../../src/recommendation/compatibility/outfitScore.js";
import { buildAttributeProfile } from "../../../src/recommendation/personalization/attributeProfile.js";
import { evaluateOutfit } from "../../../src/recommendation/rules/ruleEngine.js";
import { rulesConfig } from "../../../src/config/rulesConfig.js";
import { wardrobe, wardrobeById as w } from "../fixtures/wardrobe.js";

const ANCHORS = ["black_tshirt", "white_shirt", "navy_shirt", "blue_jeans", "black_trousers", "black_oxfords", "black_cocktail_dress", "white_sneakers"];
const coldStart = { profile: buildAttributeProfile([]), preferenceScores: new Map(), alpha: 1.0 };
const personalized = { ...coldStart, alpha: 0.7 };
const isSporty = (item) => item.style === "sporty" || item.style === "streetwear";

describe("I7.3 - README acceptance criteria", () => {
  it("no outfit returned in formal context contains a sporty item", () => {
    const context = { targetOccasion: "formal", targetSeason: null };
    let checked = 0;

    for (const id of ANCHORS) {
      for (const { items } of generateOutfits(w[id], wardrobe, context, 20)) {
        expect(items.some(isSporty), `${id}: ${items.map((i) => i.id)}`).toBe(false);
        checked += 1;
      }
      for (const { items } of generatePersonalizedOutfits(w[id], wardrobe, context, coldStart, 20)) {
        expect(items.some((itemId) => isSporty(w[itemId]))).toBe(false);
      }
    }

    expect(checked).toBeGreaterThan(20);
  });

  it("without rules, the same formal request does include sporty items (the rules are what remove them)", () => {
    const context = { targetOccasion: "formal", targetSeason: null };
    const outfits = generateOutfits(w.black_tshirt, wardrobe, context, 20, { rules: [] });
    expect(outfits.some(({ items }) => items.some(isSporty))).toBe(true);
  });
});

describe("I7.3 - step 1: item pre-filter", () => {
  it("items failing item-level hard rules never appear", () => {
    const context = { targetOccasion: "sport", targetSeason: null };
    for (const { items } of generateOutfits(w.grey_hoodie, wardrobe, context, 20)) {
      expect(items.map((i) => i.id)).not.toContain("black_oxfords"); // formal shoes for sport
    }
  });
});

describe("I7.3 - step 2: beam search drops rejected outfits", () => {
  it("no outfit breaks a pair/outfit hard rule (max_one_bold_pattern)", () => {
    const context = { targetOccasion: "casual", targetSeason: null };
    for (const id of ["orange_graphic_tee", "checked_flannel_shirt", "green_floral_skirt"]) {
      for (const { items } of generateOutfits(w[id], wardrobe, context, 20)) {
        expect(evaluateOutfit(items, context).allowed).toBe(true);
        const bold = items.filter((i) => rulesConfig.boldPatterns.includes(i.pattern));
        expect(bold.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("every returned outfit passes the full rule engine in its context", () => {
    for (const occasion of ["casual", "formal", "sport", "work", "party"]) {
      const context = { targetOccasion: occasion, targetSeason: "winter" };
      for (const id of ANCHORS) {
        for (const { items } of generateOutfits(w[id], wardrobe, context, 10)) {
          expect(evaluateOutfit(items, context).allowed).toBe(true);
        }
      }
    }
  });
});

describe("I7.3 - step 3: C_adjusted and FinalScore", () => {
  const context = { targetOccasion: "casual", targetSeason: null };

  it("generateOutfits scores are C_adjusted = clamp01(C + ruleAdjustment)", () => {
    for (const outfit of generateOutfits(w.black_tshirt, wardrobe, context, 20)) {
      expect(outfit.baseScore).toBeCloseTo(outfitScore(outfit.items, context), 12);
      expect(outfit.score).toBeCloseTo(Math.min(1, Math.max(0, outfit.baseScore + outfit.ruleAdjustment)), 12);
      expect(Math.abs(outfit.ruleAdjustment)).toBeLessThanOrEqual(rulesConfig.adjustmentCap);
    }
  });

  it("FinalScore = alpha * C_adjusted + (1 - alpha) * P", () => {
    for (const o of generatePersonalizedOutfits(w.black_tshirt, wardrobe, context, personalized)) {
      expect(o.finalScore).toBeCloseTo(0.7 * o.adjustedCompatibilityScore + 0.3 * o.preferenceScore, 12);
    }
  });

  it("the minCompatibility floor applies to the adjusted score", () => {
    for (const o of generatePersonalizedOutfits(w.black_tshirt, wardrobe, context, coldStart, 20)) {
      expect(o.adjustedCompatibilityScore).toBeGreaterThanOrEqual(0.5);
    }
  });
});

describe("I7.3 - step 4: explanations", () => {
  const context = { targetOccasion: "casual", targetSeason: null };

  it("outputs carry ruleAdjustment and appliedRules, with rule messages merged into reasons", () => {
    const [top] = generatePersonalizedOutfits(w.black_tshirt, wardrobe, context, coldStart);
    expect(top.items).toEqual(["black_tshirt", "blue_jeans", "white_sneakers"]);
    expect(top.ruleAdjustment).toBeCloseTo(0.05, 12);
    expect(top.appliedRules.map((r) => r.ruleId)).toEqual(["matching_style_set"]);
    expect(top.reasons).toContain("Every piece shares the same style for a coordinated look");
  });

  it("returned outfits only ever show soft rules (rejections are never returned)", () => {
    for (const occasion of ["casual", "formal", "sport"]) {
      for (const o of generatePersonalizedOutfits(w.white_shirt, wardrobe, { targetOccasion: occasion }, coldStart, 20)) {
        expect(o.appliedRules.every((r) => r.type === "soft")).toBe(true);
      }
    }
  });
});

describe("I7.3 - step 5: anchor fails a hard rule", () => {
  it("returns an empty list instead of throwing", () => {
    const context = { targetOccasion: "formal" };
    expect(() => generateOutfits(w.red_shorts, wardrobe, context)).not.toThrow();
    expect(generateOutfits(w.red_shorts, wardrobe, context)).toEqual([]);
    expect(generatePersonalizedOutfits(w.red_shorts, wardrobe, context, coldStart)).toEqual([]);
  });
});
