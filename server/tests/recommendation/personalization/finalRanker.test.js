import { describe, it, expect } from "vitest";
import { generatePersonalizedOutfits } from "../../../src/recommendation/personalization/finalRanker.js";
import { buildAttributeProfile } from "../../../src/recommendation/personalization/attributeProfile.js";
import { isValidOutfit } from "../../../src/recommendation/compatibility/outfitStructure.js";
import { scoringConfig } from "../../../src/config/scoringConfig.js";
import { wardrobe, wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

const context = { targetOccasion: "casual", targetSeason: null };
const coldStartPersonalization = { profile: buildAttributeProfile([]), preferenceScores: new Map(), alpha: 1.0 };

describe("generatePersonalizedOutfits - output shape", () => {
  it("returns T2.8's explanation shape plus preferenceScore, finalScore, and alpha", () => {
    const results = generatePersonalizedOutfits(wardrobeById.black_tshirt, wardrobe, context, coldStartPersonalization);

    expect(results.length).toBeGreaterThan(0);
    for (const outfit of results) {
      expect(outfit).toHaveProperty("items");
      expect(outfit).toHaveProperty("compatibilityScore");
      expect(outfit).toHaveProperty("breakdown");
      expect(outfit).toHaveProperty("colorRelations");
      expect(outfit).toHaveProperty("reasons");
      expect(outfit).toHaveProperty("preferenceScore");
      expect(outfit).toHaveProperty("finalScore");
      expect(outfit.alpha).toBe(1.0);
    }
  });

  it("at coldStart alpha (1.0), finalScore equals compatibilityScore exactly", () => {
    const results = generatePersonalizedOutfits(wardrobeById.black_tshirt, wardrobe, context, coldStartPersonalization);
    for (const outfit of results) {
      expect(outfit.finalScore).toBeCloseTo(outfit.compatibilityScore, 10);
    }
  });

  it("is deterministic for the same input", () => {
    const a = generatePersonalizedOutfits(wardrobeById.black_tshirt, wardrobe, context, coldStartPersonalization);
    const b = generatePersonalizedOutfits(wardrobeById.black_tshirt, wardrobe, context, coldStartPersonalization);
    expect(a).toEqual(b);
  });
});

describe("generatePersonalizedOutfits - minCompatibility hard floor (README acceptance criterion)", () => {
  it("never lets an outfit below minCompatibility into the results, even with a maximal preference boost", () => {
    const anchor = { id: "anchor", category: "top", style: "formal", pattern: "striped", colorHex: "#FF0000", occasions: ["formal"], seasons: ["winter"] };
    const badBottom = { id: "bad_bottom", category: "bottom", style: "sporty", pattern: "checked", colorHex: "#00FF00", occasions: ["sport"], seasons: ["summer"] };
    const badShoes = { id: "bad_shoes", category: "shoes", style: "sporty", pattern: "graphic", colorHex: "#0000FF", occasions: ["sport"], seasons: ["summer"] };
    const goodBottom = { id: "good_bottom", category: "bottom", style: "formal", pattern: "solid", colorHex: "#111111", occasions: ["formal"], seasons: ["winter"] };
    const goodShoes = { id: "good_shoes", category: "shoes", style: "formal", pattern: "solid", colorHex: "#0A0A0A", occasions: ["formal"], seasons: ["winter"] };

    // Verified empirically: [anchor,badBottom,badShoes] scores ~0.465 (below
    // the 0.5 floor); [anchor,goodBottom,goodShoes] scores ~0.939.
    const smallWardrobe = [anchor, badBottom, badShoes, goodBottom, goodShoes];
    const formalContext = { targetOccasion: "formal", targetSeason: "winter" };

    // Give the "bad" combo the maximum possible preference score (1.0 for
    // every item) so if the floor weren't enforced, a low alpha would let
    // it outrank the "good" combo on finalScore alone.
    const preferenceScores = new Map([
      ["anchor", 1.0],
      ["bad_bottom", 1.0],
      ["bad_shoes", 1.0],
      ["good_bottom", 0.0],
      ["good_shoes", 0.0],
    ]);
    const profile = buildAttributeProfile([
      { item: badBottom, R: 1.0 },
      { item: badShoes, R: 1.0 },
    ]);

    const results = generatePersonalizedOutfits(
      anchor,
      smallWardrobe,
      formalContext,
      { profile, preferenceScores, alpha: 0.1 }, // heavily weight personalization
      5
    );

    expect(results.length).toBeGreaterThan(0);
    for (const outfit of results) {
      expect(outfit.compatibilityScore).toBeGreaterThanOrEqual(scoringConfig.minCompatibility);
      expect([...outfit.items].sort()).not.toEqual(["anchor", "bad_bottom", "bad_shoes"].sort());
    }
  });
});

describe("generatePersonalizedOutfits - README acceptance criterion: personalization changes ranking", () => {
  it("a user with a strong preference profile gets a top-5 that differs from cold start in at least one outfit", () => {
    // Strong, clear preferences (loved sport_running_shoes; explicitly
    // disliked white_sneakers/black_oxfords/leather_belt), built directly
    // as a profile+preferenceScores rather than via realistic interaction
    // volume - a moderate, organic-looking interaction history was tried
    // first and did NOT change the top-5 set for this anchor/wardrobe (the
    // compatibility gaps between candidates were too large for alpha=0.7's
    // 0.3 weight on P to overcome); this stronger signal was verified
    // empirically to actually change both the ranking order and which
    // outfits qualify for the top 5 at all.
    const scoredItems = [
      { item: wardrobeById.sport_running_shoes, R: 1.0 },
      { item: wardrobeById.white_sneakers, R: 0.0 },
      { item: wardrobeById.black_oxfords, R: 0.0 },
      { item: wardrobeById.leather_belt, R: 0.0 },
    ];
    const profile = buildAttributeProfile(scoredItems);
    const preferenceScores = new Map(scoredItems.map((s) => [s.item.id, s.R]));
    const alpha = scoringConfig.alpha.default;

    const coldStartResults = generatePersonalizedOutfits(
      wardrobeById.black_tshirt, wardrobe, context, { ...coldStartPersonalization }, 5
    );
    const personalizedResults = generatePersonalizedOutfits(
      wardrobeById.black_tshirt, wardrobe, context, { profile, preferenceScores, alpha }, 5
    );

    const coldKeys = coldStartResults.map((o) => [...o.items].sort().join(","));
    const personalizedKeys = personalizedResults.map((o) => [...o.items].sort().join(","));

    expect(personalizedKeys).not.toEqual(coldKeys);

    // Specifically (verified empirically): sport_running_shoes's outfit
    // moves up from rank 4 to rank 2, and the disliked black_oxfords combo
    // drops out of the top 5 entirely, replaced by a different outfit.
    const rankOf = (results, itemId) => results.findIndex((o) => o.items.includes(itemId));
    expect(rankOf(personalizedResults, wardrobeById.sport_running_shoes.id)).toBeLessThan(
      rankOf(coldStartResults, wardrobeById.sport_running_shoes.id)
    );
    expect(coldStartResults.some((o) => o.items.includes(wardrobeById.black_oxfords.id))).toBe(true);
    expect(personalizedResults.some((o) => o.items.includes(wardrobeById.black_oxfords.id))).toBe(false);
  });
});

describe("generatePersonalizedOutfits against real/user-fed data", () => {
  it("generates ranked, structurally valid outfits from a wardrobe built entirely from legacy product records", () => {
    const anchor = mapProductToItem({ _id: "anchor", category: ["tops"], colors: ["black"] });
    const b1 = mapProductToItem({ _id: "b1", category: ["bottoms"], colors: ["blue"] });
    const s1 = mapProductToItem({ _id: "s1", category: ["shoes"] });
    const legacyWardrobe = [anchor, b1, s1];
    const itemsById = Object.fromEntries(legacyWardrobe.map((i) => [i.id, i]));

    const results = generatePersonalizedOutfits(anchor, legacyWardrobe, context, coldStartPersonalization);
    expect(results.length).toBeGreaterThan(0);
    for (const outfit of results) {
      const items = outfit.items.map((id) => itemsById[id]);
      expect(isValidOutfit(items)).toBe(true);
      expect(outfit.finalScore).toBeGreaterThanOrEqual(0);
      expect(outfit.finalScore).toBeLessThanOrEqual(1);
    }
  });
});
