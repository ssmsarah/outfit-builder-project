import { describe, it, expect } from "vitest";
import { createSearchIndex, searchIndex, rankAll } from "../../../src/recommendation/search/searchIndex.js";
import { wordSimilarity, bestMatch } from "../../../src/recommendation/search/fuzzyMatch.js";
import { searchConfig } from "../../../src/config/searchConfig.js";
import { loadSearchConfig } from "../../../src/config/loadSearchConfig.js";
import { wardrobe } from "../fixtures/wardrobe.js";

const index = createSearchIndex(wardrobe);
const ids = (results) => results.map((r) => r.itemId);

describe("search - README acceptance criteria (fixture wardrobe)", () => {
  it('"black tshirt" -> black_tshirt ranked first', () => {
    expect(ids(searchIndex(index, "black tshirt"))[0]).toBe("black_tshirt");
  });

  it('"blak tshrt" -> black_tshirt in top 3', () => {
    expect(ids(searchIndex(index, "blak tshrt")).slice(0, 3)).toContain("black_tshirt");
  });

  it('"white sneakrs" -> white_sneakers ranked first', () => {
    expect(ids(searchIndex(index, "white sneakrs"))[0]).toBe("white_sneakers");
  });

  it('"floral skirt" -> green_floral_skirt ranked first', () => {
    expect(ids(searchIndex(index, "floral skirt"))[0]).toBe("green_floral_skirt");
  });

  it('"zzzz" -> empty list', () => {
    expect(searchIndex(index, "zzzz")).toEqual([]);
  });
});

describe("search - scoring", () => {
  it("SearchScore = beta * S_char + (1 - beta) * S_word", () => {
    const { beta } = searchConfig;
    for (const r of searchIndex(index, "black casual tee")) {
      expect(r.score).toBeCloseTo(beta * r.sChar + (1 - beta) * r.sWord, 12);
    }
  });

  it("returns { itemId, score, sWord, sChar, matchedTerms } with scores in [0, 1]", () => {
    const [top] = searchIndex(index, "black tshirt");
    expect(top).toEqual({
      itemId: "black_tshirt",
      score: expect.any(Number),
      sWord: expect.any(Number),
      sChar: expect.any(Number),
      matchedTerms: ["black", "tshirt"],
    });
    for (const key of ["score", "sWord", "sChar"]) {
      expect(top[key]).toBeGreaterThan(0);
      expect(top[key]).toBeLessThanOrEqual(1);
    }
  });

  it("matchedTerms maps typos to the document term they matched", () => {
    const top = searchIndex(index, "blak casul tee")[0];
    expect(top.itemId).toBe("black_tshirt");
    expect(top.matchedTerms).toEqual(["black", "casual", "tshirt"]);
  });

  it("drops results below minScore", () => {
    for (const r of rankAll(index, "black")) expect(r.score).toBeGreaterThanOrEqual(searchConfig.minScore);
    expect(rankAll(index, "black", { minScore: 0 }).length).toBeGreaterThan(rankAll(index, "black").length);
  });

  it("sorts by descending score, ties broken by item id", () => {
    // "casual" alone ties many items; check the whole ordering contract.
    const results = rankAll(index, "casual", { minScore: 0 });
    for (let i = 1; i < results.length; i++) {
      const [a, b] = [results[i - 1], results[i]];
      expect(a.score > b.score || (a.score === b.score && a.itemId < b.itemId)).toBe(true);
    }
  });

  it("synonyms reach the index: tee, t-shirt and tshirt give the same ranking", () => {
    expect(ids(searchIndex(index, "black tee"))).toEqual(ids(searchIndex(index, "black t-shirt")));
    expect(ids(searchIndex(index, "black tee"))).toEqual(ids(searchIndex(index, "black tshirt")));
  });

  it("is deterministic", () => {
    expect(searchIndex(index, "blak tshrt")).toEqual(searchIndex(index, "blak tshrt"));
  });

  it("empty and stopword-only queries return nothing", () => {
    expect(searchIndex(index, "")).toEqual([]);
    expect(searchIndex(index, "the and")).toEqual([]);
  });
});

describe("search - paging", () => {
  const all = rankAll(index, "black", { minScore: 0 });

  it("supports limit and offset", () => {
    expect(searchIndex(index, "black", { minScore: 0, limit: 2 })).toEqual(all.slice(0, 2));
    expect(searchIndex(index, "black", { minScore: 0, limit: 2, offset: 2 })).toEqual(all.slice(2, 4));
    expect(searchIndex(index, "black", { minScore: 0, offset: 1000 })).toEqual([]);
  });

  it("uses the configured default limit", () => {
    expect(searchIndex(index, "casual", { minScore: 0 })).toHaveLength(searchConfig.defaultLimit);
  });
});

describe("fuzzyMatch", () => {
  it("word similarity is 1 for identical words and higher for closer typos", () => {
    expect(wordSimilarity("black", "black")).toBe(1);
    expect(wordSimilarity("blak", "black")).toBeGreaterThan(wordSimilarity("blak", "blue"));
    expect(wordSimilarity("xyz", "black")).toBe(0);
  });

  it("bestMatch returns the closest term above the threshold, or null", () => {
    expect(bestMatch("sneakrs", ["sneakers", "shirt", "skirt"], 0.4)).toMatchObject({ term: "sneakers" });
    expect(bestMatch("zzzz", ["sneakers", "shirt"], 0.4)).toBeNull();
  });
});

describe("loadSearchConfig - ranking values", () => {
  const base = () => structuredClone(searchConfig);

  it("rejects beta/minScore outside [0, 1] and a non-positive default limit", () => {
    expect(() => loadSearchConfig({ ...base(), beta: 1.2 })).toThrow(/beta/);
    expect(() => loadSearchConfig({ ...base(), minScore: -0.1 })).toThrow(/minScore/);
    expect(() => loadSearchConfig({ ...base(), defaultLimit: 0 })).toThrow(/defaultLimit/);
  });
});
