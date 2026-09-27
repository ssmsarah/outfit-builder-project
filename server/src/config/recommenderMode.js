// T4.1's config flag: which recommendation flow is active.
//   "scored" (default): the new algorithm pipeline (Sprints 1-3).
//   "legacy": the new pipeline is disabled; the existing client-side
//             rule-based recommender in OutfitBuilder.jsx (untouched, per
//             the T0.1 audit and the T4.1 scope decision) remains the only
//             recommender in effect.
const VALID_MODES = ["legacy", "scored"];
const DEFAULT_MODE = "scored";

export function getRecommenderMode() {
  const raw = process.env.RECOMMENDER;
  if (!raw) return DEFAULT_MODE;

  if (!VALID_MODES.includes(raw)) {
    throw new Error(`Invalid RECOMMENDER config value "${raw}" (expected "legacy" or "scored")`);
  }

  return raw;
}
