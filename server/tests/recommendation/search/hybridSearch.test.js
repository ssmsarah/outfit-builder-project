import { describe, it, expect } from "vitest";
import { hybridSearch } from "../../../src/recommendation/search/hybridSearch.js";
import { createSearchIndex, rankAll } from "../../../src/recommendation/search/searchIndex.js";
import { attributeMatch } from "../../../src/recommendation/rules/attributeMatcher.js";
import { searchConfig } from "../../../src/config/searchConfig.js";
import { wardrobe, wardrobeById } from "../fixtures/wardrobe.js";

const index = createSearchIndex(wardrobe);
const ids = ({ results }) => results.map((r) => r.itemId);

describe("hybridSearch - README acceptance criteria", () => {
  it('"black casual top" ranks black_tshirt above black_trousers, which is filtered out by category', () => {
    const response = hybridSearch(index, "black casual top", { limit: 50 });

    expect(response.parsedAttributes).toEqual({ color: "black", style: "casual", category: "top" });
    expect(ids(response)[0]).toBe("black_tshirt");
    expect(ids(response)).not.toContain("black_trousers");

    // black_trousers does match the text, so it was removed by the category filter, not by text.
    expect(rankAll(index, "black casual top", { minScore: 0 }).map((r) => r.itemId)).toContain("black_trousers");
  });
});

describe("hybridSearch - formula", () => {
  it("HybridScore = gamma * SearchScore + (1 - gamma) * MatchScore", () => {
    const { gamma } = searchConfig;
    for (const r of hybridSearch(index, "blak casul tee").results) {
      expect(r.hybridScore).toBeCloseTo(gamma * r.searchScore + (1 - gamma) * r.matchScore, 12);
    }
  });

  it("MatchScore is R5.7's attributeMatch on the parsed attributes", () => {
    const { results, parsedAttributes } = hybridSearch(index, "formal shoes");
    for (const r of results) {
      const expected = attributeMatch(wardrobeById[r.itemId], parsedAttributes);
      expect(r.matchScore).toBe(expected.score);
      expect(r.matched).toEqual(expected.matched);
      expect(r.missed).toEqual(expected.missed);
    }
  });

  it("with no parsed attributes, HybridScore = SearchScore and matchScore is null", () => {
    // "leathr" and "wool" name no attribute value.
    for (const query of ["leathr", "wool"]) {
      const { results, parsedAttributes } = hybridSearch(index, query);
      expect(parsedAttributes).toEqual({});
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.hybridScore).toBe(r.searchScore);
        expect(r.matchScore).toBeNull();
      }
    }
  });

  it("the text-only ranking is unchanged when no attributes are parsed", () => {
    const hybrid = hybridSearch(index, "leathr", { limit: 50 });
    const text = rankAll(index, "leathr");
    expect(ids(hybrid)).toEqual(text.map((r) => r.itemId));
  });

  it("a parsed category is a hard filter", () => {
    for (const r of hybridSearch(index, "white shoes", { limit: 50 }).results) {
      expect(wardrobeById[r.itemId].category).toBe("shoes");
    }
  });

  it("attribute matches lift items the text alone ranks lower", () => {
    // "blue": text favors items literally named blue; attribute matching
    // also credits blue-family items, and the three exact blues lead.
    const top3 = ids(hybridSearch(index, "blue", { limit: 3 })).sort();
    expect(top3).toEqual(["blue_jeans", "denim_jacket", "sport_running_shoes"]);
  });
});

describe("hybridSearch - output", () => {
  it("returns the per-result breakdown", () => {
    const [top] = hybridSearch(index, "black casual top").results;
    expect(top).toEqual({
      itemId: "black_tshirt",
      hybridScore: expect.any(Number),
      searchScore: expect.any(Number),
      matchScore: 1,
      matched: ["color", "style", "category"],
      missed: [],
      sWord: expect.any(Number),
      sChar: expect.any(Number),
      matchedTerms: expect.any(Array),
    });
  });

  it("scores lie in [0, 1], results are sorted, and all clear minScore", () => {
    const { results } = hybridSearch(index, "casual summer", { limit: 50 });
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      for (const key of ["hybridScore", "searchScore", "matchScore"]) {
        expect(r[key]).toBeGreaterThanOrEqual(0);
        expect(r[key]).toBeLessThanOrEqual(1);
      }
      expect(r.hybridScore).toBeGreaterThanOrEqual(searchConfig.minScore);
      if (i > 0) expect(results[i - 1].hybridScore).toBeGreaterThanOrEqual(r.hybridScore);
    }
  });

  it("supports limit/offset and reports the total before paging", () => {
    const all = hybridSearch(index, "casual", { limit: 100 });
    const page = hybridSearch(index, "casual", { limit: 2, offset: 1 });
    expect(page.results).toEqual(all.results.slice(1, 3));
    expect(page.total).toBe(all.results.length);
  });

  it("returns no results for a no-match query", () => {
    expect(hybridSearch(index, "zzzz")).toEqual({ results: [], parsedAttributes: {}, total: 0 });
  });
});
