import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { mapProductToItem } from "../../src/recommendation/mapProductToItem.js";
import Product from "../../src/models/Product.js";
import { CATEGORIES } from "../../src/recommendation/itemEnums.js";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

describe("mapProductToItem - real / user-fed data compatibility", () => {
  it("passes through a fully-tagged new-style product unchanged", () => {
    const product = {
      _id: "p1",
      category: ["tops"],
      colors: ["black"],
      outfitCategory: "top",
      colorHex: "#123456",
      isNeutralOverride: false,
      style: "streetwear",
      pattern: "graphic",
      seasons: ["summer"],
      occasions: ["party"],
    };

    const item = mapProductToItem(product);

    expect(item).toEqual({
      id: "p1",
      category: "top",
      colorHex: "#123456",
      style: "streetwear",
      pattern: "graphic",
      seasons: ["summer"],
      occasions: ["party"],
    });
  });

  it("derives every T0.2 field for a pre-T0.2 legacy record with none of the new fields set (a .lean() read of an un-migrated document)", () => {
    // This is what most real, currently-stored products look like: created
    // through the existing seller flow, before the T0.2 fields existed, and
    // read here via a plain object the way `.lean()` would return it - no
    // Mongoose document, no pre-validate hook has ever run on it.
    const legacyLeanProduct = {
      _id: "legacy1",
      name: "Classic Oxford Shirt",
      price: 2500,
      category: ["formals"],
      colors: ["Navy"],
      store: "Some Store",
    };

    const item = mapProductToItem(legacyLeanProduct);

    expect(item.id).toBe("legacy1");
    expect(CATEGORIES).toContain(item.category);
    expect(item.category).toBe("top"); // "formals" fallback, see T0.2 Decision Log
    expect(item.colorHex).toMatch(HEX_RE);
    expect(item.colorHex).toBe("#1F2A44"); // "navy" is in the known color table
    expect(item.isNeutralOverride).toBe(true); // navy is a recognized neutral name
    expect(item.style).toBe("casual");
    expect(item.pattern).toBe("solid");
    expect(item.seasons.length).toBeGreaterThan(0);
    expect(item.occasions.length).toBeGreaterThan(0);
  });

  it("falls back to neutral gray for an unrecognized free-text seller color, without crashing", () => {
    const item = mapProductToItem({
      _id: "legacy2",
      category: ["bottoms"],
      colors: ["Chartreuse Glow Ombre"],
    });

    expect(item.colorHex).toBe("#808080");
    expect(item.category).toBe("bottom");
  });

  it("falls back sensibly when category/colors are missing or malformed entirely", () => {
    const item = mapProductToItem({ _id: "legacy3" });

    expect(CATEGORIES).toContain(item.category);
    expect(item.colorHex).toMatch(HEX_RE);
  });

  it("respects an explicit isNeutralOverride: false even when the color name would otherwise infer neutral", () => {
    const item = mapProductToItem({
      _id: "p2",
      category: ["tops"],
      colors: ["black"],
      isNeutralOverride: false,
    });

    expect(item.isNeutralOverride).toBeUndefined();
  });

  it("copies name and description for search (S6.2) only when present", () => {
    const item = mapProductToItem({
      _id: "p3",
      name: "Black Cotton Tee",
      description: "Soft everyday tee",
      category: ["tops"],
    });
    expect(item.name).toBe("Black Cotton Tee");
    expect(item.description).toBe("Soft everyday tee");

    const bare = mapProductToItem({ _id: "p4", name: "  ", description: "", category: ["tops"] });
    expect(bare).not.toHaveProperty("name");
    expect(bare).not.toHaveProperty("description");
  });

  it("throws for a missing product", () => {
    expect(() => mapProductToItem(null)).toThrow();
    expect(() => mapProductToItem(undefined)).toThrow();
  });

  it("throws for a product with no id", () => {
    expect(() => mapProductToItem({ category: ["tops"] })).toThrow();
  });

  it("works against a real hydrated Mongoose Product document, not just plain objects", async () => {
    const product = new Product({
      name: "Seller Item",
      price: 1500,
      category: ["dresses"],
      store: "Store",
      seller: new mongoose.Types.ObjectId(),
      image: "https://example.com/x.jpg",
      colors: ["red"],
    });

    // Mirrors what actually happens on create: validation runs and the
    // pre-validate hook backfills outfitCategory/colorHex before mapping.
    await product.validate();

    const item = mapProductToItem(product);

    expect(item.category).toBe("dress");
    expect(item.colorHex).toBe("#CC2222");
  });
});
