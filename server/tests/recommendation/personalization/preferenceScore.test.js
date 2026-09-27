import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  itemPreferenceScore,
  computeUserItemPreferenceScores,
} from "../../../src/recommendation/personalization/preferenceScore.js";
import { scoringConfig } from "../../../src/config/scoringConfig.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../../setup/memoryDb.js";
import { logInteraction, getUserInteractions } from "../../../src/services/interactionService.js";

describe("itemPreferenceScore", () => {
  it("matches a direct weighted-sum computation for injected component values", () => {
    const signals = { L: 1, V: 0.5, S: 0.2, P: 0.8 };
    const { like, view, save, purchase } = scoringConfig.preferenceWeights;
    const expected = like * 1 + view * 0.5 + save * 0.2 + purchase * 0.8;
    expect(itemPreferenceScore(signals)).toBeCloseTo(expected, 10);
  });

  it("README acceptance criterion: a liked + purchased item outranks one that was only viewed many times", () => {
    const likedAndPurchased = itemPreferenceScore({ L: 1, V: 0, S: 0, P: 1 });
    const viewedOnly = itemPreferenceScore({ L: 0, V: 1, S: 0, P: 0 }); // V=1: the most-viewed item

    expect(likedAndPurchased).toBeGreaterThan(viewedOnly);
  });

  it("stays within [0,1] across the full range of signal combinations", () => {
    for (let l = 0; l <= 1; l += 1) {
      for (let v = 0; v <= 1; v += 0.5) {
        for (let s = 0; s <= 1; s += 0.5) {
          for (let p = 0; p <= 1; p += 0.5) {
            const score = itemPreferenceScore({ L: l, V: v, S: s, P: p });
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("no signals at all (a never-interacted-with item) scores exactly 0", () => {
    expect(itemPreferenceScore({ L: 0, V: 0, S: 0, P: 0 })).toBe(0);
  });
});

describe("computeUserItemPreferenceScores", () => {
  const NOW = new Date("2026-09-27T00:00:00Z");

  it("ranks a liked+purchased item above a merely-viewed item end-to-end from raw interactions", () => {
    const interactions = [
      { itemId: "loved", type: "like", timestamp: NOW },
      { itemId: "loved", type: "purchase", timestamp: NOW },
      { itemId: "browsed", type: "view", timestamp: NOW },
      { itemId: "browsed", type: "view", timestamp: NOW },
      { itemId: "browsed", type: "view", timestamp: NOW },
    ];
    const scores = computeUserItemPreferenceScores(interactions, { now: NOW });
    expect(scores.get("loved")).toBeGreaterThan(scores.get("browsed"));
  });
});

describe("preference scoring against real persisted interaction data", () => {
  beforeAll(async () => {
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("computes real R_i values from interactions logged through the actual service", async () => {
    const userId = new mongoose.Types.ObjectId();
    const loved = new mongoose.Types.ObjectId();
    const browsed = new mongoose.Types.ObjectId();

    await logInteraction({ userId, itemId: loved, type: "like" });
    await logInteraction({ userId, itemId: loved, type: "purchase" });
    await logInteraction({ userId, itemId: browsed, type: "view" });

    const interactions = await getUserInteractions(userId);
    const scores = computeUserItemPreferenceScores(interactions);

    expect(scores.get(loved.toString())).toBeGreaterThan(scores.get(browsed.toString()));
    for (const score of scores.values()) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
