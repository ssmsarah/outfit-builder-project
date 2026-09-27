// Occasion and Season scores (T2.3). Both share one tiered-or-Jaccard
// primitive: pass a target value for the 1.0/0.5/0.0 tiered logic, or
// `null` for Jaccard similarity between the two items' full sets. Occasion
// has no implicit target (omitted -> Jaccard, matching the README exactly).
// Season always has an effective target - if the caller doesn't pass one,
// it defaults to the *current* season derived from the date, so Jaccard
// mode for season only happens if the caller explicitly asks for it via
// `targetSeason: null`.
import { OCCASIONS, SEASONS } from "../itemEnums.js";

function jaccard(valuesA, valuesB) {
  const setA = new Set(valuesA);
  const setB = new Set(valuesB);
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  const intersectionSize = [...setA].filter((v) => setB.has(v)).length;
  return intersectionSize / union.size;
}

function tieredOrJaccardScore(valuesA, valuesB, target) {
  if (target === null) {
    return jaccard(valuesA, valuesB);
  }
  const hasA = valuesA.includes(target);
  const hasB = valuesB.includes(target);
  if (hasA && hasB) return 1;
  if (hasA || hasB) return 0.5;
  return 0;
}

export function occasionScore(itemA, itemB, targetOccasion = null) {
  if (targetOccasion !== null && !OCCASIONS.includes(targetOccasion)) {
    throw new Error(`occasionScore: unknown occasion "${targetOccasion}"`);
  }
  return tieredOrJaccardScore(itemA.occasions, itemB.occasions, targetOccasion);
}

const NORTHERN_SEASON_BY_MONTH = {
  1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring",
  6: "summer", 7: "summer", 8: "summer", 9: "autumn", 10: "autumn",
  11: "autumn", 12: "winter",
};
const SOUTHERN_FLIP = { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" };

// Meteorological (calendar-month) season boundaries - not astronomical.
export function deriveCurrentSeason(date = new Date(), hemisphere = "northern") {
  if (hemisphere !== "northern" && hemisphere !== "southern") {
    throw new Error(`deriveCurrentSeason: unknown hemisphere "${hemisphere}"`);
  }
  const northernSeason = NORTHERN_SEASON_BY_MONTH[date.getMonth() + 1];
  return hemisphere === "southern" ? SOUTHERN_FLIP[northernSeason] : northernSeason;
}

export function seasonScore(itemA, itemB, { targetSeason, date, hemisphere = "northern" } = {}) {
  let resolvedTarget;
  if (targetSeason === null) {
    resolvedTarget = null;
  } else if (targetSeason !== undefined) {
    if (!SEASONS.includes(targetSeason)) {
      throw new Error(`seasonScore: unknown season "${targetSeason}"`);
    }
    resolvedTarget = targetSeason;
  } else {
    resolvedTarget = deriveCurrentSeason(date, hemisphere);
  }

  return tieredOrJaccardScore(itemA.seasons, itemB.seasons, resolvedTarget);
}
