import { describe, it, expect } from "vitest";
import { clamp01, mean, weightedSum, weightedMean, circularHueDistance } from "../../../src/recommendation/utils/math.js";

describe("clamp01", () => {
  it("clamps below 0 up to 0", () => {
    expect(clamp01(-0.5)).toBe(0);
  });

  it("clamps above 1 down to 1", () => {
    expect(clamp01(1.5)).toBe(1);
  });

  it("passes through values already in [0,1]", () => {
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });
});

describe("mean", () => {
  it("computes the arithmetic mean", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([5])).toBe(5);
  });

  it("returns 0 for an empty list", () => {
    expect(mean([])).toBe(0);
  });
});

describe("weightedSum", () => {
  it("computes the dot product of values and weights", () => {
    expect(weightedSum([1, 2, 3], [0.5, 0.25, 0.25])).toBeCloseTo(1.75);
  });

  it("throws when values and weights lengths differ", () => {
    expect(() => weightedSum([1, 2], [0.5])).toThrow();
  });
});

describe("weightedMean", () => {
  it("computes a normalized weighted average, not just a weighted sum", () => {
    // scores [1, 0] weighted [1, 3] -> (1*1 + 0*3) / (1+3) = 0.25
    expect(weightedMean([1, 0], [1, 3])).toBeCloseTo(0.25);
  });

  it("matches the plain mean when all weights are equal", () => {
    expect(weightedMean([2, 4, 6], [1, 1, 1])).toBeCloseTo(mean([2, 4, 6]));
  });

  it("returns 0 for an empty list or all-zero weights", () => {
    expect(weightedMean([], [])).toBe(0);
    expect(weightedMean([1, 2], [0, 0])).toBe(0);
  });
});

describe("circularHueDistance", () => {
  it("matches the README's worked examples", () => {
    expect(circularHueDistance(350, 10)).toBe(20);
    expect(circularHueDistance(0, 180)).toBe(180);
  });

  it("is symmetric", () => {
    expect(circularHueDistance(10, 350)).toBe(circularHueDistance(350, 10));
    expect(circularHueDistance(120, 40)).toBe(circularHueDistance(40, 120));
  });

  it("returns 0 for identical or wrapped-equal hues", () => {
    expect(circularHueDistance(0, 0)).toBe(0);
    expect(circularHueDistance(-10, 350)).toBe(0);
    expect(circularHueDistance(400, 40)).toBe(0);
  });

  it("always returns a value in [0, 180]", () => {
    for (let h1 = 0; h1 < 360; h1 += 37) {
      for (let h2 = 0; h2 < 360; h2 += 53) {
        const d = circularHueDistance(h1, h2);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(180);
      }
    }
  });
});
