// Attribute Match Score (R5.7): how well one item matches a set of
// user-requested attributes, e.g. { category: "top", color: "black" }.
//
//   MatchScore = sum(w_k * s_k) / sum(w_k)   over the requested attributes k
//
// Weights and partial-credit tables come from rulesConfig.attributeMatch.
// `category` is a hard filter: a category miss excludes the item outright.
// Pure functions.
import { styleCompatibility } from "../compatibility/styleMatrix.js";
import { isNeutral } from "../color/colorHarmony.js";
import { colorName, colorFamily, paletteColor } from "../search/colorNames.js";
import { MATCH_ATTRIBUTES } from "./ruleSchema.js";
import { rulesConfig } from "../../config/rulesConfig.js";

// Color names come from S6.1's palette. Exact = same color name; same
// family = same non-neutral family (navy vs blue); both neutral = the
// requested color is neutral and so is the item (T1.2's isNeutral, which
// honors isNeutralOverride, or a neutral palette family).
function colorScore(item, requestedColor) {
  const { colorScores } = rulesConfig.attributeMatch;
  const requested = paletteColor(requestedColor);

  if (!requested) {
    throw new Error(`attributeMatch: unknown color "${requestedColor}"`);
  }

  if (colorName(item.colorHex) === requested.name) {
    return colorScores.exact;
  }

  const itemFamily = colorFamily(item.colorHex);

  if (requested.family !== "neutral" && requested.family === itemFamily) {
    return colorScores.sameFamily;
  }

  if (requested.family === "neutral" && (itemFamily === "neutral" || isNeutral(item))) {
    return colorScores.bothNeutral;
  }

  return 0;
}

function styleScore(item, requestedStyle) {
  if (item.style === requestedStyle) return 1;
  const partial = styleCompatibility(requestedStyle, item.style);
  return partial >= rulesConfig.attributeMatch.stylePartialMin ? partial : 0;
}

function patternScore(item, requestedPattern) {
  if (item.pattern === requestedPattern) return 1;
  return rulesConfig.attributeMatch.patternPartial[requestedPattern]?.[item.pattern] ?? 0;
}

const SCORERS = {
  category: (item, value) => (item.category === value ? 1 : 0),
  color: colorScore,
  style: styleScore,
  pattern: patternScore,
  occasion: (item, value) => (item.occasions?.includes(value) ? 1 : 0),
  season: (item, value) => (item.seasons?.includes(value) ? 1 : 0),
};

// Returns { score, matched[], missed[], scores, excluded }.
//   matched: requested attributes with a non-zero score (exact or partial)
//   missed:  requested attributes that scored 0
//   scores:  per-attribute s_k, for explanation
export function attributeMatch(item, requested = {}) {
  const keys = Object.keys(requested).filter((key) => requested[key] !== undefined);

  for (const key of keys) {
    if (!MATCH_ATTRIBUTES.includes(key)) {
      throw new Error(`attributeMatch: unknown attribute "${key}" (expected one of: ${MATCH_ATTRIBUTES.join(", ")})`);
    }
  }

  if (keys.length === 0) {
    return { score: 0, matched: [], missed: [], scores: {}, excluded: false };
  }

  const { weights } = rulesConfig.attributeMatch;
  const scores = {};
  let weighted = 0;
  let weightTotal = 0;

  for (const key of keys) {
    scores[key] = SCORERS[key](item, requested[key]);
    weighted += weights[key] * scores[key];
    weightTotal += weights[key];
  }

  const matched = keys.filter((key) => scores[key] > 0);
  const missed = keys.filter((key) => scores[key] === 0);

  if (keys.includes("category") && scores.category === 0) {
    return { score: 0, matched, missed, scores, excluded: true };
  }

  return { score: weighted / weightTotal, matched, missed, scores, excluded: false };
}

// Ranks items by MatchScore, dropping category-excluded and zero-score
// items. Ties are broken by item id for determinism.
export function matchItems(items, requested) {
  return items
    .map((item) => ({ item, ...attributeMatch(item, requested) }))
    .filter((result) => !result.excluded && result.score > 0)
    .sort((a, b) => b.score - a.score || (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0));
}
