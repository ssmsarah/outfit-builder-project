// R5.9: consolidated Sprint 5 tests.
//   1. Config-driven dead-rule check: every rule in rulesConfig must fire on
//      at least one fixture case, so a rule that can never match (typo in a
//      path value, impossible condition) fails the build.
//   2. The Sprint 5 Definition of Done exercised end to end.
//   3. Module-isolation guard: the rules layer stays pure (no DB, no
//      services), matching the T1.7/T2.9 guards for earlier sprints.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { rulesConfig } from "../../../src/config/rulesConfig.js";
import {
  applyItemRules,
  applyPairRules,
  applyOutfitRules,
  evaluateOutfit,
  filterItems,
} from "../../../src/recommendation/rules/ruleEngine.js";
import { matchItems } from "../../../src/recommendation/rules/attributeMatcher.js";
import { explainOutfitWithRules } from "../../../src/recommendation/rules/ruleExplanation.js";
import { OCCASIONS, SEASONS } from "../../../src/recommendation/itemEnums.js";
import { wardrobe, wardrobeById as w } from "../fixtures/wardrobe.js";
import { ruleFixtureItems } from "../fixtures/ruleFixtures.js";

const items = [...wardrobe, ...ruleFixtureItems];

// Every request context a rule's `when` could depend on, including none.
const contexts = [{}];
for (const occasion of OCCASIONS) contexts.push({ occasion });
for (const season of SEASONS) contexts.push({ season });

function pairs() {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) result.push([items[i], items[j]]);
  }
  return result;
}

function outfits() {
  const byCategory = (c) => items.filter((i) => i.category === c);
  const result = [];
  for (const top of byCategory("top")) {
    for (const bottom of byCategory("bottom")) {
      for (const shoes of byCategory("shoes")) result.push([top, bottom, shoes]);
    }
  }
  for (const dress of byCategory("dress")) {
    for (const shoes of byCategory("shoes")) result.push([dress, shoes]);
  }
  return result;
}

// Scope-specific search for any fixture case on which the rule fires.
function firesSomewhere(rule) {
  const only = [rule];
  const fired = (result) => result.entries.some((e) => e.ruleId === rule.id);

  for (const context of contexts) {
    if (rule.scope === "item" && items.some((item) => fired(applyItemRules(item, context, only)))) return true;
    if (rule.scope === "pair" && pairs().some(([a, b]) => fired(applyPairRules(a, b, context, only)))) return true;
    if (rule.scope === "outfit" && outfits().some((o) => fired(applyOutfitRules(o, context, only)))) return true;
  }
  return false;
}

describe("R5.9 - config-driven dead-rule check", () => {
  it.each(rulesConfig.rules.map((rule) => [rule.id, rule]))("%s fires on at least one fixture case", (_, rule) => {
    expect(firesSomewhere(rule)).toBe(true);
  });

  it("detects a dead rule", () => {
    const dead = { ...rulesConfig.rules[0], id: "dead", when: undefined, condition: { "item.style": { eq: "gothic" } } };
    expect(firesSomewhere(dead)).toBe(false);
  });

  it("checks every enabled rule in config", () => {
    // Guard against the it.each above silently testing an empty list.
    expect(rulesConfig.rules.length).toBeGreaterThanOrEqual(9);
  });
});

describe("Sprint 5 Definition of Done", () => {
  it("rules load from config, reject invalid outfits, and explain the rejection", () => {
    const result = explainOutfitWithRules([w.orange_graphic_tee, w.green_floral_skirt, w.white_sneakers]);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain(rulesConfig.rules.find((r) => r.id === "max_one_bold_pattern").message);
  });

  it("adjusts scores within the cap for every fixture outfit in every context", () => {
    for (const context of contexts) {
      for (const outfit of outfits()) {
        const { allowed, ruleAdjustment } = evaluateOutfit(outfit, context);
        expect(Math.abs(ruleAdjustment)).toBeLessThanOrEqual(rulesConfig.adjustmentCap);
        if (!allowed) expect(ruleAdjustment).toBe(0);
      }
    }
  });

  it("never lets a sporty item through the formal pre-filter", () => {
    const kept = filterItems(items, { occasion: "formal" });
    expect(kept.some((i) => i.style === "sporty" || i.style === "streetwear")).toBe(false);
  });

  it("matches items by attributes, closest first, even without an exact match", () => {
    // No fixture top is named "blue"; the closest (navy, blue family) still ranks first.
    const results = matchItems(items, { category: "top", color: "blue" });
    expect(results[0].item.id).toBe("navy_shirt");
    expect(results[0].score).toBeLessThan(1);
  });
});

describe("Sprint 5 module isolation", () => {
  const rulesDir = join(dirname(fileURLToPath(import.meta.url)), "../../../src/recommendation/rules");

  it.each(readdirSync(rulesDir))("%s does not import models, services, or mongoose", (file) => {
    const source = readFileSync(join(rulesDir, file), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*\/(models|services)\//);
    expect(source).not.toMatch(/from\s+["']mongoose["']/);
  });
});
