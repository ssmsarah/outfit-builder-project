import { describe, it, expect } from "vitest";
import { loadScoringConfig } from "../../src/config/loadScoringConfig.js";
import { scoringConfig } from "../../src/config/scoringConfig.js";

const validConfig = () => ({
  compatibilityWeights: { color: 0.3, style: 0.25, pattern: 0.15, occasion: 0.2, season: 0.1 },
  colorSubWeights: { hue: 0.6, saturation: 0.2, brightness: 0.2 },
  neutral: { maxSaturation: 0.2, minValueForDark: 0.2 },
  brightnessTargetContrast: 0.3,
  preferenceWeights: { like: 0.35, view: 0.1, save: 0.25, purchase: 0.3 },
  preferenceBlend: { itemDirect: 0.5, attributeAffinity: 0.5 },
  decayHalfLifeDays: 30,
  alpha: { default: 0.7, coldStart: 1.0, minInteractions: 5 },
  generation: { beamWidth: 10, topN: 5, accessoryPairWeight: 0.5 },
});

describe("loadScoringConfig", () => {
  it("accepts a valid config and returns its values unchanged", () => {
    const loaded = loadScoringConfig(validConfig());
    expect(loaded.compatibilityWeights.color).toBe(0.3);
    expect(loaded.alpha.minInteractions).toBe(5);
  });

  it("returns a deeply frozen config", () => {
    const loaded = loadScoringConfig(validConfig());
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.compatibilityWeights)).toBe(true);
    expect(() => {
      "use strict";
      loaded.compatibilityWeights.color = 0.99;
    }).toThrow();
  });

  it("does not mutate the input object it was given", () => {
    const input = validConfig();
    const loaded = loadScoringConfig(input);
    expect(loaded).not.toBe(input);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it.each(["compatibilityWeights", "colorSubWeights", "preferenceWeights"])(
    "throws a clear error when %s does not sum to 1.0",
    (groupName) => {
      const broken = validConfig();
      broken[groupName] = { ...broken[groupName] };
      const [firstKey] = Object.keys(broken[groupName]);
      broken[groupName][firstKey] += 0.2;

      expect(() => loadScoringConfig(broken)).toThrow(
        new RegExp(`${groupName}.*sum to 1.0`)
      );
    }
  );

  it("throws when a required weight group is missing", () => {
    const broken = validConfig();
    delete broken.preferenceWeights;

    expect(() => loadScoringConfig(broken)).toThrow(/preferenceWeights/);
  });

  it("throws when given a non-object config", () => {
    expect(() => loadScoringConfig(null)).toThrow();
    expect(() => loadScoringConfig("not a config")).toThrow();
  });

  it("accepts sums within the 1e-6 tolerance but rejects sums just outside it", () => {
    const withinTolerance = validConfig();
    withinTolerance.compatibilityWeights.color += 5e-7;
    expect(() => loadScoringConfig(withinTolerance)).not.toThrow();

    const outsideTolerance = validConfig();
    outsideTolerance.compatibilityWeights.color += 5e-5;
    expect(() => loadScoringConfig(outsideTolerance)).toThrow();
  });
});

describe("scoringConfig (real values)", () => {
  it("loads without throwing and exposes every documented group", () => {
    expect(scoringConfig.compatibilityWeights).toBeDefined();
    expect(scoringConfig.colorSubWeights).toBeDefined();
    expect(scoringConfig.neutral).toEqual({ maxSaturation: 0.2, minValueForDark: 0.2 });
    expect(scoringConfig.styleCompatibilityMatrix.casual).toEqual({
      casual: 1.0,
      smart_casual: 0.8,
      formal: 0.3,
      streetwear: 0.8,
      sporty: 0.7,
    });
    expect(scoringConfig.patternCompatibilityMatrix.solid).toEqual({
      solid: 1.0,
      striped: 0.9,
      checked: 0.9,
      graphic: 0.9,
      floral: 0.9,
    });
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
    expect(scoringConfig.brightnessTargetContrast).toBe(0.3);
    expect(scoringConfig.preferenceWeights).toBeDefined();
    expect(scoringConfig.preferenceBlend).toEqual({ itemDirect: 0.5, attributeAffinity: 0.5 });
    expect(scoringConfig.decayHalfLifeDays).toBe(30);
    expect(scoringConfig.alpha).toEqual({ default: 0.7, coldStart: 1.0, minInteractions: 5 });
    expect(scoringConfig.generation).toEqual({ beamWidth: 10, topN: 5, accessoryPairWeight: 0.5 });
  });
});
