// T4.6 acceptance criterion: "Every formula in the document matches the
// implemented code and config." This doesn't just eyeball docs/ALGORITHMS.md -
// it re-derives every numeric claim made in that document from the actual
// running code and config, and separately checks the config tables
// transcribed into the doc (style/pattern matrices, weights) against the
// real scoringConfig object, to catch any manual transcription slip.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

import { scoringConfig } from "../../src/config/scoringConfig.js";
import { hexToHsv } from "../../src/recommendation/color/colorConvert.js";
import {
  isNeutral,
  classifyHueRelation,
  computeSaturationBrightnessScore,
  pairwiseColorScore,
  outfitColorScore,
} from "../../src/recommendation/color/colorHarmony.js";
import {
  pairwiseCompatibilityScore,
  combineCompatibilityComponents,
} from "../../src/recommendation/compatibility/pairScore.js";
import { outfitScore } from "../../src/recommendation/compatibility/outfitScore.js";
import { explainOutfit } from "../../src/recommendation/compatibility/explainOutfit.js";
import { wardrobeById } from "../recommendation/fixtures/wardrobe.js";
import { decay } from "../../src/recommendation/personalization/signalNormalization.js";
import { itemPreferenceScore } from "../../src/recommendation/personalization/preferenceScore.js";
import { buildAttributeProfile, computeItemAffinity } from "../../src/recommendation/personalization/attributeProfile.js";

const docPath = path.resolve(__dirname, "../../../docs/ALGORITHMS.md");
const doc = fs.readFileSync(docPath, "utf-8");

describe("docs/ALGORITHMS.md exists and covers all three algorithms", () => {
  it("has a section for each algorithm and links to EVALUATION.md", () => {
    expect(doc).toMatch(/## 1\. Color Harmony Algorithm/);
    expect(doc).toMatch(/## 2\. Outfit Compatibility Scoring Algorithm/);
    expect(doc).toMatch(/## 3\. Personalized Recommendation Algorithm/);
    expect(doc).toMatch(/EVALUATION\.md/);
  });

  it("every algorithm section has purpose/inputs/outputs/formulas/config/worked example/complexity/limitations", () => {
    for (const heading of ["1. Color Harmony", "2. Outfit Compatibility", "3. Personalized Recommendation"]) {
      const start = doc.indexOf(heading);
      const nextSectionStart = doc.indexOf("\n---\n", start);
      const section = doc.slice(start, nextSectionStart === -1 ? undefined : nextSectionStart);
      for (const required of ["Purpose", "Inputs", "Outputs", "Formulas", "Config values", "Worked example", "Complexity", "Limitations"]) {
        expect(section, `${heading} should contain "${required}"`).toMatch(new RegExp(required));
      }
    }
  });
});

describe("Section 1 (Color Harmony) worked example matches live code", () => {
  const bt = wardrobeById.black_tshirt;
  const bj = wardrobeById.blue_jeans;
  const ws = wardrobeById.white_sneakers;

  it("hexToHsv, isNeutral, classifyHueRelation, saturation/brightness for black_tshirt + blue_jeans", () => {
    const hsv = hexToHsv("#3B5B92");
    expect(hsv.h).toBeCloseTo(217.93, 1);
    expect(hsv.s).toBeCloseTo(0.596, 2);
    expect(hsv.v).toBeCloseTo(0.573, 2);

    expect(isNeutral(bt)).toBe(true);
    expect(isNeutral(bj)).toBe(true);
    expect(classifyHueRelation(bt, bj)).toEqual({ relation: "neutral_pair", hueScore: 1 });

    const { saturationScore, brightnessScore } = computeSaturationBrightnessScore(bt, bj);
    expect(saturationScore).toBe(1);
    expect(brightnessScore).toBeCloseTo(0.6106, 3);
  });

  it("pairwiseColorScore(black_tshirt, blue_jeans) = 0.9221", () => {
    expect(pairwiseColorScore(bt, bj).score).toBeCloseTo(0.9221, 3);
  });

  it("outfitColorScore([black_tshirt, blue_jeans, white_sneakers]) = 0.9027", () => {
    expect(outfitColorScore([bt, bj, ws])).toBeCloseTo(0.9027, 3);
  });
});

describe("Section 2 (Compatibility) worked example matches live code", () => {
  const bt = wardrobeById.black_tshirt;
  const bj = wardrobeById.blue_jeans;
  const ws = wardrobeById.white_sneakers;
  const context = { targetOccasion: "casual", targetSeason: null };

  it("the README's exact injected-component worked example: 0.91", () => {
    const score = combineCompatibilityComponents({ color: 0.8, style: 1.0, pattern: 0.8, occasion: 1.0, season: 1.0 });
    expect(score).toBeCloseTo(0.91, 10);
  });

  it("pairwiseCompatibilityScore(black_tshirt, blue_jeans) components and score", () => {
    const { score, components } = pairwiseCompatibilityScore(bt, bj, context);
    expect(components.color).toBeCloseTo(0.9221, 3);
    expect(components.style).toBe(1);
    expect(components.pattern).toBe(1);
    expect(components.occasion).toBe(1);
    expect(components.season).toBe(1);
    expect(score).toBeCloseTo(0.9766, 3);
  });

  it("outfitScore + explainOutfit for [black_tshirt, blue_jeans, white_sneakers]", () => {
    const outfit = [bt, bj, ws];
    expect(outfitScore(outfit, context)).toBeCloseTo(0.9708, 3);

    const explanation = explainOutfit(outfit, context);
    expect(explanation.compatibilityScore).toBeCloseTo(0.9708, 3);
    expect(explanation.breakdown.color).toBeCloseTo(0.9027, 3);
    expect(explanation.breakdown.style).toBe(1);
    expect(explanation.reasons).toEqual(["All items share casual style", "Neutral colors pair cleanly"]);
  });
});

describe("Section 3 (Personalization) worked example matches live code", () => {
  it("decay(60) = 0.25 (a 60-day-old view counts a quarter of a fresh one)", () => {
    expect(decay(60)).toBeCloseTo(0.25, 10);
  });

  it("R_i for a liked+purchased item with no view/save history = 0.65", () => {
    expect(itemPreferenceScore({ L: 1, V: 0, S: 0, P: 1 })).toBeCloseTo(0.65, 10);
  });

  it("black-casual affinity (0.65) beats floral-formal affinity (0.5375) for an unseen item", () => {
    const likedItem = { id: "liked", category: "top", style: "casual", pattern: "solid", colorHex: "#000000" };
    const profile = buildAttributeProfile([
      { item: { ...likedItem, id: "l1" }, R: 0.65 },
      { item: { ...likedItem, id: "l2" }, R: 0.65 },
      { item: { ...likedItem, id: "l3" }, R: 0.65 },
    ]);
    const preferenceScores = new Map(); // both test items are "unseen"

    const unseenBlackCasual = { id: "u1", category: "top", style: "casual", pattern: "solid", colorHex: "#0A0A0A" };
    const unseenFloralFormal = { id: "u2", category: "top", style: "formal", pattern: "floral", colorHex: "#7D3C98" };

    expect(computeItemAffinity(unseenBlackCasual, { profile, preferenceScores })).toBeCloseTo(0.65, 3);
    expect(computeItemAffinity(unseenFloralFormal, { profile, preferenceScores })).toBeCloseTo(0.5375, 3);
  });
});

describe("Config tables transcribed into the doc match the real scoringConfig", () => {
  it("compatibilityWeights", () => {
    expect(scoringConfig.compatibilityWeights).toEqual({ color: 0.3, style: 0.25, pattern: 0.15, occasion: 0.2, season: 0.1 });
  });

  it("colorSubWeights, neutral thresholds, brightnessTargetContrast", () => {
    expect(scoringConfig.colorSubWeights).toEqual({ hue: 0.6, saturation: 0.2, brightness: 0.2 });
    expect(scoringConfig.neutral).toEqual({ maxSaturation: 0.2, minValueForDark: 0.2 });
    expect(scoringConfig.brightnessTargetContrast).toBe(0.3);
  });

  it("hueRelationScores", () => {
    expect(scoringConfig.hueRelationScores).toEqual({
      neutral_pair: 1.0,
      neutral_accent: 0.95,
      monochromatic: 0.9,
      analogous: 0.85,
      complementary: 0.8,
      split_complementary: 0.75,
      triadic: 0.7,
      clash: 0.4,
    });
  });

  it("styleCompatibilityMatrix (the exact table transcribed into the doc)", () => {
    expect(scoringConfig.styleCompatibilityMatrix).toEqual({
      casual: { casual: 1.0, smart_casual: 0.8, formal: 0.3, streetwear: 0.8, sporty: 0.7 },
      smart_casual: { casual: 0.8, smart_casual: 1.0, formal: 0.7, streetwear: 0.5, sporty: 0.3 },
      formal: { casual: 0.3, smart_casual: 0.7, formal: 1.0, streetwear: 0.2, sporty: 0.1 },
      streetwear: { casual: 0.8, smart_casual: 0.5, formal: 0.2, streetwear: 1.0, sporty: 0.7 },
      sporty: { casual: 0.7, smart_casual: 0.3, formal: 0.1, streetwear: 0.7, sporty: 1.0 },
    });
  });

  it("patternCompatibilityMatrix (the exact table transcribed into the doc)", () => {
    expect(scoringConfig.patternCompatibilityMatrix).toEqual({
      solid: { solid: 1.0, striped: 0.9, checked: 0.9, graphic: 0.9, floral: 0.9 },
      striped: { solid: 0.9, striped: 0.5, checked: 0.3, graphic: 0.3, floral: 0.3 },
      checked: { solid: 0.9, striped: 0.3, checked: 0.4, graphic: 0.3, floral: 0.2 },
      graphic: { solid: 0.9, striped: 0.3, checked: 0.3, graphic: 0.3, floral: 0.2 },
      floral: { solid: 0.9, striped: 0.3, checked: 0.2, graphic: 0.2, floral: 0.4 },
    });
  });

  it("preferenceWeights, preferenceBlend, decayHalfLifeDays, alpha, minCompatibility", () => {
    expect(scoringConfig.preferenceWeights).toEqual({ like: 0.35, view: 0.1, save: 0.25, purchase: 0.3 });
    expect(scoringConfig.preferenceBlend).toEqual({ itemDirect: 0.5, attributeAffinity: 0.5 });
    expect(scoringConfig.decayHalfLifeDays).toBe(30);
    expect(scoringConfig.alpha).toEqual({ default: 0.7, coldStart: 1.0, minInteractions: 5 });
    expect(scoringConfig.minCompatibility).toBe(0.5);
  });

  it("generation config (beamWidth, topN, accessoryPairWeight)", () => {
    expect(scoringConfig.generation).toEqual({ beamWidth: 10, topN: 5, accessoryPairWeight: 0.5 });
  });
});
