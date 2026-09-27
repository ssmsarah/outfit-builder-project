import { describe, it, expect } from "vitest";
import { isValidOutfit } from "../../../src/recommendation/compatibility/outfitStructure.js";
import { wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

const { black_tshirt, white_shirt, blue_jeans, white_sneakers, floral_summer_dress, denim_jacket, wool_overcoat, leather_belt, silver_necklace } =
  wardrobeById;

describe("isValidOutfit - README acceptance criteria", () => {
  it("a valid top+bottom+shoes outfit is valid", () => {
    expect(isValidOutfit([black_tshirt, blue_jeans, white_sneakers])).toBe(true);
  });

  it("missing shoes is invalid", () => {
    expect(isValidOutfit([black_tshirt, blue_jeans])).toBe(false);
  });

  it("two tops is invalid", () => {
    expect(isValidOutfit([black_tshirt, white_shirt, blue_jeans, white_sneakers])).toBe(false);
  });

  it("dress plus top is invalid", () => {
    expect(isValidOutfit([floral_summer_dress, black_tshirt, white_sneakers])).toBe(false);
  });
});

describe("isValidOutfit - additional structure rules", () => {
  it("a dress-alone outfit (no top/bottom) is valid", () => {
    expect(isValidOutfit([floral_summer_dress, white_sneakers])).toBe(true);
  });

  it("exactly 1 outerwear is allowed", () => {
    expect(isValidOutfit([black_tshirt, blue_jeans, white_sneakers, denim_jacket])).toBe(true);
  });

  it("2 outerwear items is invalid", () => {
    expect(
      isValidOutfit([black_tshirt, blue_jeans, white_sneakers, denim_jacket, wool_overcoat])
    ).toBe(false);
  });

  it("0 to 2 accessories are allowed", () => {
    expect(isValidOutfit([black_tshirt, blue_jeans, white_sneakers, leather_belt])).toBe(true);
    expect(
      isValidOutfit([black_tshirt, blue_jeans, white_sneakers, leather_belt, silver_necklace])
    ).toBe(true);
  });

  it("3 accessories is invalid", () => {
    const thirdAccessory = { ...leather_belt, id: "third_accessory" };
    expect(
      isValidOutfit([
        black_tshirt,
        blue_jeans,
        white_sneakers,
        leather_belt,
        silver_necklace,
        thirdAccessory,
      ])
    ).toBe(false);
  });

  it("two shoes is invalid", () => {
    expect(isValidOutfit([black_tshirt, blue_jeans, white_sneakers, { ...white_sneakers, id: "extra" }])).toBe(
      false
    );
  });

  it("an empty outfit is invalid", () => {
    expect(isValidOutfit([])).toBe(false);
  });

  it("throws for an item with an unknown category", () => {
    expect(() => isValidOutfit([{ ...black_tshirt, category: "hat" }])).toThrow(/unknown category/);
  });
});

describe("isValidOutfit against real/user-fed data", () => {
  it("validates an outfit built from mapProductToItem-derived legacy records", () => {
    const top = mapProductToItem({ _id: "t", category: ["tops"], colors: ["black"] });
    const bottom = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["blue"] });
    const shoes = mapProductToItem({ _id: "s", category: ["shoes"] });

    expect(isValidOutfit([top, bottom, shoes])).toBe(true);
  });
});
