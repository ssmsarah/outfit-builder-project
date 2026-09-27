// Single source of truth for every weight and threshold used by the
// recommendation algorithms (T0.3). Nothing in server/src/recommendation/**
// should hardcode a weight - import it from here instead.
import { loadScoringConfig } from "./loadScoringConfig.js";

const rawScoringConfig = {
  compatibilityWeights: {
    color: 0.3,
    style: 0.25,
    pattern: 0.15,
    occasion: 0.2,
    season: 0.1,
  },
  colorSubWeights: {
    hue: 0.6,
    saturation: 0.2,
    brightness: 0.2,
  },
  neutral: {
    maxSaturation: 0.2,
    minValueForDark: 0.2,
  },
  // T1.3's hue-relation table. Not present in the README's initial T0.3
  // JSON blob - added here (rather than hardcoded in colorHarmony.js)
  // because T1.3 explicitly says "scores come from config". See Decision Log.
  hueRelationScores: {
    neutral_pair: 1.0,
    neutral_accent: 0.95,
    monochromatic: 0.9,
    analogous: 0.85,
    complementary: 0.8,
    split_complementary: 0.75,
    triadic: 0.7,
    clash: 0.4,
  },
  brightnessTargetContrast: 0.3,
  // T2.1's style compatibility matrix, symmetric by construction (each row
  // lists all 5 styles so no runtime symmetrization is needed). Same
  // rationale as hueRelationScores: T2.1 says the matrix values live in
  // config, not hardcoded in compatibility logic.
  styleCompatibilityMatrix: {
    casual: { casual: 1.0, smart_casual: 0.8, formal: 0.3, streetwear: 0.8, sporty: 0.7 },
    smart_casual: { casual: 0.8, smart_casual: 1.0, formal: 0.7, streetwear: 0.5, sporty: 0.3 },
    formal: { casual: 0.3, smart_casual: 0.7, formal: 1.0, streetwear: 0.2, sporty: 0.1 },
    streetwear: { casual: 0.8, smart_casual: 0.5, formal: 0.2, streetwear: 1.0, sporty: 0.7 },
    sporty: { casual: 0.7, smart_casual: 0.3, formal: 0.1, streetwear: 0.7, sporty: 1.0 },
  },
  // T2.2's pattern compatibility matrix, same rationale as
  // styleCompatibilityMatrix above.
  patternCompatibilityMatrix: {
    solid: { solid: 1.0, striped: 0.9, checked: 0.9, graphic: 0.9, floral: 0.9 },
    striped: { solid: 0.9, striped: 0.5, checked: 0.3, graphic: 0.3, floral: 0.3 },
    checked: { solid: 0.9, striped: 0.3, checked: 0.4, graphic: 0.3, floral: 0.2 },
    graphic: { solid: 0.9, striped: 0.3, checked: 0.3, graphic: 0.3, floral: 0.2 },
    floral: { solid: 0.9, striped: 0.3, checked: 0.2, graphic: 0.2, floral: 0.4 },
  },
  preferenceWeights: {
    like: 0.35,
    view: 0.1,
    save: 0.25,
    purchase: 0.3,
  },
  preferenceBlend: {
    itemDirect: 0.5,
    attributeAffinity: 0.5,
  },
  decayHalfLifeDays: 30,
  alpha: {
    default: 0.7,
    coldStart: 1.0,
    minInteractions: 5,
  },
  generation: {
    beamWidth: 10,
    topN: 5,
    accessoryPairWeight: 0.5,
  },
  // T3.7's hard floor: no outfit below this compatibility score may enter
  // the personalized top-N, no matter how high its preference score is.
  // Not in the README's original T0.3 JSON - added explicitly by T3.7
  // ("add this as a hard floor in config").
  minCompatibility: 0.5,
};

export const scoringConfig = loadScoringConfig(rawScoringConfig);
export default scoringConfig;
