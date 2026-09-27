// T3.8: consolidated Sprint 3 tests - the two-synthetic-users divergence
// test the ticket asks for, plus the Sprint 3 Definition of Done itself
// ("recommendations change with user behavior while staying above the
// compatibility floor") exercised as an explicit property check.
import { describe, it, expect } from "vitest";
import { generatePersonalizedOutfits } from "../../../src/recommendation/personalization/finalRanker.js";
import { buildAttributeProfile } from "../../../src/recommendation/personalization/attributeProfile.js";
import { scoringConfig } from "../../../src/config/scoringConfig.js";
import { wardrobe, wardrobeById } from "../fixtures/wardrobe.js";

const context = { targetOccasion: "casual", targetSeason: null };
const alpha = scoringConfig.alpha.default;

function buildUserContext(scoredItems) {
  return {
    profile: buildAttributeProfile(scoredItems),
    preferenceScores: new Map(scoredItems.map((s) => [s.item.id, s.R])),
    alpha,
  };
}

const casualLover = buildUserContext([
  { item: wardrobeById.blue_jeans, R: 1.0 },
  { item: wardrobeById.white_sneakers, R: 1.0 },
  { item: wardrobeById.black_trousers, R: 0.0 },
  { item: wardrobeById.black_oxfords, R: 0.0 },
]);

const formalLover = buildUserContext([
  { item: wardrobeById.black_trousers, R: 1.0 },
  { item: wardrobeById.black_oxfords, R: 1.0 },
  { item: wardrobeById.blue_jeans, R: 0.0 },
  { item: wardrobeById.white_sneakers, R: 0.0 },
]);

describe("T3.8 - two synthetic users on the same anchor diverge in the expected direction", () => {
  const anchor = wardrobeById.black_tshirt;
  const casualResults = generatePersonalizedOutfits(anchor, wardrobe, context, casualLover, 5);
  const formalResults = generatePersonalizedOutfits(anchor, wardrobe, context, formalLover, 5);

  it("their top-5 lists differ", () => {
    const casualKeys = casualResults.map((o) => [...o.items].sort().join(","));
    const formalKeys = formalResults.map((o) => [...o.items].sort().join(","));
    expect(casualKeys).not.toEqual(formalKeys);
  });

  it("the formal-lover's list favors black_oxfords (their liked formal shoe) more than the casual-lover's does", () => {
    const countWith = (results, itemId) => results.filter((o) => o.items.includes(itemId)).length;
    const casualCount = countWith(casualResults, "black_oxfords");
    const formalCount = countWith(formalResults, "black_oxfords");
    expect(formalCount).toBeGreaterThan(casualCount);
  });

  it("the casual-lover's own liked combo (blue_jeans+white_sneakers) outranks it in the formal-lover's list", () => {
    const rankOf = (results) => results.findIndex((o) => o.items.includes("blue_jeans") && o.items.includes("white_sneakers"));
    const casualRank = rankOf(casualResults);
    const formalRank = rankOf(formalResults);
    expect(casualRank).toBeGreaterThanOrEqual(0);
    // Lower index = higher rank; the casual-lover should rank their liked
    // combo at least as favorably as the formal-lover does.
    if (formalRank >= 0) {
      expect(casualRank).toBeLessThanOrEqual(formalRank);
    }
  });
});

describe("T3.8 - Sprint 3 Definition of Done: personalization changes results while respecting the compatibility floor", () => {
  const anchors = [wardrobeById.black_tshirt, wardrobeById.white_sneakers, wardrobeById.floral_summer_dress];
  const userContexts = [
    { profile: buildAttributeProfile([]), preferenceScores: new Map(), alpha: 1.0 }, // cold start
    casualLover,
    formalLover,
  ];

  it("every returned outfit, for every anchor and every user context, stays at or above minCompatibility", () => {
    for (const anchor of anchors) {
      for (const personalization of userContexts) {
        const results = generatePersonalizedOutfits(anchor, wardrobe, context, personalization, 5);
        for (const outfit of results) {
          expect(outfit.compatibilityScore).toBeGreaterThanOrEqual(scoringConfig.minCompatibility);
        }
      }
    }
  });

  it("recommendations for a fixed anchor actually differ between at least one pair of the three user contexts", () => {
    const anchor = wardrobeById.black_tshirt;
    const keysFor = (personalization) =>
      generatePersonalizedOutfits(anchor, wardrobe, context, personalization, 5).map((o) =>
        [...o.items].sort().join(",")
      );

    const [coldKeys, casualKeys, formalKeys] = userContexts.map(keysFor);
    const allIdentical =
      JSON.stringify(coldKeys) === JSON.stringify(casualKeys) &&
      JSON.stringify(casualKeys) === JSON.stringify(formalKeys);
    expect(allIdentical).toBe(false);
  });
});
