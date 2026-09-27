import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  runPrecisionAt5,
  runHitRateAt5,
  runScoreSpreadByCategory,
  runWeightSensitivity,
  runPerformanceBenchmark,
} from "../../src/scripts/evaluateRecommender.js";
import { generateSyntheticWardrobe } from "../../src/scripts/syntheticWardrobe.js";

describe("runPrecisionAt5", () => {
  it("scores every labeled outfit and beats the random baseline (README acceptance criterion)", () => {
    const result = runPrecisionAt5();

    expect(result.scored.length).toBeGreaterThanOrEqual(30); // README: "at least 30 hand-labeled outfits"
    expect(result.top5).toHaveLength(5);
    expect(result.precisionAt5).toBeGreaterThanOrEqual(0);
    expect(result.precisionAt5).toBeLessThanOrEqual(1);
    expect(result.randomBaseline).toBeGreaterThanOrEqual(0);
    expect(result.randomBaseline).toBeLessThanOrEqual(1);
    expect(result.precisionAt5).toBeGreaterThan(result.randomBaseline);
  });

  it("the random baseline is close to the labeled dataset's overall good-rate (sanity check on the Monte Carlo simulation)", () => {
    const result = runPrecisionAt5();
    expect(Math.abs(result.randomBaseline - result.goodRate)).toBeLessThan(0.05);
  });
});

describe("runHitRateAt5", () => {
  it("runs at least one leave-one-out trial per synthetic user and returns a valid hit rate", () => {
    const result = runHitRateAt5();
    expect(result.trials.length).toBeGreaterThan(0);
    expect(result.hitRate).toBeGreaterThanOrEqual(0);
    expect(result.hitRate).toBeLessThanOrEqual(1);
    for (const trial of result.trials) {
      expect(typeof trial.hit).toBe("boolean");
    }
  });
});

describe("runScoreSpreadByCategory", () => {
  it("reports mean/min/max/stdDev for each of the 4 anchorable categories", () => {
    const rows = runScoreSpreadByCategory();
    const categories = rows.map((r) => r.category);
    expect(categories).toEqual(expect.arrayContaining(["top", "bottom", "shoes", "dress"]));
    for (const row of rows) {
      expect(row.min).toBeLessThanOrEqual(row.mean);
      expect(row.mean).toBeLessThanOrEqual(row.max);
      expect(row.stdDev).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("runWeightSensitivity", () => {
  it("re-runs Precision@5 for a +/-0.05 shift on every compatibility weight", () => {
    const { scored } = runPrecisionAt5();
    const { basePrecision, rows } = runWeightSensitivity(scored);

    expect(basePrecision).toBeGreaterThanOrEqual(0);
    expect(basePrecision).toBeLessThanOrEqual(1);
    // 5 weights x 2 directions (+0.05/-0.05) = 10 rows
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(["color", "style", "pattern", "occasion", "season"]).toContain(row.weight);
      expect(row.precisionAt5).toBeGreaterThanOrEqual(0);
      expect(row.precisionAt5).toBeLessThanOrEqual(1);
    }
  });
});

describe("generateSyntheticWardrobe", () => {
  it("generates the requested number of items, deterministically for a fixed seed", () => {
    const a = generateSyntheticWardrobe(500, 42);
    const b = generateSyntheticWardrobe(500, 42);
    expect(a).toHaveLength(500);
    expect(a).toEqual(b);
  });

  it("produces different wardrobes for different seeds", () => {
    const a = generateSyntheticWardrobe(50, 1);
    const b = generateSyntheticWardrobe(50, 2);
    expect(a).not.toEqual(b);
  });
});

describe("runPerformanceBenchmark - T4.5 acceptance criterion", () => {
  it("completes generateOutfits + re-ranking on a synthetic 500-item wardrobe in under 200ms", () => {
    const result = runPerformanceBenchmark({ wardrobeSize: 500, trials: 10 });

    expect(result.wardrobeSize).toBe(500);
    expect(result.maxMs).toBeGreaterThan(0);
    expect(result.meanMs).toBeLessThanOrEqual(result.maxMs);
    expect(result.maxMs).toBeLessThan(200);
    expect(result.underTarget).toBe(true);
  }, 30000);
});

describe("evaluate script - runs with one command (README acceptance criterion)", () => {
  it("`npm run evaluate` writes docs/algorithms/EVALUATION.md with all 5 result sections", () => {
    execSync("npm run evaluate", { cwd: path.resolve(__dirname, "../.."), stdio: "pipe" });

    const evalPath = path.resolve(__dirname, "../../../docs/algorithms/EVALUATION.md");
    expect(fs.existsSync(evalPath)).toBe(true);

    const content = fs.readFileSync(evalPath, "utf-8");
    expect(content).toMatch(/## 1\. Compatibility Precision@5/);
    expect(content).toMatch(/## 2\. Personalization Hit Rate@5/);
    expect(content).toMatch(/## 3\. Mean score and score spread per anchor category/);
    expect(content).toMatch(/## 4\. Weight sensitivity/);
    expect(content).toMatch(/## 5\. Performance benchmark/);
    expect(content).toMatch(/Under target \| Yes/);
    expect(content).toMatch(/Beats random baseline \| Yes/);
  }, 30000);
});
