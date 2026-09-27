import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import Product from "../../src/models/Product.js";

// Uses validate() (schema-level only, promise-based) rather than a live
// save(), so these run with no MongoDB connection - validateSync() cannot
// be used here because Mongoose only runs the pre("validate") derivation
// hook (see Product.js) through the async validate() path.

const baseProduct = () => ({
  name: "Test Item",
  price: 1000,
  category: ["tops"],
  store: "Test Store",
  seller: new mongoose.Types.ObjectId(),
  image: "https://example.com/image.jpg",
});

describe("Product outfit attributes (T0.2)", () => {
  it("accepts explicit valid outfit-algorithm fields", async () => {
    const product = new Product({
      ...baseProduct(),
      outfitCategory: "top",
      colorHex: "#1F2A44",
      isNeutralOverride: true,
      style: "smart_casual",
      pattern: "striped",
      seasons: ["autumn", "winter"],
      occasions: ["work"],
    });

    await expect(product.validate()).resolves.toBeUndefined();
    expect(product.outfitCategory).toBe("top");
    expect(product.colorHex).toBe("#1F2A44");
  });

  it("rejects an invalid outfitCategory enum value", async () => {
    const product = new Product({ ...baseProduct(), outfitCategory: "hat" });
    await expect(product.validate()).rejects.toBeDefined();
  });

  it("rejects a malformed colorHex", async () => {
    const product = new Product({ ...baseProduct(), colorHex: "blue" });
    await expect(product.validate()).rejects.toBeDefined();
  });

  it("accepts a well-formed #RRGGBB colorHex", async () => {
    const product = new Product({ ...baseProduct(), colorHex: "#CC2222" });
    await expect(product.validate()).resolves.toBeUndefined();
  });

  it("defaults style/pattern/seasons/occasions for a legacy item with no new fields", async () => {
    const product = new Product(baseProduct());
    await product.validate();

    expect(product.style).toBe("casual");
    expect(product.pattern).toBe("solid");
    expect(product.seasons.slice().sort()).toEqual(
      ["autumn", "spring", "summer", "winter"].sort()
    );
    expect(product.occasions).toEqual(["casual"]);
  });

  it("derives outfitCategory and colorHex from legacy category/colors when omitted", async () => {
    const product = new Product({
      ...baseProduct(),
      category: ["bottoms"],
      colors: ["Navy"],
    });

    await product.validate();

    expect(product.outfitCategory).toBe("bottom");
    expect(product.colorHex).toBe("#1F2A44");
    expect(product.isNeutralOverride).toBe(true);
  });

  it("falls back to a neutral gray hex for an unrecognized legacy color name", async () => {
    const product = new Product({
      ...baseProduct(),
      colors: ["chartreuse-glow"],
    });

    await product.validate();

    expect(product.colorHex).toBe("#808080");
  });

  it("does not overwrite an explicitly set outfitCategory/colorHex with derived values", async () => {
    const product = new Product({
      ...baseProduct(),
      category: ["tops"],
      colors: ["black"],
      outfitCategory: "accessory",
      colorHex: "#E67E22",
    });

    await product.validate();

    expect(product.outfitCategory).toBe("accessory");
    expect(product.colorHex).toBe("#E67E22");
  });
});
