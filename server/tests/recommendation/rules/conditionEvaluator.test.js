import { describe, it, expect } from "vitest";
import { evaluate, OPERATOR_IMPLEMENTATIONS } from "../../../src/recommendation/rules/conditionEvaluator.js";
import { OPERATORS } from "../../../src/recommendation/rules/ruleSchema.js";
import { wardrobeById } from "../fixtures/wardrobe.js";

const item = wardrobeById.red_shorts; // sporty, solid, seasons [spring, summer]
const target = { item, context: { occasion: "formal", season: "winter" } };

describe("evaluate - one test per operator", () => {
  it("every schema operator has an implementation", () => {
    expect(Object.keys(OPERATOR_IMPLEMENTATIONS).sort()).toEqual([...OPERATORS].sort());
  });

  it("eq", () => {
    expect(evaluate({ "item.style": { eq: "sporty" } }, target)).toBe(true);
    expect(evaluate({ "item.style": { eq: "formal" } }, target)).toBe(false);
  });

  it("neq", () => {
    expect(evaluate({ "item.style": { neq: "formal" } }, target)).toBe(true);
    expect(evaluate({ "item.style": { neq: "sporty" } }, target)).toBe(false);
  });

  it("in", () => {
    expect(evaluate({ "item.style": { in: ["sporty", "streetwear"] } }, target)).toBe(true);
    expect(evaluate({ "item.style": { in: ["formal"] } }, target)).toBe(false);
  });

  it("notIn", () => {
    expect(evaluate({ "item.style": { notIn: ["formal"] } }, target)).toBe(true);
    expect(evaluate({ "item.style": { notIn: ["sporty", "casual"] } }, target)).toBe(false);
  });

  it("contains (list attribute contains value)", () => {
    expect(evaluate({ "item.seasons": { contains: "summer" } }, target)).toBe(true);
    expect(evaluate({ "item.seasons": { contains: "winter" } }, target)).toBe(false);
  });

  it("containsAny", () => {
    expect(evaluate({ "item.seasons": { containsAny: ["winter", "spring"] } }, target)).toBe(true);
    expect(evaluate({ "item.seasons": { containsAny: ["winter", "autumn"] } }, target)).toBe(false);
  });

  it("onlyContains", () => {
    expect(evaluate({ "item.seasons": { onlyContains: ["spring", "summer", "autumn"] } }, target)).toBe(true);
    expect(evaluate({ "item.seasons": { onlyContains: ["summer"] } }, target)).toBe(false);
    const empty = { item: { ...item, seasons: [] }, context: {} };
    expect(evaluate({ "item.seasons": { onlyContains: ["summer"] } }, empty)).toBe(false);
  });

  it("gte", () => {
    const outfit = { outfit: { boldPatternCount: 2 }, context: {} };
    expect(evaluate({ "outfit.boldPatternCount": { gte: 2 } }, outfit)).toBe(true);
    expect(evaluate({ "outfit.boldPatternCount": { gte: 3 } }, outfit)).toBe(false);
  });

  it("lte", () => {
    const outfit = { outfit: { boldPatternCount: 2 }, context: {} };
    expect(evaluate({ "outfit.boldPatternCount": { lte: 2 } }, outfit)).toBe(true);
    expect(evaluate({ "outfit.boldPatternCount": { lte: 1 } }, outfit)).toBe(false);
  });

  it("list operators treat a Set like an array", () => {
    const outfit = { outfit: { styles: new Set(["casual", "formal"]) }, context: {} };
    expect(evaluate({ "outfit.styles": { contains: "formal" } }, outfit)).toBe(true);
    expect(evaluate({ "outfit.styles": { onlyContains: ["casual"] } }, outfit)).toBe(false);
  });

  it("list operators are false on non-list attributes, gte/lte false on non-numbers", () => {
    expect(evaluate({ "item.style": { contains: "sporty" } }, target)).toBe(false);
    expect(evaluate({ "item.style": { gte: 1 } }, target)).toBe(false);
  });

  it("an undefined context value does not match eq", () => {
    expect(evaluate({ "context.occasion": { eq: "formal" } }, { item, context: {} })).toBe(false);
  });
});

describe("evaluate - nesting", () => {
  it("several keys in one object are ANDed", () => {
    expect(evaluate({ "item.style": { eq: "sporty" }, "item.category": { eq: "bottom" } }, target)).toBe(true);
    expect(evaluate({ "item.style": { eq: "sporty" }, "item.category": { eq: "top" } }, target)).toBe(false);
  });

  it("all", () => {
    expect(
      evaluate({ all: [{ "item.style": { eq: "sporty" } }, { "context.occasion": { eq: "formal" } }] }, target)
    ).toBe(true);
    expect(
      evaluate({ all: [{ "item.style": { eq: "sporty" } }, { "context.occasion": { eq: "sport" } }] }, target)
    ).toBe(false);
  });

  it("any", () => {
    expect(
      evaluate({ any: [{ "item.style": { eq: "formal" } }, { "context.season": { eq: "winter" } }] }, target)
    ).toBe(true);
    expect(
      evaluate({ any: [{ "item.style": { eq: "formal" } }, { "context.season": { eq: "summer" } }] }, target)
    ).toBe(false);
  });

  it("not", () => {
    expect(evaluate({ not: { "item.style": { eq: "formal" } } }, target)).toBe(true);
    expect(evaluate({ not: { "item.style": { eq: "sporty" } } }, target)).toBe(false);
  });

  it("deep nesting of all / any / not", () => {
    const condition = {
      all: [
        { any: [{ "item.category": { eq: "top" } }, { "item.category": { eq: "bottom" } }] },
        { not: { any: [{ "item.pattern": { eq: "floral" } }, { "item.pattern": { eq: "graphic" } }] } },
      ],
    };
    expect(evaluate(condition, target)).toBe(true);
    expect(evaluate(condition, { item: wardrobeById.green_floral_skirt, context: {} })).toBe(false);
  });
});

describe("evaluate - errors", () => {
  it("throws a clear error on an unknown path", () => {
    expect(() => evaluate({ "item.fabric": { eq: "wool" } }, target)).toThrow(
      'evaluate: unknown attribute path "item.fabric"'
    );
    expect(() => evaluate({ "wardrobe.size": { gte: 1 } }, target)).toThrow(/unknown attribute path "wardrobe.size"/);
  });

  it("throws when the target lacks the path's root", () => {
    expect(() => evaluate({ "pair.sameStyle": { eq: true } }, target)).toThrow(/needs "pair"/);
  });

  it("throws on an unknown operator", () => {
    expect(() => evaluate({ "item.style": { like: "s" } }, target)).toThrow(/unknown operator "like"/);
  });
});
