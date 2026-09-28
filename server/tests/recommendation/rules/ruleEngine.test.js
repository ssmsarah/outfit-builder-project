import { describe, it, expect } from "vitest";
import { evaluateOutfit, filterItems } from "../../../src/recommendation/rules/ruleEngine.js";
import { rulesConfig } from "../../../src/config/rulesConfig.js";
import { wardrobe, wardrobeById as w } from "../fixtures/wardrobe.js";

const ids = (entries) => entries.map((e) => e.ruleId);

function withRule(id, patch) {
  return rulesConfig.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule));
}

// A third patterned piece so pattern_on_pattern fires on all three pairs,
// while keeping only one *bold* pattern (floral) so the outfit is allowed.
const stripedSneakers = { ...w.white_sneakers, id: "striped_sneakers", pattern: "striped" };

describe("evaluateOutfit - hard rejects", () => {
  it("rejects with the reason of every hard rule that fired, and applies no adjustment", () => {
    const result = evaluateOutfit([w.orange_graphic_tee, w.green_floral_skirt, w.black_oxfords], {
      occasion: "formal",
    });

    expect(result.allowed).toBe(false);
    expect(result.ruleAdjustment).toBe(0);
    expect(ids(result.rejections)).toEqual(["formal_no_sporty", "max_one_bold_pattern"]);
    expect(result.messages).toEqual([
      "Sporty or streetwear items are not suitable for formal occasions",
      "More than one bold pattern (graphic, floral, checked) makes the outfit too busy",
    ]);
  });

  it("records which items triggered a rule", () => {
    const result = evaluateOutfit([w.orange_graphic_tee, w.red_shorts, w.black_oxfords], { occasion: "formal" });
    const rejection = result.rejections.find((e) => e.ruleId === "formal_no_sporty");
    expect(rejection.itemIds).toEqual(["orange_graphic_tee", "red_shorts"]);
  });
});

describe("evaluateOutfit - soft adjustments", () => {
  it("applies each soft rule at most once, even when several pairs trigger it", () => {
    const result = evaluateOutfit([w.purple_striped_shirt, w.green_floral_skirt, stripedSneakers]);

    expect(result.allowed).toBe(true);
    const patternEntries = result.appliedRules.filter((e) => e.ruleId === "pattern_on_pattern");
    expect(patternEntries).toHaveLength(1);
    expect(patternEntries[0].itemIds.sort()).toEqual(
      ["green_floral_skirt", "purple_striped_shirt", "striped_sneakers"].sort()
    );

    // -0.10 (pattern_on_pattern, once) + 0.05 (matching_style_set: all casual)
    expect(result.ruleAdjustment).toBeCloseTo(-0.05, 10);
  });

  it("sums boosts and penalties", () => {
    const result = evaluateOutfit([w.white_shirt, w.black_trousers, w.black_oxfords]);
    // formal_leather_shoes (+0.05) + matching_style_set (+0.05)
    expect(ids(result.appliedRules)).toEqual(["formal_leather_shoes", "matching_style_set"]);
    expect(result.ruleAdjustment).toBeCloseTo(0.1, 10);
  });

  it("an outfit no rule touches has adjustment 0 and no messages", () => {
    const result = evaluateOutfit([w.navy_shirt, w.blue_jeans, w.white_sneakers]);
    expect(result).toEqual({ allowed: true, ruleAdjustment: 0, appliedRules: [], rejections: [], messages: [] });
  });
});

describe("evaluateOutfit - README acceptance criteria", () => {
  it("same input always produces the same output", () => {
    const outfit = [w.purple_striped_shirt, w.green_floral_skirt, stripedSneakers];
    expect(evaluateOutfit(outfit, { occasion: "casual" })).toEqual(evaluateOutfit(outfit, { occasion: "casual" }));
  });

  it("output order does not depend on rule order in config", () => {
    const outfit = [w.white_shirt, w.black_trousers, w.black_oxfords];
    const reversed = [...rulesConfig.rules].reverse();
    expect(evaluateOutfit(outfit, {}, reversed)).toEqual(evaluateOutfit(outfit));
  });

  it("disabling a rule in config removes its effect without code changes", () => {
    const outfit = [w.orange_graphic_tee, w.green_floral_skirt, w.white_sneakers];
    expect(evaluateOutfit(outfit).allowed).toBe(false);

    const rules = withRule("max_one_bold_pattern", { enabled: false });
    const result = evaluateOutfit(outfit, {}, rules);
    expect(result.allowed).toBe(true);
    expect(ids(result.appliedRules)).not.toContain("max_one_bold_pattern");
  });

  it("disabling a soft rule removes its adjustment", () => {
    const outfit = [w.white_shirt, w.black_trousers, w.black_oxfords];
    const result = evaluateOutfit(outfit, {}, withRule("formal_leather_shoes", { enabled: false }));
    expect(result.ruleAdjustment).toBeCloseTo(0.05, 10);
  });

  it("adjustment never exceeds the +0.3 cap", () => {
    const rules = rulesConfig.rules.map((rule) =>
      rule.type === "soft" ? { ...rule, action: { effect: "boost", value: 0.3 } } : rule
    );
    // Formal top + formal shoes + one style: two boosts of 0.3 = 0.6 -> capped.
    const result = evaluateOutfit([w.white_shirt, w.black_trousers, w.black_oxfords], {}, rules);
    expect(result.appliedRules.length).toBeGreaterThanOrEqual(2);
    expect(result.ruleAdjustment).toBe(rulesConfig.adjustmentCap);
  });

  it("adjustment never goes below the -0.3 cap", () => {
    const rules = rulesConfig.rules.map((rule) =>
      rule.type === "soft" ? { ...rule, action: { effect: "penalty", value: 0.3 } } : rule
    );
    const result = evaluateOutfit([w.purple_striped_shirt, w.green_floral_skirt, stripedSneakers], {}, rules);
    expect(result.appliedRules.length).toBeGreaterThanOrEqual(2);
    expect(result.ruleAdjustment).toBe(-rulesConfig.adjustmentCap);
  });

  it("stays within the cap across every fixture outfit combination", () => {
    const tops = wardrobe.filter((i) => i.category === "top");
    const bottoms = wardrobe.filter((i) => i.category === "bottom");
    const shoes = wardrobe.filter((i) => i.category === "shoes");
    for (const t of tops) {
      for (const b of bottoms) {
        for (const s of shoes) {
          const { ruleAdjustment } = evaluateOutfit([t, b, s], { occasion: "casual" });
          expect(Math.abs(ruleAdjustment)).toBeLessThanOrEqual(rulesConfig.adjustmentCap);
        }
      }
    }
  });
});

describe("filterItems", () => {
  it("removes items that fail item-level hard rules", () => {
    const kept = filterItems(wardrobe, { occasion: "formal" }).map((i) => i.id);
    expect(kept).not.toContain("orange_graphic_tee");
    expect(kept).not.toContain("red_shorts");
    expect(kept).not.toContain("grey_hoodie");
    expect(kept).not.toContain("sport_running_shoes");
    expect(kept).toContain("white_shirt");
  });

  it("keeps everything when no context-gated rule applies", () => {
    expect(filterItems(wardrobe, { occasion: "casual" })).toHaveLength(wardrobe.length);
  });

  it("is not affected by outfit-level rules", () => {
    // Both are bold-patterned, but max_one_bold_pattern is outfit-scoped.
    expect(filterItems([w.orange_graphic_tee, w.green_floral_skirt])).toHaveLength(2);
  });
});
