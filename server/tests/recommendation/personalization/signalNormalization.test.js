import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { decay, computeUserItemSignals } from "../../../src/recommendation/personalization/signalNormalization.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../../setup/memoryDb.js";
import { logInteraction, getUserInteractions } from "../../../src/services/interactionService.js";

const NOW = new Date("2026-09-27T00:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("decay", () => {
  it("is 1.0 at age 0", () => {
    expect(decay(0)).toBe(1);
  });

  it("is 0.5 at exactly one half-life (30 days)", () => {
    expect(decay(30)).toBeCloseTo(0.5);
  });

  it("a 60-day-old view counts 0.25 of a fresh view (README acceptance criterion)", () => {
    expect(decay(60)).toBeCloseTo(0.25);
  });
});

describe("computeUserItemSignals", () => {
  it("L_i is 1 only for items with a current like, 0 otherwise", () => {
    const interactions = [
      { itemId: "a", type: "like", timestamp: daysAgo(1) },
      { itemId: "b", type: "view", timestamp: daysAgo(1) },
    ];
    const signals = computeUserItemSignals(interactions, { now: NOW });
    expect(signals.get("a").L).toBe(1);
    expect(signals.get("b").L).toBe(0);
  });

  it("applies the exact 0.25 decay factor to a 60-day-old view inside the aggregation", () => {
    const interactions = [
      { itemId: "a", type: "view", timestamp: daysAgo(60) },
      { itemId: "b", type: "view", timestamp: daysAgo(0) },
    ];
    const signals = computeUserItemSignals(interactions, { now: NOW });
    // a's single decayed view (0.25) vs b's fresh view (1.0, also the max).
    const vA = signals.get("a").V;
    const vB = signals.get("b").V;
    expect(vB).toBe(1); // log(1+1)/log(1+1)
    expect(vA).toBeCloseTo(Math.log(1.25) / Math.log(2));
    expect(vA).toBeLessThan(vB);
  });

  it("normalizes V/S/P against the max across the user's items, capped at 1", () => {
    const interactions = [
      { itemId: "popular", type: "view", timestamp: daysAgo(0) },
      { itemId: "popular", type: "view", timestamp: daysAgo(0) },
      { itemId: "popular", type: "view", timestamp: daysAgo(0) },
      { itemId: "niche", type: "view", timestamp: daysAgo(0) },
    ];
    const signals = computeUserItemSignals(interactions, { now: NOW });
    expect(signals.get("popular").V).toBe(1); // the max, by definition
    expect(signals.get("niche").V).toBeGreaterThan(0);
    expect(signals.get("niche").V).toBeLessThan(1);
  });

  it("returns 0 (not NaN/Infinity) for a signal when its max across items is 0 (division by zero)", () => {
    const interactions = [{ itemId: "a", type: "view", timestamp: daysAgo(0) }];
    const signals = computeUserItemSignals(interactions, { now: NOW });
    expect(signals.get("a").S).toBe(0); // no saves anywhere -> max=0 -> 0, not NaN
    expect(signals.get("a").P).toBe(0);
    expect(Number.isNaN(signals.get("a").S)).toBe(false);
  });

  it("every signal value stays within [0,1]", () => {
    const types = ["like", "view", "save", "purchase"];
    const interactions = [];
    for (let i = 0; i < 40; i++) {
      interactions.push({
        itemId: `item${i % 5}`,
        type: types[i % types.length],
        timestamp: daysAgo(i * 3),
      });
    }
    const signals = computeUserItemSignals(interactions, { now: NOW });
    for (const { L, V, S, P } of signals.values()) {
      for (const v of [L, V, S, P]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("throws for an unrecognized interaction type", () => {
    expect(() =>
      computeUserItemSignals([{ itemId: "a", type: "share", timestamp: daysAgo(0) }], { now: NOW })
    ).toThrow(/unknown interaction type/);
  });
});

describe("computeUserItemSignals against real persisted interaction data", () => {
  beforeAll(async () => {
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("computes correct signals from interactions round-tripped through the real Interaction model (Mongoose ObjectIds, Dates)", async () => {
    const userId = new mongoose.Types.ObjectId();
    const itemA = new mongoose.Types.ObjectId();
    const itemB = new mongoose.Types.ObjectId();

    await logInteraction({ userId, itemId: itemA, type: "like" });
    await logInteraction({ userId, itemId: itemA, type: "view" });
    await logInteraction({ userId, itemId: itemB, type: "view" });
    await logInteraction({ userId, itemId: itemB, type: "purchase" });

    const interactions = await getUserInteractions(userId);
    const signals = computeUserItemSignals(interactions);

    expect(signals.get(itemA.toString()).L).toBe(1);
    expect(signals.get(itemB.toString()).L).toBe(0);
    expect(signals.get(itemB.toString()).P).toBe(1); // itemB is the only purchase -> also the max
    for (const { L, V, S, P } of signals.values()) {
      for (const v of [L, V, S, P]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
