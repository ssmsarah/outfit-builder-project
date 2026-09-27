import { describe, it, expect } from "vitest";
import { computeSaturationBrightnessScore } from "../../../src/recommendation/color/colorHarmony.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

// Bypasses hexToHsv by pre-caching `.hsv` directly, so tests can control
// s/v exactly instead of hunting for a hex string that produces them.
const item = (h, s, v, extra = {}) => ({
  colorHex: "#123456",
  hsv: { h, s, v },
  ...extra,
});

describe("computeSaturationBrightnessScore", () => {
  it("C_saturation = 1 - |s_a - s_b| for a non-neutral pair", () => {
    const { saturationScore } = computeSaturationBrightnessScore(
      item(200, 0.8, 0.5),
      item(200, 0.3, 0.5)
    );
    expect(saturationScore).toBeCloseTo(0.5);
  });

  it("forces C_saturation = 1 whenever either item is neutral, regardless of the raw gap", () => {
    // s=0.9 vs s=0.1 would normally give 1-0.8=0.2, but the second item is
    // forced neutral via isNeutralOverride.
    const { saturationScore } = computeSaturationBrightnessScore(
      item(200, 0.9, 0.5),
      item(200, 0.1, 0.5, { isNeutralOverride: true })
    );
    expect(saturationScore).toBe(1);
  });

  it("C_brightness == 1 when |v_a - v_b| equals the target contrast (0.30)", () => {
    const { brightnessScore } = computeSaturationBrightnessScore(
      item(200, 0.5, 0.6),
      item(200, 0.5, 0.3) // |0.6 - 0.3| = 0.30
    );
    expect(brightnessScore).toBe(1);
  });

  it("rewards moderate contrast over identical brightness", () => {
    const identical = computeSaturationBrightnessScore(item(200, 0.5, 0.5), item(200, 0.5, 0.5));
    const moderateContrast = computeSaturationBrightnessScore(item(200, 0.5, 0.6), item(200, 0.5, 0.3));

    expect(moderateContrast.brightnessScore).toBeGreaterThan(identical.brightnessScore);
  });

  it("C_brightness bottoms out at 0 for maximal contrast far from the target", () => {
    const { brightnessScore } = computeSaturationBrightnessScore(
      item(200, 0.5, 0),
      item(200, 0.5, 1) // |1-0| = 1, as far as possible from targetContrast=0.3
    );
    expect(brightnessScore).toBe(0);
  });

  it("always returns both scores within [0,1]", () => {
    for (let sa = 0; sa <= 1; sa += 0.2) {
      for (let sb = 0; sb <= 1; sb += 0.2) {
        for (let va = 0; va <= 1; va += 0.25) {
          for (let vb = 0; vb <= 1; vb += 0.25) {
            const { saturationScore, brightnessScore } = computeSaturationBrightnessScore(
              item(0, sa, va),
              item(0, sb, vb)
            );
            expect(saturationScore).toBeGreaterThanOrEqual(0);
            expect(saturationScore).toBeLessThanOrEqual(1);
            expect(brightnessScore).toBeGreaterThanOrEqual(0);
            expect(brightnessScore).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("handles real/user-fed data without throwing and stays in range", () => {
    const a = mapProductToItem({ _id: "a", category: ["tops"], colors: ["black"] });
    const b = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["Unmapped Coral Dust"] });

    const { saturationScore, brightnessScore } = computeSaturationBrightnessScore(a, b);
    expect(saturationScore).toBeGreaterThanOrEqual(0);
    expect(saturationScore).toBeLessThanOrEqual(1);
    expect(brightnessScore).toBeGreaterThanOrEqual(0);
    expect(brightnessScore).toBeLessThanOrEqual(1);
  });
});
