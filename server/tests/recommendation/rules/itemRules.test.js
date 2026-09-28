import { describe, it, expect } from "vitest";
import { applyItemRules, activeRules, buildRuleContext } from "../../../src/recommendation/rules/ruleEngine.js";
import { rulesConfig } from "../../../src/config/rulesConfig.js";
import { wardrobeById } from "../fixtures/wardrobe.js";

describe("applyItemRules - README acceptance criteria", () => {
  it("formal context rejects orange_graphic_tee and red_shorts", () => {
    for (const id of ["orange_graphic_tee", "red_shorts"]) {
      const result = applyItemRules(wardrobeById[id], { occasion: "formal" });
      expect(result.allowed, id).toBe(false);
      expect(result.entries.map((e) => e.ruleId)).toContain("formal_no_sporty");
    }
  });

  it("casual context allows both", () => {
    for (const id of ["orange_graphic_tee", "red_shorts"]) {
      const result = applyItemRules(wardrobeById[id], { occasion: "casual" });
      expect(result.allowed, id).toBe(true);
      expect(result.messages).toEqual([]);
    }
  });
});

describe("applyItemRules - each item rule", () => {
  it("formal context allows formal items", () => {
    expect(applyItemRules(wardrobeById.white_shirt, { occasion: "formal" }).allowed).toBe(true);
  });

  it("sport context rejects formal shoes but not sporty/casual shoes or non-shoes", () => {
    const context = { occasion: "sport" };
    expect(applyItemRules(wardrobeById.black_oxfords, context).allowed).toBe(false);
    expect(applyItemRules(wardrobeById.sport_running_shoes, context).allowed).toBe(true);
    expect(applyItemRules(wardrobeById.white_sneakers, context).allowed).toBe(true);
    expect(applyItemRules(wardrobeById.white_shirt, context).allowed).toBe(true);
  });

  it("winter rejects summer-only items, summer rejects winter-only items", () => {
    const summerOnly = { ...wardrobeById.red_shorts, seasons: ["summer"] };
    expect(applyItemRules(summerOnly, { season: "winter" }).allowed).toBe(false);
    expect(applyItemRules(summerOnly, { season: "summer" }).allowed).toBe(true);

    expect(applyItemRules(wardrobeById.wool_overcoat, { season: "summer" }).allowed).toBe(false);
    expect(applyItemRules(wardrobeById.wool_overcoat, { season: "winter" }).allowed).toBe(true);
  });

  it("items that list several seasons are not season-only", () => {
    // red_shorts is [spring, summer] - not *only* summer.
    expect(applyItemRules(wardrobeById.red_shorts, { season: "winter" }).allowed).toBe(true);
  });

  it("returns the rule message for each rejection", () => {
    const result = applyItemRules(wardrobeById.red_shorts, { occasion: "formal" });
    expect(result.messages).toEqual([
      "Sporty or streetwear items are not suitable for formal occasions",
    ]);
    expect(result.adjustments).toEqual([]);
  });

  it("no context means no context-gated rule fires", () => {
    expect(applyItemRules(wardrobeById.red_shorts).allowed).toBe(true);
  });
});

describe("rule context", () => {
  it("accepts both occasion/season and targetOccasion/targetSeason", () => {
    expect(buildRuleContext({ targetOccasion: "formal", targetSeason: "winter" })).toEqual({
      occasion: "formal",
      season: "winter",
    });
    expect(buildRuleContext({ occasion: "sport" })).toEqual({ occasion: "sport", season: undefined });
    expect(buildRuleContext({ targetSeason: null })).toEqual({ occasion: undefined, season: undefined });
  });

  it("targetOccasion from the recommender reaches the rules", () => {
    expect(applyItemRules(wardrobeById.red_shorts, { targetOccasion: "formal" }).allowed).toBe(false);
  });
});

describe("activeRules", () => {
  it("orders by descending priority, then id", () => {
    const ids = activeRules("item").map((r) => r.id);
    expect(ids).toEqual([
      "formal_no_sporty",
      "sport_requires_sporty_shoes",
      "summer_no_winter_only",
      "winter_no_summer_only",
    ]);
  });

  it("skips disabled rules", () => {
    const rules = rulesConfig.rules.map((r) => (r.id === "formal_no_sporty" ? { ...r, enabled: false } : r));
    expect(activeRules("item", rules).map((r) => r.id)).not.toContain("formal_no_sporty");
    expect(applyItemRules(wardrobeById.red_shorts, { occasion: "formal" }, rules).allowed).toBe(true);
  });
});
