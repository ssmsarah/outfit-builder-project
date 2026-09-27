// Pairwise Compatibility C(A,B) (T2.4). Split into two layers on purpose:
// `combineCompatibilityComponents` is a pure weighted-sum over already-
// computed component scores (this is what the README's worked example
// tests directly, by injecting component values), and
// `pairwiseCompatibilityScore` is the real entry point that computes each
// component from two actual items before combining them.
import { pairwiseColorScore } from "../color/colorHarmony.js";
import { styleCompatibility } from "./styleMatrix.js";
import { patternCompatibility } from "./patternMatrix.js";
import { occasionScore, seasonScore } from "./contextScores.js";
import { scoringConfig } from "../../config/scoringConfig.js";
import { weightedSum, clamp01 } from "../utils/math.js";

export function combineCompatibilityComponents({ color, style, pattern, occasion, season }) {
  const { color: wc, style: ws, pattern: wp, occasion: wo, season: wse } =
    scoringConfig.compatibilityWeights;

  return clamp01(
    weightedSum([color, style, pattern, occasion, season], [wc, ws, wp, wo, wse])
  );
}

// context: { targetOccasion?, targetSeason?, date?, hemisphere? } - all
// optional. Omitting targetOccasion falls back to Jaccard (T2.3); omitting
// targetSeason falls back to the current season derived from `date`.
export function pairwiseCompatibilityScore(itemA, itemB, context = {}) {
  const components = {
    color: pairwiseColorScore(itemA, itemB).score,
    style: styleCompatibility(itemA.style, itemB.style),
    pattern: patternCompatibility(itemA.pattern, itemB.pattern),
    occasion: occasionScore(itemA, itemB, context.targetOccasion),
    season: seasonScore(itemA, itemB, {
      targetSeason: context.targetSeason,
      date: context.date,
      hemisphere: context.hemisphere,
    }),
  };

  return { score: combineCompatibilityComponents(components), components };
}
