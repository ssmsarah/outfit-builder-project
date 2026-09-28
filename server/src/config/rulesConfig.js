// Single source of truth for the Rule-Based Attribute Matching algorithm
// (Sprint 5). Every rule, cap, and weight lives here - nothing in
// server/src/recommendation/rules/** hardcodes one. Validated once at import
// time by loadRulesConfig (R5.1), so consumers always get a checked, frozen
// object. To change or disable a rule, edit it here (set `enabled: false`).
import { loadRulesConfig } from "../recommendation/rules/ruleSchema.js";

const rawRulesConfig = {
  // Largest value a soft rule's boost/penalty may carry (R5.1).
  maxSoftValue: 0.3,

  // Total soft adjustment per outfit is clamped to [-cap, +cap] (R5.6).
  adjustmentCap: 0.3,

  // Patterns counted by the derived `outfit.boldPatternCount` field (R5.5).
  boldPatterns: ["graphic", "floral", "checked"],

  // Attribute Match Score (R5.7).
  attributeMatch: {
    // Only requested attributes count; weights are renormalized over them.
    weights: {
      category: 0.3,
      color: 0.25,
      style: 0.2,
      pattern: 0.1,
      occasion: 0.1,
      season: 0.05,
    },
    // Partial style credit = style matrix value (T2.1), only if >= this.
    stylePartialMin: 0.7,
    // Partial pattern credit: requested pattern -> item pattern -> score.
    patternPartial: {
      solid: { striped: 0.5 },
    },
    // Color names and families come from searchConfig.colorPalette (S6.1).
    colorScores: {
      exact: 1.0,
      sameFamily: 0.6,
      bothNeutral: 0.4,
    },
  },

  rules: [
    {
      id: "formal_no_sporty",
      description: "Formal outfits cannot contain sporty items",
      scope: "item",
      type: "hard",
      priority: 100,
      when: { "context.occasion": { eq: "formal" } },
      condition: { "item.style": { in: ["sporty", "streetwear"] } },
      action: { effect: "reject" },
      message: "Sporty or streetwear items are not suitable for formal occasions",
    },
    {
      id: "sport_requires_sporty_shoes",
      description: "Sport outfits need sporty or casual shoes",
      scope: "item",
      type: "hard",
      priority: 100,
      when: { "context.occasion": { eq: "sport" } },
      condition: {
        "item.category": { eq: "shoes" },
        "item.style": { notIn: ["sporty", "casual"] },
      },
      action: { effect: "reject" },
      message: "Only sporty or casual shoes are suitable for sport",
    },
    {
      id: "winter_no_summer_only",
      description: "Winter outfits cannot contain summer-only items",
      scope: "item",
      type: "hard",
      priority: 90,
      when: { "context.season": { eq: "winter" } },
      condition: { "item.seasons": { onlyContains: ["summer"] } },
      action: { effect: "reject" },
      message: "Summer-only items are not suitable for winter",
    },
    {
      id: "summer_no_winter_only",
      description: "Summer outfits cannot contain winter-only items",
      scope: "item",
      type: "hard",
      priority: 90,
      when: { "context.season": { eq: "summer" } },
      condition: { "item.seasons": { onlyContains: ["winter"] } },
      action: { effect: "reject" },
      message: "Winter-only items are not suitable for summer",
    },
    {
      id: "max_one_bold_pattern",
      description: "An outfit may contain at most one bold pattern",
      scope: "outfit",
      type: "hard",
      priority: 80,
      condition: { "outfit.boldPatternCount": { gte: 2 } },
      action: { effect: "reject" },
      message: "More than one bold pattern (graphic, floral, checked) makes the outfit too busy",
    },
    {
      id: "pattern_on_pattern",
      description: "Two patterned items together are penalized",
      scope: "pair",
      type: "soft",
      priority: 50,
      condition: { "pair.bothPatterned": { eq: true } },
      action: { effect: "penalty", value: 0.1 },
      message: "Two patterned pieces compete for attention",
    },
    {
      id: "formal_leather_shoes",
      description: "A formal top with formal shoes is boosted",
      scope: "pair",
      type: "soft",
      priority: 40,
      condition: {
        any: [
          {
            "a.category": { eq: "top" },
            "a.style": { eq: "formal" },
            "b.category": { eq: "shoes" },
            "b.style": { eq: "formal" },
          },
          {
            "a.category": { eq: "shoes" },
            "a.style": { eq: "formal" },
            "b.category": { eq: "top" },
            "b.style": { eq: "formal" },
          },
        ],
      },
      action: { effect: "boost", value: 0.05 },
      message: "Formal top and formal shoes make a polished pairing",
    },
    {
      id: "matching_style_set",
      description: "An outfit whose items all share one style is boosted",
      scope: "outfit",
      type: "soft",
      priority: 40,
      condition: { "outfit.styleCount": { eq: 1 } },
      action: { effect: "boost", value: 0.05 },
      message: "Every piece shares the same style for a coordinated look",
    },
    {
      id: "double_clash_color",
      description: "Clashing colors are penalized",
      scope: "pair",
      type: "soft",
      priority: 50,
      condition: { "pair.colorRelation": { eq: "clash" } },
      action: { effect: "penalty", value: 0.1 },
      message: "Two of the colors clash",
    },
  ],
};

export const rulesConfig = loadRulesConfig(rawRulesConfig);
export default rulesConfig;
