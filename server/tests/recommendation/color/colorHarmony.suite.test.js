// T1.7: consolidated Sprint 1 property tests + the Sprint 1 Definition of
// Done's module-isolation guarantee. The ticket-by-ticket test files
// (colorConvert.test.js, colorHarmony.*.test.js) already cover each
// function's specific acceptance criteria including symmetry/range checks
// on real fixture data; this file adds broader randomized property sweeps
// that aren't tied to any one fixture, plus a static check that the color
// module never reaches into compatibility/ or personalization/.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  isNeutral,
  classifyHueRelation,
  computeSaturationBrightnessScore,
  pairwiseColorScore,
  outfitColorScore,
} from "../../../src/recommendation/color/colorHarmony.js";
import { hexToHsv } from "../../../src/recommendation/color/colorConvert.js";

// Deterministic PRNG (mulberry32) so property tests are reproducible across
// runs/CI instead of flaking on Math.random().
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260927);

function randomHex() {
  const byte = () => Math.floor(rand() * 256).toString(16).padStart(2, "0");
  return `#${byte()}${byte()}${byte()}`.toUpperCase();
}

function randomItem() {
  return {
    colorHex: randomHex(),
    isNeutralOverride: rand() < 0.15 ? true : undefined,
  };
}

const RANDOM_PAIR_COUNT = 300;

describe("T1.7 - color harmony property tests (randomized)", () => {
  it("pairwiseColorScore is symmetric: C(A,B) == C(B,A)", () => {
    for (let i = 0; i < RANDOM_PAIR_COUNT; i++) {
      const a = randomItem();
      const b = randomItem();
      const ab = pairwiseColorScore(a, b);
      const ba = pairwiseColorScore(b, a);
      expect(ab.score).toBeCloseTo(ba.score, 10);
      expect(ab.relation).toBe(ba.relation);
    }
  });

  it("pairwiseColorScore is always in [0,1]", () => {
    for (let i = 0; i < RANDOM_PAIR_COUNT; i++) {
      const { score } = pairwiseColorScore(randomItem(), randomItem());
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("classifyHueRelation is symmetric and always returns a hueScore in [0,1]", () => {
    for (let i = 0; i < RANDOM_PAIR_COUNT; i++) {
      const a = randomItem();
      const b = randomItem();
      const ab = classifyHueRelation(a, b);
      const ba = classifyHueRelation(b, a);
      expect(ab).toEqual(ba);
      expect(ab.hueScore).toBeGreaterThanOrEqual(0);
      expect(ab.hueScore).toBeLessThanOrEqual(1);
    }
  });

  it("computeSaturationBrightnessScore is symmetric and always in [0,1]", () => {
    for (let i = 0; i < RANDOM_PAIR_COUNT; i++) {
      const a = randomItem();
      const b = randomItem();
      const ab = computeSaturationBrightnessScore(a, b);
      const ba = computeSaturationBrightnessScore(b, a);
      expect(ab.saturationScore).toBeCloseTo(ba.saturationScore, 10);
      expect(ab.brightnessScore).toBeCloseTo(ba.brightnessScore, 10);
      expect(ab.saturationScore).toBeGreaterThanOrEqual(0);
      expect(ab.saturationScore).toBeLessThanOrEqual(1);
      expect(ab.brightnessScore).toBeGreaterThanOrEqual(0);
      expect(ab.brightnessScore).toBeLessThanOrEqual(1);
    }
  });

  it("hexToHsv round-trips to h in [0,360), s/v in [0,1] for any valid hex", () => {
    for (let i = 0; i < RANDOM_PAIR_COUNT; i++) {
      const { h, s, v } = hexToHsv(randomHex());
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("outfitColorScore is invariant under item order and always in [0,1]", () => {
    for (let i = 0; i < 50; i++) {
      const items = [randomItem(), randomItem(), randomItem(), randomItem()];
      const shuffled = [...items].reverse();

      const score = outfitColorScore(items);
      const scoreShuffled = outfitColorScore(shuffled);

      expect(score).toBeCloseTo(scoreShuffled, 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("isNeutral is consistent with the scores it feeds into (neutral pairs always get hueScore 1.00)", () => {
    for (let i = 0; i < RANDOM_PAIR_COUNT; i++) {
      const a = randomItem();
      const b = randomItem();
      const { relation, hueScore } = classifyHueRelation(a, b);
      if (isNeutral(a) && isNeutral(b)) {
        expect(relation).toBe("neutral_pair");
        expect(hueScore).toBe(1);
      }
    }
  });
});

describe("T1.7 - Sprint 1 Definition of Done: color module isolation", () => {
  it("colorConvert.js and colorHarmony.js do not import from compatibility/ or personalization/", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const colorDir = join(here, "..", "..", "..", "src", "recommendation", "color");

    for (const file of ["colorConvert.js", "colorHarmony.js"]) {
      const source = readFileSync(join(colorDir, file), "utf-8");
      expect(source).not.toMatch(/from\s+["'].*\/compatibility\//);
      expect(source).not.toMatch(/from\s+["'].*\/personalization\//);
    }
  });
});
