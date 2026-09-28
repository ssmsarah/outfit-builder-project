// I7.7 acceptance: 1,000-item synthetic wardrobe. Lives in tests/scripts so
// it runs in the sequential "benchmarks" group (vitest.config.js), not
// alongside the parallel unit tests.
import { describe, it, expect } from "vitest";
import { runPerformanceChecks, namedSyntheticWardrobe, TARGETS_MS } from "../../src/scripts/benchmarkRulesAndSearch.js";

describe("I7.7 - performance on a 1,000-item wardrobe", () => {
  const result = runPerformanceChecks({ size: 1000 });

  it(`full index build under ${TARGETS_MS.indexBuild} ms`, () => {
    expect(result.indexBuild.maxMs).toBeLessThan(TARGETS_MS.indexBuild);
  });

  it(`search under ${TARGETS_MS.search} ms`, () => {
    expect(result.search.maxMs).toBeLessThan(TARGETS_MS.search);
  });

  it(`outfit recommendation with rules under ${TARGETS_MS.recommendation} ms`, () => {
    expect(result.recommendation.maxMs).toBeLessThan(TARGETS_MS.recommendation);
  });
});

describe("namedSyntheticWardrobe", () => {
  it("is deterministic and names every item", () => {
    const a = namedSyntheticWardrobe(50);
    expect(a).toEqual(namedSyntheticWardrobe(50));
    expect(a.every((item) => typeof item.name === "string" && item.name.split(" ").length >= 3)).toBe(true);
  });
});
