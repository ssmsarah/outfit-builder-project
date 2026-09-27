import { describe, it, expect } from "vitest";
import { validateRecommendRequest } from "../../src/validators/recommendOutfitsValidator.js";

describe("validateRecommendRequest", () => {
  it("accepts a minimal valid request (anchorItemId only)", () => {
    expect(validateRecommendRequest({ anchorItemId: "abc123" })).toBeNull();
  });

  it("accepts a fully-specified valid request", () => {
    expect(
      validateRecommendRequest({ anchorItemId: "abc123", occasion: "casual", season: "summer", limit: 5 })
    ).toBeNull();
  });

  it("rejects a missing anchorItemId", () => {
    expect(validateRecommendRequest({})).toMatch(/anchorItemId is required/);
  });

  it("rejects an invalid occasion", () => {
    expect(validateRecommendRequest({ anchorItemId: "abc123", occasion: "brunch" })).toMatch(/Invalid occasion/);
  });

  it("rejects an invalid season", () => {
    expect(validateRecommendRequest({ anchorItemId: "abc123", season: "monsoon" })).toMatch(/Invalid season/);
  });

  it("rejects a non-positive-integer limit", () => {
    expect(validateRecommendRequest({ anchorItemId: "abc123", limit: 0 })).toMatch(/limit must be/);
    expect(validateRecommendRequest({ anchorItemId: "abc123", limit: -3 })).toMatch(/limit must be/);
    expect(validateRecommendRequest({ anchorItemId: "abc123", limit: 2.5 })).toMatch(/limit must be/);
    expect(validateRecommendRequest({ anchorItemId: "abc123", limit: "5" })).toMatch(/limit must be/);
  });

  it("accepts every valid occasion and season enum value", () => {
    for (const occasion of ["casual", "work", "formal", "party", "sport"]) {
      expect(validateRecommendRequest({ anchorItemId: "abc123", occasion })).toBeNull();
    }
    for (const season of ["spring", "summer", "autumn", "winter"]) {
      expect(validateRecommendRequest({ anchorItemId: "abc123", season })).toBeNull();
    }
  });
});
