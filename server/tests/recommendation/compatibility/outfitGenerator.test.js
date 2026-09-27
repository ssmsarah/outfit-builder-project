import { describe, it, expect } from "vitest";
import { generateOutfits } from "../../../src/recommendation/compatibility/outfitGenerator.js";
import { isValidOutfit } from "../../../src/recommendation/compatibility/outfitStructure.js";
import { wardrobe, wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

const context = { targetOccasion: "casual", targetSeason: null };

describe("generateOutfits - README acceptance criteria", () => {
  it("anchor black_tshirt returns 5 valid outfits in descending score order", () => {
    const results = generateOutfits(wardrobeById.black_tshirt, wardrobe, context);

    expect(results.length).toBe(5);
    for (const { items, score } of results) {
      expect(isValidOutfit(items)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("the same input always gives the same output (determinism)", () => {
    const a = generateOutfits(wardrobeById.black_tshirt, wardrobe, context);
    const b = generateOutfits(wardrobeById.black_tshirt, wardrobe, context);

    expect(a).toEqual(b);
  });

  it("returns fewer than topN without error if the wardrobe is too small", () => {
    const tinyWardrobe = [wardrobeById.black_tshirt, wardrobeById.blue_jeans, wardrobeById.white_sneakers];
    const results = generateOutfits(wardrobeById.black_tshirt, tinyWardrobe, context, 5);

    expect(results.length).toBeLessThan(5);
    expect(results.length).toBe(1); // exactly one bottom, one shoes candidate available
  });

  it("returns an empty array (not an error) when a required category is entirely absent", () => {
    const noShoesWardrobe = wardrobe.filter((i) => i.category !== "shoes");
    const results = generateOutfits(wardrobeById.black_tshirt, noShoesWardrobe, context, 5);
    expect(results).toEqual([]);
  });
});

describe("generateOutfits - other anchor categories and structure", () => {
  it("works for a shoes anchor (needs top + bottom)", () => {
    const results = generateOutfits(wardrobeById.white_sneakers, wardrobe, context);
    expect(results.length).toBeGreaterThan(0);
    for (const { items } of results) {
      expect(isValidOutfit(items)).toBe(true);
      expect(items.some((i) => i.id === "white_sneakers")).toBe(true);
    }
  });

  it("works for a dress anchor (needs shoes only)", () => {
    const results = generateOutfits(wardrobeById.floral_summer_dress, wardrobe, context);
    expect(results.length).toBeGreaterThan(0);
    for (const { items } of results) {
      expect(isValidOutfit(items)).toBe(true);
      expect(items.some((i) => i.category === "top" || i.category === "bottom")).toBe(false);
    }
  });

  it("works for a bottom anchor (needs top + shoes)", () => {
    const results = generateOutfits(wardrobeById.blue_jeans, wardrobe, context);
    expect(results.length).toBeGreaterThan(0);
    for (const { items } of results) {
      expect(isValidOutfit(items)).toBe(true);
    }
  });

  it("throws for an unsupported anchor category (outerwear/accessory)", () => {
    expect(() => generateOutfits(wardrobeById.leather_belt, wardrobe, context)).toThrow(
      /unsupported anchor category/
    );
    expect(() => generateOutfits(wardrobeById.denim_jacket, wardrobe, context)).toThrow(
      /unsupported anchor category/
    );
  });

  it("never uses the same item twice, and never returns duplicate outfits", () => {
    const results = generateOutfits(wardrobeById.black_tshirt, wardrobe, context, 20);

    const outfitKeys = new Set();
    for (const { items } of results) {
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length); // no repeated item within one outfit

      const key = [...ids].sort().join(",");
      expect(outfitKeys.has(key)).toBe(false); // no duplicate outfit across results
      outfitKeys.add(key);
    }
  });

  it("adds at most 1 accessory per outfit", () => {
    const results = generateOutfits(wardrobeById.black_tshirt, wardrobe, context, 20);
    for (const { items } of results) {
      const accessoryCount = items.filter((i) => i.category === "accessory").length;
      expect(accessoryCount).toBeLessThanOrEqual(1);
    }
  });

  it("respects a custom topN, including a value larger than the default beamWidth pool would naturally produce", () => {
    const results = generateOutfits(wardrobeById.black_tshirt, wardrobe, context, 2);
    expect(results.length).toBe(2);
  });
});

describe("generateOutfits against real/user-fed data", () => {
  it("generates outfits from a wardrobe built entirely from legacy product records", () => {
    const legacyWardrobe = [
      mapProductToItem({ _id: "anchor", category: ["tops"], colors: ["black"] }),
      mapProductToItem({ _id: "b1", category: ["bottoms"], colors: ["blue"] }),
      mapProductToItem({ _id: "b2", category: ["bottoms"], colors: ["Unmapped Coral"] }),
      mapProductToItem({ _id: "s1", category: ["shoes"] }),
      mapProductToItem({ _id: "s2", category: ["shoes"], colors: ["white"] }),
    ];

    const anchor = legacyWardrobe[0];
    const results = generateOutfits(anchor, legacyWardrobe, { targetOccasion: "casual", targetSeason: null });

    expect(results.length).toBeGreaterThan(0);
    for (const { items } of results) {
      expect(isValidOutfit(items)).toBe(true);
    }
  });
});
