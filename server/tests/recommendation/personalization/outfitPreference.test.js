import { describe, it, expect } from "vitest";
import { outfitPreferenceScore } from "../../../src/recommendation/personalization/outfitPreference.js";
import { buildAttributeProfile } from "../../../src/recommendation/personalization/attributeProfile.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

describe("outfitPreferenceScore - unit test with a fixed profile", () => {
  // Deliberately distinct category/style/pattern/colorGroup per item, so
  // each attribute bucket has exactly one data point (that item's own R) -
  // otherwise buckets get shared across items (e.g. same style) and
  // P_item stops being hand-derivable as simply "= R". Verified this
  // matters: an earlier version of this test used 3 items that all shared
  // style="casual"/pattern="solid"/colorGroup="neutral", and while the
  // outfit *mean* happened to still equal 0.8 by coincidence, the
  // per-item claim it was based on (P_item = R) was actually false
  // (checked: P_item(top)=0.675, not 0.6).
  const top = { id: "top1", category: "top", style: "casual", pattern: "solid", colorHex: "#000000" };
  const bottom = { id: "bottom1", category: "bottom", style: "formal", pattern: "striped", colorHex: "#CC2222" };
  const shoes = { id: "shoes1", category: "shoes", style: "sporty", pattern: "checked", colorHex: "#2E8B57" };

  const profile = buildAttributeProfile([
    { item: top, R: 0.6 },
    { item: bottom, R: 0.8 },
    { item: shoes, R: 1.0 },
  ]);
  const preferenceScores = new Map([
    ["top1", 0.6],
    ["bottom1", 0.8],
    ["shoes1", 1.0],
  ]);

  it("equals the mean of P_item across the outfit's items", () => {
    // Each item is now the sole data point for all 4 of its own buckets ->
    // attributeAffinity(item) = mean(R,R,R,R) = R -> P_item = 0.5R+0.5R = R.
    const score = outfitPreferenceScore([top, bottom, shoes], { profile, preferenceScores });
    expect(score).toBeCloseTo((0.6 + 0.8 + 1.0) / 3);
  });

  it("matches a single item's own P_item for a 1-item outfit", () => {
    const score = outfitPreferenceScore([top], { profile, preferenceScores });
    expect(score).toBeCloseTo(0.6);
  });
});

describe("outfitPreferenceScore - range and edge cases", () => {
  const profile = buildAttributeProfile([]);
  const preferenceScores = new Map();

  it("stays within [0,1] for outfits made entirely of unseen items (falls back to attribute affinity defaults)", () => {
    const items = [
      { id: "a", category: "top", style: "casual", pattern: "solid", colorHex: "#000000" },
      { id: "b", category: "bottom", style: "formal", pattern: "floral", colorHex: "#7D3C98" },
    ];
    const score = outfitPreferenceScore(items, { profile, preferenceScores });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeCloseTo(0.5); // every attribute unseen -> every P_item = 0.5
  });

  it("returns 0 for an empty outfit rather than throwing", () => {
    expect(outfitPreferenceScore([], { profile, preferenceScores })).toBe(0);
  });
});

describe("outfitPreferenceScore against real/user-fed data", () => {
  it("scores an outfit built from legacy product records without throwing", () => {
    const top = mapProductToItem({ _id: "t", category: ["tops"], colors: ["black"] });
    const bottom = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["Unmapped Coral"] });
    const profile = buildAttributeProfile([{ item: top, R: 0.7 }]);
    const preferenceScores = new Map([["t", 0.7]]);

    const score = outfitPreferenceScore([top, bottom], { profile, preferenceScores });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
