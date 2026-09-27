// Item Preference Score R_i (T3.3): weighted sum of the T3.2 signals using
// scoringConfig.preferenceWeights (like/view/save/purchase = 0.35/0.10/0.25/0.30,
// already defined in T0.3).
import { computeUserItemSignals } from "./signalNormalization.js";
import { scoringConfig } from "../../config/scoringConfig.js";
import { weightedSum, clamp01 } from "../utils/math.js";

// Pure combiner over already-computed signals - the injectable unit for
// tests, same pattern as T2.4's combineCompatibilityComponents.
export function itemPreferenceScore({ L, V, S, P }) {
  const { like, view, save, purchase } = scoringConfig.preferenceWeights;
  return clamp01(weightedSum([L, V, S, P], [like, view, save, purchase]));
}

// Convenience chain: raw interactions -> per-item R_i, in one call. Still
// pure other than accepting an already-fetched interaction list (T3.2's
// contract).
export function computeUserItemPreferenceScores(interactions, options = {}) {
  const signals = computeUserItemSignals(interactions, options);
  const scores = new Map();
  for (const [itemId, itemSignals] of signals) {
    scores.set(itemId, itemPreferenceScore(itemSignals));
  }
  return scores;
}
