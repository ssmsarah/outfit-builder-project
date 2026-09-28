import { describe, it, expect } from "vitest";
import { applyOutfitRules, deriveOutfitFields } from "../../../src/recommendation/rules/ruleEngine.js";
import { wardrobeById as w } from "../fixtures/wardrobe.js";

const ruleIds = (result) => result.entries.map((e) => e.ruleId);

describe("applyOutfitRules - README acceptance criteria", () => {
  it("graphic tee + floral skirt is rejected by max_one_bold_pattern", () => {
    const result = applyOutfitRules([w.orange_graphic_tee, w.green_floral_skirt, w.white_sneakers]);

    expect(result.allowed).toBe(false);
    expect(ruleIds(result)).toContain("max_one_bold_pattern");
    expect(result.messages).toContain(
      "More than one bold pattern (graphic, floral, checked) makes the outfit too busy"
    );
  });
});

describe("deriveOutfitFields", () => {
  it("exposes patternCount, boldPatternCount, styles, nonNeutralColorCount", () => {
    const fields = deriveOutfitFields([w.purple_striped_shirt, w.green_floral_skirt, w.white_sneakers]);

    expect(fields.patternCount).toBe(2); // striped + floral
    expect(fields.boldPatternCount).toBe(1); // striped is not bold
    expect(fields.styles).toEqual(new Set(["casual"]));
    expect(fields.styleCount).toBe(1);
    expect(fields.nonNeutralColorCount).toBe(2); // purple, green; white is neutral
    expect(fields.categories).toEqual(["top", "bottom", "shoes"]);
    expect(fields.itemCount).toBe(3);
  });

  it("counts neutral overrides as neutral", () => {
    // navy_shirt and blue_jeans are saturated blues but flagged isNeutralOverride.
    expect(deriveOutfitFields([w.navy_shirt, w.blue_jeans, w.black_oxfords]).nonNeutralColorCount).toBe(0);
  });
});

describe("applyOutfitRules - each outfit rule", () => {
  it("one bold pattern is allowed", () => {
    const result = applyOutfitRules([w.orange_graphic_tee, w.blue_jeans, w.white_sneakers]);
    expect(result.allowed).toBe(true);
  });

  it("checked + floral is rejected too", () => {
    const result = applyOutfitRules([w.checked_flannel_shirt, w.green_floral_skirt, w.white_sneakers]);
    expect(result.allowed).toBe(false);
  });

  it("matching_style_set boosts an outfit whose items all share one style", () => {
    const result = applyOutfitRules([w.black_tshirt, w.blue_jeans, w.white_sneakers]);
    expect(result.allowed).toBe(true);
    expect(result.adjustments).toEqual([
      expect.objectContaining({ ruleId: "matching_style_set", effect: "boost", value: 0.05 }),
    ]);
  });

  it("matching_style_set does not fire for mixed styles", () => {
    const result = applyOutfitRules([w.navy_shirt, w.blue_jeans, w.white_sneakers]);
    expect(ruleIds(result)).not.toContain("matching_style_set");
  });
});
