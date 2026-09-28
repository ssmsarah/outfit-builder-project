// Rule Explanation Output (R5.8). Every rule the engine applies is reported
// as { ruleId, type, effect, value, message } (plus itemIds - see R5.6).
// This module merges those messages into T2.8's outfit `reasons` list so a
// single explanation carries both the compatibility reasons and the rules.
import { explainOutfit } from "../compatibility/explainOutfit.js";
import { evaluateOutfit } from "./ruleEngine.js";

// Adds rule output to an existing T2.8 explanation. Rule messages follow
// the compatibility reasons, without duplicates.
export function mergeRuleExplanation(explanation, ruleResult) {
  const reasons = [...(explanation.reasons ?? [])];
  for (const message of ruleResult.messages) {
    if (!reasons.includes(message)) reasons.push(message);
  }

  return {
    ...explanation,
    reasons,
    allowed: ruleResult.allowed,
    ruleAdjustment: ruleResult.ruleAdjustment,
    appliedRules: ruleResult.appliedRules,
  };
}

export function explainOutfitWithRules(items, context = {}, rules) {
  return mergeRuleExplanation(explainOutfit(items, context), evaluateOutfit(items, context, rules));
}
