import { describe, it, expect } from "vitest";
import {
  occasionScore,
  seasonScore,
  deriveCurrentSeason,
} from "../../../src/recommendation/compatibility/contextScores.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

const item = (occasions, seasons = ["spring", "summer", "autumn", "winter"]) => ({
  occasions,
  seasons,
});

describe("occasionScore", () => {
  it("target given, both items include it -> 1.0", () => {
    expect(occasionScore(item(["work", "casual"]), item(["work"]), "work")).toBe(1.0);
  });

  it("target given, exactly one item includes it -> 0.5", () => {
    expect(occasionScore(item(["work"]), item(["casual"]), "work")).toBe(0.5);
  });

  it("target given, neither item includes it -> 0.0", () => {
    expect(occasionScore(item(["casual"]), item(["sport"]), "work")).toBe(0.0);
  });

  it("no target given -> Jaccard similarity of the two occasion sets", () => {
    const score = occasionScore(item(["casual", "work"]), item(["work", "formal"]));
    expect(score).toBeCloseTo(1 / 3); // intersection {work} / union {casual,work,formal}
  });

  it("throws for an unknown target occasion", () => {
    expect(() => occasionScore(item(["casual"]), item(["casual"]), "brunch")).toThrow(/unknown occasion/);
  });
});

describe("deriveCurrentSeason", () => {
  it("maps calendar months to the correct northern-hemisphere season", () => {
    expect(deriveCurrentSeason(new Date(2026, 0, 15))).toBe("winter"); // Jan
    expect(deriveCurrentSeason(new Date(2026, 3, 10))).toBe("spring"); // Apr
    expect(deriveCurrentSeason(new Date(2026, 6, 4))).toBe("summer"); // Jul
    expect(deriveCurrentSeason(new Date(2026, 9, 20))).toBe("autumn"); // Oct
  });

  it("flips the mapping for the southern hemisphere", () => {
    expect(deriveCurrentSeason(new Date(2026, 0, 15), "southern")).toBe("summer");
    expect(deriveCurrentSeason(new Date(2026, 6, 4), "southern")).toBe("winter");
  });

  it("defaults to northern hemisphere", () => {
    const d = new Date(2026, 6, 4);
    expect(deriveCurrentSeason(d)).toBe(deriveCurrentSeason(d, "northern"));
  });

  it("throws for an unknown hemisphere", () => {
    expect(() => deriveCurrentSeason(new Date(), "equatorial")).toThrow(/unknown hemisphere/);
  });
});

describe("seasonScore", () => {
  it("explicit target season, both items include it -> 1.0", () => {
    const score = seasonScore(item([], ["summer", "autumn"]), item([], ["summer"]), {
      targetSeason: "summer",
    });
    expect(score).toBe(1.0);
  });

  it("explicit target season, exactly one item includes it -> 0.5", () => {
    const score = seasonScore(item([], ["summer"]), item([], ["winter"]), { targetSeason: "summer" });
    expect(score).toBe(0.5);
  });

  it("explicit target season, neither item includes it -> 0.0", () => {
    const score = seasonScore(item([], ["spring"]), item([], ["autumn"]), { targetSeason: "summer" });
    expect(score).toBe(0.0);
  });

  it("targetSeason: null forces Jaccard mode across the two seasons sets", () => {
    const score = seasonScore(item([], ["spring", "summer"]), item([], ["summer", "autumn"]), {
      targetSeason: null,
    });
    expect(score).toBeCloseTo(1 / 3);
  });

  it("defaults the target to the current season derived from `date` when omitted", () => {
    const july = new Date(2026, 6, 4); // -> summer (northern, default)
    const score = seasonScore(item([], ["summer", "winter"]), item([], ["summer"]), { date: july });
    expect(score).toBe(1.0);

    const scoreMiss = seasonScore(item([], ["winter"]), item([], ["spring"]), { date: july });
    expect(scoreMiss).toBe(0.0);
  });

  it("respects hemisphere when deriving the default target", () => {
    const july = new Date(2026, 6, 4); // northern: summer, southern: winter
    const north = seasonScore(item([], ["summer"]), item([], ["summer"]), { date: july, hemisphere: "northern" });
    const south = seasonScore(item([], ["summer"]), item([], ["summer"]), { date: july, hemisphere: "southern" });
    expect(north).toBe(1.0);
    expect(south).toBe(0.0);
  });

  it("throws for an unknown explicit target season", () => {
    expect(() => seasonScore(item([], ["spring"]), item([], ["spring"]), { targetSeason: "monsoon" })).toThrow(
      /unknown season/
    );
  });
});

describe("occasion/season scores against real/user-fed data", () => {
  it("computes valid scores for items derived from legacy product records", () => {
    const a = mapProductToItem({ _id: "a", category: ["tops"], colors: ["black"] });
    const b = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["Unmapped Coral"] });

    // Both fall back to occasions=["casual"], seasons=all four (T0.2 defaults).
    expect(occasionScore(a, b, "casual")).toBe(1.0);
    expect(occasionScore(a, b)).toBeCloseTo(1.0); // identical single-element sets

    const season = seasonScore(a, b, { date: new Date(2026, 6, 4) });
    expect(season).toBeGreaterThanOrEqual(0);
    expect(season).toBeLessThanOrEqual(1);
  });
});
