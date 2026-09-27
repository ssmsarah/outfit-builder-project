import { describe, it, expect, afterEach } from "vitest";
import { getRecommenderMode } from "../../src/config/recommenderMode.js";

describe("getRecommenderMode", () => {
  const original = process.env.RECOMMENDER;

  afterEach(() => {
    if (original === undefined) delete process.env.RECOMMENDER;
    else process.env.RECOMMENDER = original;
  });

  it("defaults to 'scored' when RECOMMENDER is unset", () => {
    delete process.env.RECOMMENDER;
    expect(getRecommenderMode()).toBe("scored");
  });

  it("returns 'legacy' when RECOMMENDER=legacy", () => {
    process.env.RECOMMENDER = "legacy";
    expect(getRecommenderMode()).toBe("legacy");
  });

  it("returns 'scored' when RECOMMENDER=scored", () => {
    process.env.RECOMMENDER = "scored";
    expect(getRecommenderMode()).toBe("scored");
  });

  it("throws for an invalid value", () => {
    process.env.RECOMMENDER = "banana";
    expect(() => getRecommenderMode()).toThrow(/Invalid RECOMMENDER/);
  });
});
