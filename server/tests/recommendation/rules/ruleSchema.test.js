import { describe, it, expect } from "vitest";
import { loadRulesConfig, validateRule, isKnownPath } from "../../../src/recommendation/rules/ruleSchema.js";
import { rulesConfig } from "../../../src/config/rulesConfig.js";

const OPTIONS = { maxSoftValue: 0.3 };

function hardRule(overrides = {}) {
  return {
    id: "test_hard",
    description: "test",
    scope: "item",
    type: "hard",
    priority: 100,
    condition: { "item.style": { eq: "sporty" } },
    action: { effect: "reject" },
    message: "rejected",
    ...overrides,
  };
}

function softRule(overrides = {}) {
  return {
    id: "test_soft",
    description: "test",
    scope: "pair",
    type: "soft",
    priority: 50,
    condition: { "pair.bothPatterned": { eq: true } },
    action: { effect: "penalty", value: 0.1 },
    message: "penalized",
    ...overrides,
  };
}

function config(rules) {
  return { maxSoftValue: 0.3, adjustmentCap: 0.3, boldPatterns: ["graphic"], rules };
}

describe("rulesConfig - the real config", () => {
  it("loads and validates", () => {
    expect(rulesConfig.rules.length).toBeGreaterThanOrEqual(9);
  });

  it("contains the README's minimum rule set with the right scope and type", () => {
    const expected = {
      formal_no_sporty: ["item", "hard"],
      sport_requires_sporty_shoes: ["item", "hard"],
      winter_no_summer_only: ["item", "hard"],
      summer_no_winter_only: ["item", "hard"],
      max_one_bold_pattern: ["outfit", "hard"],
      pattern_on_pattern: ["pair", "soft"],
      formal_leather_shoes: ["pair", "soft"],
      matching_style_set: ["outfit", "soft"],
      double_clash_color: ["pair", "soft"],
    };

    for (const [id, [scope, type]] of Object.entries(expected)) {
      const rule = rulesConfig.rules.find((r) => r.id === id);
      expect(rule, id).toBeDefined();
      expect(rule.scope).toBe(scope);
      expect(rule.type).toBe(type);
    }
  });

  it("uses the README's soft values", () => {
    const value = (id) => rulesConfig.rules.find((r) => r.id === id).action.value;
    expect(value("pattern_on_pattern")).toBe(0.1);
    expect(value("formal_leather_shoes")).toBe(0.05);
    expect(value("matching_style_set")).toBe(0.05);
    expect(value("double_clash_color")).toBe(0.1);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(rulesConfig)).toBe(true);
    expect(Object.isFrozen(rulesConfig.rules[0].condition)).toBe(true);
  });
});

describe("validateRule - acceptance criteria", () => {
  it("accepts well-formed hard and soft rules", () => {
    expect(() => validateRule(hardRule(), OPTIONS)).not.toThrow();
    expect(() => validateRule(softRule(), OPTIONS)).not.toThrow();
  });

  it.each(["id", "description", "scope", "type", "priority", "condition", "action", "message"])(
    "rejects a rule missing %s",
    (field) => {
      const rule = hardRule();
      delete rule[field];
      expect(() => validateRule(rule, OPTIONS)).toThrow(/missing required field/);
    }
  );

  it("rejects unknown operators", () => {
    const rule = hardRule({ condition: { "item.style": { like: "sport" } } });
    expect(() => validateRule(rule, OPTIONS)).toThrow(/unknown operator "like"/);
  });

  it("rejects unknown operators nested inside all/any/not", () => {
    const rule = hardRule({
      condition: { all: [{ not: { "item.style": { startsWith: "s" } } }] },
    });
    expect(() => validateRule(rule, OPTIONS)).toThrow(/unknown operator "startsWith"/);
  });

  it("rejects unknown attributes", () => {
    const rule = hardRule({ condition: { "item.fabric": { eq: "wool" } } });
    expect(() => validateRule(rule, OPTIONS)).toThrow(/unknown attribute "item.fabric"/);
  });

  it("rejects attributes from a root the scope does not expose", () => {
    const rule = hardRule({ condition: { "pair.sameStyle": { eq: true } } });
    expect(() => validateRule(rule, OPTIONS)).toThrow(/not available here/);
  });

  it("only allows context attributes in `when`", () => {
    const rule = hardRule({ when: { "item.style": { eq: "formal" } } });
    expect(() => validateRule(rule, OPTIONS)).toThrow(/not available here/);
  });

  it.each([-0.01, 0.31, 1, "0.1", undefined])("rejects soft value %s outside [0, 0.3]", (value) => {
    const rule = softRule({ action: { effect: "boost", value } });
    expect(() => validateRule(rule, OPTIONS)).toThrow(/soft rule value/);
  });

  it("accepts soft values at the edges of [0, 0.3]", () => {
    expect(() => validateRule(softRule({ action: { effect: "boost", value: 0 } }), OPTIONS)).not.toThrow();
    expect(() => validateRule(softRule({ action: { effect: "boost", value: 0.3 } }), OPTIONS)).not.toThrow();
  });

  it("requires hard rules to reject and soft rules to boost/penalize", () => {
    expect(() => validateRule(hardRule({ action: { effect: "penalty", value: 0.1 } }), OPTIONS)).toThrow(
      /hard rules must use effect "reject"/
    );
    expect(() => validateRule(softRule({ action: { effect: "reject" } }), OPTIONS)).toThrow(
      /soft rules must use effect/
    );
  });

  it("rejects unknown scope and type", () => {
    expect(() => validateRule(hardRule({ scope: "wardrobe" }), OPTIONS)).toThrow(/unknown scope/);
    expect(() => validateRule(hardRule({ type: "medium" }), OPTIONS)).toThrow(/unknown type/);
  });

  it("requires array operands for set operators and numbers for gte/lte", () => {
    expect(() => validateRule(hardRule({ condition: { "item.style": { in: "sporty" } } }), OPTIONS)).toThrow(
      /needs an array value/
    );
    expect(() =>
      validateRule(
        hardRule({ scope: "outfit", condition: { "outfit.patternCount": { gte: "2" } } }),
        OPTIONS
      )
    ).toThrow(/needs a numeric value/);
  });
});

describe("loadRulesConfig", () => {
  it("rejects duplicate rule ids", () => {
    expect(() => loadRulesConfig(config([hardRule(), hardRule()]))).toThrow(/duplicate rule id "test_hard"/);
  });

  it("rejects a config without a rules array or caps", () => {
    expect(() => loadRulesConfig({ maxSoftValue: 0.3, adjustmentCap: 0.3, boldPatterns: [] })).toThrow(/rules must be an array/);
    expect(() => loadRulesConfig({ adjustmentCap: 0.3, boldPatterns: [], rules: [] })).toThrow(/maxSoftValue/);
    expect(() => loadRulesConfig({ maxSoftValue: 0.3, boldPatterns: [], rules: [] })).toThrow(/adjustmentCap/);
  });

  it("rejects unknown bold patterns", () => {
    expect(() => loadRulesConfig({ ...config([]), boldPatterns: ["polka"] })).toThrow(/boldPatterns/);
  });

  it("validates attributeMatch weights: known keys, all present, sum to 1", () => {
    const weights = { category: 0.3, color: 0.25, style: 0.2, pattern: 0.1, occasion: 0.1, season: 0.05 };
    const withWeights = (w) => ({ ...config([]), attributeMatch: { weights: w } });

    expect(() => loadRulesConfig(withWeights(weights))).not.toThrow();
    expect(() => loadRulesConfig(withWeights({ ...weights, fabric: 0 }))).toThrow(/unknown attributeMatch weight/);
    expect(() => loadRulesConfig(withWeights({ ...weights, season: undefined }))).toThrow(/season must be/);
    expect(() => loadRulesConfig(withWeights({ ...weights, season: 0.5 }))).toThrow(/must sum to 1.0/);
  });

  it("does not mutate the input", () => {
    const raw = config([hardRule()]);
    const loaded = loadRulesConfig(raw);
    expect(loaded).not.toBe(raw);
    expect(Object.isFrozen(raw)).toBe(false);
  });
});

describe("isKnownPath", () => {
  it("recognizes known paths and rejects everything else", () => {
    expect(isKnownPath("item.style")).toBe(true);
    expect(isKnownPath("outfit.boldPatternCount")).toBe(true);
    expect(isKnownPath("item.fabric")).toBe(false);
    expect(isKnownPath("item")).toBe(false);
    expect(isKnownPath("item.style.name")).toBe(false);
  });
});
