import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  precisionAtK,
  recallAtK,
  reciprocalRank,
  runSearchEvaluation,
  runLabeledPrecision,
  runRuleImpact,
  main,
} from "../../src/scripts/evaluateRulesAndSearch.js";

describe("ranking metrics", () => {
  it("precision@k, recall@k and reciprocal rank follow the standard definitions", () => {
    const ranked = ["a", "x", "b", "y", "z", "c"];
    expect(precisionAtK(ranked, ["a", "b", "c"], 5)).toBeCloseTo(2 / 5, 12);
    expect(recallAtK(ranked, ["a", "b", "c"], 5)).toBeCloseTo(2 / 3, 12);
    expect(reciprocalRank(ranked, ["b"])).toBeCloseTo(1 / 3, 12);
    expect(reciprocalRank(ranked, ["q"])).toBe(0);
    expect(recallAtK(ranked, [], 10)).toBe(0);
  });
});

describe("I7.6 - README acceptance criteria", () => {
  const { betaSweep } = runSearchEvaluation();

  it("combined char+word beats word-only on the typo query group", () => {
    const wordOnly = betaSweep.find((s) => s.beta === 0);
    const combined = betaSweep.find((s) => s.label === "combined" && s.beta === 0.6);
    expect(combined.groups.typo.mrr).toBeGreaterThan(wordOnly.groups.typo.mrr);
  });

  it("rules-on Precision@5 is greater than or equal to rules-off", () => {
    const { rulesOn, rulesOff } = runLabeledPrecision();
    expect(rulesOn.precisionAt5).toBeGreaterThanOrEqual(rulesOff.precisionAt5);
  });

  it("rules never reject an outfit labeled good", () => {
    expect(runLabeledPrecision().rulesOn.goodRejected).toBe(0);
  });

  it("runs with one command and writes all 5 sections", () => {
    const outPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "eval-")), "EVALUATION_RULES_SEARCH.md");
    main(outPath);
    const report = fs.readFileSync(outPath, "utf8");

    for (const heading of ["## 1. Search quality", "## 2. Ablation", "## 3. Rule impact", "## 4. Search latency", "## 5. Performance"]) {
      expect(report).toContain(heading);
    }
  });
});

describe("rule impact", () => {
  it("reports a rate for every rule over all candidate outfits and contexts", () => {
    const impact = runRuleImpact();
    expect(impact.evaluations).toBe(impact.outfits * impact.contexts);
    for (const rule of impact.rules) {
      expect(rule.rejectedRate).toBeGreaterThanOrEqual(0);
      expect(rule.rejectedRate).toBeLessThanOrEqual(1);
      if (rule.type === "soft") expect(rule.rejectedRate).toBe(0);
    }
  });
});
