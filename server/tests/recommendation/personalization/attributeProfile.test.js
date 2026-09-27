import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  colorGroupOf,
  buildAttributeProfile,
  attributeAffinity,
  computeItemAffinity,
  buildUserAffinityContext,
} from "../../../src/recommendation/personalization/attributeProfile.js";
import { wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../../setup/memoryDb.js";
import { logInteraction, getUserInteractions } from "../../../src/services/interactionService.js";

describe("colorGroupOf", () => {
  it("returns 'neutral' for neutral items", () => {
    expect(colorGroupOf(wardrobeById.black_tshirt)).toBe("neutral");
    expect(colorGroupOf(wardrobeById.navy_shirt)).toBe("neutral"); // isNeutralOverride
  });

  it("buckets non-neutral items by 30-degree hue ranges", () => {
    expect(colorGroupOf(wardrobeById.red_shorts)).toBe("hue-0"); // h≈0
    expect(colorGroupOf({ colorHex: "#7D3C98" })).toMatch(/^hue-\d+$/); // purple
  });
});

describe("buildAttributeProfile / attributeAffinity", () => {
  const casualBlackTop1 = { id: "a", category: "top", style: "casual", pattern: "solid", colorHex: "#000000" };
  const casualBlackTop2 = { id: "b", category: "top", style: "casual", pattern: "solid", colorHex: "#0A0A0A" };

  it("computes the mean R_i per attribute value", () => {
    const profile = buildAttributeProfile([
      { item: casualBlackTop1, R: 0.6 },
      { item: casualBlackTop2, R: 0.8 },
    ]);
    expect(profile.style.get("casual")).toBeCloseTo(0.7);
    expect(profile.pattern.get("solid")).toBeCloseTo(0.7);
    expect(profile.category.get("top")).toBeCloseTo(0.7);
    expect(profile.colorGroup.get("neutral")).toBeCloseTo(0.7);
  });

  it("attributeAffinity defaults unseen attribute values to 0.5", () => {
    const profile = buildAttributeProfile([{ item: casualBlackTop1, R: 1.0 }]);
    const unseenEverything = { id: "z", category: "dress", style: "formal", pattern: "floral", colorHex: "#7D3C98" };
    expect(attributeAffinity(unseenEverything, profile)).toBeCloseTo(0.5);
  });

  it("attributeAffinity is the mean across all 4 attribute types, mixing seen and unseen", () => {
    const profile = buildAttributeProfile([{ item: casualBlackTop1, R: 1.0 }]);
    // style seen (1.0), pattern seen (1.0), category seen (1.0), colorGroup unseen (floral/purple, 0.5)
    const item = { id: "z", category: "top", style: "casual", pattern: "solid", colorHex: "#7D3C98" };
    expect(attributeAffinity(item, profile)).toBeCloseTo((1 + 1 + 1 + 0.5) / 4);
  });
});

describe("computeItemAffinity", () => {
  it("blends R_i and attribute affinity 50/50 for an item the user interacted with", () => {
    const item = { id: "a", category: "top", style: "casual", pattern: "solid", colorHex: "#000000" };
    const profile = buildAttributeProfile([{ item, R: 0.8 }]);
    const preferenceScores = new Map([["a", 0.8]]);

    const result = computeItemAffinity(item, { profile, preferenceScores });
    // attributeAffinity(item) here = mean of its own 4 buckets, each = 0.8 (only data point)
    expect(result).toBeCloseTo(0.5 * 0.8 + 0.5 * 0.8);
  });

  it("uses attribute affinity alone for an unseen item (no entry in preferenceScores)", () => {
    const seen = { id: "a", category: "top", style: "casual", pattern: "solid", colorHex: "#000000" };
    const profile = buildAttributeProfile([{ item: seen, R: 0.9 }]);
    const preferenceScores = new Map([["a", 0.9]]);

    const unseen = { id: "unseen1", category: "top", style: "casual", pattern: "solid", colorHex: "#0A0A0A" };
    expect(computeItemAffinity(unseen, { profile, preferenceScores })).toBeCloseTo(
      attributeAffinity(unseen, profile)
    );
  });
});

describe("attribute affinity - README acceptance criterion (end-to-end, real persisted data)", () => {
  beforeAll(async () => {
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("a user who liked several black casual items gets higher P_item for an unseen black casual item than for an unseen floral formal item", async () => {
    const userId = new mongoose.Types.ObjectId();

    // Interaction.itemId is a real Mongoose ObjectId field, so items need
    // real ObjectIds - not arbitrary strings - to persist correctly.
    const likedItems = [
      { _id: new mongoose.Types.ObjectId(), category: "top", style: "casual", pattern: "solid", colorHex: "#000000" },
      { _id: new mongoose.Types.ObjectId(), category: "top", style: "casual", pattern: "solid", colorHex: "#0A0A0A" },
      { _id: new mongoose.Types.ObjectId(), category: "top", style: "casual", pattern: "solid", colorHex: "#111111" },
    ].map((i) => ({ ...i, id: i._id.toString() }));

    for (const item of likedItems) {
      await logInteraction({ userId, itemId: item._id, type: "like" });
      await logInteraction({ userId, itemId: item._id, type: "purchase" });
    }

    const itemsById = Object.fromEntries(likedItems.map((i) => [i.id, i]));
    const interactions = await getUserInteractions(userId);
    const { profile, preferenceScores } = buildUserAffinityContext(interactions, itemsById);

    const unseenBlackCasual = { id: "unseen_black", category: "top", style: "casual", pattern: "solid", colorHex: "#1A1A1A" };
    const unseenFloralFormal = { id: "unseen_floral", category: "top", style: "formal", pattern: "floral", colorHex: "#7D3C98" };

    const pBlackCasual = computeItemAffinity(unseenBlackCasual, { profile, preferenceScores });
    const pFloralFormal = computeItemAffinity(unseenFloralFormal, { profile, preferenceScores });

    expect(pBlackCasual).toBeGreaterThan(pFloralFormal);
  });

  it("handles real/user-fed data (mapProductToItem-derived items) without throwing", async () => {
    const userId = new mongoose.Types.ObjectId();
    const legacyItem = mapProductToItem({
      _id: new mongoose.Types.ObjectId(),
      category: ["tops"],
      colors: ["black"],
    });

    await logInteraction({ userId, itemId: legacyItem.id, type: "like" });

    const itemsById = { [legacyItem.id]: legacyItem };
    const interactions = await getUserInteractions(userId);
    const { profile, preferenceScores } = buildUserAffinityContext(interactions, itemsById);

    const unseenLegacy = mapProductToItem({
      _id: new mongoose.Types.ObjectId(),
      category: ["tops"],
      colors: ["black"],
    });
    const affinity = computeItemAffinity(unseenLegacy, { profile, preferenceScores });

    expect(affinity).toBeGreaterThanOrEqual(0);
    expect(affinity).toBeLessThanOrEqual(1);
  });
});
