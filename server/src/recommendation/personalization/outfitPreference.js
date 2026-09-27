// Outfit Preference Score P (T3.5): mean P_item across the outfit's items.
import { computeItemAffinity } from "./attributeProfile.js";
import { mean, clamp01 } from "../utils/math.js";

export function outfitPreferenceScore(items, { profile, preferenceScores }) {
  const itemScores = items.map((item) => computeItemAffinity(item, { profile, preferenceScores }));
  return clamp01(mean(itemScores));
}
