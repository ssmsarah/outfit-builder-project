// Validates a raw scoring config object and returns a frozen, safe-to-share
// copy. Kept separate from the actual config values (scoringConfig.js) so it
// can be unit-tested against both valid and deliberately broken configs
// (T0.3 acceptance criteria) without depending on the real numbers.

const WEIGHT_GROUPS_MUST_SUM_TO_ONE = [
  "compatibilityWeights",
  "colorSubWeights",
  "preferenceWeights",
];

const SUM_TOLERANCE = 1e-6;

function sumValues(obj) {
  return Object.values(obj).reduce((total, value) => total + value, 0);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

export function loadScoringConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== "object") {
    throw new Error("Invalid scoring config: config must be an object");
  }

  for (const groupName of WEIGHT_GROUPS_MUST_SUM_TO_ONE) {
    const group = rawConfig[groupName];

    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new Error(
        `Invalid scoring config: "${groupName}" is missing or not an object`
      );
    }

    const sum = sumValues(group);

    if (Math.abs(sum - 1) > SUM_TOLERANCE) {
      throw new Error(
        `Invalid scoring config: "${groupName}" weights must sum to 1.0 (got ${sum})`
      );
    }
  }

  return deepFreeze(structuredClone(rawConfig));
}
