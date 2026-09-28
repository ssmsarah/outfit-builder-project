// Rule Engine (Sprint 5). Applies the declarative rules from
// config/rulesConfig.js at three scopes - item (R5.3), pair (R5.4), and
// outfit (R5.5). Pure functions: every entry point takes an optional
// `rules` list (defaults to the real config) so tests can pass a modified
// copy, e.g. with a rule disabled.
import { evaluate } from "./conditionEvaluator.js";
import { classifyHueRelation, isNeutral } from "../color/colorHarmony.js";
import { rulesConfig } from "../../config/rulesConfig.js";

// Rules read `context.occasion` / `context.season`, while the rest of the
// recommender passes `targetOccasion` / `targetSeason` (T2.3). Accept both.
// A season is only used when explicitly requested - rules never infer the
// current season from the date.
export function buildRuleContext(context = {}) {
  return {
    occasion: context.occasion ?? context.targetOccasion ?? undefined,
    season: context.season ?? context.targetSeason ?? undefined,
  };
}

// rules array -> { scope -> ordered active rules }. The outfit generator
// evaluates rules thousands of times per request, so the filter + sort is
// done once per rules list. Keyed weakly, so test-built lists are freed.
const activeRulesCache = new WeakMap();

// Enabled rules of one scope, in evaluation order: descending priority,
// ties broken by id so the order never depends on config ordering.
export function activeRules(scope, rules = rulesConfig.rules) {
  let byScope = activeRulesCache.get(rules);
  if (!byScope) {
    byScope = new Map();
    activeRulesCache.set(rules, byScope);
  }

  if (!byScope.has(scope)) {
    byScope.set(
      scope,
      rules
        .filter((rule) => rule.scope === scope && rule.enabled !== false)
        .sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    );
  }

  return byScope.get(scope);
}

// Returns an explanation entry when the rule fires, otherwise null.
function applyRule(rule, target) {
  if (rule.when && !evaluate(rule.when, target)) return null;
  if (!evaluate(rule.condition, target)) return null;

  return {
    ruleId: rule.id,
    type: rule.type,
    effect: rule.action.effect,
    value: rule.action.value ?? null,
    message: rule.message,
  };
}

function summarize(entries) {
  return {
    allowed: !entries.some((entry) => entry.type === "hard"),
    adjustments: entries.filter((entry) => entry.type === "soft"),
    messages: entries.map((entry) => entry.message),
    entries,
  };
}

function applyScopeRules(scope, target, rules) {
  const entries = [];
  for (const rule of activeRules(scope, rules)) {
    const entry = applyRule(rule, target);
    if (entry) entries.push(entry);
  }
  return summarize(entries);
}

// R5.3: rules with scope "item" against a single item.
export function applyItemRules(item, context = {}, rules = rulesConfig.rules) {
  return applyScopeRules("item", { item, context: buildRuleContext(context) }, rules);
}

// Derived `pair.*` fields (R5.4). colorRelation reuses T1.3's classifier.
export function derivePairFields(a, b) {
  return {
    colorRelation: classifyHueRelation(a, b).relation,
    bothPatterned: a.pattern !== "solid" && b.pattern !== "solid",
    sameStyle: a.style === b.style,
    categories: [a.category, b.category],
  };
}

// R5.4: rules with scope "pair" against an (a, b) pair.
export function applyPairRules(a, b, context = {}, rules = rulesConfig.rules) {
  return applyScopeRules(
    "pair",
    { a, b, pair: derivePairFields(a, b), context: buildRuleContext(context) },
    rules
  );
}

// Derived `outfit.*` fields (R5.5). Neutrality reuses T1.2's isNeutral.
export function deriveOutfitFields(items) {
  const styles = new Set(items.map((item) => item.style));

  return {
    patternCount: items.filter((item) => item.pattern !== "solid").length,
    boldPatternCount: items.filter((item) => rulesConfig.boldPatterns.includes(item.pattern)).length,
    styles,
    styleCount: styles.size,
    nonNeutralColorCount: items.filter((item) => !isNeutral(item)).length,
    categories: items.map((item) => item.category),
    itemCount: items.length,
  };
}

// R5.5: rules with scope "outfit" against the whole item list.
export function applyOutfitRules(items, context = {}, rules = rulesConfig.rules) {
  return applyScopeRules(
    "outfit",
    { outfit: deriveOutfitFields(items), context: buildRuleContext(context) },
    rules
  );
}

function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}

// Same order as activeRules, across all scopes.
function compareRules(a, b, priorityById) {
  return priorityById[b.ruleId] - priorityById[a.ruleId] || (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0);
}

// Keeps the first entry per rule id and records every item that triggered
// it, so a rule that fires on several items/pairs is reported (and, for
// soft rules, applied) exactly once per outfit.
function mergeEntries(triggers) {
  const byRule = new Map();

  for (const { entry, itemIds } of triggers) {
    const existing = byRule.get(entry.ruleId);
    if (existing) {
      for (const id of itemIds) {
        if (!existing.itemIds.includes(id)) existing.itemIds.push(id);
      }
    } else {
      byRule.set(entry.ruleId, { ...entry, itemIds: [...itemIds] });
    }
  }

  return [...byRule.values()];
}

// R5.6: evaluates every rule scope against a (partial or complete) outfit.
//   1. item rules on every item, pair rules on every pair, outfit rules once
//   2. any hard reject -> allowed = false, no soft adjustment is applied
//   3. each soft rule applies at most once per outfit
//   4. ruleAdjustment = clamp(sum(boosts) - sum(penalties), -cap, +cap)
//   5. entries ordered by descending priority, ties by id
//   6. disabled rules (enabled: false) are skipped (see activeRules)
//
// `cache` (from createRuleCache) memoizes item- and pair-rule results by id.
// Only valid for one context + rules list; the outfit generator creates one
// per request, because beam search re-checks the same items and pairs in
// many candidate outfits. Results are identical with or without it.
export function createRuleCache() {
  return { items: new Map(), pairs: new Map() };
}

const priorityCache = new WeakMap();

function priorityByRuleId(rules) {
  let priorities = priorityCache.get(rules);
  if (!priorities) {
    priorities = Object.fromEntries(rules.map((rule) => [rule.id, rule.priority]));
    priorityCache.set(rules, priorities);
  }
  return priorities;
}

function memo(map, key, compute) {
  if (!map) return compute();
  if (!map.has(key)) map.set(key, compute());
  return map.get(key);
}

export function evaluateOutfit(items, context = {}, rules = rulesConfig.rules, cache = null) {
  const triggers = [];

  for (const item of items) {
    const entries = memo(cache?.items, item.id, () => applyItemRules(item, context, rules).entries);
    for (const entry of entries) {
      triggers.push({ entry, itemIds: [item.id] });
    }
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const [a, b] = [items[i], items[j]];
      const entries = memo(cache?.pairs, `${a.id}|${b.id}`, () => applyPairRules(a, b, context, rules).entries);
      for (const entry of entries) {
        triggers.push({ entry, itemIds: [a.id, b.id] });
      }
    }
  }

  for (const entry of applyOutfitRules(items, context, rules).entries) {
    triggers.push({ entry, itemIds: items.map((item) => item.id) });
  }

  const priorityById = priorityByRuleId(rules);
  const entries = mergeEntries(triggers).sort((a, b) => compareRules(a, b, priorityById));

  const rejections = entries.filter((entry) => entry.type === "hard");

  if (rejections.length > 0) {
    return {
      allowed: false,
      ruleAdjustment: 0,
      appliedRules: rejections,
      rejections,
      messages: rejections.map((entry) => entry.message),
    };
  }

  const adjustments = entries.filter((entry) => entry.type === "soft");
  const net = adjustments.reduce(
    (total, entry) => total + (entry.effect === "boost" ? entry.value : -entry.value),
    0
  );
  const { adjustmentCap } = rulesConfig;

  return {
    allowed: true,
    ruleAdjustment: clamp(net, -adjustmentCap, adjustmentCap),
    appliedRules: adjustments,
    rejections: [],
    messages: adjustments.map((entry) => entry.message),
  };
}

// R5.6 pre-filter: only the items that pass every item-level hard rule.
export function filterItems(items, context = {}, rules = rulesConfig.rules) {
  return items.filter((item) => applyItemRules(item, context, rules).allowed);
}
