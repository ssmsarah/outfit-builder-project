// Cold Start and Adaptive Alpha (T3.6). Determines how much weight T3.7's
// FinalScore gives to compatibility (C) vs. personalization (P): alpha=1.0
// means pure compatibility (identical to Sprint 2's output), lower alpha
// blends in more of the personalization score.
import { scoringConfig } from "../../config/scoringConfig.js";

export function resolveAlpha({ isAnonymous = false, interactionCount = 0 } = {}) {
  const { default: defaultAlpha, coldStart, minInteractions } = scoringConfig.alpha;

  if (isAnonymous || interactionCount < minInteractions) {
    return coldStart;
  }

  return defaultAlpha;
}

export function resolveAlphaFromInteractions(interactions, { isAnonymous = false } = {}) {
  return resolveAlpha({ isAnonymous, interactionCount: interactions.length });
}
