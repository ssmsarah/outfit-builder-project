// Color Harmony Algorithm (Sprint 1). Grows one ticket at a time:
// T1.2 isNeutral, T1.3 classifyHueRelation, T1.4 saturation/brightness,
// T1.5 pairwiseColorScore, T1.6 outfitColorScore. All pure functions except
// where they intentionally read/write the getItemHsv cache on an item.
import { getItemHsv } from "./colorConvert.js";
import { circularHueDistance, clamp01, weightedSum, mean } from "../utils/math.js";
import { scoringConfig } from "../../config/scoringConfig.js";

export function isNeutral(item) {
  if (item.isNeutralOverride === true) {
    return true;
  }

  const { s, v } = getItemHsv(item);
  const { maxSaturation, minValueForDark } = scoringConfig.neutral;

  return s <= maxSaturation || v <= minValueForDark;
}

// Classifies the hue relationship between two items. Branch order matters:
// each check assumes every earlier branch's range has already been ruled
// out, so together they partition circularHueDistance's [0,180] range
// exactly as the README's table does (including the unnamed 45<d<105 gap,
// which correctly falls through to "clash").
export function classifyHueRelation(a, b) {
  const { hueRelationScores } = scoringConfig;
  const aNeutral = isNeutral(a);
  const bNeutral = isNeutral(b);

  if (aNeutral && bNeutral) {
    return { relation: "neutral_pair", hueScore: hueRelationScores.neutral_pair };
  }

  if (aNeutral || bNeutral) {
    return { relation: "neutral_accent", hueScore: hueRelationScores.neutral_accent };
  }

  const d = circularHueDistance(getItemHsv(a).h, getItemHsv(b).h);

  if (d <= 15) {
    return { relation: "monochromatic", hueScore: hueRelationScores.monochromatic };
  }
  if (d <= 45) {
    return { relation: "analogous", hueScore: hueRelationScores.analogous };
  }
  if (d >= 165) {
    return { relation: "complementary", hueScore: hueRelationScores.complementary };
  }
  if (d >= 135) {
    return { relation: "split_complementary", hueScore: hueRelationScores.split_complementary };
  }
  if (d >= 105) {
    return { relation: "triadic", hueScore: hueRelationScores.triadic };
  }
  return { relation: "clash", hueScore: hueRelationScores.clash };
}

// C_saturation and C_brightness (T1.4). Neutrals don't compete on
// saturation (README), so a neutral pair short-circuits saturationScore to
// 1 rather than measuring the raw |s_a - s_b| gap. Every intermediate
// result is clamped to [0,1] per instruction 6, even where the formula's
// own min()/abs() already guarantee that range.
export function computeSaturationBrightnessScore(a, b) {
  const { s: sa, v: va } = getItemHsv(a);
  const { s: sb, v: vb } = getItemHsv(b);

  const saturationScore =
    isNeutral(a) || isNeutral(b) ? 1 : clamp01(1 - Math.abs(sa - sb));

  const { brightnessTargetContrast: targetContrast } = scoringConfig;
  const brightnessScore = clamp01(
    1 -
      Math.min(
        1,
        Math.abs(Math.abs(va - vb) - targetContrast) / (1 - targetContrast)
      )
  );

  return { saturationScore, brightnessScore };
}

// C_color(A,B) (T1.5): the hue relation score plus the saturation/brightness
// sub-scores, blended by scoringConfig.colorSubWeights.
export function pairwiseColorScore(a, b) {
  const { relation, hueScore } = classifyHueRelation(a, b);
  const { saturationScore, brightnessScore } = computeSaturationBrightnessScore(a, b);
  const { hue, saturation, brightness } = scoringConfig.colorSubWeights;

  const components = { hue: hueScore, saturation: saturationScore, brightness: brightnessScore };
  const score = clamp01(
    weightedSum(
      [components.hue, components.saturation, components.brightness],
      [hue, saturation, brightness]
    )
  );

  return { score, relation, components };
}

// Distinct non-neutral "hue groups" among an outfit's items: items within
// 30 degrees of each other belong to the same group. Modeled as connected
// components on a proximity graph (union-find), not just adjacent-pair
// bucketing, so it's transitive: if A is near B and B is near C, all three
// land in one group even if A and C themselves are more than 30 degrees
// apart. Neutral items don't participate in hue grouping at all.
function countNonNeutralHueGroups(items) {
  const hues = items.filter((item) => !isNeutral(item)).map((item) => getItemHsv(item).h);
  const parent = hues.map((_, i) => i);

  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      if (circularHueDistance(hues[i], hues[j]) <= 30) {
        union(i, j);
      }
    }
  }

  return new Set(hues.map((_, i) => find(i))).size;
}

// outfitColorScore(items) (T1.6): mean C_color across every item pair, with
// a 0.85 penalty when the outfit spans more than 3 distinct non-neutral hue
// groups (too many competing colors at once).
export function outfitColorScore(items) {
  const pairScores = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairScores.push(pairwiseColorScore(items[i], items[j]).score);
    }
  }

  const baseScore = mean(pairScores);
  const hueGroupCount = countNonNeutralHueGroups(items);
  const penalized = hueGroupCount > 3 ? baseScore * 0.85 : baseScore;

  return clamp01(penalized);
}
