// Full Outfit Score (T2.6): combines pairwise compatibility (T2.4) across
// every item pair with the outfit-level color score (T1.6), and enforces
// outfit structure (T2.5) as a hard gate.
import { isValidOutfit } from "./outfitStructure.js";
import { pairwiseCompatibilityScore } from "./pairScore.js";
import { outfitColorScore } from "../color/colorHarmony.js";
import { scoringConfig } from "../../config/scoringConfig.js";
import { weightedMean, clamp01 } from "../utils/math.js";

export function outfitScore(items, context = {}) {
  if (!isValidOutfit(items)) {
    return 0;
  }

  const pairCompatibilityScores = [];
  const pairColorScores = [];
  const pairWeights = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const involvesAccessory =
        items[i].category === "accessory" || items[j].category === "accessory";
      const weight = involvesAccessory ? scoringConfig.generation.accessoryPairWeight : 1.0;

      const { score, components } = pairwiseCompatibilityScore(items[i], items[j], context);

      pairCompatibilityScores.push(score);
      pairColorScores.push(components.color);
      pairWeights.push(weight);
    }
  }

  const base = weightedMean(pairCompatibilityScores, pairWeights);

  // meanPairColor uses the *same* accessory-adjusted weights as `base`, not
  // a plain mean - base is a weighted mean of scores that are themselves a
  // fixed linear combination of components, so base = w_c*weightedMean(color)
  // + (other weighted component means). Using the same weights here is what
  // makes "base - w_c*meanPairColor" cleanly cancel out color's contribution
  // to `base` before adding back w_c*outfitColorScore in its place. See
  // Decision Log T2.6.
  const wc = scoringConfig.compatibilityWeights.color;
  const meanPairColor = weightedMean(pairColorScores, pairWeights);
  const colorScore = outfitColorScore(items);

  return clamp01(base - wc * meanPairColor + wc * colorScore);
}
