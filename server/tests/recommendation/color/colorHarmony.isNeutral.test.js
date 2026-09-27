import { describe, it, expect } from "vitest";
import { isNeutral } from "../../../src/recommendation/color/colorHarmony.js";
import { wardrobeById } from "../fixtures/wardrobe.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

describe("isNeutral", () => {
  it("treats black as neutral (v <= minValueForDark)", () => {
    expect(isNeutral({ colorHex: "#000000" })).toBe(true);
  });

  it("treats white as neutral (s <= maxSaturation)", () => {
    expect(isNeutral({ colorHex: "#FFFFFF" })).toBe(true);
  });

  it("treats grey as neutral", () => {
    expect(isNeutral({ colorHex: "#808080" })).toBe(true);
  });

  it("treats an isNeutralOverride item as neutral even when its raw HSV would not qualify", () => {
    // navy (#1F2A44) has s~0.54 and v~0.27, both above the 0.20 thresholds -
    // without the override it would NOT be neutral by HSV alone.
    const navy = { colorHex: "#1F2A44" };
    expect(isNeutral(navy)).toBe(false);

    const navyOverridden = { colorHex: "#1F2A44", isNeutralOverride: true };
    expect(isNeutral(navyOverridden)).toBe(true);
  });

  it("does not treat a saturated, mid-brightness color as neutral", () => {
    expect(isNeutral({ colorHex: "#CC2222" })).toBe(false); // red_shorts
    expect(isNeutral({ colorHex: "#2E8B57" })).toBe(false); // green_floral_skirt
  });

  it("agrees with the fixture wardrobe's intended neutral items", () => {
    expect(isNeutral(wardrobeById.black_tshirt)).toBe(true);
    expect(isNeutral(wardrobeById.navy_shirt)).toBe(true); // override
    expect(isNeutral(wardrobeById.blue_jeans)).toBe(true); // override
    expect(isNeutral(wardrobeById.black_oxfords)).toBe(true);
    expect(isNeutral(wardrobeById.white_sneakers)).toBe(true);

    expect(isNeutral(wardrobeById.red_shorts)).toBe(false);
    expect(isNeutral(wardrobeById.green_floral_skirt)).toBe(false);
    expect(isNeutral(wardrobeById.orange_graphic_tee)).toBe(false);
    expect(isNeutral(wardrobeById.purple_striped_shirt)).toBe(false);
  });

  it("handles real/user-fed data whose color fell back to neutral gray", () => {
    const item = mapProductToItem({
      _id: "legacy1",
      category: ["accessories"],
      colors: ["Unrecognized Sunset Glow"],
    });

    expect(isNeutral(item)).toBe(true); // #808080 fallback is itself neutral
  });

  it("handles real/user-fed data with an explicit legacy neutral color name", () => {
    const item = mapProductToItem({
      _id: "legacy2",
      category: ["formals"],
      colors: ["Navy"],
    });

    expect(isNeutral(item)).toBe(true); // isNeutralOverride derived true for "navy"
  });
});
