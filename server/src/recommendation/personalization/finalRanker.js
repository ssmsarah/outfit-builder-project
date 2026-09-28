// Final Score and Re-ranking (T3.7, rules added in I7.3):
//
//   C_adjusted = clamp01(C + ruleAdjustment)
//   FinalScore = alpha * C_adjusted + (1 - alpha) * P
//
// Runs T2.7's beam search (which already applies the rules) over a larger
// pool (topN*4), blends in T3.5's outfit preference score, enforces the
// minCompatibility hard floor on C_adjusted, and re-sorts - returning T2.8's
// explanation (with rule messages merged into `reasons`, R5.8) plus
// adjustedCompatibilityScore, ruleAdjustment, appliedRules, preferenceScore,
// finalScore and alpha. `compatibilityScore` keeps T2.8's meaning: the raw
// compatibility before rules.
import { generateOutfits, compareByKey } from "../compatibility/outfitGenerator.js";
import { explainOutfit } from "../compatibility/explainOutfit.js";
import { mergeRuleExplanation } from "../rules/ruleExplanation.js";
import { outfitPreferenceScore } from "./outfitPreference.js";
import { scoringConfig } from "../../config/scoringConfig.js";

const POOL_MULTIPLIER = 4;

// personalization: { profile, preferenceScores, alpha } - alpha is a
// resolved value (via T3.6's resolveAlpha), not re-derived here, keeping
// this function focused on ranking given an already-decided alpha.
// options.rules is passed through to generateOutfits ([] = rules off).
export function generatePersonalizedOutfits(
  anchorItem,
  wardrobe,
  context = {},
  personalization,
  topN = scoringConfig.generation.topN,
  options = {}
) {
  const { profile, preferenceScores, alpha } = personalization;
  const { minCompatibility } = scoringConfig;

  const pool = generateOutfits(anchorItem, wardrobe, context, topN * POOL_MULTIPLIER, options);

  const ranked = pool
    .map(({ items, score: adjustedCompatibilityScore, ruleAdjustment, appliedRules }) => {
      const preferenceScore = outfitPreferenceScore(items, { profile, preferenceScores });
      const finalScore = alpha * adjustedCompatibilityScore + (1 - alpha) * preferenceScore;
      return { items, adjustedCompatibilityScore, ruleAdjustment, appliedRules, preferenceScore, finalScore };
    })
    .filter((o) => o.adjustedCompatibilityScore >= minCompatibility)
    .sort((a, b) => b.finalScore - a.finalScore || compareByKey(a.items, b.items))
    .slice(0, topN);

  return ranked.map(({ items, adjustedCompatibilityScore, ruleAdjustment, appliedRules, preferenceScore, finalScore }) => ({
    ...mergeRuleExplanation(explainOutfit(items, context), {
      allowed: true,
      ruleAdjustment,
      appliedRules,
      messages: appliedRules.map((rule) => rule.message),
    }),
    adjustedCompatibilityScore,
    preferenceScore,
    finalScore,
    alpha,
  }));
}
