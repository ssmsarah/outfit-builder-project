// Shared, dependency-free math helpers (T0.5) used across the color,
// compatibility, and personalization modules. Pure functions only - no
// config, no DB, no randomness.

export function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

// mean([]) returns 0 rather than NaN so callers that may see zero-length
// input (e.g. a single-item outfit with no pairs) don't have to special-case
// it themselves unless 0 is the wrong default for their context.
export function mean(list) {
  if (!list || list.length === 0) return 0;
  const sum = list.reduce((total, value) => total + value, 0);
  return sum / list.length;
}

export function weightedSum(values, weights) {
  if (values.length !== weights.length) {
    throw new Error(
      `weightedSum: values (${values.length}) and weights (${weights.length}) must be the same length`
    );
  }
  return values.reduce((total, value, i) => total + value * weights[i], 0);
}

// weightedMean([]) returns 0, same rationale as mean([]).
export function weightedMean(values, weights) {
  if (!values || values.length === 0) return 0;
  const weightTotal = weights.reduce((total, w) => total + w, 0);
  if (weightTotal === 0) return 0;
  return weightedSum(values, weights) / weightTotal;
}

function normalizeHue(h) {
  return ((h % 360) + 360) % 360;
}

// Shortest angular distance between two hues, in degrees, always in [0, 180].
export function circularHueDistance(h1, h2) {
  const a = normalizeHue(h1);
  const b = normalizeHue(h2);
  const diff = Math.abs(a - b);
  return diff > 180 ? 360 - diff : diff;
}
