import { describe, it, expect } from "vitest";
import { classifyHueRelation } from "../../../src/recommendation/color/colorHarmony.js";
import { scoringConfig } from "../../../src/config/scoringConfig.js";
import { mapProductToItem } from "../../../src/recommendation/mapProductToItem.js";

// Builds a pure hex color at the given hue (s=1, v=1) so tests can target
// exact circularHueDistance values instead of relying on the fixture wardrobe's
// incidental hues. Test-only helper - not part of the production API.
function hexFromHue(h) {
  const c = 1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let [r1, g1, b1] = [0, 0, 0];
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}

const item = (h) => ({ colorHex: hexFromHue(h) });
const neutral = (hex) => ({ colorHex: hex });
const scores = scoringConfig.hueRelationScores;

describe("classifyHueRelation - one test per table row", () => {
  it("both neutral -> neutral_pair (1.00)", () => {
    const result = classifyHueRelation(neutral("#000000"), neutral("#FFFFFF"));
    expect(result).toEqual({ relation: "neutral_pair", hueScore: scores.neutral_pair });
  });

  it("exactly one neutral -> neutral_accent (0.95)", () => {
    const result = classifyHueRelation(neutral("#000000"), item(200));
    expect(result).toEqual({ relation: "neutral_accent", hueScore: scores.neutral_accent });
  });

  it("d <= 15 -> monochromatic (0.90)", () => {
    const result = classifyHueRelation(item(200), item(210)); // d = 10
    expect(result).toEqual({ relation: "monochromatic", hueScore: scores.monochromatic });
  });

  it("15 < d <= 45 -> analogous (0.85)", () => {
    const result = classifyHueRelation(item(200), item(230)); // d = 30
    expect(result).toEqual({ relation: "analogous", hueScore: scores.analogous });
  });

  it("165 <= d <= 180 -> complementary (0.80)", () => {
    const result = classifyHueRelation(item(10), item(190)); // d = 180
    expect(result).toEqual({ relation: "complementary", hueScore: scores.complementary });
  });

  it("135 <= d < 165 -> split_complementary (0.75)", () => {
    const result = classifyHueRelation(item(200), item(350)); // d = 150
    expect(result).toEqual({ relation: "split_complementary", hueScore: scores.split_complementary });
  });

  it("105 <= d < 135 -> triadic (0.70)", () => {
    const result = classifyHueRelation(item(200), item(320)); // d = 120
    expect(result).toEqual({ relation: "triadic", hueScore: scores.triadic });
  });

  it("everything else (45 < d < 105) -> clash (0.40)", () => {
    const result = classifyHueRelation(item(200), item(270)); // d = 70
    expect(result).toEqual({ relation: "clash", hueScore: scores.clash });
  });
});

describe("classifyHueRelation against real/user-fed data", () => {
  it("classifies two derived legacy items without throwing and returns a valid relation", () => {
    const a = mapProductToItem({ _id: "a", category: ["tops"], colors: ["black"] });
    const b = mapProductToItem({ _id: "b", category: ["bottoms"], colors: ["Unmapped Dusty Rose"] });

    const result = classifyHueRelation(a, b);
    expect(Object.keys(scores)).toContain(result.relation);
    expect(result.hueScore).toBeGreaterThanOrEqual(0);
    expect(result.hueScore).toBeLessThanOrEqual(1);
  });
});
