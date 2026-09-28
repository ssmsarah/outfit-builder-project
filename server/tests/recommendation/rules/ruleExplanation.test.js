import { describe, it, expect } from "vitest";
import { explainOutfitWithRules, mergeRuleExplanation } from "../../../src/recommendation/rules/ruleExplanation.js";
import { explainOutfit } from "../../../src/recommendation/compatibility/explainOutfit.js";
import { rulesConfig } from "../../../src/config/rulesConfig.js";
import { wardrobeById as w } from "../fixtures/wardrobe.js";

const messageOf = (id) => rulesConfig.rules.find((r) => r.id === id).message;

describe("rule explanation - README acceptance criteria", () => {
  it("a rejected outfit includes the message of every hard rule that rejected it", () => {
    const items = [w.orange_graphic_tee, w.green_floral_skirt, w.black_oxfords];
    const result = explainOutfitWithRules(items, { targetOccasion: "formal" });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain(messageOf("formal_no_sporty"));
    expect(result.reasons).toContain(messageOf("max_one_bold_pattern"));
    expect(result.appliedRules.map((e) => e.ruleId).sort()).toEqual(["formal_no_sporty", "max_one_bold_pattern"]);
  });
});

describe("rule explanation - entry shape", () => {
  it("every applied rule has ruleId, type, effect, value, message", () => {
    const result = explainOutfitWithRules([w.white_shirt, w.black_trousers, w.black_oxfords]);

    expect(result.appliedRules.length).toBeGreaterThan(0);
    for (const entry of result.appliedRules) {
      expect(entry).toEqual(
        expect.objectContaining({
          ruleId: expect.any(String),
          type: expect.stringMatching(/^(hard|soft)$/),
          effect: expect.stringMatching(/^(reject|boost|penalty)$/),
          value: expect.anything(),
          message: expect.any(String),
        })
      );
    }
  });

  it("hard entries carry value null, soft entries their configured value", () => {
    const rejected = explainOutfitWithRules([w.orange_graphic_tee, w.blue_jeans, w.white_sneakers], {
      targetOccasion: "formal",
    });
    expect(rejected.appliedRules[0]).toMatchObject({ type: "hard", effect: "reject", value: null });

    const boosted = explainOutfitWithRules([w.white_shirt, w.black_trousers, w.black_oxfords]);
    expect(boosted.appliedRules.find((e) => e.ruleId === "formal_leather_shoes")).toMatchObject({
      type: "soft",
      effect: "boost",
      value: 0.05,
    });
  });
});

describe("mergeRuleExplanation", () => {
  it("keeps T2.8's reasons first and appends rule messages", () => {
    const items = [w.white_shirt, w.black_trousers, w.black_oxfords];
    const base = explainOutfit(items);
    const result = explainOutfitWithRules(items);

    expect(result.reasons.slice(0, base.reasons.length)).toEqual(base.reasons);
    expect(result.reasons.slice(base.reasons.length)).toEqual([
      messageOf("formal_leather_shoes"),
      messageOf("matching_style_set"),
    ]);
    // The T2.8 fields are untouched.
    expect(result.breakdown).toEqual(base.breakdown);
    expect(result.compatibilityScore).toBe(base.compatibilityScore);
  });

  it("does not duplicate a message already in reasons", () => {
    const merged = mergeRuleExplanation(
      { reasons: ["Two of the colors clash"] },
      { allowed: true, ruleAdjustment: -0.1, appliedRules: [], messages: ["Two of the colors clash"] }
    );
    expect(merged.reasons).toEqual(["Two of the colors clash"]);
  });

  it("an outfit no rule touches keeps its reasons and gets adjustment 0", () => {
    const items = [w.navy_shirt, w.blue_jeans, w.white_sneakers];
    const result = explainOutfitWithRules(items);
    expect(result.reasons).toEqual(explainOutfit(items).reasons);
    expect(result.ruleAdjustment).toBe(0);
    expect(result.appliedRules).toEqual([]);
  });
});
