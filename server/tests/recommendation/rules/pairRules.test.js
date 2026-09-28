import { describe, it, expect } from "vitest";
import { applyPairRules, derivePairFields } from "../../../src/recommendation/rules/ruleEngine.js";
import { wardrobeById as w } from "../fixtures/wardrobe.js";

const ruleIds = (result) => result.entries.map((e) => e.ruleId);

describe("applyPairRules - README acceptance criteria", () => {
  it("purple_striped_shirt + green_floral_skirt triggers pattern_on_pattern", () => {
    const result = applyPairRules(w.purple_striped_shirt, w.green_floral_skirt);

    expect(ruleIds(result)).toContain("pattern_on_pattern");
    expect(result.allowed).toBe(true);
    expect(result.adjustments.find((a) => a.ruleId === "pattern_on_pattern")).toMatchObject({
      type: "soft",
      effect: "penalty",
      value: 0.1,
    });
  });
});

describe("derivePairFields", () => {
  it("exposes colorRelation, bothPatterned, sameStyle, categories", () => {
    expect(derivePairFields(w.purple_striped_shirt, w.green_floral_skirt)).toEqual({
      colorRelation: "split_complementary",
      bothPatterned: true,
      sameStyle: true,
      categories: ["top", "bottom"],
    });

    expect(derivePairFields(w.black_tshirt, w.blue_jeans)).toEqual({
      colorRelation: "neutral_pair",
      bothPatterned: false,
      sameStyle: true,
      categories: ["top", "bottom"],
    });
  });

  it("sameStyle is false for different styles", () => {
    expect(derivePairFields(w.white_shirt, w.blue_jeans).sameStyle).toBe(false);
  });
});

describe("applyPairRules - each pair rule", () => {
  it("one patterned item is not pattern_on_pattern", () => {
    expect(ruleIds(applyPairRules(w.purple_striped_shirt, w.blue_jeans))).not.toContain("pattern_on_pattern");
  });

  it("formal_leather_shoes fires for a formal top + formal shoes, in either order", () => {
    expect(ruleIds(applyPairRules(w.white_shirt, w.black_oxfords))).toContain("formal_leather_shoes");
    expect(ruleIds(applyPairRules(w.black_oxfords, w.white_shirt))).toContain("formal_leather_shoes");
  });

  it("formal_leather_shoes does not fire for casual shoes or a non-top", () => {
    expect(ruleIds(applyPairRules(w.white_shirt, w.white_sneakers))).not.toContain("formal_leather_shoes");
    expect(ruleIds(applyPairRules(w.black_trousers, w.black_oxfords))).not.toContain("formal_leather_shoes");
  });

  it("double_clash_color fires when the color relation is clash", () => {
    // red (h~0) vs purple (h~282): 78 degrees apart, inside T1.3's 45-105 "clash" gap.
    expect(derivePairFields(w.red_shorts, w.purple_striped_shirt).colorRelation).toBe("clash");
    expect(ruleIds(applyPairRules(w.red_shorts, w.purple_striped_shirt))).toContain("double_clash_color");
  });

  it("neutral pairs never trigger double_clash_color", () => {
    expect(ruleIds(applyPairRules(w.black_tshirt, w.blue_jeans))).not.toContain("double_clash_color");
  });
});
